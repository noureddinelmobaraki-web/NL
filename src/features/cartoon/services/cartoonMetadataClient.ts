/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type {
  CartoonSeriesItem,
  SpacetoonPlanetId,
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

function mapGenresToSpacetoonPlanet(genreIds: number[]): {
  planet: SpacetoonPlanetId;
  labelAr: string;
} {
  if (genreIds.includes(28) || genreIds.includes(10759)) {
    return { planet: 'action', labelAr: 'كوكب أكشن' };
  }
  if (genreIds.includes(12)) {
    return { planet: 'adventure', labelAr: 'كوكب مغامرات' };
  }
  if (genreIds.includes(35)) {
    return { planet: 'comedy', labelAr: 'كوكب كوميديا' };
  }
  if (genreIds.includes(9648) || genreIds.includes(80)) {
    return { planet: 'abjad', labelAr: 'كوكب أبجد' };
  }
  if (genreIds.includes(878)) {
    return { planet: 'science', labelAr: 'كوكب علوم' };
  }
  if (genreIds.includes(36) || genreIds.includes(10752)) {
    return { planet: 'history', labelAr: 'كوكب تاريخ' };
  }
  return { planet: 'zomoroda', labelAr: 'كوكب زمردة' };
}

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

/**
 * Fetches global family animation movies & series from TMDB Discover (Genre 16 = Animation)
 */
export async function fetchGlobalAnimationCatalog(
  page = 1,
): Promise<CartoonSeriesItem[]> {
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch(
        `${TMDB_BASE}/discover/movie?api_key=${PUBLIC_TMDB_KEY}&with_genres=16,10751&language=ar-SA&sort_by=popularity.desc&page=${page}`,
      ),
      fetch(
        `${TMDB_BASE}/discover/tv?api_key=${PUBLIC_TMDB_KEY}&with_genres=16,10762&language=ar-SA&sort_by=popularity.desc&page=${page}`,
      ),
    ]);

    const items: CartoonSeriesItem[] = [];

    if (moviesRes.ok) {
      const mData = await moviesRes.json();
      for (const m of (mData.results || []).slice(0, 18)) {
        if (!m.poster_path) continue;
        items.push({
          id: `tmdb-anim-movie-${m.id}`,
          titleAr: m.title || m.original_title || 'فيلم رسوم متحركة',
          titleEn: m.original_title || m.title || 'Animation Movie',
          planet: 'movies',
          planetLabelAr: 'أفلام الكرتون',
          studio: 'أنيميشن عالمي',
          year: Number((m.release_date || '2020').slice(0, 4)) || 2020,
          episodesCount: 1,
          rating: Number((m.vote_average || 7.8).toFixed(1)),
          posterUrl: `${TMDB_IMG_W500}${m.poster_path}`,
          backdropUrl: m.backdrop_path
            ? `${TMDB_IMG_W1280}${m.backdrop_path}`
            : `${TMDB_IMG_W500}${m.poster_path}`,
          synopsisAr:
            m.overview || 'فيلم رسوم متحركة عائلي عالمي بجودة عالية.',
          tmdbId: m.id,
          mediaType: 'movie',
          archiveIds: [],
        });
      }
    }

    if (tvRes.ok) {
      const tData = await tvRes.json();
      for (const t of (tData.results || []).slice(0, 18)) {
        if (!t.poster_path) continue;
        const mapped = mapGenresToSpacetoonPlanet(t.genre_ids || []);
        items.push({
          id: `tmdb-anim-tv-${t.id}`,
          titleAr: t.name || t.original_name || 'مسلسل كرتون',
          titleEn: t.original_name || t.name || 'Animated Series',
          planet: mapped.planet,
          planetLabelAr: mapped.labelAr,
          studio: 'أنيميشن عالمي',
          year: Number((t.first_air_date || '2018').slice(0, 4)) || 2018,
          episodesCount: 24,
          rating: Number((t.vote_average || 8.0).toFixed(1)),
          posterUrl: `${TMDB_IMG_W500}${t.poster_path}`,
          backdropUrl: t.backdrop_path
            ? `${TMDB_IMG_W1280}${t.backdrop_path}`
            : `${TMDB_IMG_W500}${t.poster_path}`,
          synopsisAr: t.overview || 'مسلسل رسوم متحركة عالمي ممتع.',
          tmdbId: t.id,
          mediaType: 'tv',
          archiveIds: [],
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}
