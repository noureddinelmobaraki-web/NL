/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Cartoon Metadata Client
 * - Enriches Spacetoon & Classic Arabic Cartoon items with high-res posters/backdrops from TMDB
 * - Fetches Global Animation Series & Movies (Disney, Pixar, Cartoon Network, Warner Bros) via TMDB Discover API
 */

import { PUBLIC_TMDB_KEY } from '../../../config/publicKeys';
import type { CartoonSeriesItem } from '../types/cartoon.types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

let cachedGlobalCartoons: CartoonSeriesItem[] | null = null;

export async function fetchGlobalAnimationCatalog(): Promise<CartoonSeriesItem[]> {
  if (cachedGlobalCartoons && cachedGlobalCartoons.length > 0) {
    return cachedGlobalCartoons;
  }

  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  if (!tmdbKey) return [];

  try {
    const [tvRes, movieRes] = await Promise.all([
      fetch(
        `${TMDB_BASE}/discover/tv?api_key=${tmdbKey}&with_genres=16&language=ar-SA&sort_by=popularity.desc&page=1`,
        { signal: AbortSignal.timeout(6500) },
      ),
      fetch(
        `${TMDB_BASE}/discover/movie?api_key=${tmdbKey}&with_genres=16&language=ar-SA&sort_by=popularity.desc&page=1`,
        { signal: AbortSignal.timeout(6500) },
      ),
    ]);

    const tvJson = tvRes.ok ? await tvRes.json() : { results: [] };
    const movieJson = movieRes.ok ? await movieRes.json() : { results: [] };

    const mapTmdbItem = (raw: any, mediaType: 'tv' | 'movie'): CartoonSeriesItem => {
      const tmdbId = Number(raw?.id);
      const titleAr = raw?.name || raw?.title || 'كرتون عالمي';
      const titleEn = raw?.original_name || raw?.original_title || titleAr;
      const yearStr = String(raw?.first_air_date || raw?.release_date || '2022');
      const poster = raw?.poster_path
        ? `${TMDB_IMAGE_BASE}/w500${raw.poster_path}`
        : '';
      const backdrop = raw?.backdrop_path
        ? `${TMDB_IMAGE_BASE}/w1280${raw.backdrop_path}`
        : poster;

      return {
        id: `tmdb-${mediaType}-${tmdbId}`,
        titleAr,
        titleEn,
        planet: mediaType === 'movie' ? 'movies' : 'global',
        planetLabelAr: mediaType === 'movie' ? 'أفلام أنيميشن' : 'أنيميشن عالمي',
        studio: 'أنيميشن عالمي',
        year: Number(yearStr.slice(0, 4)) || 2022,
        rating: Number(Number(raw?.vote_average || 8.0).toFixed(1)),
        episodesCount: mediaType === 'movie' ? 1 : 24,
        synopsisAr:
          raw?.overview ||
          'عمل أنيميشن عالمي متميز متاح للمشاهدة والتحميل بجودة عالية.',
        posterUrl: poster,
        backdropUrl: backdrop,
        tmdbId,
        mediaType,
        archiveIds: [],
      };
    };

    const tvList = Array.isArray(tvJson?.results)
      ? tvJson.results.slice(0, 12).map((r: any) => mapTmdbItem(r, 'tv'))
      : [];
    const movieList = Array.isArray(movieJson?.results)
      ? movieJson.results.slice(0, 12).map((r: any) => mapTmdbItem(r, 'movie'))
      : [];

    cachedGlobalCartoons = [...tvList, ...movieList].filter((i) => Boolean(i.posterUrl));
    return cachedGlobalCartoons;
  } catch {
    return [];
  }
}

export async function enrichCartoonWithTmdbPoster(
  item: CartoonSeriesItem,
): Promise<CartoonSeriesItem> {
  if (!item.tmdbId) return item;
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  if (!tmdbKey) return item;

  try {
    const res = await fetch(
      `${TMDB_BASE}/${item.mediaType}/${item.tmdbId}?api_key=${tmdbKey}&language=ar-SA`,
      { signal: AbortSignal.timeout(4500) },
    );
    if (!res.ok) return item;
    const data = await res.json();
    const poster = data?.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}`
      : item.posterUrl;
    const backdrop = data?.backdrop_path
      ? `${TMDB_IMAGE_BASE}/w1280${data.backdrop_path}`
      : item.backdropUrl;

    return {
      ...item,
      posterUrl: poster,
      backdropUrl: backdrop,
      synopsisAr: item.synopsisAr || data?.overview || item.synopsisAr,
    };
  } catch {
    return item;
  }
}
