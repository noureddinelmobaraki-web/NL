/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type {
  CartoonSeriesItem,
} from '../types/cartoon.types';

const PUBLIC_TMDB_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_W1280 = 'https://image.tmdb.org/t/p/w1280';
const ANILIST_GQL = 'https://graphql.anilist.co';

const POSTER_CACHE_KEY = 'nl_cartoon_posters_v5';

export interface PosterCacheEntry {
  posterUrl: string;
  backdropUrl?: string;
}

const MEMORY_POSTER_CACHE: Record<string, PosterCacheEntry> = {};

function loadPosterCache(): Record<string, PosterCacheEntry> {
  if (Object.keys(MEMORY_POSTER_CACHE).length > 0) {
    return MEMORY_POSTER_CACHE;
  }
  try {
    const raw = localStorage.getItem(POSTER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PosterCacheEntry>;
    Object.assign(MEMORY_POSTER_CACHE, parsed);
    return MEMORY_POSTER_CACHE;
  } catch {
    return MEMORY_POSTER_CACHE;
  }
}

function savePosterCache(cache: Record<string, PosterCacheEntry>): void {
  Object.assign(MEMORY_POSTER_CACHE, cache);
  try {
    localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(MEMORY_POSTER_CACHE));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Batch-resolves official high-resolution cover & banner artwork from AniList GraphQL
 * in a SINGLE HTTP request for up to 50 MAL IDs at once (zero rate-limiting).
 */
export async function fetchAniListBatchPostersByMalIds(
  malIds: number[],
): Promise<Map<number, PosterCacheEntry>> {
  const uniqueIds = Array.from(
    new Set(malIds.filter((id) => Number.isFinite(id) && id > 0)),
  );
  const resultMap = new Map<number, PosterCacheEntry>();
  if (uniqueIds.length === 0) return resultMap;

  const cache = loadPosterCache();
  const missingIds: number[] = [];

  for (const id of uniqueIds) {
    const cached = cache[`mal-${id}`];
    if (cached?.posterUrl) {
      resultMap.set(id, cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return resultMap;

  const query = `
    query ($idMals: [Int]) {
      Page(page: 1, perPage: 50) {
        media(idMal_in: $idMals, type: ANIME) {
          idMal
          coverImage { extraLarge large }
          bannerImage
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { idMals: missingIds },
      }),
      signal: AbortSignal.timeout(7500),
    });

    if (res.ok) {
      const json = await res.json();
      const mediaList: any[] = json?.data?.Page?.media ?? [];
      for (const m of mediaList) {
        const malId = Number(m?.idMal);
        const poster = m?.coverImage?.extraLarge || m?.coverImage?.large || '';
        if (malId && poster) {
          const entry: PosterCacheEntry = {
            posterUrl: poster,
            backdropUrl: m?.bannerImage || poster,
          };
          resultMap.set(malId, entry);
          cache[`mal-${malId}`] = entry;
        }
      }
      savePosterCache(cache);
    }
  } catch {
    // Fall through to individual TMDB resolution
  }

  return resultMap;
}

export const resolveBatchAnimeAndCartoonPosters = fetchAniListBatchPostersByMalIds;

export async function resolvePosterByTmdbOrMal(params: {
  cacheId: string;
  tmdbId?: number;
  malId?: number;
  titleEn?: string;
  isMovie?: boolean;
  fallbackPosterUrl: string;
  fallbackBackdropUrl?: string;
}): Promise<PosterCacheEntry> {
  const cache = loadPosterCache();
  const cached = cache[params.cacheId];
  if (cached?.posterUrl) {
    return cached;
  }

  // 1. Check if already resolved in batch MAL cache
  if (params.malId && cache[`mal-${params.malId}`]?.posterUrl) {
    const malCached = cache[`mal-${params.malId}`];
    cache[params.cacheId] = malCached;
    savePosterCache(cache);
    return malCached;
  }

  // 2. Try TMDB by ID first
  if (params.tmdbId) {
    try {
      const endpoint = params.isMovie ? 'movie' : 'tv';
      const res = await fetch(
        `${TMDB_BASE}/${endpoint}/${params.tmdbId}?api_key=${PUBLIC_TMDB_KEY}`,
        { signal: AbortSignal.timeout(5500) },
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.poster_path) {
          const entry: PosterCacheEntry = {
            posterUrl: `${TMDB_IMG_W500}${data.poster_path}`,
            backdropUrl: data.backdrop_path
              ? `${TMDB_IMG_W1280}${data.backdrop_path}`
              : params.fallbackBackdropUrl ||
                `${TMDB_IMG_W500}${data.poster_path}`,
          };
          cache[params.cacheId] = entry;
          savePosterCache(cache);
          return entry;
        }
      }
    } catch {
      // fall through
    }
  }

  // 3. Try AniList single query by malId (fast & no 429 rate-limit like Jikan)
  if (params.malId) {
    const batchMap = await fetchAniListBatchPostersByMalIds([params.malId]);
    const hit = batchMap.get(params.malId);
    if (hit?.posterUrl) {
      cache[params.cacheId] = hit;
      savePosterCache(cache);
      return hit;
    }
  }

  // 4. Try TMDB search by English title
  if (params.titleEn) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/multi?api_key=${PUBLIC_TMDB_KEY}&query=${encodeURIComponent(params.titleEn)}&include_adult=false`,
        { signal: AbortSignal.timeout(5500) },
      );
      if (res.ok) {
        const data = await res.json();
        const match = (data?.results || []).find((r: any) =>
          Boolean(r?.poster_path),
        );
        if (match?.poster_path) {
          const entry: PosterCacheEntry = {
            posterUrl: `${TMDB_IMG_W500}${match.poster_path}`,
            backdropUrl: match.backdrop_path
              ? `${TMDB_IMG_W1280}${match.backdrop_path}`
              : params.fallbackBackdropUrl ||
                `${TMDB_IMG_W500}${match.poster_path}`,
          };
          cache[params.cacheId] = entry;
          savePosterCache(cache);
          return entry;
        }
      }
    } catch {
      // fall through
    }
  }

  return {
    posterUrl: params.fallbackPosterUrl,
    backdropUrl: params.fallbackBackdropUrl || params.fallbackPosterUrl,
  };
}

/**
 * Enriches a Spacetoon registry item with high-res AniList/TMDB poster & backdrop
 */
export async function enrichCartoonWithTmdbPoster(
  item: CartoonSeriesItem,
): Promise<CartoonSeriesItem> {
  const resolved = await resolvePosterByTmdbOrMal({
    cacheId: item.id,
    tmdbId: item.tmdbId,
    malId: item.malId,
    titleEn: item.titleEn,
    isMovie: item.mediaType === 'movie',
    fallbackPosterUrl: item.posterUrl,
    fallbackBackdropUrl: item.backdropUrl,
  });

  return {
    ...item,
    posterUrl: resolved.posterUrl || item.posterUrl,
    backdropUrl: resolved.backdropUrl || item.backdropUrl || resolved.posterUrl,
  };
}

/**
 * Enriches all items in a CartoonSeriesItem list using a single batch AniList warm-up first
 */
export async function enrichCartoonCatalogPosters(
  items: CartoonSeriesItem[],
): Promise<CartoonSeriesItem[]> {
  const malIds = items
    .map((i) => i.malId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  await fetchAniListBatchPostersByMalIds(malIds);
  return Promise.all(items.map((item) => enrichCartoonWithTmdbPoster(item)));
}

export const GOLDEN_AGE_CARTOON_VAULTS: CartoonSeriesItem[] = [
  {
    id: 'classic-toons-2025',
    titleAr: 'Golden Age Cartoon Treasury — Fleischer, Looney Tunes, Tom & Jerry, Popeye & Droopy',
    titleEn: 'Golden Age Cartoon Treasury — Fleischer, Looney Tunes, Tom & Jerry, Popeye & Droopy',
    planet: 'global',
    planetLabelAr: 'أنيميشن عالمي (العصر الذهبي)',
    studio: 'أنيميشن عالمي',
    year: 1940,
    episodesCount: 55,
    rating: 9.4,
    posterUrl: 'https://archive.org/services/img/classic-toons-2025',
    backdropUrl: 'https://archive.org/services/img/classic-toons-2025',
    synopsisAr:
      '55 restored Golden-Age theatrical animated shorts including Fleischer Studios, Looney Tunes, Tom & Jerry, Popeye the Sailor, and Tex Avery Droopy classics.',
    mediaType: 'tv',
    archiveIds: ['classic-toons-2025'],
  },
  {
    id: 'pdcartooncollection',
    titleAr: '124 Classic Public Domain Cartoons — Popeye, Superman, Merrie Melodies & Betty Boop',
    titleEn: '124 Classic Public Domain Cartoons — Popeye, Superman, Merrie Melodies & Betty Boop',
    planet: 'global',
    planetLabelAr: 'أنيميشن عالمي (العصر الذهبي)',
    studio: 'أنيميشن عالمي',
    year: 1938,
    episodesCount: 124,
    rating: 9.5,
    posterUrl: 'https://archive.org/services/img/pdcartooncollection',
    backdropUrl: 'https://archive.org/services/img/pdcartooncollection',
    synopsisAr:
      '124 classic theatrical cartoons featuring Fleischer Superman, Popeye the Sailor, Merrie Melodies, Looney Tunes, and Betty Boop.',
    mediaType: 'tv',
    archiveIds: ['pdcartooncollection'],
  },
  {
    id: 'cartoon-classics-vol-1-25-favorite-cartoons-3-hours',
    titleAr: 'Cartoon Classics Vol. 1 — 25 Favorite Theatrical Shorts',
    titleEn: 'Cartoon Classics Vol. 1 — 25 Favorite Theatrical Shorts',
    planet: 'global',
    planetLabelAr: 'أنيميشن عالمي (العصر الذهبي)',
    studio: 'أنيميشن عالمي',
    year: 1942,
    episodesCount: 25,
    rating: 9.1,
    posterUrl:
      'https://archive.org/services/img/cartoon-classics-vol-1-25-favorite-cartoons-3-hours',
    backdropUrl:
      'https://archive.org/services/img/cartoon-classics-vol-1-25-favorite-cartoons-3-hours',
    synopsisAr:
      '3-hour anthology of 25 favorite vintage theatrical cartoon shorts from the Golden Age of American animation.',
    mediaType: 'tv',
    archiveIds: ['cartoon-classics-vol-1-25-favorite-cartoons-3-hours'],
  },
  {
    id: 'comic-toons-philip-loro-international-pictures',
    titleAr: 'Comic Toons Classic Anthology — 22 Restored Theatrical Shorts',
    titleEn: 'Comic Toons Classic Anthology — 22 Restored Theatrical Shorts',
    planet: 'global',
    planetLabelAr: 'أنيميشن عالمي (العصر الذهبي)',
    studio: 'أنيميشن عالمي',
    year: 1945,
    episodesCount: 22,
    rating: 9.0,
    posterUrl:
      'https://archive.org/services/img/comic-toons-philip-loro-international-pictures',
    backdropUrl:
      'https://archive.org/services/img/comic-toons-philip-loro-international-pictures',
    synopsisAr:
      '22 restored theatrical cartoon shorts curated from Philip Loro International Pictures archives.',
    mediaType: 'tv',
    archiveIds: ['comic-toons-philip-loro-international-pictures'],
  },
];

/**
 * Returns the curated Golden-Age & Classic Cartoon Archive Vaults (replacing Jikan genres=15)
 */
export async function fetchGlobalAnimationCatalog(
  _page = 1,
): Promise<CartoonSeriesItem[]> {
  return GOLDEN_AGE_CARTOON_VAULTS;
}
