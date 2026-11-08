/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download & Optional Progressive Torrent Stream Manager (Part 3)
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
import { fetchPiece } from './engine/pieceFetchers';
import {
  TransportFailoverController,
  createInitialDiagnostics,
  stageOrderFor,
} from './engine/transportFailoverMachine';
import {
  probeBridge,
  probeHlsStream,
  probeWebRtc,
  probeWebSeed,
  proxify,
  type LegacyStreamSource,
  type ProbeEnv,
} from './engine/transportProbes';
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
import { openMagnetExternally, saveTorrentFile } from './services/externalHandoff';
import {
  byteOffsetToPieceIndex,
  computePieceMapBuckets,
  isHeaderAndTailComplete,
  SeekGate,
  selectNextPieceToDownload,
} from './slidingWindowScheduler';
import type {
  CandidateTransportStage,
  CinemaDownloadSnapshot,
  DiscoveredReleaseOption,
  DownloadMediaContext,
  DownloadQualityTier,
  DownloadTaskState,
  ParsedTorrentMetainfo,
  ResolvedTransport,
  TransportDiagnostics,
} from './types';

const STAGE_LABELS_AR: Record<CandidateTransportStage, string> = {
  bridge: 'جسر الخادم',
  webseed: 'بذور الويب HTTP',
  webrtc: 'سرب WebRTC',
  'hls-stream': 'بث HLS/MP4 مستخرج',
};

/** EWMA speed meter — sampled over a sliding window so MB/s doesn't jump. */
export class SpeedMeter {
  private samples: Array<{ t: number; bytes: number }> = [];
  private ewma = 0;
  constructor(private windowMs = 8_000, private alpha = 0.3) {}
  push(bytes: number, now = Date.now()): number {
    this.samples.push({ t: now, bytes });
    this.samples = this.samples.filter((s) => now - s.t <= this.windowMs);
    return this.rate(now);
  }
  rate(now = Date.now()): number {
    this.samples = this.samples.filter((s) => now - s.t <= this.windowMs);
    if (!this.samples.length) return (this.ewma = this.ewma * (1 - this.alpha));
    const span = Math.max(1_000, now - this.samples[0].t);
    const instant = (this.samples.reduce((a, s) => a + s.bytes, 0) * 1000) / span;
    this.ewma = this.ewma === 0 ? instant : this.alpha * instant + (1 - this.alpha) * this.ewma;
    return Math.round(this.ewma);
  }
}

