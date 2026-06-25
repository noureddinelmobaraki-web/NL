import type Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';

// ─── Shared HLS Config ────────────────────────────────────────────────────
// Single source of truth used by every Hls instance in the pool.
const HLS_CONFIG: Partial<HlsConfig> = {
  enableWorker:           true,
  lowLatencyMode:         true,       // Enable Low Latency mode
  maxBufferLength:        10,         // buffer 10s ahead 
  maxMaxBufferLength:     30,
  backBufferLength:       15,         // reduce back buffer for streams
  startLevel:             -1,         // auto quality
  startFragPrefetch:      true,       // begin fetching first fragment immediately after manifest
  abrEwmaDefaultEstimate: 2_000_000,  // assume 2 Mbps → picks high quality faster
  progressive:            true,
  liveSyncDurationCount:  3,          // live stream specific
  liveMaxLatencyDurationCount: 10,
};

// ─── Persistent Instance Pool (LRU implementation) ──────────────────────
const MAX_POOL_SIZE = 4;
const pool = new Map<string, Hls>();
const lruOrder: string[] = [];

let HlsModule: typeof import('hls.js') | null = null;

export async function getHlsClass() {
  if (!HlsModule) {
    HlsModule = await import('hls.js');
  }
  return HlsModule.default;
}

/**
 * Returns the existing Hls instance for this URL, or creates a new one.
 * The new instance immediately starts fetching the manifest, without needing an audio element.
 * Enforces a strict LRU limit on the pool size to prevent memory leaks.
 */
export async function getOrCreateHls(url: string): Promise<Hls> {
  const existing = pool.get(url);
  if (existing) {
    // Move to end of LRU order (most recently used)
    const idx = lruOrder.indexOf(url);
    if (idx !== -1) {
      lruOrder.splice(idx, 1);
    }
    lruOrder.push(url);
    return existing;
  }

  // Enforce pool size limit by destroying and purging the oldest instance
  if (pool.size >= MAX_POOL_SIZE) {
    const oldestUrl = lruOrder.shift();
    if (oldestUrl) {
      const oldestHls = pool.get(oldestUrl);
      if (oldestHls) {
        try {
          oldestHls.destroy();
        } catch (e) {
          console.error('[hlsPool] Failed to destroy oldest HLS instance:', e);
        }
        pool.delete(oldestUrl);
      }
    }
  }

  const HlsConstructor = await getHlsClass();
  const hls = new HlsConstructor(HLS_CONFIG);
  hls.loadSource(url);
  pool.set(url, hls);
  lruOrder.push(url);
  return hls;
}

/**
 * Destroys and removes a specific instance from the pool.
 * Only needed for cleanup on full unmount (e.g. page navigation away).
 */
export function destroyHls(url: string): void {
  const hls = pool.get(url);
  if (hls) {
    try {
      hls.destroy();
    } catch {}
    pool.delete(url);
    const idx = lruOrder.indexOf(url);
    if (idx !== -1) {
      lruOrder.splice(idx, 1);
    }
  }
}

/**
 * Destroys all instances and clears the pool.
 * Call on app unmount / page unload if needed.
 */
export function destroyAllHls(): void {
  pool.forEach(hls => {
    try {
      hls.destroy();
    } catch {}
  });
  pool.clear();
  lruOrder.length = 0;
}

/**
 * Safely detach an Hls instance from any media element it may be attached to.
 * Idempotent: calling on an already-detached instance is a no-op.
 * Does NOT destroy the instance — it stays in the pool for reuse.
 */
export function safeDetach(url: string): void {
  const hls = pool.get(url);
  if (!hls) return;
  try { hls.detachMedia(); } catch { /* already detached or destroyed */ }
}
