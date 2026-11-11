/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * TVmaze Keyless API Series & Episode Enricher
 * - Enriches TV series with full episode guides, episode thumbnails, summaries,
 *   airdates, and network info without consuming TMDB API quota.
 */

export interface TvMazeEpisodeInfo {
  id: number;
  season: number;
  number: number;
  name: string;
  airdate: string;
  runtime: number | null;
  rating: number | null;
  summaryText: string;
  thumbnailUrl: string;
  originalImageUrl: string;
}

export interface TvMazeShowEnrichment {
  tvmazeId: number;
  name: string;
  status: string;
  premiered: string;
  ended: string | null;
  networkName: string;
  rating: number | null;
  summaryText: string;
  posterUrl: string;
  episodes: TvMazeEpisodeInfo[];
  episodesBySeason: Record<number, TvMazeEpisodeInfo[]>;
}

const TVMAZE_CACHE = new Map<string, TvMazeShowEnrichment>();

function stripHtmlTags(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTvMazeEpisodes(rawEpisodes: unknown[]): TvMazeEpisodeInfo[] {
  if (!Array.isArray(rawEpisodes)) return [];
  const parsed: TvMazeEpisodeInfo[] = [];

  for (const item of rawEpisodes) {
    if (!item || typeof item !== 'object') continue;
    const ep = item as Record<string, unknown>;
    const season = Number(ep.season) || 1;
    const number = Number(ep.number) || 1;
    const imageObj = (ep.image as Record<string, string> | undefined) || {};
    const ratingObj = (ep.rating as Record<string, number> | undefined) || {};

    parsed.push({
      id: Number(ep.id) || season * 1000 + number,
      season,
      number,
      name: String(ep.name || `Episode ${number}`),
      airdate: String(ep.airdate || ''),
      runtime: typeof ep.runtime === 'number' ? ep.runtime : null,
      rating: typeof ratingObj.average === 'number' ? ratingObj.average : null,
      summaryText: stripHtmlTags(String(ep.summary || '')),
      thumbnailUrl: String(imageObj.medium || imageObj.original || ''),
      originalImageUrl: String(imageObj.original || imageObj.medium || ''),
    });
  }

  return parsed;
}

export async function fetchTvMazeEnrichment(params: {
  imdbId?: string;
  title?: string;
  signal?: AbortSignal;
}): Promise<TvMazeShowEnrichment | null> {
  const cleanImdb =
    params.imdbId && /^tt\d+$/i.test(params.imdbId.trim())
      ? params.imdbId.trim()
      : '';
  const cleanTitle = (params.title || '').trim();
  const cacheKey = cleanImdb || cleanTitle.toLowerCase();
  if (!cacheKey) return null;

  const cached = TVMAZE_CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    let showData: Record<string, unknown> | null = null;

    if (cleanImdb) {
      const lookupRes = await fetch(
        `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(cleanImdb)}`,
        { signal: params.signal ?? AbortSignal.timeout(6500) },
      );
      if (lookupRes.ok) {
        const lookedUp = (await lookupRes.json()) as Record<string, unknown>;
        if (lookedUp?.id) {
          const epRes = await fetch(
            `https://api.tvmaze.com/shows/${lookedUp.id}?embed=episodes`,
            { signal: params.signal ?? AbortSignal.timeout(6500) },
          );
          showData = epRes.ok
            ? ((await epRes.json()) as Record<string, unknown>)
            : lookedUp;
        }
      }
    }

    if (!showData && cleanTitle) {
      const searchRes = await fetch(
        `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}&embed=episodes`,
        { signal: params.signal ?? AbortSignal.timeout(6500) },
      );
      if (searchRes.ok) {
        showData = (await searchRes.json()) as Record<string, unknown>;
      }
    }

    if (!showData || !showData.id) return null;

    const embedded =
      (showData._embedded as Record<string, unknown[]> | undefined) || {};
    const episodes = parseTvMazeEpisodes(embedded.episodes || []);
    const episodesBySeason: Record<number, TvMazeEpisodeInfo[]> = {};
    for (const ep of episodes) {
      if (!episodesBySeason[ep.season]) {
        episodesBySeason[ep.season] = [];
      }
      episodesBySeason[ep.season].push(ep);
    }

    const imageObj = (showData.image as Record<string, string> | undefined) || {};
    const ratingObj =
      (showData.rating as Record<string, number> | undefined) || {};
    const networkObj =
      (showData.network as Record<string, string> | undefined) ||
      (showData.webChannel as Record<string, string> | undefined) ||
      {};

    const enrichment: TvMazeShowEnrichment = {
      tvmazeId: Number(showData.id),
      name: String(showData.name || cleanTitle),
      status: String(showData.status || ''),
      premiered: String(showData.premiered || ''),
      ended: showData.ended ? String(showData.ended) : null,
      networkName: String(networkObj.name || ''),
      rating: typeof ratingObj.average === 'number' ? ratingObj.average : null,
      summaryText: stripHtmlTags(String(showData.summary || '')),
      posterUrl: String(imageObj.original || imageObj.medium || ''),
      episodes,
      episodesBySeason,
    };

    TVMAZE_CACHE.set(cacheKey, enrichment);
    return enrichment;
  } catch {
    return null;
  }
}
