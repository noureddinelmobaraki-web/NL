/**
 * Mobile-Only Background Song Pre-Cacher & Persistent Offline Data Engine.
 *
 * Strictly gated to mobile viewports (<= 767px), coarse-pointer touch devices,
 * and installed standalone PWAs. Desktop browsers never import or execute this module.
 */

import {
  CACHE_MOBILE_API,
  CACHE_MOBILE_POSTERS,
  CACHE_MOBILE_SONGS,
  isMobileSuperCacheDevice,
} from './mobileCacheGuard';

export {
  CACHE_MOBILE_API,
  CACHE_MOBILE_POSTERS,
  CACHE_MOBILE_SONGS,
  isMobileSuperCacheDevice,
};

export interface MobileCacheStatus {
  cachedCount: number;
  totalCount: number;
  inProgress: boolean;
  lastRunAt: number;
}

interface SongCatalogEntry {
  id: number | string;
  title?: string;
  url?: string;
  hasLrc?: boolean;
  lrcFile?: string | null;
  lrcUrl?: string | null;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

const STATUS_STORAGE_KEY = 'nl-mobile-cache-status-v1';
const QUOTA_LIMIT_RATIO = 0.72;
const SEGMENT_CONCURRENCY = 2;
const BATCH_YIELD_MS = 120;
const PLAYBACK_WAIT_POLL_MS = 3000;
const MAX_PLAYBACK_WAIT_MS = 180000;

const DATA_MANIFEST_FILES = [
  'songs.json',
  'videos.json',
  'games.json',
  'search-index.json',
  'youtube.json',
  'nl-music-fv.json',
  'lqip-manifest.json',
];

let activePrecachePromise: Promise<MobileCacheStatus | null> | null = null;

function getBaseUrl(): string {
  const raw = import.meta.env.BASE_URL || '/NL/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNetworkConnection(): NetworkInformationLike | undefined {
  return (navigator as unknown as { connection?: NetworkInformationLike }).connection;
}

function isNetworkAllowedForPrecache(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.onLine) return false;
  const conn = getNetworkConnection();
  if (conn?.saveData === true) return false;
  const eff = conn?.effectiveType;
  if (eff === '2g' || eff === 'slow-2g') return false;
  return true;
}

function isMediaOrCinemaBusy(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  const mediaPlaying = Array.from(document.querySelectorAll('audio, video')).some((el) => {
    const m = el as HTMLMediaElement;
    return !m.paused && !m.ended && m.readyState > 0;
  });
  return mediaPlaying || Boolean((window as unknown as { __NL_CINEMA_BUSY__?: boolean }).__NL_CINEMA_BUSY__);
}

async function waitForPlaybackIdle(): Promise<boolean> {
  const start = Date.now();
  while (isMediaOrCinemaBusy()) {
    if (!isNetworkAllowedForPrecache()) return false;
    if (Date.now() - start >= MAX_PLAYBACK_WAIT_MS) return false;
    await sleep(PLAYBACK_WAIT_POLL_MS);
  }
  return isNetworkAllowedForPrecache();
}

async function hasStorageHeadroom(): Promise<boolean> {
  try {
    if (!navigator.storage?.estimate) return true;
    const { usage, quota } = await navigator.storage.estimate();
    if (usage && quota && quota > 0 && usage / quota > QUOTA_LIMIT_RATIO) {
      return false;
    }
  } catch {
    // Ignore storage estimate failures and continue cautiously
  }
  return true;
}

function persistAndEmitStatus(status: MobileCacheStatus): void {
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch {
    // Ignore private-browsing quota errors
  }
  try {
    window.dispatchEvent(new CustomEvent('nl-mobile-cache-progress', { detail: status }));
  } catch {
    // Ignore dispatch errors
  }
}

export function getMobileCacheStatus(): MobileCacheStatus | null {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MobileCacheStatus;
  } catch {
    return null;
  }
}

