/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Official YTS.GG v2 API Client (Primary: https://movies-api.accel.li/api/v2/)
 * Supports:
 *  - list_movies.json (search by IMDb ID or Title, quality filters: 480p, 720p, 1080p, 1080p.x265, 2160p, 3D)
 *  - movie_details.json (with_images=true & with_cast=true)
 *  - movie_suggestions.json
 *  - movie_parental_guides.json
 *  - Non-destructive metadata, poster, backdrop, trailer & subtitle IMDb ID enrichment
 */

import type { CinemaItem } from '../components/Movies/moviesDataClient';

export const YTS_API_MIRRORS = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.gg/api/v2',
  'https://yts.mx/api/v2',
] as const;

export const YTS_RECOMMENDED_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://open.stealth.si:80/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://tracker.leechers-paradise.org:6969',
  'udp://p4p.arenabg.ch:1337',
  'udp://tracker.internetwarriors.net:1337',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
] as const;

export interface YtsTorrentEntry {
  url: string;
  hash: string;
  quality: string; // '480p' | '720p' | '1080p' | '2160p' | '3D'
  type: string; // 'bluray' | 'web'
  is_repack?: string;
  video_codec?: string; // 'x264' | 'x265'
  bit_depth?: string; // '8' | '10'
  audio_channels?: string; // '2.0' | '5.1' | '7.1'
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded?: string;
}

export interface YtsCastEntry {
  name: string;
  character_name: string;
  url_small_image?: string;
  imdb_code?: string;
}

export interface YtsMovieRecord {
  id: number;
  url?: string;
  imdb_code: string;
  title: string;
  title_english?: string;
  title_long?: string;
  slug?: string;
  year: number;
  rating: number;
  runtime: number;
  genres?: string[];
  summary?: string;
  description_full?: string;
  synopsis?: string;
  yt_trailer_code?: string;
  language?: string;
  mpa_rating?: string;
  background_image?: string;
  background_image_original?: string;
  small_cover_image?: string;
  medium_cover_image?: string;
  large_cover_image?: string;
  medium_screenshot_image1?: string;
  medium_screenshot_image2?: string;
  medium_screenshot_image3?: string;
  large_screenshot_image1?: string;
  large_screenshot_image2?: string;
  large_screenshot_image3?: string;
  cast?: YtsCastEntry[];
  torrents?: YtsTorrentEntry[];
}

export interface YtsParentalGuideItem {
  type: string;
  parental_guide_text: string;
}

