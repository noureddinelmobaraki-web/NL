import type { LyricLine } from '../../types';

/**
 * Binary-search the active line for time t. Lines are time-sorted by parseLRC.
 * Returns the last line whose time <= t (endTime-aware, with a stable fallback).
 */
export function findActiveIndex(lines: LyricLine[], t: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let fallback = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= t) {
      fallback = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return fallback;
}
