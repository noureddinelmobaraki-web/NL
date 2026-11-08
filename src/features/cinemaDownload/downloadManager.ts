/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download & Progressive Torrent Stream Manager
 * Coordinates:
 * - Real Magnet / WebTorrent Swarm Bridge (/api/cinema-download/torrent-meta & /piece)
 * - Sliding-Window Priority Scheduler (Header [0,1] + Tail [N-1] -> Playhead Window -> Sequential)
 * - HTTP 206 Partial Content Byte-Range Video Streamer (/api/cinema-download/range-stream + Service Worker)
 * - Dynamic Seek Reprioritization (/api/cinema-download/seek-priority) when jumping to any minute
 * - Hybrid OPFS + Extended IndexedDB Chunk Worker (never stops or fakes 100% when movie > 2.13 GB OPFS)
 * - Hand-off to Main Cinema Player (`nl:cinema-progressive-torrent-stream` custom event)
 */

import { useSyncExternalStore } from 'react';
import { nowPlayingBus } from '../../audio/nowPlayingBus';
import {
  computeRealPieceGeometry,
  discoverReleasesForMedia,
} from './releaseDiscoveryService';
import { formatBytes } from './releaseParserAndFilter';
import {
  byteOffsetToPieceIndex,
  computePieceMapBuckets,
  isHeaderAndTailComplete,
  selectNextPieceToDownload,
} from './slidingWindowScheduler';
import type {
  CinemaDownloadSnapshot,
  DiscoveredReleaseOption,
  DownloadMediaContext,
  DownloadQualityTier,
} from './types';

interface ActiveLoopContext {
  cancelled: boolean;
  hlsSegments?: string[];
  bytesTransferredInSession: number;
  sessionStartTimeMs: number;
  isRecentSeek: boolean;
  currentPieceAbort: AbortController | null;
}

function isDirectDiskPickerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).showSaveFilePicker === 'function'
  );
}

export function buildProgressiveRangeStreamUrl(
  release: DiscoveredReleaseOption,
): string {
  const params = new URLSearchParams({
    infoHash: release.infoHash,
    magnet: release.magnetUri,
  });
  if (release.directStreamUrl && release.sourceKind !== 'direct-hls') {
    params.set('directUrl', release.directStreamUrl);
    if (release.streamReferer) {
      params.set('referer', release.streamReferer);
    }
  }
  return `/api/cinema-download/range-stream?${params.toString()}`;
}