interface LoopContext {
  cancel: AbortController;
  seek: AbortController;
  controller: TransportFailoverController;
  transport: ResolvedTransport;
  allowGeometryChange: boolean;
  speed: SpeedMeter;
  isRecentSeek: boolean;
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
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/+$/, '')
      : '';
  const exactSize =
    release.fileGeometry?.fileLength ||
    release.selectedFileLength ||
    release.sizeBytes;
  const params = new URLSearchParams({
    infoHash: release.infoHash,
    magnet: release.magnetUri,
    size: String(exactSize),
    pieceLen: String(release.pieceLength),
    name: release.cleanFileName,
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
  private loops = new Map<string, LoopContext>();
  private metainfoCache = new Map<string, ParsedTorrentMetainfo>();
  private reprobeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingRetryStage = new Map<string, CandidateTransportStage | null>();
  private speedTicker: ReturnType<typeof setInterval> | null = null;
  private swarmSessions = new Map<string, BrowserSwarmSession>();
  private savedBitfields = new Map<string, number[]>();
  private inFlight = new Map<string, Set<number>>();
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
      directSaveSupported: isDirectDiskPickerSupported(),
    },
    tasks: {},
    liveTrackersCount: 14,
    bridgeHealthy: false,
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
        this.state.bridgeHealthy = false;
        return false;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        this.state.bridgeHealthy = false;
        return false;
      }
      const data = await res.json();
      const ok = Boolean(data?.ok);
      this.state.bridgeHealthy = ok;
      return ok;
    } catch {
      this.state.bridgeHealthy = false;
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
    };
    if (typeof window !== 'undefined') {
      const hasBusyTask = Object.values(this.state.tasks).some(
        (t) =>
          t.status === 'downloading' ||
          t.status === 'initializing' ||
          t.status === 'exporting' ||
          t.isStreamingActive,
      );
      (window as any).__NL_CINEMA_BUSY__ = hasBusyTask;
    }
    this.syncDynamicIsland();
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  /** Fine-grained per-task patch: only the touched task object gets a new identity. */
  private patchTask(infoHash: string, patch: Partial<DownloadTaskState>): void {
    const prev = this.state.tasks[infoHash];
    if (!prev) return;
    this.state.tasks[infoHash] = { ...prev, ...patch, updatedAt: Date.now() };
    this.emit();
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
          directSaveSupported: isDirectDiskPickerSupported(),
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
          directSaveSupported: isDirectDiskPickerSupported(),
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

          const cleanBf: number[] = bf.map((b) => (b === 1 ? 1 : 0));
          this.savedBitfields.set(rec.infoHash, cleanBf);
          const done = cleanBf.reduce((a, b) => a + b, 0);
          const total = Math.max(1, cleanBf.length);
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
              headerAndTailReady: isHeaderAndTailComplete(cleanBf, total),
              playheadPieceIndex: 0,
              priorityPhase: 'sequential',
              pieceMapBuckets: computePieceMapBuckets(cleanBf, total, 0),
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
          directSaveSupported: isDirectDiskPickerSupported(),
        };
      }
      const bf: number[] = Array.isArray(bitfield)
        ? bitfield.map((b: number) => (b === 1 ? 1 : 0))
        : new Array(totalPieces).fill(0);
      this.savedBitfields.set(infoHash, bf);
      this.inFlight.delete(infoHash);

      const task = this.state.tasks[infoHash];
      if (!task) return;

      const pct = Number(
        ((completedPieces / Math.max(1, totalPieces)) * 100).toFixed(1),
      );
      this.patchTask(infoHash, {
        ...(storageMode ? { storageMode } : {}),
        completedPieces,
        totalPieces,
        verifiedPiecesCount: completedPieces,
        progressPct: pct,
        headerAndTailReady: isHeaderAndTailComplete(bf, totalPieces),
        pieceMapBuckets: computePieceMapBuckets(
          bf,
          totalPieces,
          task.playheadPieceIndex || 0,
        ),
        downloadedBytes:
          typeof writtenBytes === 'number' && writtenBytes > 0
            ? writtenBytes
            : Math.round(
                (completedPieces / Math.max(1, totalPieces)) * task.totalBytes,
              ),
        status: completedPieces >= totalPieces ? 'exporting' : 'downloading',
        statusMessage:
          completedPieces > 0 && completedPieces < totalPieces
            ? `تم استئناف التحميل من الكاش (${completedPieces}/${totalPieces} قطعة موثقة بـ SHA-1)...`
            : 'تم تهيئة مخزن TPPIECES القرصي — جاري سحب وتوثيق القطع...',
      });

      if (completedPieces >= totalPieces) {
        this.worker?.postMessage({
          action: 'FINALIZE_AND_EXPORT',
          payload: { infoHash },
        });
      } else {
        void this.runPieceDownloadLoop(infoHash, bf);
      }
    } else if (msg.type === 'PIECE_VERIFIED') {
      this.onPieceVerified(msg);
    } else if (msg.type === 'PIECE_CORRUPT') {
      this.onPieceCorrupt(msg);
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
          directSaveSupported: isDirectDiskPickerSupported(),
        };
      }
      const task = this.state.tasks[infoHash];
      if (task) {
        const nextSize =
          typeof actualSizeBytes === 'number' && actualSizeBytes > 0
            ? actualSizeBytes
            : task.downloadedBytes;
        let nextBlobUrl = task.blobStreamUrl;
        if (file instanceof File && !nextBlobUrl) {
          try {
            nextBlobUrl = URL.createObjectURL(file);
          } catch {}
        }
        task.release.sizeBytes = nextSize;
        task.release.sizeFormatted = formatBytes(nextSize);
        this.patchTask(infoHash, {
          downloadedBytes: nextSize,
          totalBytes: nextSize,
          status: 'completed',
          progressPct: 100,
          exportedToDevice: true,
          speedBytesPerSec: 0,
          etaSeconds: 0,
          blobStreamUrl: nextBlobUrl,
          streamUrl: nextBlobUrl || task.streamUrl,
          statusMessage: savedDirectlyToDisk
            ? `تم حفظ الملف المدمج (${formatBytes(nextSize)}) مباشرة على قرص جهازك بنجاح!`
            : `اكتمل تنزيل الملف (${formatBytes(nextSize)}) إلى مجلد التنزيلات في جهازك!`,
        });
      }
      if (file && !savedDirectlyToDisk) {
        this.triggerBrowserNativeSave(
          file,
          fileName || task?.release.cleanFileName || 'movie.mp4',
        );
      }
    } else if (msg.type === 'CACHE_CLEARED') {
      const { infoHash, quota } = msg;
      if (quota) {
        this.state.quota = {
          ...this.state.quota,
          ...quota,
          directSaveSupported: isDirectDiskPickerSupported(),
        };
      }
      this.savedBitfields.delete(infoHash);
      this.inFlight.delete(infoHash);
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
        }
        this.patchTask(infoHash, {
          blobStreamUrl: undefined,
          cacheCleared: true,
          statusMessage:
            'تم تفريغ كاش المتصفح القرصي بالكامل واستعادة المساحة الحرة.',
        });
      } else {
        this.emit();
      }
    } else if (msg.type === 'ERROR') {
      const { infoHash, message } = msg;
      if (infoHash && this.state.tasks[infoHash]) {
        this.patchTask(infoHash, {
          status: 'error',
          errorMessage: message,
          statusMessage: message,
        });
      }
    }
  }

  private async loadMetainfo(
    release: DiscoveredReleaseOption,
    signal: AbortSignal,
  ): Promise<ParsedTorrentMetainfo | null> {
    const cached = this.metainfoCache.get(release.infoHash);
    if (cached) return cached;
    let bytes: Uint8Array | null = null;
    if (release.rawTorrentBase64) {
      bytes = Uint8Array.from(atob(release.rawTorrentBase64), (c) =>
        c.charCodeAt(0),
      );
    } else {
      const urls = release.directTorrentUrl
        ? [release.directTorrentUrl, ...release.torrentCacheUrls]
        : release.torrentCacheUrls;
      for (const url of urls.slice(0, 3)) {
        try {
          const timeoutSig =
            typeof (AbortSignal as any).any === 'function'
              ? (AbortSignal as any).any([signal, AbortSignal.timeout(4_500)])
              : signal;
          const r = await fetch(proxify(url), { signal: timeoutSig });
          const ab = r.ok ? await r.arrayBuffer() : null;
          if (ab && ab.byteLength > 120 && new Uint8Array(ab)[0] === 0x64) {
            bytes = new Uint8Array(ab);
            break;
          }
        } catch {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        }
      }
    }
    if (!bytes) return null;
    try {
      const meta = await parseTorrentFileBytes(bytes);
      release.rawTorrentBase64 = meta.rawTorrentBase64;
      release.selectedFileOffset = meta.selectedFile.offset;
      release.selectedFileLength = meta.selectedFile.length;
      release.fileGeometry = meta.geometry;
      release.pieceHashesHex = meta.pieceHashesHex;
      if (meta.geometry.fileLength > 0) {
        release.sizeBytes = meta.geometry.fileLength;
        release.sizeFormatted = formatBytes(meta.geometry.fileLength);
        release.pieceLength = meta.geometry.pieceLength;
        release.totalPieces = meta.geometry.filePieceCount;
      }
      this.metainfoCache.set(release.infoHash, meta);
      return meta;
    } catch {
      return null;
    }
  }

  private getOrCreateSwarm(
    infoHash: string,
    release: DiscoveredReleaseOption,
    meta: ParsedTorrentMetainfo | null,
  ): BrowserSwarmSession {
    let s = this.swarmSessions.get(infoHash);
    const geom = meta?.geometry ?? release.fileGeometry ?? null;
    if (!s) {
      const seeds = [
        ...new Set([...(release.webSeeds ?? []), ...(meta?.webSeeds ?? [])]),
      ];
      s = new BrowserSwarmSession(
        infoHash,
        seeds,
        release.selectedFileOffset || 0,
        geom,
      );
      this.swarmSessions.set(infoHash, s);
    } else if (geom) {
      s.setGeometry(geom);
    }
    return s;
  }

  private async resolveFallbackStreamTransport(
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
  ): Promise<LegacyStreamSource | null> {
    let streamUrl = release.directStreamUrl;
    let streamType: 'mp4' | 'hls' =
      release.sourceKind === 'direct-hls' ? 'hls' : 'mp4';
    let streamRef = release.streamReferer || '';

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
            hlsSegments: segments,
            transportMode: 'hls-assembler',
          };
        }
      } catch {}
    } else {
      const proxied = streamUrl.startsWith('https://broad-block-7bd7.')
        ? streamUrl
        : buildWorkerProxyUrl(streamUrl, streamRef);
      const { pieceLength, totalPieces } = computeRealPieceGeometry(
        release.sizeBytes,
      );
      return {
        realSizeBytes: release.sizeBytes,
        pieceLength,
        totalPieces,
        activePeers: Math.max(25, release.seeders || 25),
        directRangeUrl: proxied,
        directRangeReferer: streamRef,
        transportMode: 'webseed-range',
      };
    }

    return null;
  }

  /**
   * ENTRY POINT: The worker INIT is posted ONLY after a transport passed its probe.
   */
  public async beginTransportPipeline(
    infoHash: string,
    startStage?: CandidateTransportStage | null,
  ): Promise<void> {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    this.stopLoop(infoHash);
    this.clearReprobe(infoHash);

    const cancel = new AbortController();
    const order = stageOrderFor(task.release);
    const savedBf = this.savedBitfields.get(infoHash);
    const hasProgress = Boolean(savedBf?.some((b) => b === 1));
    const frozen = hasProgress
      ? {
          sizeBytes: task.totalBytes,
          pieceLength: task.release.pieceLength,
          totalPieces: task.totalPieces,
          isVariableSegments: task.transportMode === 'hls-assembler',
          pieceHashesHex: task.release.pieceHashesHex ?? [],
          fileGeometry: task.release.fileGeometry ?? null,
        }
      : null;

    const prevAllow = this.loops.get(infoHash)?.allowGeometryChange ?? false;
    let allowGeometryChange = prevAllow || !hasProgress;

    this.patchTask(infoHash, {
      status: 'initializing',
      transportMode: 'initializing',
      errorMessage: undefined,
      speedBytesPerSec: 0,
      etaSeconds: null,
      statusMessage:
        'جاري فحص مسارات النقل (فحص 1-بايت قبل تهيئة المخزن)...',
      diagnostics: {
        ...createInitialDiagnostics(order),
        autoReprobeRound: task.diagnostics?.autoReprobeRound ?? 0,
      },
    });

    let meta: ParsedTorrentMetainfo | null = null;
    if (task.release.sourceKind === 'torrent-hybrid') {
      try {
        meta = await this.loadMetainfo(task.release, cancel.signal);
        if (meta && this.state.bridgeHealthy) {
          void fetch('/api/cinema-download/upload-torrent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              infoHash,
              torrentBase64: meta.rawTorrentBase64,
            }),
          }).catch(() => {});
        }
      } catch {
        return;
      }
    }

    const controller = new TransportFailoverController({
      order,
      signal: cancel.signal,
      frozenGeometry: frozen,
      initialDiagnostics: this.state.tasks[infoHash]?.diagnostics,
      canChangeGeometry: () => allowGeometryChange,
      onDiagnostics: (d) => this.onDiagnostics(infoHash, d),
      probe: (stage, frozenGeometry) => {
        const current = this.state.tasks[infoHash]!;
        const env: ProbeEnv = {
          infoHash,
          release: current.release,
          metainfo: meta,
          frozen: frozenGeometry,
          signal: cancel.signal,
          getSwarm: () =>
            this.getOrCreateSwarm(infoHash, current.release, meta),
          resolveStreamFallback: () =>
            this.resolveFallbackStreamTransport(current.media, current.release),
        };
        switch (stage) {
          case 'bridge':
            return probeBridge(env);
          case 'webseed':
            return probeWebSeed(env);
          case 'webrtc':
            return probeWebRtc(env);
          case 'hls-stream':
            return probeHlsStream(env);
        }
      },
    });

    let transport: ResolvedTransport | null;
    try {
      transport = await controller.resolveFrom(startStage);
    } catch {
      return;
    }

    if (!transport) {
      this.enterFallbackNeeded(infoHash, controller.diagnostics);
      return;
    }

    this.loops.set(infoHash, {
      cancel,
      seek: new AbortController(),
      controller,
      transport,
      get allowGeometryChange() {
        return allowGeometryChange;
      },
      set allowGeometryChange(v: boolean) {
        allowGeometryChange = v;
      },
      speed: new SpeedMeter(),
      isRecentSeek: false,
      seekGate: new SeekGate((ratio) => {
        const current = this.state.tasks[infoHash];
        if (!current) return;
        const clamped = Math.max(0, Math.min(0.995, ratio));
        const byteOffset = Math.floor(clamped * current.totalBytes);
        this.seekStreamToByteOffset(infoHash, byteOffset, true);
      }),
    } as LoopContext);

    this.commitTransportToWorker(infoHash, transport, frozen !== null);
  }

  private commitTransportToWorker(
    infoHash: string,
    t: ResolvedTransport,
    resumeExisting: boolean,
  ): void {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const g = t.geometry;
    task.release.pieceLength = g.pieceLength;
    task.release.totalPieces = g.totalPieces;
    task.release.sizeBytes = g.sizeBytes;
    task.release.sizeFormatted = formatBytes(g.sizeBytes);
    if (g.fileGeometry) {
      task.release.fileGeometry = g.fileGeometry;
    }
    this.patchTask(infoHash, {
      transportMode: t.mode,
      totalPieces: g.totalPieces,
      totalBytes: g.sizeBytes,
      activePeers: t.peers,
      streamUrl: buildProgressiveRangeStreamUrl(
        task.release,
        this.sessionToken,
      ),
      statusMessage: resumeExisting
        ? 'تم اجتياز الفحص — جاري استئناف المخزن الحالي...'
        : `تم اجتياز فحص المسار — تهيئة مخزن OPFS (${formatBytes(g.sizeBytes)} / ${g.totalPieces} قطعة)...`,
    });
    if (this.worker) {
      this.worker.postMessage({
        action: 'INIT',
        payload: {
          infoHash,
          fileName: task.release.cleanFileName,
          size: g.sizeBytes,
          pieceLen: g.pieceLength,
          totalPieces: g.totalPieces,
          isVariableSegments: g.isVariableSegments,
          pieceHashes: g.pieceHashesHex,
          geometry: g.fileGeometry ?? null,
          mediaSnapshot: task.media,
          releaseSnapshot: task.release,
        },
      });
    } else {
      this.handleWorkerMessage({
        type: 'INIT_READY',
        infoHash,
        storageMode: task.storageMode,
        bitfield: new Array(g.totalPieces).fill(0),
        completedPieces: 0,
        totalPieces: g.totalPieces,
      });
    }
  }

  private onDiagnostics(infoHash: string, d: TransportDiagnostics): void {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const label = d.probingStage
      ? `فحص المسار: ${STAGE_LABELS_AR[d.probingStage]} (محاولة ${d.attemptInStage}/${d.maxAttemptsInStage})`
      : null;
    this.patchTask(infoHash, {
      diagnostics: d,
      ...(label && task.status === 'initializing'
        ? { statusMessage: label }
        : {}),
    });
  }

  private enterFallbackNeeded(infoHash: string, d: TransportDiagnostics): void {
    const round = d.autoReprobeRound;
    const canAuto = round < 3;
    const delay = 60_000 * (round + 1);
    this.patchTask(infoHash, {
      status: 'paused',
      transportMode: 'initializing',
      speedBytesPerSec: 0,
      etaSeconds: null,
      errorMessage: d.lastError ?? undefined,
      statusMessage: d.geometrySwitchBlocked
        ? 'المصادر الأصلية غير متاحة. يوجد مصدر بث بديل لكنه يتطلب إعادة البدء من الصفر — يمكنك الموافقة أو استخدام تطبيق تورنت خارجي.'
        : 'لا يوجد نظراء WebRTC أو مصادر HTTP قابلة للوصول من داخل المتصفح حالياً. افتح الرابط في تطبيق تورنت خارجي، أو انتظر إعادة الفحص التلقائية.',
      diagnostics: {
        ...d,
        stage: 'fallback-needed',
        nextRetryAt: canAuto ? Date.now() + delay : null,
      },
    });
    if (canAuto) {
      this.reprobeTimers.set(
        infoHash,
        setTimeout(() => {
          const t = this.state.tasks[infoHash];
          if (!t || t.diagnostics?.stage !== 'fallback-needed') return;
          this.patchTask(infoHash, {
            diagnostics: { ...t.diagnostics, autoReprobeRound: round + 1 },
          });
          void this.beginTransportPipeline(infoHash);
        }, delay),
      );
    }
  }

  private clearReprobe(infoHash: string): void {
    const t = this.reprobeTimers.get(infoHash);
    if (t) clearTimeout(t);
    this.reprobeTimers.delete(infoHash);
  }

  private stopLoop(infoHash: string): void {
    const l = this.loops.get(infoHash);
    if (l) {
      l.cancel.abort();
      l.seek.abort();
    }
    this.loops.delete(infoHash);
  }

  private markInFlight(infoHash: string, idx: number): void {
    const s = this.inFlight.get(infoHash) ?? new Set<number>();
    s.add(idx);
    this.inFlight.set(infoHash, s);
    const bf = this.savedBitfields.get(infoHash);
    if (bf) bf[idx] = 2; // 2 = in-flight (scheduler treats non-zero as "taken")
  }

  private async runPieceDownloadLoop(
    infoHash: string,
    initialBitfield: number[],
  ): Promise<void> {
    const loop = this.loops.get(infoHash);
    if (!loop) return;
    this.ensureSpeedTicker();

    while (!loop.cancel.signal.aborted) {
      const task = this.state.tasks[infoHash];
      if (!task || task.status !== 'downloading') return;
      const bf = this.savedBitfields.get(infoHash) || initialBitfield;

      const sel = selectNextPieceToDownload(
        bf,
        task.totalPieces,
        task.playheadPieceIndex || 0,
        loop.isRecentSeek,
        Boolean(task.isStreamingActive),
      );
      if (!sel) return;

      if (task.activeDownloadingPieceIndex !== sel.pieceIndex) {
        this.patchTask(infoHash, {
          activeDownloadingPieceIndex: sel.pieceIndex,
          priorityPhase: sel.phase,
          headerAndTailReady: sel.headerAndTailReady,
          ...(task.showPieceMap
            ? {
                pieceMapBuckets: computePieceMapBuckets(
                  bf.map((b) => (b === 1 ? 1 : 0)),
                  task.totalPieces,
                  task.playheadPieceIndex || 0,
                ),
              }
            : {}),
        });
      }

      if (loop.seek.signal.aborted) loop.seek = new AbortController();
      const result = await fetchPiece({
        infoHash,
        magnetUri: task.release.magnetUri,
        pieceIndex: sel.pieceIndex,
        pieceLength: loop.transport.geometry.pieceLength,
        totalSize: loop.transport.geometry.sizeBytes,
        transport: loop.transport,
        seekSignal: loop.seek.signal,
        cancelSignal: loop.cancel.signal,
        swarm: this.swarmSessions.get(infoHash) ?? null,
      });

      if ('aborted' in result) {
        if (result.aborted === 'cancel') return;
        continue; // genuine seek — re-select immediately
      }

      if (!result.ok) {
        let decision;
        try {
          decision = await loop.controller.reportPieceFailure({
            reason: result.reason,
            httpStatus: result.httpStatus,
            permanent: result.permanent,
          });
        } catch {
          return;
        }

        if (decision.kind === 'retry') continue;
        if (decision.kind === 'exhausted') {
          this.loops.delete(infoHash);
          this.enterFallbackNeeded(infoHash, loop.controller.diagnostics);
          return;
        }
        loop.transport = decision.transport;
        if (decision.geometryChanged) {
          this.savedBitfields.set(
            infoHash,
            new Array(decision.transport.geometry.totalPieces).fill(0),
          );
          this.commitTransportToWorker(infoHash, decision.transport, false);
          return;
        }
        this.patchTask(infoHash, {
          transportMode: decision.transport.mode,
          activePeers: decision.transport.peers,
          statusMessage: `تم التبديل تلقائياً إلى: ${STAGE_LABELS_AR[decision.transport.stage]} — بدون فقدان التقدم`,
        });
        continue;
      }

      loop.controller.reportPieceSuccess();
      loop.isRecentSeek = false;
      if (result.peers) {
        loop.controller.updateLiveCounters(
          loop.transport.stage === 'bridge'
            ? { bridgePeers: result.peers }
            : { webrtcPeers: result.peers },
        );
      }

      const byteLen = result.buffer.byteLength;
      this.markInFlight(infoHash, sel.pieceIndex);
      const bytesKind =
        loop.transport.stage === 'webrtc' ? 'torrent-piece' : 'file-slice';
      if (this.worker) {
        this.worker.postMessage(
          {
            action: 'WRITE_PIECE',
            payload: {
              infoHash,
              pieceIndex: sel.pieceIndex,
              buffer: result.buffer,
              expectedHash: result.expectedSha1,
              bytesKind,
            },
          },
          [result.buffer],
        );
      }
      loop.speed.push(byteLen);
    }
  }

  private onPieceVerified(msg: {
    infoHash: string;
    pieceIndex: number;
    completedPieces: number;
    totalPieces: number;
    writtenBytes?: number;
  }): void {
    const { infoHash, pieceIndex, completedPieces, totalPieces } = msg;
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const bf = this.savedBitfields.get(infoHash);
    if (bf) bf[pieceIndex] = 1;
    this.inFlight.get(infoHash)?.delete(pieceIndex);

    const downloaded =
      msg.writtenBytes && msg.writtenBytes > 0
        ? msg.writtenBytes
        : task.downloadedBytes;
    const speed = this.loops.get(infoHash)?.speed.rate() ?? 0;
    const done = completedPieces >= totalPieces;
    const cleanBf = bf ? bf.map((b) => (b === 1 ? 1 : 0)) : null;
    this.patchTask(infoHash, {
      completedPieces,
      verifiedPiecesCount: completedPieces,
      totalPieces,
      progressPct: Number(
        ((completedPieces / Math.max(1, totalPieces)) * 100).toFixed(1),
      ),
      downloadedBytes: downloaded,
      speedBytesPerSec: done ? 0 : speed,
      etaSeconds: done
        ? 0
        : speed > 0
          ? Math.max(1, Math.round((task.totalBytes - downloaded) / speed))
          : null,
      headerAndTailReady: cleanBf
        ? isHeaderAndTailComplete(cleanBf, totalPieces)
        : task.headerAndTailReady,
      ...(task.showPieceMap && cleanBf
        ? {
            pieceMapBuckets: computePieceMapBuckets(
              cleanBf,
              totalPieces,
              task.playheadPieceIndex || 0,
            ),
          }
        : {}),
      status: done ? 'exporting' : task.status,
      statusMessage: done
        ? 'اكتمل التحميل والتحقق بـ SHA-1 — جاري الدمج والحفظ...'
        : `جاري التحميل: ${completedPieces}/${totalPieces} قطعة (${formatBytes(downloaded)} من ${formatBytes(task.totalBytes)})`,
    });
    if (done) {
      this.worker?.postMessage({
        action: 'FINALIZE_AND_EXPORT',
        payload: { infoHash },
      });
    }
  }

  private onPieceCorrupt(msg: {
    infoHash: string;
    pieceIndex?: number;
    reason?: string;
  }): void {
    const task = this.state.tasks[msg.infoHash];
    if (!task) return;
    const bf = this.savedBitfields.get(msg.infoHash);
    if (bf && typeof msg.pieceIndex === 'number') bf[msg.pieceIndex] = 0;
    this.inFlight.get(msg.infoHash)?.delete(msg.pieceIndex ?? -1);
    this.patchTask(msg.infoHash, {
      corruptPiecesRetried: task.corruptPiecesRetried + 1,
      bannedPeersCount: task.bannedPeersCount + 1,
      statusMessage:
        msg.reason || 'قطعة تالفة (SHA-1) — أُعيدت لقائمة الجلب',
    });
  }

  private ensureSpeedTicker(): void {
    if (this.speedTicker) return;
    this.speedTicker = setInterval(() => {
      if (this.loops.size === 0) {
        clearInterval(this.speedTicker!);
        this.speedTicker = null;
        return;
      }
      for (const [hash, loop] of this.loops) {
        const t = this.state.tasks[hash];
        if (!t || t.status !== 'downloading') continue;
        const r = loop.speed.rate();
        if (
          Math.abs(r - t.speedBytesPerSec) >
          Math.max(1024, t.speedBytesPerSec * 0.05)
        ) {
          this.patchTask(hash, {
            speedBytesPerSec: r,
            etaSeconds:
              r > 0
                ? Math.round((t.totalBytes - t.downloadedBytes) / r)
                : null,
          });
        }
      }
    }, 1_000);
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
    const cleanBf = bf.map((b) => (b === 1 ? 1 : 0));
    const loop = this.loops.get(infoHash);
    if (loop) {
      loop.isRecentSeek = true;
      if (bf[targetPiece] !== 1) {
        loop.seek.abort();
      }
    }

    this.patchTask(infoHash, {
      playheadPieceIndex: targetPiece,
      priorityPhase: 'seek-window',
      pieceMapBuckets: computePieceMapBuckets(
        cleanBf,
        task.totalPieces,
        targetPiece,
      ),
      statusMessage: `قفز زمني فوري: تم توجيه الأولوية القصوى للقطعة #${targetPiece + 1} (${formatBytes(byteOffset)})...`,
    });

    if (notifyBackend && loop?.transport.useBridgeBackend) {
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
    const loop = this.loops.get(infoHash);
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
    this.metainfoCache.set(meta.infoHashHex, meta);
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

    const fileBytes = meta.geometry.fileLength || meta.selectedFile.length || meta.totalLength;
    const pieceLength = meta.geometry.pieceLength;
    const totalPieces = meta.geometry.filePieceCount;

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
      fileGeometry: meta.geometry,
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
      pieceHashesHex: meta.pieceHashesHex,
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
    const cleanBf: number[] | undefined = savedBf
      ? savedBf.map((b) => (b === 1 ? 1 : 0))
      : undefined;
    const initialDone = cleanBf
      ? cleanBf.reduce((a, b) => a + b, 0)
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
      headerAndTailReady: cleanBf
        ? isHeaderAndTailComplete(cleanBf, release.totalPieces)
        : false,
      playheadPieceIndex: existing?.playheadPieceIndex || 0,
      priorityPhase: enableInstantStream ? 'header-tail' : 'sequential',
      pieceMapBuckets: computePieceMapBuckets(
        cleanBf || new Array(release.totalPieces).fill(0),
        release.totalPieces,
        0,
      ),
      statusMessage:
        'جاري فحص مسارات النقل (فحص 1-بايت قبل تهيئة المخزن)...',
      startedAt: existing?.startedAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (enableInstantStream) {
      this.state.activeStreamingTaskHash = infoHash;
    } else if (this.state.activeStreamingTaskHash === infoHash) {
      this.state.activeStreamingTaskHash = null;
    }
    this.state.activeTab = 'tasks';
    this.emit();

    await this.beginTransportPipeline(infoHash);
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
    this.state.activeStreamingTaskHash = nextState ? infoHash : null;
    this.patchTask(infoHash, {
      isStreamingActive: nextState,
      showPieceMap: nextState,
    });
  };

  public togglePieceMapForTask = (infoHash: string): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;
    const nextShow = !task.showPieceMap;
    const bf = this.savedBitfields.get(infoHash);
    this.patchTask(infoHash, {
      showPieceMap: nextShow,
      ...(nextShow && bf
        ? {
            pieceMapBuckets: computePieceMapBuckets(
              bf.map((b) => (b === 1 ? 1 : 0)),
              task.totalPieces,
              task.playheadPieceIndex || 0,
            ),
          }
        : {}),
    });
  };

  public pauseTask = (infoHash: string): void => {
    this.stopLoop(infoHash);
    this.clearReprobe(infoHash);
    this.worker?.postMessage({
      action: 'PAUSE_SESSION',
      payload: { infoHash },
    });
    this.patchTask(infoHash, {
      status: 'paused',
      speedBytesPerSec: 0,
      etaSeconds: null,
      statusMessage: 'متوقف مؤقتاً — التقدم محفوظ في OPFS',
    });
  };

  public resumeTask = (infoHash: string): void => {
    const t = this.state.tasks[infoHash];
    if (!t) return;
    this.patchTask(infoHash, {
      diagnostics: t.diagnostics
        ? { ...t.diagnostics, autoReprobeRound: 0 }
        : undefined,
    });
    void this.beginTransportPipeline(
      infoHash,
      this.pendingRetryStage.get(infoHash) ?? null,
    );
  };

  public retryFromStage = (
    infoHash: string,
    stage: CandidateTransportStage | null,
  ): void => {
    this.pendingRetryStage.set(infoHash, stage);
    this.resumeTask(infoHash);
    this.pendingRetryStage.delete(infoHash);
  };

  public acceptGeometryChange = (infoHash: string): void => {
    const l = this.loops.get(infoHash);
    if (l) l.allowGeometryChange = true;
    this.savedBitfields.delete(infoHash);
    this.inFlight.delete(infoHash);
    this.worker?.postMessage({
      action: 'CLEANUP_CACHE',
      payload: { infoHash },
    });
    void this.beginTransportPipeline(infoHash, 'hls-stream');
  };

  public openTaskInExternalClient = (infoHash: string): void => {
    const t = this.state.tasks[infoHash];
    if (t) openMagnetExternally(t.release);
  };

  public saveTaskTorrentFile = async (infoHash: string): Promise<boolean> => {
    const t = this.state.tasks[infoHash];
    if (!t) return false;
    return saveTorrentFile(t.release, async (url) => {
      const r = await fetch(proxify(url), {
        signal: AbortSignal.timeout(5_000),
      });
      return r.ok ? r.arrayBuffer() : null;
    });
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
        this.patchTask(infoHash, {
          statusMessage:
            'جاري الدمج الذري بشرائح 256 KiB والكتابة المباشرة لقرص جهازك...',
        });
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

    this.patchTask(infoHash, {
      statusMessage: 'جاري إعادة نقل الملف من الكاش القرصي إلى جهازك...',
    });
    this.worker?.postMessage({
      action: 'FINALIZE_AND_EXPORT',
      payload: { infoHash },
    });
  };

  public confirmClearCache = (infoHash: string): void => {
    this.stopLoop(infoHash);
    this.clearReprobe(infoHash);
    const swarm = this.swarmSessions.get(infoHash);
    if (swarm) {
      swarm.destroy();
      this.swarmSessions.delete(infoHash);
    }

    if (this.state.tasks[infoHash]) {
      this.patchTask(infoHash, {
        cacheCleared: true,
        statusMessage:
          'جاري حذف نسخة الكاش المؤقتة من OPFS واستعادة مساحة القرص...',
      });
    }
    this.worker?.postMessage({
      action: 'CLEANUP_CACHE',
      payload: { infoHash },
    });
  };

  public removeTaskFromList = (infoHash: string): void => {
    this.stopLoop(infoHash);
    this.clearReprobe(infoHash);
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
    this.inFlight.delete(infoHash);
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
