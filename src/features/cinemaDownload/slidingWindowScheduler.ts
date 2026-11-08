/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * TorrentPlayer v0.3.3 Deadline & Sliding-Window Piece Priority Scheduler + SeekGate
 */

import type {
  PieceMapBucketKind,
  SlidingWindowPriorityPhase,
} from './types';

export const READ_AHEAD_WINDOW_PIECES = 10;
export const CRITICAL_WINDOW_PIECES = 4;

export interface NextPieceSelection {
  pieceIndex: number;
  phase: SlidingWindowPriorityPhase;
  headerAndTailReady: boolean;
}

export class SeekGate {
  private inflight = false;
  private pendingTarget: number | null = null;

  constructor(
    private readonly applySeek: (targetRatio: number) => Promise<void> | void,
  ) {}

  public request(targetRatio: number): void {
    this.pendingTarget = targetRatio;
    if (!this.inflight) {
      void this.drain();
    }
  }

  private async drain(): Promise<void> {
    this.inflight = true;
    try {
      while (this.pendingTarget !== null) {
        const next = this.pendingTarget;
        this.pendingTarget = null;
        await this.applySeek(next);
      }
    } finally {
      this.inflight = false;
    }
  }
}

export function getHeaderAndTailIndices(totalPieces: number): number[] {
  if (totalPieces <= 0) return [];
  if (totalPieces === 1) return [0];
  if (totalPieces === 2) return [0, 1];
  if (totalPieces === 3) return [0, 1, 2];
  return [0, 1, totalPieces - 1, totalPieces - 2];
}

export function isHeaderAndTailComplete(
  bitfield: ArrayLike<number>,
  totalPieces: number,
): boolean {
  const critical = getHeaderAndTailIndices(totalPieces);
  return critical.every((idx) => bitfield[idx] === 1);
}

export function selectNextPieceToDownload(
  bitfield: ArrayLike<number>,
  totalPieces: number,
  playheadPiece = 0,
  isRecentSeek = false,
  isStreamingActive = false,
): NextPieceSelection | null {
  const safeTotal = Math.max(1, totalPieces);
  const clampedPlayhead = Math.max(
    0,
    Math.min(safeTotal - 1, Math.floor(playheadPiece || 0)),
  );

  const headerAndTailDone = isHeaderAndTailComplete(bitfield, safeTotal);

  // Mode A: Download-First Sequential Mode (default when streaming is OFF)
  if (!isStreamingActive) {
    for (let idx = 0; idx < safeTotal; idx++) {
      if (bitfield[idx] !== 1) {
        return {
          pieceIndex: idx,
          phase: 'sequential',
          headerAndTailReady: headerAndTailDone,
        };
      }
    }
    return null;
  }

  // Mode B: Active Streaming Mode (Critical Phase + Header/Tail + Playhead Read-Ahead)
  const critEnd = Math.min(
    safeTotal - 1,
    clampedPlayhead + CRITICAL_WINDOW_PIECES - 1,
  );
  let critTotal = 0;
  let critDone = 0;
  for (let idx = clampedPlayhead; idx <= critEnd; idx++) {
    critTotal++;
    if (bitfield[idx] === 1) critDone++;
  }

  if (isRecentSeek && critDone * 2 < critTotal) {
    for (let idx = clampedPlayhead; idx <= critEnd; idx++) {
      if (bitfield[idx] !== 1) {
        return {
          pieceIndex: idx,
          phase: 'critical-phase',
          headerAndTailReady: headerAndTailDone,
        };
      }
    }
  }

  const headerTail = getHeaderAndTailIndices(safeTotal);
  for (const idx of headerTail) {
    if (bitfield[idx] !== 1) {
      return {
        pieceIndex: idx,
        phase: 'header-tail',
        headerAndTailReady: false,
      };
    }
  }

  const windowEnd = Math.min(
    safeTotal - 1,
    clampedPlayhead + READ_AHEAD_WINDOW_PIECES - 1,
  );
  for (let idx = clampedPlayhead; idx <= windowEnd; idx++) {
    if (bitfield[idx] !== 1) {
      return {
        pieceIndex: idx,
        phase: isRecentSeek ? 'seek-window' : 'playhead-window',
        headerAndTailReady: true,
      };
    }
  }

  for (let idx = windowEnd + 1; idx < safeTotal; idx++) {
    if (bitfield[idx] !== 1) {
      return {
        pieceIndex: idx,
        phase: 'sequential',
        headerAndTailReady: true,
      };
    }
  }

  for (let idx = 0; idx < clampedPlayhead; idx++) {
    if (bitfield[idx] !== 1) {
      return {
        pieceIndex: idx,
        phase: 'sequential',
        headerAndTailReady: true,
      };
    }
  }

  return null;
}

export function byteOffsetToPieceIndex(
  byteOffset: number,
  pieceLength: number,
  totalPieces: number,
): number {
  const safeLen = Math.max(1, pieceLength);
  const raw = Math.floor(Math.max(0, byteOffset) / safeLen);
  return Math.max(0, Math.min(Math.max(1, totalPieces) - 1, raw));
}

export function computePieceMapBuckets(
  bitfield: ArrayLike<number>,
  totalPieces: number,
  playheadPiece = 0,
  bucketCount = 48,
): PieceMapBucketKind[] {
  const safeTotal = Math.max(1, totalPieces);
  const count = Math.max(8, Math.min(safeTotal, bucketCount));
  const buckets: PieceMapBucketKind[] = new Array(count).fill('empty');

  const clampedPlayhead = Math.max(
    0,
    Math.min(safeTotal - 1, Math.floor(playheadPiece || 0)),
  );
  const windowEnd = Math.min(
    safeTotal - 1,
    clampedPlayhead + READ_AHEAD_WINDOW_PIECES - 1,
  );

  for (let b = 0; b < count; b++) {
    const startIdx = Math.floor((b / count) * safeTotal);
    const endIdx = Math.max(
      startIdx,
      Math.floor(((b + 1) / count) * safeTotal) - 1,
    );

    let someVerified = false;
    let inPlayheadWindow = false;
    const isHeaderOrTail = b === 0 || b === count - 1;

    for (let i = startIdx; i <= endIdx; i++) {
      if (bitfield[i] === 1) {
        someVerified = true;
      }
      if (i >= clampedPlayhead && i <= windowEnd) {
        inPlayheadWindow = true;
      }
    }

    if (someVerified) {
      buckets[b] = isHeaderOrTail ? 'header-tail' : 'verified';
    } else if (inPlayheadWindow) {
      buckets[b] = 'playhead-window';
    } else {
      buckets[b] = 'empty';
    }
  }

  return buckets;
}
