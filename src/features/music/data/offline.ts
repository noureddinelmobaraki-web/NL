// Persistent offline song library via the Cache Storage API.
// No transcoding -> instant, never blocks the UI thread.

const SAVED_CACHE = 'nl-saved-audio';

/** Ask the browser to keep our storage (reduces eviction). Safe to call often. */
export async function ensurePersistentStorage(): Promise<void> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (!already) await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
}

async function putWithFallback(cache: Cache, url: string): Promise<boolean> {
  // Prefer CORS (github.io / jsdelivr send Access-Control-Allow-Origin: *).
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) {
      await cache.put(url, r.clone());
      return true;
    }
  } catch {
    /* fall through to no-cors */
  }
  // Fallback: opaque response (e.g. r2.dev without CORS). Still cacheable and
  // playable by <audio>; the SW serves it whole.
  try {
    const r = await fetch(url, { mode: 'no-cors' });
    await cache.put(url, r.clone());
    return true;
  } catch {
    return false;
  }
}

/** Save a track's original file to the offline library. Returns true on success. */
export async function saveTrackOffline(
  track: { src: string; srcFallback?: string; coverUrl?: string },
  onState?: (s: 'start' | 'done' | 'error') => void,
): Promise<boolean> {
  if (!track?.src || typeof caches === 'undefined') return false;
  onState?.('start');
  try {
    await ensurePersistentStorage();
    const cache = await caches.open(SAVED_CACHE);
    let ok = await putWithFallback(cache, track.src);
    if (!ok && track.srcFallback) ok = await putWithFallback(cache, track.srcFallback);
    // Best-effort: cache the cover too so it shows on the player screen offline.
    if (ok && track.coverUrl) {
      try { await putWithFallback(cache, track.coverUrl); } catch { /* non-fatal */ }
    }
    onState?.(ok ? 'done' : 'error');
    return ok;
  } catch {
    onState?.('error');
    return false;
  }
}

/** Remove a track from the offline library. */
export async function removeTrackOffline(track: { src: string; srcFallback?: string; coverUrl?: string }): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(SAVED_CACHE);
    await cache.delete(track.src, { ignoreVary: true });
    if (track.srcFallback) await cache.delete(track.srcFallback, { ignoreVary: true });
    if (track.coverUrl) await cache.delete(track.coverUrl, { ignoreVary: true });
  } catch {
    /* ignore */
  }
}

/** List the URLs currently in the offline library (for reconciliation). */
export async function listSavedUrls(): Promise<string[]> {
  try {
    if (typeof caches === 'undefined') return [];
    const cache = await caches.open(SAVED_CACHE);
    const keys = await cache.keys();
    return keys.map((r) => r.url);
  } catch {
    return [];
  }
}
