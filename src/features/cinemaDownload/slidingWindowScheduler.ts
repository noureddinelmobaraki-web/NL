/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Sliding Window Priority Piece Scheduler (Header/Tail + Seek/Playhead Priority)
 */

import {
  fileByteToLocalPieceIndex,
  type SelectedFileGeometry,
} from './bencodeAndInputManager';
import type { PieceMapBucketKind, SlidingWindowPriorityPhase } from './types';

export interface SchedulerSelectionResult {
  pieceIndex: number;
  phase: SlidingWindowPriorityPhase;
  headerAndTailReady: boolean;
}

export function isHeaderAndTailComplete(
  bitfield: Uint8Array | number[],
  totalPieces: number,
  edgePieceCount = 2,
): boolean {
  if (totalPieces <= 0) return false;
  const count = Math.min(edgePieceCount, totalPieces);
  for (let i = 0; i < count; i++) {
    if (bitfield[i] !== 1) return false;
    if (bitfield[totalPieces - 1 - i] !== 1) return false;
  }
  return true;
}

export const isHeaderAndTailReady = isHeaderAndTailComplete;

export function byteOffsetToPieceIndex(
  byteOffset: number,
  pieceLength: number,
  totalPieces: number,
): number {
  const safePieceLen = Math.max(16384, pieceLength || 1048576);
  const rawIndex = Math.floor(Math.max(0, byteOffset) / safePieceLen);
  return Math.max(0, Math.min(Math.max(0, totalPieces - 1), rawIndex));
}

/** File-relative byte -> LOCAL piece index (accounts for fileOffset). */
export function fileByteToPieceIndex(
  fileByte: number,
  geometry: SelectedFileGeometry | null,
  fallbackPieceLength: number,
  totalPieces: number,
): number {
  if (geometry) return fileByteToLocalPieceIndex(geometry, fileByte);
  return byteOffsetToPieceIndex(fileByte, fallbackPieceLength, totalPieces);
}

export interface SelectNextPieceParams {
  bitfield: Uint8Array | number[];
  totalPieces: number;
  isStreamingActive: boolean;
  playheadPieceIndex?: number;
  isSeeking?: boolean;
  windowRadius?: number;
}

export function selectNextPieceToDownload(
  paramsOrBitfield: SelectNextPieceParams | Uint8Array | number[],
  totalPiecesArg?: number,
  playheadPieceIndexArg = 0,
  isSeekingArg = false,
  isStreamingActiveArg = false,
): SchedulerSelectionResult | null {
  const params: SelectNextPieceParams =
    paramsOrBitfield instanceof Uint8Array || Array.isArray(paramsOrBitfield)
      ? {
          bitfield: paramsOrBitfield,
          totalPieces: totalPiecesArg ?? paramsOrBitfield.length,
          playheadPieceIndex: playheadPieceIndexArg,
          isSeeking: isSeekingArg,
          isStreamingActive: isStreamingActiveArg,
          windowRadius: 8,
        }
      : paramsOrBitfield;

  const {
    bitfield,
    totalPieces,
    isStreamingActive,
    playheadPieceIndex = 0,
    isSeeking = false,
    windowRadius = 8,
  } = params;

  const headerTailReady = isHeaderAndTailComplete(bitfield, totalPieces, 2);

  if (isStreamingActive) {
    // 1. Ensure first 2 and last 2 pieces are fetched first so MP4 moov atom (head or tail) is immediately readable
    const edgeIndices = [
      0,
      Math.min(1, totalPieces - 1),
      Math.max(0, totalPieces - 1),
      Math.max(0, totalPieces - 2),
    ];
    for (const idx of edgeIndices) {
      if (!bitfield[idx]) {
        return {
          pieceIndex: idx,
          phase: 'header-tail',
          headerAndTailReady: headerTailReady,
        };
      }
    }

    // 2. Sliding window around current video playhead (skipping pieces where bitfield[p] is 1 verified or 2 in-flight)
    const clampedHead = Math.max(
      0,
      Math.min(totalPieces - 1, playheadPieceIndex),
    );
    const windowEnd = Math.min(totalPieces - 1, clampedHead + windowRadius);
    for (let p = clampedHead; p <= windowEnd; p++) {
      if (!bitfield[p]) {
        return {
          pieceIndex: p,
          phase: isSeeking ? 'critical-phase' : 'deadline-window',
          headerAndTailReady: headerTailReady,
        };
      }
    }
  }

  // 3. Standard sequential fill across remaining un-started pieces (bitfield[p] === 0)
  for (let p = 0; p < totalPieces; p++) {
    if (!bitfield[p]) {
      return {
        pieceIndex: p,
        phase: 'sequential',
        headerAndTailReady: headerTailReady,
      };
    }
  }

  return null;
}

export function buildPieceMapBuckets(params: {
  bitfield: Uint8Array | number[];
  totalPieces: number;
  bucketCount?: number;
  isStreamingActive: boolean;
  playheadPieceIndex?: number;
  windowRadius?: number;
}): PieceMapBucketKind[] {
  const {
    bitfield,
    totalPieces,
    bucketCount = 48,
    isStreamingActive,
    playheadPieceIndex = 0,
    windowRadius = 8,
  } = params;

  const safeBuckets = Math.max(8, Math.min(64, bucketCount));
  const result: PieceMapBucketKind[] = new Array(safeBuckets).fill('empty');
  if (totalPieces <= 0) return result;

  for (let b = 0; b < safeBuckets; b++) {
    const startP = Math.floor((b * totalPieces) / safeBuckets);
    const endP = Math.max(
      startP,
      Math.floor(((b + 1) * totalPieces) / safeBuckets) - 1,
    );

    let allVerified = true;
    let touchesPlayheadWindow = false;
    const isEdgeBucket = b === 0 || b === safeBuckets - 1;

    for (let p = startP; p <= endP; p++) {
      if (bitfield[p] !== 1) {
        allVerified = false;
      }
      if (
        isStreamingActive &&
        p >= playheadPieceIndex &&
        p <= playheadPieceIndex + windowRadius
      ) {
        touchesPlayheadWindow = true;
      }
    }

    if (allVerified) {
      result[b] = 'verified';
    } else if (touchesPlayheadWindow) {
      result[b] = 'playhead-window';
    } else if (isEdgeBucket) {
      result[b] = 'header-tail';
    } else {
      result[b] = 'empty';
    }
  }

  return result;
}

export function computePieceMapBuckets(
  bitfield: Uint8Array | number[],
  totalPieces: number,
  playheadPieceIndex = 0,
  bucketCount = 48,
): PieceMapBucketKind[] {
  return buildPieceMapBuckets({
    bitfield,
    totalPieces,
    bucketCount,
    isStreamingActive: true,
    playheadPieceIndex,
  });
}

export class SeekGate<T = number> {
  private inFlight = false;
  private latestPending: T | null = null;
  private readonly handler?: (target: T) => Promise<void> | void;

  constructor(handler?: (target: T) => Promise<void> | void) {
    this.handler = handler;
  }

  public request(target: T): void {
    this.latestPending = target;
    if (!this.inFlight) {
      void this.drain();
    }
  }

  public run(task: () => void): void {
    task();
  }

  private async drain(): Promise<void> {
    this.inFlight = true;
    try {
      while (this.latestPending !== null) {
        const next = this.latestPending;
        this.latestPending = null;
        if (this.handler) {
          await this.handler(next);
        }
      }
    } finally {
      this.inFlight = false;
    }
  }
}