const ytsCache = new Map<string, { at: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

async function fetchYtsEndpoint<T = any>(
  endpointPath: string,
  params: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      qs.set(k, String(v));
    }
  }
  const queryString = qs.toString();
  const cacheKey = `${endpointPath}?${queryString}`;
  const cached = ytsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data as T;
  }

  for (const base of YTS_API_MIRRORS) {
    if (signal?.aborted) return null;
    const url = `${base}/${endpointPath.replace(/^\/+/, '')}${queryString ? `?${queryString}` : ''}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: signal ?? AbortSignal.timeout(5500),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json && json.status === 'ok' && json.data) {
        ytsCache.set(cacheKey, { at: Date.now(), data: json.data });
        return json.data as T;
      }
    } catch {
      // Try next mirror
    }
  }
  return null;
}

export function buildYtsMagnetUri(
  hash: string,
  movieTitle: string,
  extraTrackers: string[] = [],
): string {
  const cleanHash = hash.trim().toLowerCase();
  const trackers = Array.from(new Set([...YTS_RECOMMENDED_TRACKERS, ...extraTrackers]));
  const trParams = trackers.map((tr) => `tr=${encodeURIComponent(tr)}`).join('&');
  return `magnet:?xt=urn:btih:${cleanHash}&dn=${encodeURIComponent(movieTitle)}&${trParams}`;
}

export async function fetchYtsListMovies(
  params: {
    limit?: number;
    page?: number;
    quality?: 'All' | '480p' | '720p' | '1080p' | '1080p.x265' | '2160p' | '3D';
    minimum_rating?: number;
    query_term?: string;
    genre?: string;
    sort_by?: string;
    order_by?: 'desc' | 'asc';
    with_rt_ratings?: boolean;
  },
  signal?: AbortSignal,
): Promise<YtsMovieRecord[]> {
  const data = await fetchYtsEndpoint<{ movie_count?: number; movies?: YtsMovieRecord[] }>(
    'list_movies.json',
    {
      limit: params.limit ?? 20,
      page: params.page ?? 1,
      quality: params.quality,
      minimum_rating: params.minimum_rating,
      query_term: params.query_term,
      genre: params.genre,
      sort_by: params.sort_by,
      order_by: params.order_by,
      with_rt_ratings: params.with_rt_ratings ?? true,
    },
    signal,
  );
  return Array.isArray(data?.movies) ? data!.movies : [];
}

export async function fetchYtsMovieDetails(
  params: {
    movieId?: number | string;
    imdbId?: string;
    withImages?: boolean;
    withCast?: boolean;
  },
  signal?: AbortSignal,
): Promise<YtsMovieRecord | null> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    with_images: params.withImages ?? true,
    with_cast: params.withCast ?? true,
  };
  if (params.movieId !== undefined && params.movieId !== null && String(params.movieId) !== '') {
    queryParams.movie_id = params.movieId;
  } else if (params.imdbId) {
    queryParams.imdb_id = params.imdbId;
  } else {
    return null;
  }

  const data = await fetchYtsEndpoint<{ movie?: YtsMovieRecord }>(
    'movie_details.json',
    queryParams,
    signal,
  );
  return data?.movie && data.movie.id ? data.movie : null;
}

export async function fetchYtsMovieSuggestions(
  ytsMovieId: number,
  signal?: AbortSignal,
): Promise<YtsMovieRecord[]> {
  if (!ytsMovieId || ytsMovieId <= 0) return [];
  const data = await fetchYtsEndpoint<{ movies?: YtsMovieRecord[] }>(
    'movie_suggestions.json',
    { movie_id: ytsMovieId },
    signal,
  );
  return Array.isArray(data?.movies) ? data!.movies : [];
}

export async function fetchYtsParentalGuides(
  ytsMovieId: number,
  signal?: AbortSignal,
): Promise<YtsParentalGuideItem[]> {
  if (!ytsMovieId || ytsMovieId <= 0) return [];
  const data = await fetchYtsEndpoint<{ parental_guides?: YtsParentalGuideItem[] }>(
    'movie_parental_guides.json',
    { movie_id: ytsMovieId },
    signal,
  );
  return Array.isArray(data?.parental_guides) ? data!.parental_guides : [];
}

/**
 * Resolves the complete YTS movie record + ALL available torrent qualities
 * (480p, 720p, 1080p, 1080p.x265, 2160p 4K) by querying both IMDb ID and Title
 * across `list_movies.json` and `movie_details.json`.
 */
export async function resolveYtsMovieAndTorrents(params: {
  imdbId?: string;
  title?: string;
  originalTitle?: string;
  year?: string | number;
  signal?: AbortSignal;
}): Promise<{
  movie: YtsMovieRecord | null;
  torrents: YtsTorrentEntry[];
  suggestions: YtsMovieRecord[];
  parentalGuides: YtsParentalGuideItem[];
}> {
  const cleanImdb =
    params.imdbId && /^tt\d+$/i.test(params.imdbId.trim()) ? params.imdbId.trim() : '';
  const searchTitle = (params.originalTitle || params.title || '').trim();
  const targetYear = params.year ? Number(String(params.year).slice(0, 4)) : undefined;

  const matchedMovies: YtsMovieRecord[] = [];

  const tasks: Promise<void>[] = [];
  if (cleanImdb) {
    tasks.push(
      fetchYtsListMovies({ query_term: cleanImdb, limit: 10, with_rt_ratings: true }, params.signal).then(
        (list) => {
          matchedMovies.push(...list);
        },
      ),
    );
    tasks.push(
      fetchYtsMovieDetails({ imdbId: cleanImdb, withImages: true, withCast: true }, params.signal).then(
        (det) => {
          if (det) matchedMovies.push(det);
        },
      ),
    );
  }

  if (searchTitle) {
    tasks.push(
      fetchYtsListMovies({ query_term: searchTitle, limit: 15, with_rt_ratings: true }, params.signal).then(
        (list) => {
          const filtered = list.filter((m) => {
            if (cleanImdb && m.imdb_code?.toLowerCase() === cleanImdb.toLowerCase()) return true;
            const normA = (m.title_english || m.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
            const normB = searchTitle.toLowerCase().replace(/[^a-z0-9]+/g, '');
            const titleMatches = normA === normB || normA.includes(normB) || normB.includes(normA);
            const yearMatches = !targetYear || !m.year || Math.abs(m.year - targetYear) <= 1;
            return titleMatches && yearMatches;
          });
          matchedMovies.push(...filtered);
        },
      ),
    );
  }

  await Promise.allSettled(tasks);

  let primaryMovie = matchedMovies[0] || null;

  if (primaryMovie?.id && (!primaryMovie.cast || !primaryMovie.background_image_original)) {
    const detailed = await fetchYtsMovieDetails(
      { movieId: primaryMovie.id, withImages: true, withCast: true },
      params.signal,
    );
    if (detailed) {
      primaryMovie = { ...primaryMovie, ...detailed };
      matchedMovies.unshift(detailed);
    }
  }

  const torrentMap = new Map<string, YtsTorrentEntry>();
  for (const mv of matchedMovies) {
    for (const tor of mv.torrents || []) {
      if (!tor?.hash || !/^[0-9a-fA-F]{40}$/.test(tor.hash.trim())) continue;
      const key = tor.hash.trim().toLowerCase();
      if (!torrentMap.has(key)) {
        torrentMap.set(key, {
          ...tor,
          hash: key,
        });
      }
    }
  }

  let suggestions: YtsMovieRecord[] = [];
  let parentalGuides: YtsParentalGuideItem[] = [];
  if (primaryMovie?.id) {
    const [sugRes, pgRes] = await Promise.allSettled([
      fetchYtsMovieSuggestions(primaryMovie.id, params.signal),
      fetchYtsParentalGuides(primaryMovie.id, params.signal),
    ]);
    if (sugRes.status === 'fulfilled') suggestions = sugRes.value;
    if (pgRes.status === 'fulfilled') parentalGuides = pgRes.value;
  }

  return {
    movie: primaryMovie,
    torrents: Array.from(torrentMap.values()),
    suggestions,
    parentalGuides,
  };
}

/**
 * Non-destructively enriches a CinemaItem with YTS v2 metadata, HD posters,
 * backdrops, IMDb ID, YouTube trailer, certification, runtime, and cast
 * WITHOUT overwriting existing valid localized TMDB data.
 */
export async function enrichCinemaItemWithYts(
  item: CinemaItem,
  signal?: AbortSignal,
): Promise<CinemaItem> {
  if (item.mediaType !== 'movie') return item;
  try {
    const { movie } = await resolveYtsMovieAndTorrents({
      imdbId: item.imdbId,
      title: item.title,
      year: item.year,
      signal,
    });
    if (!movie) return item;

    const hasMissingOverview =
      !item.overview ||
      item.overview.includes('unavailable') ||
      item.overview.includes('non disponible') ||
      item.overview.includes('not available');

    return {
      ...item,
      imdbId: item.imdbId || movie.imdb_code || undefined,
      posterPath:
        item.posterPath ||
        movie.large_cover_image ||
        movie.medium_cover_image ||
        '',
      backdropPath:
        item.backdropPath ||
        movie.background_image_original ||
        movie.large_screenshot_image1 ||
        movie.background_image ||
        '',
      trailerKey: item.trailerKey || movie.yt_trailer_code || '',
      rating: item.rating > 0 ? item.rating : movie.rating || 0,
      runtime: item.runtime || (movie.runtime > 0 ? movie.runtime : undefined),
      certification: item.certification || movie.mpa_rating || undefined,
      overview:
        hasMissingOverview && (movie.description_full || movie.synopsis || movie.summary)
          ? movie.description_full || movie.synopsis || movie.summary || item.overview
          : item.overview,
      cast:
        item.cast && item.cast.length > 0
          ? item.cast
          : (movie.cast || []).map((c, idx) => ({
              id: idx + 1,
              name: c.name,
              character: c.character_name || '',
              profilePath: c.url_small_image || '',
            })),
    };
  } catch {
    return item;
  }
}
