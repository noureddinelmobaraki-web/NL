/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Sliding-Window Piece Priority Scheduler (Secret #1)
 * Replaces Rarest-First random torrent piece selection with a 3-tier priority queue:
 * 1. Priority 1 (Header + Tail First): Pieces [0, 1] and [totalPieces - 2, totalPieces - 1]
 *    so MP4 `moov` atoms and MKV `Cues` seek tables are available within seconds.
 * 2. Priority 2 (Playhead Read-Ahead / Dynamic Seek Window): The 10 contiguous pieces
 *    [playheadPiece .. playheadPiece + 9] directly in front of the viewer's current timestamp.
 * 3. Priority 3 (Sequential Forward Fill): Remaining missing pieces in sequential order.
 */

import type {
  PieceMapBucketKind,
  SlidingWindowPriorityPhase,
} from './types';

export const READ_AHEAD_WINDOW_PIECES = 10;

export interface NextPieceSelection {
  pieceIndex: number;
  phase: SlidingWindowPriorityPhase;
  headerAndTailReady: boolean;
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

/**
 * Selects the next missing piece (`bitfield[i] === 0`) according to the
 * 3-tier Sliding-Window Priority algorithm.
 */
export function selectNextPieceToDownload(
  bitfield: ArrayLike<number>,
  totalPieces: number,
  playheadPiece = 0,
  isRecentSeek = false,
): NextPieceSelection | null {
  const safeTotal = Math.max(1, totalPieces);
  const clampedPlayhead = Math.max(
    0,
    Math.min(safeTotal - 1, Math.floor(playheadPiece || 0)),
  );

  // Tier 1: Header [0, 1] + Tail [N-1, N-2] First (container metadata & seek index)
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

  // Tier 2: Playhead Read-Ahead / Seek Critical Window [playhead .. playhead + 9]
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

  // Tier 3A: Sequential forward from playhead window to end of file
  for (let idx = windowEnd + 1; idx < safeTotal; idx++) {
    if (bitfield[idx] !== 1) {
      return {
        pieceIndex: idx,
        phase: 'sequential',
        headerAndTailReady: true,
      };
    }
  }

  // Tier 3B: Wrap around to fill any skipped pieces before playhead
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

/**
 * Converts a target byte offset or playback timestamp ratio into the corresponding
 * piece index (`targetPiece = Math.floor(byteOffset / pieceLength)`).
 */
export function byteOffsetToPieceIndex(
  byteOffset: number,
  pieceLength: number,
  totalPieces: number,
): number {
  const safeLen = Math.max(1, pieceLength);
  const raw = Math.floor(Math.max(0, byteOffset) / safeLen);
  return Math.max(0, Math.min(Math.max(1, totalPieces) - 1, raw));
}

/**
 * Downsamples a bitfield of arbitrary length (e.g. 1,680 pieces) into `bucketCount`
 * visual segments for the Live Sliding-Window Piece Bar in the UI.
 */
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

    let allVerified = true;
    let someVerified = false;
    let inPlayheadWindow = false;
    const isHeaderOrTail = b === 0 || b === count - 1;

    for (let i = startIdx; i <= endIdx; i++) {
      if (bitfield[i] === 1) {
        someVerified = true;
      } else {
        allVerified = false;
      }
      if (i >= clampedPlayhead && i <= windowEnd) {
        inPlayheadWindow = true;
      }
    }

    if (inPlayheadWindow) {
      buckets[b] = 'playhead-window';
    } else if (allVerified || someVerified) {
      buckets[b] = isHeaderOrTail ? 'header-tail' : 'verified';
    } else {
      buckets[b] = 'empty';
    }
  }

  return buckets;
}