export async function clearMobileSuperCache(): Promise<void> {
  try {
    const sw = navigator.serviceWorker?.controller;
    sw?.postMessage({ type: 'CLEAR_MOBILE_SUPER_CACHE' });
  } catch {
    // Ignore SW messaging failures
  }
  if ('caches' in window) {
    await Promise.all([
      caches.delete(CACHE_MOBILE_SONGS),
      caches.delete(CACHE_MOBILE_API),
      caches.delete(CACHE_MOBILE_POSTERS),
    ]);
  }
  try {
    localStorage.removeItem(STATUS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function parseHlsPlaylistLines(playlistText: string, baseUrl: string): {
  variants: string[];
  segments: string[];
} {
  const variants: string[] = [];
  const segments: string[] = [];
  const lines = playlistText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    try {
      const resolved = new URL(line, baseUrl).href;
      if (/\.m3u8(\?.*)?$/i.test(resolved)) {
        variants.push(resolved);
      } else {
        segments.push(resolved);
      }
    } catch {
      // Skip malformed URL lines
    }
  }

  return { variants, segments };
}

async function cacheSongLyrics(
  song: SongCatalogEntry,
  songsCache: Cache,
  baseUrl: string,
): Promise<void> {
  const targets: Array<{ url: string; mode: RequestMode }> = [];
  if (song.lrcUrl) {
    targets.push({ url: song.lrcUrl, mode: 'cors' });
  }
  if (song.hasLrc && song.lrcFile) {
    targets.push({
      url: `${baseUrl}lrc/${encodeURIComponent(song.lrcFile)}`,
      mode: 'same-origin',
    });
  }

  for (const target of targets) {
    try {
      const existing = await songsCache.match(target.url, { ignoreVary: true });
      if (existing) continue;
      const resp = await fetch(target.url, { mode: target.mode, credentials: 'omit' });
      if (resp.ok) {
        await songsCache.put(target.url, resp.clone());
      }
    } catch {
      // Lyrics are best-effort; never fail audio caching if one lyric URL hiccups
    }
  }
}

async function isSongAlreadyCached(
  song: SongCatalogEntry,
  songsCache: Cache,
): Promise<boolean> {
  if (!song.url) return true;
  const cachedManifest = await songsCache.match(song.url, { ignoreVary: true });
  if (!cachedManifest) return false;

  try {
    const manifestText = await cachedManifest.clone().text();
    const { variants, segments } = parseHlsPlaylistLines(manifestText, song.url);

    let effectiveSegments = segments;
    if (effectiveSegments.length === 0 && variants.length > 0) {
      const cachedVariant = await songsCache.match(variants[0], { ignoreVary: true });
      if (!cachedVariant) return false;
      const variantText = await cachedVariant.clone().text();
      effectiveSegments = parseHlsPlaylistLines(variantText, variants[0]).segments;
    }

    if (effectiveSegments.length === 0) return false;
    const lastSegUrl = effectiveSegments[effectiveSegments.length - 1];
    const lastSegHit = await songsCache.match(lastSegUrl, { ignoreVary: true });
    return Boolean(lastSegHit);
  } catch {
    return false;
  }
}

async function fetchAndCacheSegments(
  segments: string[],
  songsCache: Cache,
): Promise<boolean> {
  for (let i = 0; i < segments.length; i += SEGMENT_CONCURRENCY) {
    if (!(await waitForPlaybackIdle())) return false;
    if (!(await hasStorageHeadroom())) return false;

    const batch = segments.slice(i, i + SEGMENT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (segUrl) => {
        try {
          const hit = await songsCache.match(segUrl, { ignoreVary: true });
          if (hit) return true;
          const resp = await fetch(segUrl, { mode: 'cors', credentials: 'omit' });
          if (!resp.ok) return false;
          await songsCache.put(segUrl, resp.clone());
          return true;
        } catch {
          return false;
        }
      }),
    );

    if (results.some((ok) => !ok)) {
      return false;
    }

    if (i + SEGMENT_CONCURRENCY < segments.length) {
      await sleep(BATCH_YIELD_MS);
    }
  }
  return true;
}

async function cacheSingleSong(
  song: SongCatalogEntry,
  songsCache: Cache,
  baseUrl: string,
): Promise<'cached' | 'aborted' | 'failed'> {
  if (!song.url) return 'cached';

  // Fast skip if already atomically cached
  if (await isSongAlreadyCached(song, songsCache)) {
    await cacheSongLyrics(song, songsCache, baseUrl);
    return 'cached';
  }

  if (!(await waitForPlaybackIdle())) return 'aborted';
  if (!(await hasStorageHeadroom())) return 'aborted';

  try {
    const manifestResp = await fetch(song.url, { mode: 'cors', credentials: 'omit' });
    if (!manifestResp.ok) return 'failed';
    const manifestText = await manifestResp.clone().text();
    const { variants, segments } = parseHlsPlaylistLines(manifestText, song.url);

    let variantUrl: string | null = null;
    let variantResp: Response | null = null;
    let targetSegments = segments;

    // Handle nested master HLS playlists cleanly
    if (targetSegments.length === 0 && variants.length > 0) {
      variantUrl = variants[0];
      const vResp = await fetch(variantUrl, { mode: 'cors', credentials: 'omit' });
      if (!vResp.ok) return 'failed';
      const vText = await vResp.clone().text();
      variantResp = vResp;
      targetSegments = parseHlsPlaylistLines(vText, variantUrl).segments;
    }

    if (targetSegments.length === 0) return 'failed';

    const allSegmentsOk = await fetchAndCacheSegments(targetSegments, songsCache);
    if (!allSegmentsOk) {
      // Do NOT store .m3u8 so partial downloads self-heal on next launch
      return isNetworkAllowedForPrecache() ? 'failed' : 'aborted';
    }

    // Atomic per-song completion: store variant (if any) + primary .m3u8 only after all segments succeed
    if (variantUrl && variantResp) {
      await songsCache.put(variantUrl, variantResp);
    }
    await songsCache.put(song.url, manifestResp);

    await cacheSongLyrics(song, songsCache, baseUrl);
    return 'cached';
  } catch {
    return isNetworkAllowedForPrecache() ? 'failed' : 'aborted';
  }
}

async function precacheLocalDataManifests(
  apiCache: Cache,
  baseUrl: string,
): Promise<SongCatalogEntry[]> {
  let songs: SongCatalogEntry[] = [];

  for (const filename of DATA_MANIFEST_FILES) {
    const url = `${baseUrl}data/${filename}`;
    try {
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (resp.ok) {
        await apiCache.put(url, resp.clone());
        if (filename === 'songs.json') {
          const parsed = (await resp.json()) as unknown;
          if (Array.isArray(parsed)) {
            songs = parsed as SongCatalogEntry[];
          }
        }
      }
    } catch {
      if (filename === 'songs.json') {
        try {
          const cached = await apiCache.match(url, { ignoreVary: true });
          if (cached) {
            const parsed = (await cached.json()) as unknown;
            if (Array.isArray(parsed)) {
              songs = parsed as SongCatalogEntry[];
            }
          }
        } catch {
          // Ignore fallback parse error
        }
      }
    }
  }

  return songs;
}

function notifyServiceWorkerEnabled(reg?: ServiceWorkerRegistration | null): void {
  try {
    const target = reg?.active || navigator.serviceWorker?.controller;
    target?.postMessage({ type: 'SET_MOBILE_SUPER_CACHE', enabled: true });
  } catch {
    // Ignore SW message failures
  }
}

export function startMobileHomeSongsPrecache(
  reg?: ServiceWorkerRegistration | null,
): Promise<MobileCacheStatus | null> {
  if (!isMobileSuperCacheDevice()) {
    return Promise.resolve(null);
  }
  if (typeof window === 'undefined' || !('caches' in window)) {
    return Promise.resolve(null);
  }
  if (activePrecachePromise) {
    return activePrecachePromise;
  }

  activePrecachePromise = (async () => {
    notifyServiceWorkerEnabled(reg);

    // Ask OS to protect persistent mobile caches from silent eviction
    try {
      await navigator.storage?.persist?.();
    } catch {
      // Best effort
    }

    const baseUrl = getBaseUrl();
    const apiCache = await caches.open(CACHE_MOBILE_API);
    const songs = await precacheLocalDataManifests(apiCache, baseUrl);
    const totalCount = songs.length;

    if (totalCount === 0) {
      return getMobileCacheStatus();
    }

    const songsCache = await caches.open(CACHE_MOBILE_SONGS);
    let cachedCount = 0;

    // Count already-cached songs up front so progress reflects true state immediately
    const alreadyCachedFlags = await Promise.all(
      songs.map((song) => isSongAlreadyCached(song, songsCache)),
    );
    cachedCount = alreadyCachedFlags.filter(Boolean).length;

    const status: MobileCacheStatus = {
      cachedCount,
      totalCount,
      inProgress: cachedCount < totalCount,
      lastRunAt: Date.now(),
    };
    persistAndEmitStatus(status);

    if (cachedCount >= totalCount) {
      // Ensure any missing lyrics for cached songs are topped up quietly
      for (const song of songs) {
        if (!isNetworkAllowedForPrecache()) break;
        await cacheSongLyrics(song, songsCache, baseUrl);
      }
      const doneStatus: MobileCacheStatus = {
        cachedCount: totalCount,
        totalCount,
        inProgress: false,
        lastRunAt: Date.now(),
      };
      persistAndEmitStatus(doneStatus);
      return doneStatus;
    }

    try {
      for (let i = 0; i < songs.length; i++) {
        if (!isNetworkAllowedForPrecache()) break;
        if (!(await hasStorageHeadroom())) break;

        if (alreadyCachedFlags[i]) {
          await cacheSongLyrics(songs[i], songsCache, baseUrl);
          continue;
        }

        const outcome = await cacheSingleSong(songs[i], songsCache, baseUrl);
        if (outcome === 'aborted') {
          break;
        }
        if (outcome === 'cached') {
          cachedCount += 1;
          persistAndEmitStatus({
            cachedCount,
            totalCount,
            inProgress: cachedCount < totalCount,
            lastRunAt: Date.now(),
          });
        }

        await sleep(BATCH_YIELD_MS);
      }
    } finally {
      const finalStatus: MobileCacheStatus = {
        cachedCount,
        totalCount,
        inProgress: false,
        lastRunAt: Date.now(),
      };
      persistAndEmitStatus(finalStatus);
      activePrecachePromise = null;
    }

    return getMobileCacheStatus();
  })();

  return activePrecachePromise;
}
