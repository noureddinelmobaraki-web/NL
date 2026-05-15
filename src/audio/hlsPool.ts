import Hls, { type HlsConfig } from 'hls.js';

// ─── Shared HLS Config ────────────────────────────────────────────────────
// Single source of truth used by every Hls instance in the pool.
const HLS_CONFIG: Partial<HlsConfig> = {
  enableWorker:           true,
  lowLatencyMode:         false,
  maxBufferLength:        8,          // buffer 8s ahead max
  maxMaxBufferLength:     30,
  backBufferLength:       30,
  startLevel:             -1,         // auto quality
  startFragPrefetch:      true,       // begin fetching first fragment immediately after manifest
  abrEwmaDefaultEstimate: 1_000_000,  // assume 1 Mbps → picks quality fast on startup
  progressive:            true,
};

// ─── Persistent Instance Pool ─────────────────────────────────────────────
// Stores Hls instances indexed by m3u8 URL.
//
// Lifecycle:
//   getOrCreateHls(url)  → creates instance if absent, calls loadSource(url),
//                          stores in pool, returns it. Idempotent.
//   useHlsAudio          → calls attachMedia(audio) on the returned instance.
//   on song change       → calls detachMedia() — instance stays in pool with
//                          its manifest + buffered fragments intact.
//   on next attach       → same instance, already warm, attachMedia is instant.
//
// Instances are NEVER destroyed (no hls.destroy()).
// detachMedia() is the only teardown — it keeps internal HLS state alive.
const pool = new Map<string, Hls>();

/**
 * Returns the existing Hls instance for this URL, or creates a new one.
 * The new instance immediately starts fetching the manifest and, with
 * startFragPrefetch:true, the first fragment — without needing an audio element.
 */
export function getOrCreateHls(url: string): Hls {
  const existing = pool.get(url);
  if (existing) return existing;

  const hls = new Hls(HLS_CONFIG);
  hls.loadSource(url);
  pool.set(url, hls);
  return hls;
}

/**
 * Destroys and removes a specific instance from the pool.
 * Only needed for cleanup on full unmount (e.g. page navigation away).
 */
export function destroyHls(url: string): void {
  const hls = pool.get(url);
  if (hls) {
    hls.destroy();
    pool.delete(url);
  }
}

/**
 * Destroys all instances and clears the pool.
 * Call on app unmount / page unload if needed.
 */
export function destroyAllHls(): void {
  pool.forEach(hls => hls.destroy());
  pool.clear();
}