class CinemaDownloadManager {
  private listeners = new Set<() => void>();
  private worker: Worker | null = null;
  private discoveryAbort: AbortController | null = null;
  private activeLoops = new Map<string, ActiveLoopContext>();
  private savedBitfields = new Map<string, number[]>();

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
    liveTrackersCount: 11,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
      this.registerStreamServiceWorker();
      void this.refreshQuota();
    }
  }

  private registerStreamServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    try {
      void navigator.serviceWorker
        .register('/torrent-stream-sw.js')
        .catch(() => {});
      navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent) => {
          const data = event.data;
          if (
            data &&
            data.type === 'TORRENT_SW_SEEK_RANGE' &&
            typeof data.infoHash === 'string' &&
            typeof data.byteStart === 'number'
          ) {
            this.seekStreamToByteOffset(data.infoHash, data.byteStart, false);
          }
        },
      );
    } catch {
      // ignore SW registration issues in restricted environments
    }
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
      } catch {
        // ignore listener error
      }
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
      } catch {
        // ignore
      }
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
              progressPct: pct,
              completedPieces: done,
              totalPieces: total,
              downloadedBytes: writtenBytes,
              totalBytes: release.sizeBytes,
              speedBytesPerSec: 0,
              etaSeconds: null,
              verifiedPiecesCount: done,
              corruptPiecesRetried: 0,
              activePeers: release.seeders || 1,
              exportedToDevice: Boolean(rec.exportedToDevice),
              cacheCleared: false,
              streamUrl: buildProgressiveRangeStreamUrl(release),
              headerAndTailReady: isHeaderAndTailComplete(bf, total),
              playheadPieceIndex: 0,
              priorityPhase: 'header-tail',
              pieceMapBuckets: computePieceMapBuckets(bf, total, 0),
              statusMessage: isDone
                ? 'مكتمل في كاش المتصفح القرصي — جاهز للمشاهدة أو النقل للجهاز'
                : `محفوظ في الكاش (${done}/${total} قطعة) — جاهز للاستئناف أو المشاهدة الفورية`,
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
      task.status = completedPieces >= totalPieces ? 'exporting' : 'downloading';
      task.statusMessage =
        completedPieces > 0 && completedPieces < totalPieces
          ? `تم استئناف الكاش (${completedPieces}/${totalPieces} قطعة) — النافذة المنزلقة نشطة...`
          : task.storageMode === 'hybrid-extended'
            ? 'تم تفعيل الكاش الهجين الممتد (OPFS + IndexedDB) لتجاوز سقف المساحة — جاري خطف الرأس والذيل أولاً...'
            : 'تم حجز الكاش القرصي OPFS — جاري خطف قطعتي الرأس والذيل (Header + Tail) أولاً...';
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
        task.release.sourceKind === 'direct-hls' &&
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
        progress ?? ((completedPieces / Math.max(1, totalPieces)) * 100).toFixed(1),
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

      const phaseLabel =
        task.priorityPhase === 'header-tail'
          ? 'خطف الرأس والذيل (Header+Tail)'
          : task.priorityPhase === 'seek-window'
            ? `أولوية القفز الزمني (قطعة #${(task.playheadPieceIndex || 0) + 1})`
            : task.priorityPhase === 'playhead-window'
              ? `نافذة المشاهدة الأمامية (#${(task.playheadPieceIndex || 0) + 1})`
              : 'التحميل التتابعي';

      task.statusMessage = `${phaseLabel}: تم توثيق ${completedPieces}/${totalPieces} قطعة بـ SHA-1 (${formatBytes(actualDownloaded)})`;
      task.updatedAt = now;

      if (completedPieces >= totalPieces) {
        task.status = 'exporting';
        task.speedBytesPerSec = 0;
        task.etaSeconds = 0;
        task.statusMessage =
          'اكتمل فحص جميع القطع الفعلية 100% بـ SHA-1! جاري النقل التلقائي لجهازك...';
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
      task.statusMessage =
        reason || 'قطعة تالفة — جاري إعادة طلبها من نظير آخر';
      this.emit();
    } else if (msg.type === 'EXPORT_READY') {
      const { infoHash, fileName, file, actualSizeBytes, quota } = msg;
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
        task.statusMessage = `تم نقل الملف الكامل (${formatBytes(task.downloadedBytes)}) إلى مجلد التنزيلات في جهازك! يمكنك الآن تأكيد تفريغ الكاش.`;
        task.updatedAt = Date.now();
      }
      if (file) {
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
      const task = this.state.tasks[infoHash];
      if (task) {
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

  /**
   * Resolves real metadata (exact file size, piece count, active peers, or HLS segment list)
   * from the server Magnet/WebTorrent bridge before starting the download.
   */
  private async resolveRealSourceMetadata(
    release: DiscoveredReleaseOption,
    infoHash: string,
  ): Promise<{
    realSizeBytes: number;
    pieceLength: number;
    totalPieces: number;
    activePeers: number;
    hlsSegments?: string[];
  }> {
    if (release.sourceKind === 'direct-hls' && release.directStreamUrl) {
      try {
        const params = new URLSearchParams({
          url: release.directStreamUrl,
        });
        if (release.streamReferer) {
          params.set('referer', release.streamReferer);
        }
        const res = await fetch(
          `/api/cinema-download/hls-segments?${params.toString()}`,
          { signal: AbortSignal.timeout(12000) },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            segments?: string[];
            totalSegments?: number;
          };
          if (Array.isArray(data.segments) && data.segments.length > 0) {
            return {
              realSizeBytes: release.sizeBytes,
              pieceLength: Math.max(
                65536,
                Math.round(release.sizeBytes / data.segments.length),
              ),
              totalPieces: data.segments.length,
              activePeers: 100,
              hlsSegments: data.segments,
            };
          }
        }
      } catch {
        // Ignore
      }
    }

    if (release.sourceKind === 'torrent-hybrid') {
      try {
        const params = new URLSearchParams({
          infoHash,
          magnet: release.magnetUri,
        });
        const res = await fetch(
          `/api/cinema-download/torrent-meta?${params.toString()}`,
          { signal: AbortSignal.timeout(18000) },
        );
        if (res.ok) {
          const meta = (await res.json()) as {
            fileSize?: number;
            pieceLength?: number;
            totalPieces?: number;
            peers?: number;
          };
          if (meta.fileSize && meta.fileSize > 0) {
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
            };
          }
        }
      } catch {
        // Fallback to discovered size geometry
      }
    }

    const { pieceLength, totalPieces } = computeRealPieceGeometry(
      release.sizeBytes,
    );
    return {
      realSizeBytes: release.sizeBytes,
      pieceLength,
      totalPieces,
      activePeers: release.seeders || 1,
    };
  }

  /**
   * Sliding-Window Priority Download Loop (Secret #1 + #4):
   * Continuously selects the highest-priority missing piece:
   * 1. Header [0, 1] + Tail [N-1, N-2] First
   * 2. Active Playhead / Seek Window [playheadPiece .. playheadPiece + 9]
   * 3. Sequential Forward Fill
   * If the user seeks in the video player, `currentPieceAbort` cancels any low-priority
   * in-flight piece so the seek target piece is fetched immediately!
   */
  private async runPieceDownloadLoop(
    infoHash: string,
    initialBitfield: number[],
  ): Promise<void> {
    const prevLoop = this.activeLoops.get(infoHash);
    if (prevLoop) {
      prevLoop.cancelled = true;
      prevLoop.currentPieceAbort?.abort();
    }

    const task = this.state.tasks[infoHash];
    if (!task) return;

    const loopState: ActiveLoopContext = {
      cancelled: false,
      hlsSegments: prevLoop?.hlsSegments,
      bytesTransferredInSession: 0,
      sessionStartTimeMs: Date.now(),
      isRecentSeek: false,
      currentPieceAbort: null,
    };
    this.activeLoops.set(infoHash, loopState);

    const totalPieces = task.totalPieces;
    const pieceLength = task.release.pieceLength;
    const totalSize = task.totalBytes;
    const isHls =
      task.release.sourceKind === 'direct-hls' &&
      Array.isArray(loopState.hlsSegments) &&
      loopState.hlsSegments.length > 0;

    let consecutiveFailures = 0;

    while (!loopState.cancelled) {
      const currentTask = this.state.tasks[infoHash];
      if (!currentTask || currentTask.status !== 'downloading') return;

      const currentBf = this.savedBitfields.get(infoHash) || initialBitfield;
      const selection = selectNextPieceToDownload(
        currentBf,
        totalPieces,
        currentTask.playheadPieceIndex || 0,
        loopState.isRecentSeek,
      );

      if (!selection) {
        // All pieces verified!
        return;
      }

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
        const timeoutId = setTimeout(() => pieceAbort.abort(), 28000);

        try {
          const params = new URLSearchParams({
            infoHash,
            pieceIndex: String(pieceIndex),
            pieceLength: String(pieceLength),
            totalSize: String(totalSize),
            magnet: currentTask.release.magnetUri,
          });

          if (isHls && loopState.hlsSegments?.[pieceIndex]) {
            params.set('segmentUrl', loopState.hlsSegments[pieceIndex]);
            if (currentTask.release.streamReferer) {
              params.set('referer', currentTask.release.streamReferer);
            }
          } else if (currentTask.release.directStreamUrl) {
            params.set('directUrl', currentTask.release.directStreamUrl);
            if (currentTask.release.streamReferer) {
              params.set('referer', currentTask.release.streamReferer);
            }
          }

          const res = await fetch(
            `/api/cinema-download/piece?${params.toString()}`,
            {
              signal: pieceAbort.signal,
            },
          );
          clearTimeout(timeoutId);

          if (
            res.ok &&
            res.headers.get('Content-Type')?.includes('application/octet-stream')
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
            const errJson = await res.json().catch(() => null);
            lastErrorReason =
              errJson?.error ||
              `HTTP ${res.status} عند جلب القطعة #${pieceIndex + 1}`;
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (pieceAbort.signal.aborted && !loopState.cancelled) {
            // Aborted because user seeked to a new timestamp — immediately loop to new playhead piece!
            abortedBySeek = true;
            break;
          }
          lastErrorReason =
            err?.message || 'انتهت مهلة الاتصال بالسرب أو الخادم';
        }
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }

      if (loopState.cancelled) return;
      if (abortedBySeek) {
        continue;
      }

      if (!pieceBuffer || pieceBuffer.byteLength === 0) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 2) {
          currentTask.status = 'paused';
          currentTask.speedBytesPerSec = 0;
          currentTask.etaSeconds = null;
          currentTask.errorMessage = lastErrorReason;
          currentTask.statusMessage = `توقف مؤقت: تعذر جلب القطعة #${pieceIndex + 1} من السرب (${lastErrorReason || 'لا يوجد نظراء مستجيبون حالياً'}) — اضغط استئناف أو جرب جودة أخرى.`;
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

  /**
   * Reprioritizes the Sliding-Window Scheduler and the backend WebTorrent swarm
   * immediately when the user seeks to a byte offset or timestamp (Secret #1 & #2).
   */
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
    task.statusMessage = `قفز زمني فوري (Sliding-Window Seek): تم توجيه الأولوية القصوى للقطعة #${targetPiece + 1} (${formatBytes(byteOffset)})...`;
    task.updatedAt = Date.now();

    const loop = this.activeLoops.get(infoHash);
    if (loop) {
      loop.isRecentSeek = true;
      // If the target piece is not yet cached, abort the old piece fetch so the loop immediately fetches targetPiece!
      if (bf[targetPiece] !== 1) {
        loop.currentPieceAbort?.abort();
      }
    }
    this.emit();

    if (notifyBackend && task.release.sourceKind === 'torrent-hybrid') {
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
        } catch {
          // ignore
        }
      }, 15000);
    } catch {
      // ignore in headless environments
    }
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
            : 'نافذة منزلقة نشطة'
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

  // ── Public UI Actions ────────────────────────────────────────────────────

  public openModalForMedia = (media: DownloadMediaContext): void => {
    this.initWorker();
    void this.refreshQuota();

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

  /**
   * Starts real Magnet / Torrent / Stream download using the Hybrid OPFS + Extended
   * IndexedDB Chunk Worker and Sliding-Window Piece Scheduler.
   * Never fakes 100% completion!
   */
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
    const streamUrl = buildProgressiveRangeStreamUrl(release);

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
      activePeers: release.seeders || 1,
      exportedToDevice: false,
      cacheCleared: false,
      isStreamingActive: enableInstantStream || existing?.isStreamingActive,
      streamUrl,
      headerAndTailReady: savedBf
        ? isHeaderAndTailComplete(savedBf, release.totalPieces)
        : false,
      playheadPieceIndex: existing?.playheadPieceIndex || 0,
      priorityPhase: 'header-tail',
      pieceMapBuckets: computePieceMapBuckets(
        savedBf || new Array(release.totalPieces).fill(0),
        release.totalPieces,
        0,
      ),
      statusMessage:
        'جاري الاتصال برابط الـ Magnet الفعلي وجلب جدول الملفات من السرب (WebTorrent)...',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (enableInstantStream) {
      this.state.activeStreamingTaskHash = infoHash;
    }
    this.state.activeTab = 'tasks';
    this.emit();

    const resolved = await this.resolveRealSourceMetadata(release, infoHash);
    const task = this.state.tasks[infoHash];
    if (!task) return;

    task.totalBytes = resolved.realSizeBytes;
    task.release.sizeBytes = resolved.realSizeBytes;
    task.release.sizeFormatted = formatBytes(resolved.realSizeBytes);
    task.release.pieceLength = resolved.pieceLength;
    task.release.totalPieces = resolved.totalPieces;
    task.totalPieces = resolved.totalPieces;
    task.activePeers = resolved.activePeers;

    this.activeLoops.set(infoHash, {
      cancelled: false,
      hlsSegments: resolved.hlsSegments,
      bytesTransferredInSession: 0,
      sessionStartTimeMs: Date.now(),
      isRecentSeek: false,
      currentPieceAbort: null,
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
          pieceHashes: [],
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

  /**
   * Starts Progressive Torrent Streaming + OPFS Caching simultaneously,
   * opening the live HTTP 206 player inside the Download Studio Modal.
   */
  public startProgressiveStream = async (
    media: DownloadMediaContext,
    release: DiscoveredReleaseOption,
    openInCinemaStage = false,
  ): Promise<void> => {
    const infoHash = release.infoHash;
    const existing = this.state.tasks[infoHash];
    if (existing) {
      existing.isStreamingActive = true;
      existing.streamUrl = buildProgressiveRangeStreamUrl(release);
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

  /**
   * Hands off the active Progressive Torrent HTTP 206 Stream directly to
   * the Main Cinema Player on `MoviesPage.tsx` while continuing OPFS background caching!
   */
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
      task?.streamUrl || buildProgressiveRangeStreamUrl(release);

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
    const nextState =
      this.state.activeStreamingTaskHash === infoHash ? null : infoHash;
    task.isStreamingActive = Boolean(nextState);
    this.state.activeStreamingTaskHash = nextState;
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
    task.statusMessage = `متوقف مؤقتاً (${task.completedPieces}/${task.totalPieces} قطعة حقيقية محفوظة — جاهز للاستئناف)`;
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

  public reExportTask = (infoHash: string): void => {
    const task = this.state.tasks[infoHash];
    if (!task) return;
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
