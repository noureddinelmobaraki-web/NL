/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

let mapCache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export function preloadSongYoutubeMap(): Promise<Record<string, string>> {
  if (mapCache) return Promise.resolve(mapCache);
  if (inflight) return inflight;
  const base = import.meta.env?.BASE_URL || '/';
  const url = `${base.endsWith('/') ? base : `${base}/`}data/song-youtube.json`;
  const promise: Promise<Record<string, string>> = fetch(url, { cache: 'force-cache' })
    .then((r) =>
      r.ok
        ? (r.json() as Promise<Record<string, string>>)
        : Promise.resolve({} as Record<string, string>),
    )
    .then((data): Record<string, string> => {
      const normalized: Record<string, string> =
        data && typeof data === 'object' ? (data as Record<string, string>) : {};
      mapCache = normalized;
      return normalized;
    })
    .catch((): Record<string, string> => {
      const empty: Record<string, string> = {};
      mapCache = empty;
      return empty;
    });
  inflight = promise;
  return promise;
}

if (typeof window !== 'undefined') {
  void preloadSongYoutubeMap();
}

export function getSongYoutubeId(songId: number | string): string | null {
  if (!mapCache) {
    void preloadSongYoutubeMap();
    return null;
  }
  const v = mapCache[String(songId)];
  return v && v.trim().length > 0 ? v.trim() : null;
}
