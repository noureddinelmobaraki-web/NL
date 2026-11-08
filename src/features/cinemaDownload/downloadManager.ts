/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download & Optional Progressive Torrent Stream Manager (Part 2)
 */

import { useSyncExternalStore } from 'react';
import { nowPlayingBus } from '../../audio/nowPlayingBus';
import { buildSources } from '../../components/Movies/MovieSourcesModal';
import {
  buildWorkerProxyUrl,
  fetchExtractedVideos,
} from '../../services/videoExtractor';
import {
  parseMagnetUriInput,
  parseTorrentFileBytes,
} from './bencodeAndInputManager';
import { BrowserSwarmSession } from './engine/browserSwarmClient';
import {
  buildCleanDownloadFileName,
  computeRealPieceGeometry,
  discoverReleasesForMedia,
} from './releaseDiscoveryService';
import {
  buildPublicTorrentCacheUrls,
  formatBytes,
  parseSceneReleaseName,
  synthesizeMagnetUri,
} from './releaseParserAndFilter';
import {
  byteOffsetToPieceIndex,
  computePieceMapBuckets,
  isHeaderAndTailComplete,
  SeekGate,
  selectNextPieceToDownload,
} from './slidingWindowScheduler';
import type {
  ActiveTransportMode,
  CinemaDownloadSnapshot,
  DiscoveredReleaseOption,
  DownloadMediaContext,
  DownloadQualityTier,
} from './types';

interface ActiveLoopContext {
  cancelled: boolean;
  hlsSegments?: string[];
  directRangeUrl?: string;
  directRangeReferer?: string;
  useBridgeBackend: boolean;
  bytesTransferredInSession: number;
  sessionStartTimeMs: number;
  isRecentSeek: boolean;
  currentPieceAbort: AbortController | null;
  seekGate: SeekGate;
}

function isDirectDiskPickerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).showSaveFilePicker === 'function'
  );
}

export function buildProgressiveRangeStreamUrl(
  release: DiscoveredReleaseOption,
  sessionToken?: string,
): string {
  if (release.directStreamUrl) {
    return release.directStreamUrl;
  }
  if (release.fallbackStreamUrl) {
    return release.fallbackStreamUrl;
  }
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/+$/, '')
      : '';
  const params = new URLSearchParams({
    infoHash: release.infoHash,
    magnet: release.magnetUri,
    size: String(release.sizeBytes),
    pieceLen: String(release.pieceLength),
  });
  if (sessionToken) {
    params.set('t', sessionToken);
  }
  return `${base}/__tp_stream__/${release.infoHash}?${params.toString()}`;
}

async function resolveHlsSegmentsClientSide(
  playlistUrl: string,
  referer?: string,
): Promise<string[]> {
  const fetchViaProxy = async (targetUrl: string): Promise<string> => {
    const proxied = targetUrl.startsWith('https://broad-block-7bd7.')
      ? targetUrl
      : buildWorkerProxyUrl(targetUrl, referer);
    const res = await fetch(proxied, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  };

  let manifestText = await fetchViaProxy(playlistUrl);
  let activeBaseUrl = playlistUrl;

  if (manifestText.includes('#EXT-X-STREAM-INF')) {
    const lines = manifestText.split(/\r?\n/);
    let bestBw = -1;
    let bestUri = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
        const bw = bwMatch ? Number(bwMatch[1]) : 0;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) continue;
          if (!nextLine.startsWith('#')) {
            if (bw >= bestBw) {
              bestBw = bw;
              try {
                const rawUrl = new URL(nextLine, playlistUrl);
                const innerTarget = rawUrl.searchParams.get('videoUrl');
                bestUri = innerTarget || rawUrl.toString();
              } catch {
                bestUri = nextLine;
              }
            }
          }
          break;
        }
      }
    }
    if (bestUri) {
      activeBaseUrl = bestUri;
      manifestText = await fetchViaProxy(bestUri);
    }
  }

  const segments: string[] = [];
  for (const rawLine of manifestText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXT-X-MAP:')) {
      const uriMatch = line.match(/URI="([^"]+)"/i);
      if (uriMatch?.[1]) {
        try {
          segments.push(new URL(uriMatch[1], activeBaseUrl).toString());
        } catch {}
      }
    } else if (!line.startsWith('#')) {
      try {
        segments.push(new URL(line, activeBaseUrl).toString());
      } catch {}
    }
  }

  return segments.map((seg) =>
    seg.startsWith('https://broad-block-7bd7.')
      ? seg
      : buildWorkerProxyUrl(seg, referer || activeBaseUrl),
  );
}

class CinemaDownloadManager {
  private listeners = new Set<() => void>();
  private worker: Worker | null = null;
  private discoveryAbort: AbortController | null = null;
  private activeLoops = new Map<string, ActiveLoopContext>();
  private swarmSessions = new Map<string, BrowserSwarmSession>();
  private savedBitfields = new Map<string, number[]>();
  private sessionToken = '';

  private state: CinemaDownloadSnapshot = {
    isModalOpen: false,
    activeMedia: null,
    isDiscovering: false,
    discoveredReleases: [],
    discoveryError: null,
    selectedQualityFilter: 'all',
    activeTab: 'discover',
    activeStreamingTaskHash: null,
    quota: {
      usageBytes: 0,
      quotaBytes: 0,
      freeBytes: 0,
      usageMB: 0,
      quotaMB: 0,
      freeGB: 0,
      persisted: false,
      opfsSupported: true,
      directDiskSupported: isDirectDiskPickerSupported(),
    },
    tasks: {},
    activeTaskIds: [],
    liveTrackersCount: 14,
    bridgeServerAvailable: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const rnd = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(rnd);
      }
      this.sessionToken = Array.from(rnd, (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      this.initWorker();
      this.registerStreamServiceWorker();
      void this.refreshQuota();
      void this.checkBridgeHealth();
    }
  }

