/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { amLog, type SuppressorMeta } from './audioHelpers';

export class BgSuppressionRegistry {
  public readonly map = new Map<string, SuppressorMeta>();
  public token = 0;

  private static readonly SUPPRESSOR_STALE_MS = 30_000;
  private static readonly SUPPRESSOR_PURGE_INTERVAL_MS = 5_000;
  private purgeTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onAllCleared: () => void;

  constructor(onAllCleared: () => void) {
    this.onAllCleared = onAllCleared;
  }

  get size(): number {
    return this.map.size;
  }

  has(reason?: string): boolean {
    if (reason === undefined) return this.map.size > 0;
    return this.map.has(reason);
  }

  add(reason: string): number {
    this.map.set(reason, { reason, ts: performance.now() });
    this.startPurgeTimerIfNeeded();
    return ++this.token;
  }

  release(reason: string): boolean {
    const existed = this.map.delete(reason);
    if (existed) {
      this.token++;
    }
    if (this.map.size === 0) {
      this.stopPurgeTimer();
    }
    return existed;
  }

  forceReleasePrefix(prefix: string): number {
    let removed = 0;
    for (const reason of this.map.keys()) {
      if (reason === prefix || reason.startsWith(prefix + ':')) {
        this.map.delete(reason);
        removed++;
      }
    }
    if (removed > 0) {
      this.token++;
      if (this.map.size === 0) {
        this.stopPurgeTimer();
      }
    }
    return removed;
  }

  forceRelease(reason: string): number {
    if (reason === '*') {
      const n = this.map.size;
      if (n > 0) {
        amLog.warn(
          `forceReleaseBg('*') clearing ${n} suppressor(s):`,
          Array.from(this.map.keys()),
        );
        this.map.clear();
        this.stopPurgeTimer();
        this.token++;
      }
      return n;
    }
    const existed = this.map.delete(reason);
    if (existed) {
      if (this.map.size === 0) this.stopPurgeTimer();
      amLog.warn(`forceReleaseBg('${reason}')`);
      return 1;
    }
    return 0;
  }

  purgeStale(): number {
    const now = performance.now();
    const threshold = BgSuppressionRegistry.SUPPRESSOR_STALE_MS;
    let removed = 0;
    this.map.forEach((meta, key) => {
      if (now - meta.ts >= threshold) {
        this.map.delete(key);
        removed++;
        amLog.warn(`Purged stale suppressor '${key}' (age=${Math.round(now - meta.ts)}ms)`);
      }
    });
    if (this.map.size === 0) {
      this.stopPurgeTimer();
      this.token++;
      this.onAllCleared();
    }
    return removed;
  }

  private startPurgeTimerIfNeeded(): void {
    if (this.purgeTimer !== null) return;
    if (typeof setInterval === 'undefined') return;
    this.purgeTimer = setInterval(() => {
      this.purgeStale();
    }, BgSuppressionRegistry.SUPPRESSOR_PURGE_INTERVAL_MS);
  }

  stopPurgeTimer(): void {
    if (this.purgeTimer !== null) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }
}
