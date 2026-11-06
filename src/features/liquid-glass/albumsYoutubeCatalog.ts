/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Lazily loads the 99-album YouTube video ID catalog outside the main JS bundle.
 */

export type AlbumsYoutubeCatalogMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

const CATALOG_URLS = [
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/data/albums-youtube-catalog.json',
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/data/albums-youtube-catalog.json',
  `${import.meta.env.BASE_URL || '/'}data/albums-youtube-catalog.json`,
];

let cachedCatalog: AlbumsYoutubeCatalogMap | null = null;
let inflightCatalog: Promise<AlbumsYoutubeCatalogMap> | null = null;

export async function loadAlbumsYoutubeCatalog(): Promise<AlbumsYoutubeCatalogMap> {
  if (cachedCatalog) return cachedCatalog;
  if (inflightCatalog) return inflightCatalog;

  inflightCatalog = (async () => {
    for (const url of CATALOG_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = (await res.json()) as AlbumsYoutubeCatalogMap;
        if (data && typeof data === 'object') {
          cachedCatalog = data;
          return data;
        }
      } catch {
        /* try next URL */
      }
    }
    return {};
  })();

  return inflightCatalog;
}

if (typeof window !== 'undefined') {
  void loadAlbumsYoutubeCatalog();
}

export function getTrackYoutubeVideoId(albumId: string, trackNum: number): string | null {
  if (!cachedCatalog) {
    void loadAlbumsYoutubeCatalog();
    return null;
  }
  const albumMap = cachedCatalog[albumId];
  if (!albumMap) return null;
  return albumMap[String(trackNum)] ?? albumMap['1'] ?? null;
}