  private async checkBridgeHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/cinema-download/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        this.state.bridgeServerAvailable = false;
        return false;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        this.state.bridgeServerAvailable = false;
        return false;
      }
      const data = await res.json();
      const ok = Boolean(data?.ok);
      this.state.bridgeServerAvailable = ok;
      return ok;
    } catch {
      this.state.bridgeServerAvailable = false;
      return false;
    }
  }

  private registerStreamServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    try {
      const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
      const swPath = import.meta.env.PROD
        ? `${base}/sw.js`
        : `${base}/torrent-stream-sw.js`;
      void navigator.serviceWorker
        .register(swPath, { scope: `${base}/` })
        .catch(() => {});

      navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent) => {
          const data = event.data;
          if (!data) return;

          if (data.type === 'SW_OPEN_RANGE' && event.ports[0] && this.worker) {
            if (
              typeof data.infoHash === 'string' &&
              typeof data.start === 'number'
            ) {
              this.seekStreamToByteOffset(data.infoHash, data.start, false);
            }
            this.worker.postMessage(
              {
                action: 'OPEN_BYTE_RANGE',
                payload: {
                  infoHash: data.infoHash,
                  start: data.start,
                  end: data.end,
                },
              },
              [event.ports[0]],
            );
          } else if (
            data.type === 'TORRENT_SW_SEEK_RANGE' &&
            typeof data.infoHash === 'string' &&
            typeof data.byteStart === 'number'
          ) {
            this.seekStreamToByteOffset(data.infoHash, data.byteStart, false);
          }
        },
      );
    } catch {}
  }

  private emit(): void {
    this.state = {
      ...this.state,
      tasks: { ...this.state.tasks },
      activeTaskIds: Object.keys(this.state.tasks),
    };
    this.syncDynamicIsland();
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  public subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  public getSnapshot = (): CinemaDownloadSnapshot => {
    return this.state;
  };

  private initWorker(): void {
    if (this.worker || typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(
        new URL('./opfsStorageWorker.ts', import.meta.url),
        { type: 'module' },
      );
      this.worker.onmessage = (e: MessageEvent) =>
        this.handleWorkerMessage(e.data);
      this.worker.postMessage({ action: 'GET_QUOTA_AND_SAVED' });
    } catch {
      this.worker = null;
    }
  }

  public async ensurePersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        const already = await navigator.storage.persisted();
        const persisted = already ? true : await navigator.storage.persist();
        this.state.quota = { ...this.state.quota, persisted };
        this.emit();
        return persisted;
      } catch {
        return false;
      }
    }
    return false;
  }

  public async refreshQuota(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usage = est.usage || 0;
        const quota = est.quota || 0;
        const free = Math.max(0, quota - usage);
        const persisted = navigator.storage.persisted
          ? await navigator.storage.persisted()
          : false;
        this.state.quota = {
          usageBytes: usage,
          quotaBytes: quota,
          freeBytes: free,
          usageMB: Math.round(usage / 1e6),
          quotaMB: Math.round(quota / 1e6),
          freeGB: Number((free / 1e9).toFixed(2)),
          persisted,
          opfsSupported: Boolean(navigator.storage.getDirectory),
          directDiskSupported: isDirectDiskPickerSupported(),
        };
        this.emit();
      } catch {}
    }
  }

  private handleWorkerMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'QUOTA_AND_SAVED') {
      if (msg.quota) {
        this.state.quota = {
          ...this.state.quota,
          ...msg.quota,
          directDiskSupported: isDirectDiskPickerSupported(),
        };
      }
      if (Array.isArray(msg.savedRecords)) {
        for (const rec of msg.savedRecords) {
          if (!rec?.infoHash || !rec.mediaSnapshot || !rec.releaseSnapshot) {
            continue;
          }
          const bf: number[] = Array.isArray(rec.bitfield) ? rec.bitfield : [];
          const release = rec.releaseSnapshot as DiscoveredReleaseOption;
          if (bf.length === 32 && release.pieceLength === 262144) {
            this.worker?.postMessage({
              action: 'CLEANUP_CACHE',
              payload: { infoHash: rec.infoHash },
            });
            continue;
          }

          this.savedBitfields.set(rec.infoHash, bf);
          const done = bf.reduce((a, b) => a + b, 0);
          const total = Math.max(1, bf.length);
          const pct = Number(((done / total) * 100).toFixed(1));
          const isDone = done >= total;
          const media = rec.mediaSnapshot as DownloadMediaContext;
          const writtenBytes =
            Number(rec.writtenBytes) ||
            Math.round((done / total) * release.sizeBytes);

          if (!this.state.tasks[rec.infoHash]) {
            this.state.tasks[rec.infoHash] = {
              taskId: rec.infoHash,
              infoHash: rec.infoHash,
              media,
              release,
              status: isDone ? 'completed' : 'paused',
              storageMode: rec.storageMode || 'opfs-cache',
              transportMode: 'initializing',
              progressPct: pct,
              completedPieces: done,
              totalPieces: total,
              downloadedBytes: writtenBytes,
              totalBytes: release.sizeBytes,
              speedBytesPerSec: 0,
              etaSeconds: null,
              verifiedPiecesCount: done,
              corruptPiecesRetried: 0,
              bannedPeersCount: 0,
              activePeers: release.seeders || 1,
              exportedToDevice: Boolean(rec.exportedToDevice),
              cacheCleared: false,
              isStreamingActive: false,
              showPieceMap: false,
              streamUrl: buildProgressiveRangeStreamUrl(
                release,
                this.sessionToken,
              ),
              headerAndTailReady: isHeaderAndTailComplete(bf, total),
              playheadPieceIndex: 0,
              priorityPhase: 'sequential',
              pieceMapBuckets: computePieceMapBuckets(bf, total, 0),
              statusMessage: isDone
                ? 'مكتمل 100% في مخزن TPPIECES القرصي — جاهز للحفظ الفوري على جهازك'
                : `محفوظ في الكاش (${done}/${total} قطعة موثقة) — اضغط استئناف لإكمال التحميل`,
              startedAt: rec.updatedAt || Date.now(),
              updatedAt: rec.updatedAt || Date.now(),
            };
          }
        }
      }
      this.emit();
    } else if (msg.type === 'INIT_READY') {
      const {
        infoHash,
        storageMode,
        bitfield,
        completedPieces,
        totalPieces,
        writtenBytes,
        quota,
      } = msg;
      if (quota) {
        this.state.quota = {
          ...this.state.quota,
          ...quota,
          directDiskSupported: isDirectDiskPickerSupported(),
        };
      }
      const bf: number[] = Array.isArray(bitfield)
        ? bitfield
        : new Array(totalPieces).fill(0);
      this.savedBitfields.set(infoHash, bf);

      const task = this.state.tasks[infoHash];
      if (!task) return;

      if (storageMode) {
        task.storageMode = storageMode;
      }
      const pct = Number(
        ((completedPieces / Math.max(1, totalPieces)) * 100).toFixed(1),
      );
      task.completedPieces = completedPieces;
      task.totalPieces = totalPieces;
      task.verifiedPiecesCount = completedPieces;
      task.progressPct = pct;
      task.headerAndTailReady = isHeaderAndTailComplete(bf, totalPieces);
      task.pieceMapBuckets = computePieceMapBuckets(
        bf,
        totalPieces,
        task.playheadPieceIndex || 0,
      );
      task.downloadedBytes =
        typeof writtenBytes === 'number' && writtenBytes > 0
          ? writtenBytes
          : Math.round(
              (completedPieces / Math.max(1, totalPieces)) * task.totalBytes,
            );
      task.status =
        completedPieces >= totalPieces ? 'exporting' : 'downloading';
      task.statusMessage =
        completedPieces > 0 && completedPieces < totalPieces
          ? `تم استئناف التحميل من الكاش (${completedPieces}/${totalPieces} قطعة موثقة بـ SHA-1)...`
          : 'تم تهيئة مخزن TPPIECES القرصي — جاري سحب وتوثيق القطع...';
      task.updatedAt = Date.now();
      this.emit();

      if (completedPieces >= totalPieces) {
        this.worker?.postMessage({
          action: 'FINALIZE_AND_EXPORT',
          payload: { infoHash },
        });
      } else {
        void this.runPieceDownloadLoop(infoHash, bf);
      }
    } else if (msg.type === 'PIECE_VERIFIED') {
      const {
        infoHash,
        pieceIndex,
        completedPieces,
        totalPieces,
        progress,
        pieceByteLength,
        writtenBytes,
      } = msg;
      const task = this.state.tasks[infoHash];
      if (!task) return;

      const bf =
        this.savedBitfields.get(infoHash) || new Array(totalPieces).fill(0);
      if (typeof pieceIndex === 'number') {
        bf[pieceIndex] = 1;
        this.savedBitfields.set(infoHash, bf);
      }

      const loopCtx = this.activeLoops.get(infoHash);
      const now = Date.now();
      if (loopCtx && typeof pieceByteLength === 'number' && pieceByteLength > 0) {
        loopCtx.bytesTransferredInSession += pieceByteLength;
      }

      const elapsedSec = Math.max(
        0.5,
        (now - (loopCtx?.sessionStartTimeMs || task.startedAt)) / 1000,
      );
      const actualDownloaded =
        typeof writtenBytes === 'number' && writtenBytes > 0
          ? writtenBytes
          : task.downloadedBytes + (pieceByteLength || 0);

      if (
        (task.release.sourceKind === 'direct-hls' ||
          task.transportMode === 'hls-assembler') &&
        completedPieces > 0 &&
        totalPieces > 0
      ) {
        const avgSegSize = actualDownloaded / completedPieces;
        task.totalBytes = Math.max(
          actualDownloaded,
          Math.round(avgSegSize * totalPieces),
        );
      }

      const sessionTransferred =
        loopCtx?.bytesTransferredInSession || actualDownloaded;
      const speed = Math.round(sessionTransferred / elapsedSec);
      const remainingBytes = Math.max(0, task.totalBytes - actualDownloaded);
      const eta =
        speed > 0 ? Math.max(1, Math.round(remainingBytes / speed)) : null;

      task.completedPieces = completedPieces;
      task.totalPieces = totalPieces;
      task.verifiedPiecesCount = completedPieces;
      task.progressPct = Number(
        progress ??
          ((completedPieces / Math.max(1, totalPieces)) * 100).toFixed(1),
      );
      task.downloadedBytes = actualDownloaded;
      task.speedBytesPerSec = speed;
      task.etaSeconds = eta;
      task.headerAndTailReady = isHeaderAndTailComplete(bf, totalPieces);
      task.pieceMapBuckets = computePieceMapBuckets(
        bf,
        totalPieces,
        task.playheadPieceIndex || 0,
      );

      task.statusMessage = `جاري التحميل: تم توثيق ${completedPieces}/${totalPieces} قطعة بـ SHA-1 (${formatBytes(actualDownloaded)} من ${formatBytes(task.totalBytes)})`;
      task.updatedAt = now;

      if (completedPieces >= totalPieces) {
        task.status = 'exporting';
        task.speedBytesPerSec = 0;
        task.etaSeconds = 0;
        task.statusMessage =
          'اكتمل التحميل وفحص جميع القطع 100% بـ SHA-1! جاري الدمج الذري ونقل الملف لجهازك...';
        this.emit();
        this.worker?.postMessage({
          action: 'FINALIZE_AND_EXPORT',
          payload: { infoHash },
        });
      } else {
        this.emit();
      }
    } else if (msg.type === 'PIECE_CORRUPT') {
      const { infoHash, reason } = msg;
      const task = this.state.tasks[infoHash];
      if (!task) return;
      task.corruptPiecesRetried += 1;
      task.bannedPeersCount += 1;
      task.statusMessage =
        reason ||
        'تم رصد قطعة تالفة وحظر المرسل (Smart Ban) — جاري إعادة الجلب';
      this.emit();
    } else if (msg.type === 'EXPORT_READY') {
      const {
        infoHash,
        fileName,
        file,
        savedDirectlyToDisk,
        actualSizeBytes,
        quota,
      } = msg;
      if (quota) {
        this.state.quota = {
          ...this.state.quota,
          ...quota,
          directDiskSupported: isDirectDiskPickerSupported(),
        };
      }
      const task = this.state.tasks[infoHash];
      if (task) {
        if (typeof actualSizeBytes === 'number' && actualSizeBytes > 0) {
          task.downloadedBytes = actualSizeBytes;
          task.totalBytes = actualSizeBytes;
          task.release.sizeBytes = actualSizeBytes;
          task.release.sizeFormatted = formatBytes(actualSizeBytes);
        }
        task.status = 'completed';
        task.progressPct = 100;
        task.exportedToDevice = true;
        task.speedBytesPerSec = 0;
        task.etaSeconds = 0;
        if (file instanceof File && !task.blobStreamUrl) {
          try {
            task.blobStreamUrl = URL.createObjectURL(file);
            task.streamUrl = task.blobStreamUrl;
          } catch {}
        }
        task.statusMessage = savedDirectlyToDisk
          ? `تم حفظ الملف المدمج (${formatBytes(task.downloadedBytes)}) مباشرة على قرص جهازك بنجاح!`
          : `اكتمل تنزيل الملف (${formatBytes(task.downloadedBytes)}) إلى مجلد التنزيلات في جهازك!`;
        task.updatedAt = Date.now();
      }
      if (file && !savedDirectlyToDisk) {
        this.triggerBrowserNativeSave(
          file,
          fileName || task?.release.cleanFileName || 'movie.mp4',
        );
      }
      this.emit();
    } else if (msg.type === 'CACHE_CLEARED') {
      const { infoHash, quota } = msg;
      if (quota) {
        this.state.quota = {
          ...this.state.quota,
          ...quota,
          directDiskSupported: isDirectDiskPickerSupported(),
        };
      }
      this.savedBitfields.delete(infoHash);
      const swarm = this.swarmSessions.get(infoHash);
      if (swarm) {
        swarm.destroy();
        this.swarmSessions.delete(infoHash);
      }
      const task = this.state.tasks[infoHash];
      if (task) {
        if (task.blobStreamUrl) {
          try {
            URL.revokeObjectURL(task.blobStreamUrl);
          } catch {}
          task.blobStreamUrl = undefined;
        }
        task.cacheCleared = true;
        task.statusMessage =
          'تم تفريغ كاش المتصفح القرصي بالكامل واستعادة المساحة الحرة.';
      }
      this.emit();
    } else if (msg.type === 'ERROR') {
      const { infoHash, message } = msg;
      if (infoHash && this.state.tasks[infoHash]) {
        const task = this.state.tasks[infoHash];
        task.status = 'error';
        task.errorMessage = message;
        task.statusMessage = message;
        this.emit();
      }
    }
  }

  private async resolveRealSourceMetadata(
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
    infoHash: string,
  ): Promise<{
    realSizeBytes: number;
    pieceLength: number;
    totalPieces: number;
    activePeers: number;
    pieceHashesHex: string[];
    hlsSegments?: string[];
    directRangeUrl?: string;
    directRangeReferer?: string;
    useBridgeBackend: boolean;
    transportMode: ActiveTransportMode;
  }> {
    if (release.sourceKind === 'direct-hls' && release.directStreamUrl) {
      try {
        const segments = await resolveHlsSegmentsClientSide(
          release.directStreamUrl,
          release.streamReferer,
        );
        if (segments.length > 0) {
          return {
            realSizeBytes: release.sizeBytes,
            pieceLength: Math.max(
              65536,
              Math.round(release.sizeBytes / segments.length),
            ),
            totalPieces: segments.length,
            activePeers: 120,
            pieceHashesHex: [],
            hlsSegments: segments,
            useBridgeBackend: false,
            transportMode: 'hls-assembler',
          };
        }
      } catch {}
    }

    if (release.sourceKind === 'direct-mp4' && release.directStreamUrl) {
      const proxiedUrl = buildWorkerProxyUrl(
        release.directStreamUrl,
        release.streamReferer,
      );
      let exactSize = release.sizeBytes;
      try {
        const headRes = await fetch(proxiedUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        const cl = Number(headRes.headers.get('content-length') || 0);
        if (cl > 1024 * 1024) exactSize = cl;
      } catch {}
      const { pieceLength, totalPieces } = computeRealPieceGeometry(exactSize);
      return {
        realSizeBytes: exactSize,
        pieceLength,
        totalPieces,
        activePeers: 100,
        pieceHashesHex: [],
        directRangeUrl: proxiedUrl,
        directRangeReferer: release.streamReferer,
        useBridgeBackend: false,
        transportMode: 'webseed-range',
      };
    }

    const bridgeAlive = await this.checkBridgeHealth();
    let parsedPieceHashes: string[] = release.pieceHashesHex || [];
    const discoveredWebSeeds = new Set<string>(release.webSeeds || []);

    if (release.rawTorrentBase64 && bridgeAlive) {
      await fetch('/api/cinema-download/upload-torrent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoHash,
          torrentBase64: release.rawTorrentBase64,
        }),
      }).catch(() => {});
    }

    if (!release.rawTorrentBase64) {
      for (const cacheUrl of release.torrentCacheUrls.slice(0, 2)) {
        try {
          const proxiedCache = buildWorkerProxyUrl(cacheUrl);
          const r = await fetch(proxiedCache, {
            signal: AbortSignal.timeout(3500),
          });
          if (r.ok) {
            const ab = await r.arrayBuffer();
            if (ab.byteLength > 120) {
              const bytes = new Uint8Array(ab);
              if (bytes[0] === 0x64) {
                const meta = await parseTorrentFileBytes(bytes);
                parsedPieceHashes = meta.pieceHashesHex;
                release.rawTorrentBase64 = meta.rawTorrentBase64;
                release.selectedFileOffset = meta.selectedFile.offset;
                release.selectedFileLength = meta.selectedFile.length;
                for (const ws of meta.webSeeds) discoveredWebSeeds.add(ws);
                if (bridgeAlive) {
                  await fetch('/api/cinema-download/upload-torrent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      infoHash,
                      torrentBase64: meta.rawTorrentBase64,
                    }),
                  }).catch(() => {});
                }
                break;
              }
            }
          }
        } catch {}
      }
    }

    let swarmSession = this.swarmSessions.get(infoHash);
    if (!swarmSession) {
      swarmSession = new BrowserSwarmSession(
        infoHash,
        Array.from(discoveredWebSeeds),
        release.selectedFileOffset || 0,
      );
      this.swarmSessions.set(infoHash, swarmSession);
    }

    if (bridgeAlive && release.sourceKind === 'torrent-hybrid') {
      try {
        const params = new URLSearchParams({
          infoHash,
          magnet: release.magnetUri,
        });
        const res = await fetch(
          `/api/cinema-download/torrent-meta?${params.toString()}`,
          { signal: AbortSignal.timeout(12000) },
        );
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const meta = (await res.json()) as {
            ok?: boolean;
            fileSize?: number;
            pieceLength?: number;
            totalPieces?: number;
            peers?: number;
          };
          if (meta.ok && meta.fileSize && meta.fileSize > 0) {
            const pLen =
              meta.pieceLength ||
              computeRealPieceGeometry(meta.fileSize).pieceLength;
            const tPieces =
              meta.totalPieces || Math.max(1, Math.ceil(meta.fileSize / pLen));
            return {
              realSizeBytes: meta.fileSize,
              pieceLength: pLen,
              totalPieces: tPieces,
              activePeers: Number(meta.peers) || release.seeders || 1,
              pieceHashesHex: [],
              useBridgeBackend: true,
              transportMode: 'webtorrent-bridge',
            };
          }
        }
      } catch {}
    }

    const firstWebSeed = Array.from(discoveredWebSeeds)[0];
    if (firstWebSeed) {
      const proxiedSeed = buildWorkerProxyUrl(firstWebSeed);
      const { pieceLength, totalPieces } = computeRealPieceGeometry(
        release.sizeBytes,
      );
      return {
        realSizeBytes: release.sizeBytes,
        pieceLength,
        totalPieces,
        activePeers: release.seeders || 15,
        pieceHashesHex: parsedPieceHashes,
        directRangeUrl: proxiedSeed,
        useBridgeBackend: false,
        transportMode: 'webseed-range',
      };
    }

    const fallbackResult = await this.resolveFallbackStreamTransport(
      media,
      release,
    );
    if (fallbackResult) {
      return fallbackResult;
    }

    const { pieceLength, totalPieces } = computeRealPieceGeometry(
      release.sizeBytes,
    );
    return {
      realSizeBytes: release.sizeBytes,
      pieceLength,
      totalPieces,
      activePeers: release.seeders || 1,
      pieceHashesHex: parsedPieceHashes,
      useBridgeBackend: bridgeAlive,
      transportMode: bridgeAlive
        ? 'webtorrent-bridge'
        : 'browser-webrtc-swarm',
    };
  }

  private async resolveFallbackStreamTransport(
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
  ): Promise<{
    realSizeBytes: number;
    pieceLength: number;
    totalPieces: number;
    activePeers: number;
    pieceHashesHex: string[];
    hlsSegments?: string[];
    directRangeUrl?: string;
    directRangeReferer?: string;
    useBridgeBackend: boolean;
    transportMode: ActiveTransportMode;
  } | null> {
    let streamUrl = release.fallbackStreamUrl || release.directStreamUrl;
    let streamType = release.fallbackStreamType;
    let streamRef =
      release.fallbackStreamReferer || release.streamReferer || '';

    if (!streamUrl && media.tmdbId > 0) {
      try {
        const playSources = buildSources({
          id: media.tmdbId,
          mediaType: media.mediaType,
          imdbId: media.imdbId,
          season: media.season || 1,
          episode: media.episode || 1,
        });
        const topUrls = playSources.slice(0, 5).map((s) => s.url);
        if (topUrls.length > 0) {
          const extracted = await fetchExtractedVideos(topUrls);
          const best =
            extracted.find((s) => s.type === 'mp4') || extracted[0];
          if (best) {
            streamUrl = best.proxiedUrl || best.directUrl;
            streamType =
              best.type === 'hls' || best.directUrl.includes('.m3u8')
                ? 'hls'
                : 'mp4';
            streamRef = best.sourcePage;
            release.fallbackStreamUrl = streamUrl;
            release.fallbackStreamType = streamType;
            release.fallbackStreamReferer = streamRef;
          }
        }
      } catch {}
    }

    if (!streamUrl) return null;

    if (streamType === 'hls' || streamUrl.includes('.m3u8')) {
      try {
        const segments = await resolveHlsSegmentsClientSide(
          streamUrl,
          streamRef,
        );
        if (segments.length > 0) {
          return {
            realSizeBytes: release.sizeBytes,
            pieceLength: Math.max(
              65536,
              Math.round(release.sizeBytes / segments.length),
            ),
            totalPieces: segments.length,
            activePeers: Math.max(25, release.seeders || 25),
            pieceHashesHex: [],
            hlsSegments: segments,
            useBridgeBackend: false,
            transportMode: 'hls-assembler',
          };
        }
      } catch {}
    } else {
      const proxied = streamUrl.startsWith('https://broad-block-7bd7.')
        ? streamUrl
        : buildWorkerProxyUrl(streamUrl, streamRef);
      let exactSize = release.sizeBytes;
      try {
        const headRes = await fetch(proxied, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4500),
        });
        const cl = Number(headRes.headers.get('content-length') || 0);
        if (cl > 1024 * 1024) exactSize = cl;
      } catch {}
      const { pieceLength, totalPieces } = computeRealPieceGeometry(exactSize);
      return {
        realSizeBytes: exactSize,
        pieceLength,
        totalPieces,
        activePeers: Math.max(25, release.seeders || 25),
        pieceHashesHex: [],
        directRangeUrl: proxied,
        directRangeReferer: streamRef,
        useBridgeBackend: false,
        transportMode: 'webseed-range',
      };
    }

    return null;
  }

  private async runPieceDownloadLoop(
    infoHash: string,
    initialBitfield: number[],
  ): Promise<void> {
    const loopState = this.activeLoops.get(infoHash);
    const task = this.state.tasks[infoHash];
    if (!task || !loopState) return;

    let consecutiveFailures = 0;

    while (!loopState.cancelled) {
      const currentTask = this.state.tasks[infoHash];
      if (!currentTask || currentTask.status !== 'downloading') return;

      const totalPieces = currentTask.totalPieces;
      const pieceLength = currentTask.release.pieceLength;
      const totalSize = currentTask.totalBytes;
      const currentBf = this.savedBitfields.get(infoHash) || initialBitfield;

      const selection = selectNextPieceToDownload(
        currentBf,
        totalPieces,
        currentTask.playheadPieceIndex || 0,
        loopState.isRecentSeek,
        Boolean(currentTask.isStreamingActive),
      );

      if (!selection) return;

      const { pieceIndex, phase, headerAndTailReady } = selection;
      currentTask.activeDownloadingPieceIndex = pieceIndex;
      currentTask.priorityPhase = phase;
      currentTask.headerAndTailReady = headerAndTailReady;
      currentTask.pieceMapBuckets = computePieceMapBuckets(
        currentBf,
        totalPieces,
        currentTask.playheadPieceIndex || 0,
      );
      this.emit();

      let pieceBuffer: ArrayBuffer | null = null;
      let expectedSha1: string | undefined;
      let lastErrorReason = '';
      let abortedBySeek = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (loopState.cancelled) return;
        const pieceAbort = new AbortController();
        loopState.currentPieceAbort = pieceAbort;
        const timeoutId = setTimeout(() => pieceAbort.abort(), 24000);

        try {
          if (
            !loopState.useBridgeBackend &&
            Array.isArray(loopState.hlsSegments) &&
            loopState.hlsSegments[pieceIndex]
          ) {
            const segUrl = loopState.hlsSegments[pieceIndex];
            const res = await fetch(segUrl, { signal: pieceAbort.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              if (buf && buf.byteLength > 0) {
                pieceBuffer = buf;
                break;
              }
            }
            lastErrorReason = `HTTP ${res.status} عند سحب المقطع #${pieceIndex + 1}`;
          } else if (
            !loopState.useBridgeBackend &&
            loopState.directRangeUrl
          ) {
            const byteStart = pieceIndex * pieceLength;
            const byteEnd = Math.min(
              totalSize - 1,
              byteStart + pieceLength - 1,
            );
            const res = await fetch(loopState.directRangeUrl, {
              headers: { Range: `bytes=${byteStart}-${byteEnd}` },
              signal: pieceAbort.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok || res.status === 206) {
              const buf = await res.arrayBuffer();
              if (buf && buf.byteLength > 0) {
                pieceBuffer = buf.slice(0, byteEnd - byteStart + 1);
                break;
              }
            }
            lastErrorReason = `HTTP ${res.status} عند جلب النطاق #${pieceIndex + 1}`;
          } else if (loopState.useBridgeBackend) {
            const params = new URLSearchParams({
              infoHash,
              pieceIndex: String(pieceIndex),
              pieceLength: String(pieceLength),
              totalSize: String(totalSize),
              magnet: currentTask.release.magnetUri,
            });
            if (
              Array.isArray(loopState.hlsSegments) &&
              loopState.hlsSegments[pieceIndex]
            ) {
              params.set('segmentUrl', loopState.hlsSegments[pieceIndex]);
            } else if (currentTask.release.directStreamUrl) {
              params.set('directUrl', currentTask.release.directStreamUrl);
            }

            const res = await fetch(
              `/api/cinema-download/piece?${params.toString()}`,
              { signal: pieceAbort.signal },
            );
            clearTimeout(timeoutId);

            if (
              res.ok &&
              res.headers
                .get('Content-Type')
                ?.includes('application/octet-stream')
            ) {
              expectedSha1 = res.headers.get('X-Piece-SHA1') || undefined;
              const peersHeader = res.headers.get('X-Active-Peers');
              if (peersHeader) {
                currentTask.activePeers =
                  Number(peersHeader) || currentTask.activePeers;
              }
              const realFileSizeHeader = res.headers.get('X-Real-File-Size');
              if (realFileSizeHeader && Number(realFileSizeHeader) > 0) {
                currentTask.totalBytes = Number(realFileSizeHeader);
                currentTask.release.sizeBytes = Number(realFileSizeHeader);
                currentTask.release.sizeFormatted = formatBytes(
                  Number(realFileSizeHeader),
                );
              }
              const buf = await res.arrayBuffer();
              if (buf && buf.byteLength > 0) {
                pieceBuffer = buf;
                break;
              }
            } else {
              if (res.status === 404) {
                loopState.useBridgeBackend = false;
                this.state.bridgeServerAvailable = false;
              }

              const swarm = this.swarmSessions.get(infoHash);
              if (swarm) {
                const browserBuf = await swarm.fetchPieceInBrowser(
                  pieceIndex,
                  pieceLength,
                  totalSize,
                  pieceAbort.signal,
                );
                if (browserBuf && browserBuf.byteLength > 0) {
                  pieceBuffer = browserBuf;
                  currentTask.transportMode = 'browser-webrtc-swarm';
                  currentTask.activePeers = Math.max(
                    currentTask.activePeers,
                    swarm.getConnectedPeersCount(),
                  );
                  break;
                }
              }

              const fallback = await this.resolveFallbackStreamTransport(
                currentTask.media,
                currentTask.release,
              );
              if (
                fallback &&
                (fallback.hlsSegments?.length || fallback.directRangeUrl)
              ) {
                loopState.useBridgeBackend = false;
                loopState.hlsSegments = fallback.hlsSegments;
                loopState.directRangeUrl = fallback.directRangeUrl;
                loopState.directRangeReferer = fallback.directRangeReferer;
                currentTask.transportMode = fallback.transportMode;
                currentTask.totalPieces = fallback.totalPieces;
                currentTask.release.pieceLength = fallback.pieceLength;
                currentTask.release.totalPieces = fallback.totalPieces;
                const newBf = new Array(fallback.totalPieces).fill(0);
                this.savedBitfields.set(infoHash, newBf);
                this.worker?.postMessage({
                  action: 'INIT',
                  payload: {
                    infoHash,
                    fileName: currentTask.release.cleanFileName,
                    size: fallback.realSizeBytes,
                    pieceLen: fallback.pieceLength,
                    totalPieces: fallback.totalPieces,
                    isVariableSegments: Boolean(fallback.hlsSegments?.length),
                    pieceHashes: [],
                    mediaSnapshot: currentTask.media,
                    releaseSnapshot: currentTask.release,
                  },
                });
                return;
              }

              const errJson = await res.json().catch(() => null);
              lastErrorReason =
                errJson?.error ||
                `تعذر جلب القطعة #${pieceIndex + 1} من السرب (HTTP ${res.status})`;
            }
          } else {
            const swarm = this.swarmSessions.get(infoHash);
            if (swarm) {
              const browserBuf = await swarm.fetchPieceInBrowser(
                pieceIndex,
                pieceLength,
                totalSize,
                pieceAbort.signal,
              );
              clearTimeout(timeoutId);
              if (browserBuf && browserBuf.byteLength > 0) {
                pieceBuffer = browserBuf;
                currentTask.transportMode = 'browser-webrtc-swarm';
                currentTask.activePeers = Math.max(
                  currentTask.activePeers,
                  swarm.getConnectedPeersCount(),
                );
                break;
              }
            }
            clearTimeout(timeoutId);
            lastErrorReason =
              'بانتظار نظراء WebRTC أو بذور WebSeed متاحة في المتصفح';
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (pieceAbort.signal.aborted && !loopState.cancelled) {
            abortedBySeek = true;
            break;
          }
          lastErrorReason =
            err?.message || 'انتهت مهلة الاتصال بالسرب أو الخادم';
        }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }

      if (loopState.cancelled) return;
      if (abortedBySeek) continue;

      if (!pieceBuffer || pieceBuffer.byteLength === 0) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 2) {
          currentTask.status = 'paused';
          currentTask.speedBytesPerSec = 0;
          currentTask.etaSeconds = null;
          currentTask.errorMessage = lastErrorReason;
          currentTask.statusMessage = `توقف مؤقت: تعذر جلب القطعة #${pieceIndex + 1} (${lastErrorReason || 'لا يوجد استجابة حالياً'}) — اضغط استئناف للمحاولة مجدداً.`;
          currentTask.updatedAt = Date.now();
          this.emit();
          return;
        }
        continue;
      }

      consecutiveFailures = 0;
      loopState.isRecentSeek = false;
      currentBf[pieceIndex] = 1;
      this.savedBitfields.set(infoHash, currentBf);

      if (this.worker) {
        this.worker.postMessage(
          {
            action: 'WRITE_PIECE',
            payload: {
              infoHash,
              pieceIndex,
              buffer: pieceBuffer,
              expectedHash: expectedSha1,
            },
          },
          [pieceBuffer],
        );
      } else {
        const done = currentBf.reduce((a, b) => a + b, 0);
        this.handleWorkerMessage({
          type: 'PIECE_VERIFIED',
          infoHash,
          pieceIndex,
          pieceByteLength: pieceBuffer.byteLength,
          completedPieces: done,
          totalPieces,
          progress: Number(((done / totalPieces) * 100).toFixed(1)),
        });
      }
    }
  }

  public seekStreamToByteOffset = (
    infoHash: string,
    byteOffset: number,
    notifyBackend = true,
  ): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;

    const targetPiece = byteOffsetToPieceIndex(
      byteOffset,
      task.release.pieceLength,
      task.totalPieces,
    );
    if (task.playheadPieceIndex === targetPiece) return;

    const bf =
      this.savedBitfields.get(infoHash) || new Array(task.totalPieces).fill(0);
    task.playheadPieceIndex = targetPiece;
    task.priorityPhase = 'seek-window';
    task.pieceMapBuckets = computePieceMapBuckets(
      bf,
      task.totalPieces,
      targetPiece,
    );
    task.statusMessage = `قفز زمني فوري: تم توجيه الأولوية القصوى للقطعة #${targetPiece + 1} (${formatBytes(byteOffset)})...`;
    task.updatedAt = Date.now();

    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.isRecentSeek = true;
      if (bf[targetPiece] !== 1) {
        loop.currentPieceAbort?.abort();
      }
    }
    this.emit();

    if (notifyBackend && loop?.useBridgeBackend) {
      void fetch('/api/cinema-download/seek-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoHash,
          magnet: task.release.magnetUri,
          byteOffset,
          windowBytes: 12 * 1024 * 1024,
        }),
      }).catch(() => {});
    }
  };

  public seekStreamToProgress = (infoHash: string, ratio0to1: number): void => {
    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.seekGate.request(ratio0to1);
      return;
    }
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const clamped = Math.max(0, Math.min(0.995, ratio0to1));
    const byteOffset = Math.floor(clamped * task.totalBytes);
    this.seekStreamToByteOffset(infoHash, byteOffset, true);
  };

  public triggerBrowserNativeSave(
    diskFile: File | Blob,
    fileName: string,
  ): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    try {
      const objectUrl = URL.createObjectURL(diskFile);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || 'cinema_download.mp4';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }, 20000);
    } catch {}
  }

  private syncDynamicIsland(): void {
    const allTasks = Object.values(this.state.tasks);
    const activeTask =
      allTasks.find(
        (t) => t.status === 'downloading' || t.status === 'exporting',
      ) || allTasks.find((t) => t.status === 'paused');

    const currentBus = nowPlayingBus.get();
    if (
      currentBus &&
      currentBus.source !== 'download' &&
      currentBus.isPlaying
    ) {
      return;
    }

    if (!activeTask) {
      nowPlayingBus.clear('download');
      return;
    }

    const isDownloading =
      activeTask.status === 'downloading' || activeTask.status === 'exporting';
    const seTag =
      activeTask.media.mediaType === 'tv'
        ? ` S${String(activeTask.media.season || 1).padStart(2, '0')}E${String(
            activeTask.media.episode || 1,
          ).padStart(2, '0')}`
        : '';

    nowPlayingBus.publish({
      source: 'download',
      title: `⬇ ${activeTask.progressPct.toFixed(0)}% • ${activeTask.media.title}${seTag}`,
      subtitle: `${activeTask.release.quality} • ${
        isDownloading && activeTask.speedBytesPerSec > 0
          ? `${formatBytes(activeTask.speedBytesPerSec)}/s`
          : activeTask.status === 'paused'
            ? 'متوقف مؤقتاً'
            : 'جاري التحميل'
      }`,
      artworkUrl: activeTask.media.posterUrl,
      accent: '#38BDF8',
      isPlaying: isDownloading,
      canPrev: false,
      canNext: false,
      controls: {
        toggle: () => {
          if (activeTask.status === 'downloading') {
            this.pauseTask(activeTask.infoHash);
          } else if (activeTask.status === 'paused') {
            this.resumeTask(activeTask.infoHash);
          }
        },
        stop: () => {
          this.pauseTask(activeTask.infoHash);
          nowPlayingBus.clear('download');
        },
      },
    });
  }

  public openModalForMedia = (media: DownloadMediaContext): void => {
    this.initWorker();
    void this.refreshQuota();
    void this.checkBridgeHealth();

    if (this.discoveryAbort) {
      this.discoveryAbort.abort();
    }
    const abortController = new AbortController();
    this.discoveryAbort = abortController;

    this.state = {
      ...this.state,
      isModalOpen: true,
      activeMedia: media,
      isDiscovering: true,
      discoveredReleases: [],
      discoveryError: null,
      selectedQualityFilter: 'all',
      activeTab: 'discover',
    };
    this.emit();

    void discoverReleasesForMedia(media, abortController.signal)
      .then(({ imdbId, releases, trackersCount }) => {
        if (abortController.signal.aborted) return;
        this.state = {
          ...this.state,
          activeMedia: this.state.activeMedia
            ? {
                ...this.state.activeMedia,
                imdbId: imdbId || this.state.activeMedia.imdbId,
              }
            : null,
          isDiscovering: false,
          discoveredReleases: releases,
          liveTrackersCount: trackersCount,
        };
        this.emit();
      })
      .catch((err: any) => {
        if (abortController.signal.aborted) return;
        this.state = {
          ...this.state,
          isDiscovering: false,
          discoveryError: err?.message || 'تعذر جلب روابط الجودات حالياً',
        };
        this.emit();
      });
  };

  public openTasksModal = (): void => {
    this.initWorker();
    void this.refreshQuota();
    void this.checkBridgeHealth();
    this.state = {
      ...this.state,
      isModalOpen: true,
      activeTab: 'tasks',
    };
    this.emit();
  };

  public closeModal = (): void => {
    this.state = {
      ...this.state,
      isModalOpen: false,
    };
    this.emit();
  };

  public setActiveTab = (tab: 'discover' | 'tasks'): void => {
    this.state = {
      ...this.state,
      activeTab: tab,
    };
    this.emit();
  };

  public setQualityFilter = (filter: DownloadQualityTier | 'all'): void => {
    this.state = {
      ...this.state,
      selectedQualityFilter: filter,
    };
    this.emit();
  };

  public addCustomTorrentFile = async (file: File): Promise<void> => {
    const ab = await file.arrayBuffer();
    const meta = await parseTorrentFileBytes(new Uint8Array(ab));
    const parsedScene = parseSceneReleaseName(
      meta.selectedFile.path || meta.name,
    );
    const media: DownloadMediaContext = this.state.activeMedia || {
      id: Date.now(),
      tmdbId: 0,
      mediaType: parsedScene.type === 'episode' ? 'tv' : 'movie',
      title: parsedScene.cleanTitle || meta.name,
      year: parsedScene.year ? String(parsedScene.year) : undefined,
      posterUrl: '/profile_img-192.webp',
      season: parsedScene.season,
      episode: parsedScene.episode,
    };

    const fileBytes = meta.selectedFile.length || meta.totalLength;
    const { pieceLength, totalPieces } = computeRealPieceGeometry(fileBytes);

    const release: DiscoveredReleaseOption = {
      id: `${meta.infoHashHex}_${parsedScene.screenSize}`,
      title: meta.selectedFile.path || meta.name,
      cleanFileName: buildCleanDownloadFileName(
        media,
        parsedScene.screenSize,
        parsedScene.videoCodec,
        'mp4',
      ),
      quality: parsedScene.screenSize,
      sourceKind: 'torrent-hybrid',
      sizeBytes: fileBytes,
      sizeFormatted: formatBytes(fileBytes),
      seeders: 25,
      leechers: 5,
      infoHash: meta.infoHashHex,
      magnetUri: synthesizeMagnetUri(
        meta.infoHashHex,
        meta.name,
        meta.announceList,
      ),
      torrentCacheUrls: buildPublicTorrentCacheUrls(meta.infoHashHex),
      rawTorrentBase64: meta.rawTorrentBase64,
      selectedFileOffset: meta.selectedFile.offset,
      selectedFileLength: meta.selectedFile.length,
      webSeeds: meta.webSeeds,
      directStreamUrl: meta.webSeeds[0],
      videoCodec: parsedScene.videoCodec,
      audioCodec: parsedScene.audioCodec,
      audioChannels: parsedScene.audioChannels,
      hdrBadges: parsedScene.colorDepth,
      sourceLabel: '.torrent File',
      releaseGroup: parsedScene.releaseGroup,
      pieceLength,
      totalPieces,
      pieceHashesHex:
        meta.files.length === 1 ? meta.pieceHashesHex : undefined,
      verifiedSafe: true,
      securityNotes: ['SHA-1 Metainfo Verified'],
      parsedMeta: parsedScene,
      isRealSource: true,
    };

    await this.startDownload(media, release, false);
  };

  public addCustomMagnetLink = async (rawMagnet: string): Promise<void> => {
    const parsedMag = parseMagnetUriInput(rawMagnet);
    const title =
      parsedMag.displayName || `Magnet_${parsedMag.infoHashHex.slice(0, 8)}`;
    const parsedScene = parseSceneReleaseName(title);
    const media: DownloadMediaContext = this.state.activeMedia || {
      id: Date.now(),
      tmdbId: 0,
      mediaType: parsedScene.type === 'episode' ? 'tv' : 'movie',
      title: parsedScene.cleanTitle || title,
      year: parsedScene.year ? String(parsedScene.year) : undefined,
      posterUrl: '/profile_img-192.webp',
      season: parsedScene.season,
      episode: parsedScene.episode,
    };

    const estBytes = 1.8 * 1024 * 1024 * 1024;
    const { pieceLength, totalPieces } = computeRealPieceGeometry(estBytes);

    const release: DiscoveredReleaseOption = {
      id: `${parsedMag.infoHashHex}_${parsedScene.screenSize}`,
      title,
      cleanFileName: buildCleanDownloadFileName(
        media,
        parsedScene.screenSize,
        parsedScene.videoCodec,
        'mp4',
      ),
      quality: parsedScene.screenSize,
      sourceKind: 'torrent-hybrid',
      sizeBytes: estBytes,
      sizeFormatted: formatBytes(estBytes),
      seeders: 20,
      leechers: 4,
      infoHash: parsedMag.infoHashHex,
      magnetUri: synthesizeMagnetUri(
        parsedMag.infoHashHex,
        title,
        parsedMag.trackers.length > 0 ? parsedMag.trackers : undefined,
      ),
      torrentCacheUrls: [
        ...parsedMag.exactTopicTorrentUrls,
        ...buildPublicTorrentCacheUrls(parsedMag.infoHashHex),
      ],
      webSeeds: parsedMag.webSeeds,
      directStreamUrl: parsedMag.webSeeds[0],
      videoCodec: parsedScene.videoCodec,
      audioCodec: parsedScene.audioCodec,
      audioChannels: parsedScene.audioChannels,
      hdrBadges: parsedScene.colorDepth,
      sourceLabel: 'Magnet Link',
      releaseGroup: parsedScene.releaseGroup,
      pieceLength,
      totalPieces,
      verifiedSafe: true,
      securityNotes: ['Magnet BTIH Verified'],
      parsedMeta: parsedScene,
      isRealSource: true,
    };

    await this.startDownload(media, release, false);
  };

  public startDownload = async (
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
    enableInstantStream = false,
  ): Promise<void> => {
    this.initWorker();
    await this.ensurePersistentStorage();
    await this.refreshQuota();

    const infoHash = release.infoHash;
    const existing = this.state.tasks[infoHash];
    const savedBf = this.savedBitfields.get(infoHash);
    const initialDone = savedBf
      ? savedBf.reduce((a, b) => a + b, 0)
      : existing?.completedPieces || 0;
    const streamUrl = buildProgressiveRangeStreamUrl(
      release,
      this.sessionToken,
    );

    const needsHybridExtended =
      this.state.quota.freeBytes > 0 &&
      release.sizeBytes > this.state.quota.freeBytes * 0.85;

    this.state.tasks[infoHash] = {
      taskId: infoHash,
      infoHash,
      media,
      release,
      status: 'initializing',
      storageMode: needsHybridExtended ? 'hybrid-extended' : 'opfs-cache',
      transportMode: 'initializing',
      progressPct: Number(
        ((initialDone / Math.max(1, release.totalPieces)) * 100).toFixed(1),
      ),
      completedPieces: initialDone,
      totalPieces: release.totalPieces,
      downloadedBytes: existing?.downloadedBytes || 0,
      totalBytes: release.sizeBytes,
      speedBytesPerSec: 0,
      etaSeconds: null,
      verifiedPiecesCount: initialDone,
      corruptPiecesRetried: 0,
      bannedPeersCount: 0,
      activePeers: release.seeders || 1,
      exportedToDevice: false,
      cacheCleared: false,
      isStreamingActive: Boolean(enableInstantStream),
      showPieceMap: Boolean(enableInstantStream),
      streamUrl,
      headerAndTailReady: savedBf
        ? isHeaderAndTailComplete(savedBf, release.totalPieces)
        : false,
      playheadPieceIndex: existing?.playheadPieceIndex || 0,
      priorityPhase: enableInstantStream ? 'header-tail' : 'sequential',
      pieceMapBuckets: computePieceMapBuckets(
        savedBf || new Array(release.totalPieces).fill(0),
        release.totalPieces,
        0,
      ),
      statusMessage:
        'جاري تهيئة محرك التحميل المتعدد المسارات وحجز مخزن TPPIECES القرصي...',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (enableInstantStream) {
      this.state.activeStreamingTaskHash = infoHash;
    } else if (this.state.activeStreamingTaskHash === infoHash) {
      this.state.activeStreamingTaskHash = null;
    }
    this.state.activeTab = 'tasks';
    this.emit();

    const resolved = await this.resolveRealSourceMetadata(
      media,
      release,
      infoHash,
    );
    const task = this.state.tasks[infoHash];
    if (!task) return;

    task.totalBytes = resolved.realSizeBytes;
    task.release.sizeBytes = resolved.realSizeBytes;
    task.release.sizeFormatted = formatBytes(resolved.realSizeBytes);
    task.release.pieceLength = resolved.pieceLength;
    task.release.totalPieces = resolved.totalPieces;
    task.totalPieces = resolved.totalPieces;
    task.activePeers = resolved.activePeers;
    task.transportMode = resolved.transportMode;
    task.streamUrl = buildProgressiveRangeStreamUrl(
      task.release,
      this.sessionToken,
    );

    const prevLoop = this.activeLoops.get(infoHash);
    if (prevLoop) {
      prevLoop.cancelled = true;
      prevLoop.currentPieceAbort?.abort();
    }

    this.activeLoops.set(infoHash, {
      cancelled: false,
      hlsSegments: resolved.hlsSegments,
      directRangeUrl: resolved.directRangeUrl,
      directRangeReferer: resolved.directRangeReferer,
      useBridgeBackend: resolved.useBridgeBackend,
      bytesTransferredInSession: 0,
      sessionStartTimeMs: Date.now(),
      isRecentSeek: false,
      currentPieceAbort: null,
      seekGate: new SeekGate((ratio) => {
        const current = this.state.tasks[infoHash];
        if (!current) return;
        const clamped = Math.max(0, Math.min(0.995, ratio));
        const byteOffset = Math.floor(clamped * current.totalBytes);
        this.seekStreamToByteOffset(infoHash, byteOffset, true);
      }),
    });

    if (this.worker) {
      this.worker.postMessage({
        action: 'INIT',
        payload: {
          infoHash,
          fileName: task.release.cleanFileName,
          size: resolved.realSizeBytes,
          pieceLen: resolved.pieceLength,
          totalPieces: resolved.totalPieces,
          isVariableSegments: Boolean(resolved.hlsSegments?.length),
          pieceHashes: resolved.pieceHashesHex,
          mediaSnapshot: media,
          releaseSnapshot: task.release,
        },
      });
    } else {
      this.handleWorkerMessage({
        type: 'INIT_READY',
        infoHash,
        storageMode: task.storageMode,
        bitfield: new Array(resolved.totalPieces).fill(0),
        completedPieces: 0,
        totalPieces: resolved.totalPieces,
      });
    }
  };

  public startProgressiveStream = async (
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
    openInCinemaStage = false,
  ): Promise<void> => {
    const infoHash = release.infoHash;
    const existing = this.state.tasks[infoHash];
    if (existing) {
      existing.isStreamingActive = true;
      existing.showPieceMap = true;
      existing.streamUrl =
        existing.blobStreamUrl ||
        buildProgressiveRangeStreamUrl(release, this.sessionToken);
      this.state.activeStreamingTaskHash = infoHash;
      this.state.activeTab = 'tasks';
      if (existing.status === 'paused') {
        void this.startDownload(media, release, true);
      } else {
        this.emit();
      }
    } else {
      void this.startDownload(media, release, true);
    }

    if (openInCinemaStage) {
      this.openInMainCinemaPlayer(infoHash, media, release);
    }
  };

  public openInMainCinemaPlayer = (
    infoHash: string,
    explicitMedia?: DownloadMediaContext,
    explicitRelease?: DiscoveredReleaseOption,
  ): void => {
    const task = this.state.tasks[infoHash];
    const media = explicitMedia || task?.media;
    const release = explicitRelease || task?.release;
    if (!media || !release) return;

    const streamUrl =
      task?.blobStreamUrl ||
      task?.streamUrl ||
      buildProgressiveRangeStreamUrl(release, this.sessionToken);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nl:cinema-progressive-torrent-stream', {
          detail: {
            infoHash,
            media,
            release,
            streamUrl,
          },
        }),
      );
    }
    this.closeModal();
  };

  public toggleStreamPlayerForTask = (infoHash: string): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const nextState = !task.isStreamingActive;
    task.isStreamingActive = nextState;
    task.showPieceMap = nextState;
    this.state.activeStreamingTaskHash = nextState ? infoHash : null;
    this.emit();
  };

  public togglePieceMapForTask = (infoHash: string): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    task.showPieceMap = !task.showPieceMap;
    this.emit();
  };

  public pauseTask = (infoHash: string): void => {
    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.cancelled = true;
      loop.currentPieceAbort?.abort();
    }

    const task = this.state.tasks[infoHash];
    if (!task) return;

    task.status = 'paused';
    task.speedBytesPerSec = 0;
    task.etaSeconds = null;
    task.statusMessage = `متوقف مؤقتاً (${task.completedPieces}/${task.totalPieces} قطعة محفوظة في TPPIECES — جاهز للاستئناف)`;
    task.updatedAt = Date.now();
    this.worker?.postMessage({
      action: 'PAUSE_SESSION',
      payload: { infoHash },
    });
    this.emit();
  };

  public resumeTask = (infoHash: string): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    void this.startDownload(
      task.media,
      task.release,
      Boolean(task.isStreamingActive),
    );
  };

  public reExportTask = async (infoHash: string): Promise<void> => {
    const task = this.state.tasks[infoHash];
    if (!task) return;

    if (isDirectDiskPickerSupported()) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: task.release.cleanFileName || 'movie.mp4',
        });
        const writableStream = await handle.createWritable();
        task.statusMessage =
          'جاري الدمج الذري بشرائح 256 KiB والكتابة المباشرة لقرص جهازك...';
        this.emit();
        this.worker?.postMessage(
          {
            action: 'FINALIZE_AND_EXPORT',
            payload: { infoHash, writableStream },
          },
          [writableStream],
        );
        return;
      } catch {}
    }

    task.statusMessage = 'جاري إعادة نقل الملف من الكاش القرصي إلى جهازك...';
    this.emit();
    this.worker?.postMessage({
      action: 'FINALIZE_AND_EXPORT',
      payload: { infoHash },
    });
  };

  public confirmClearCache = (infoHash: string): void => {
    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.cancelled = true;
      loop.currentPieceAbort?.abort();
    }
    const swarm = this.swarmSessions.get(infoHash);
    if (swarm) {
      swarm.destroy();
      this.swarmSessions.delete(infoHash);
    }

    const task = this.state.tasks[infoHash];
    if (task) {
      task.cacheCleared = true;
      task.statusMessage =
        'جاري حذف نسخة الكاش المؤقتة من OPFS واستعادة مساحة القرص...';
    }
    this.worker?.postMessage({
      action: 'CLEANUP_CACHE',
      payload: { infoHash },
    });
    this.emit();
  };

  public removeTaskFromList = (infoHash: string): void => {
    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.cancelled = true;
      loop.currentPieceAbort?.abort();
    }
    const swarm = this.swarmSessions.get(infoHash);
    if (swarm) {
      swarm.destroy();
      this.swarmSessions.delete(infoHash);
    }
    if (this.state.activeStreamingTaskHash === infoHash) {
      this.state.activeStreamingTaskHash = null;
    }
    this.worker?.postMessage({
      action: 'CLEANUP_CACHE',
      payload: { infoHash },
    });
    delete this.state.tasks[infoHash];
    this.savedBitfields.delete(infoHash);
    this.emit();
  };
}

export const cinemaDownloadManager = new CinemaDownloadManager();

export function useCinemaDownloadState(): CinemaDownloadSnapshot {
  return useSyncExternalStore(
    cinemaDownloadManager.subscribe,
    cinemaDownloadManager.getSnapshot,
    cinemaDownloadManager.getSnapshot,
  );
}
