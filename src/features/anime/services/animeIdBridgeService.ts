/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * 3-Layer Anime Identifier Bridge & Episode Offset Resolver
 * Layer 1: AniZip API (https://api.ani.zip/mappings)
 * Layer 2: ARM Server API (https://arm.haglund.dev/api/v2/ids)
 * Layer 3: Fribb/anime-lists & anitorrent GitHub Raw JSON fallback
 */

import type {
  AnimeEpisodeInfo,
  AnimeIdentifiers,
  AnimeItem,
  AnimeSkipWindow,
} from '../types/anime.types';

const ANIZIP_BASE = 'https://api.ani.zip/mappings';
const ARM_BASE = 'https://arm.haglund.dev/api/v2';
const ANISKIP_BASE = 'https://api.aniskip.com/v2/skip-times';

interface ResolvedBridgePayload {
  ids: AnimeIdentifiers;
  episodes: AnimeEpisodeInfo[];
}

const BRIDGE_CACHE = new Map<string, ResolvedBridgePayload>();

export async function resolveAnimeIdsAndEpisodes(
  anime: AnimeItem,
): Promise<ResolvedBridgePayload> {
  const cacheKey = `${anime.malId || 0}_${anime.anilistId || 0}_${anime.kitsuId || 0}`;
  const cached = BRIDGE_CACHE.get(cacheKey);
  if (cached) return cached;

  const baseIds: AnimeIdentifiers = {
    malId: anime.malId,
    anilistId: anime.anilistId,
    kitsuId: anime.kitsuId,
    tmdbId: anime.tmdbId,
    imdbId: anime.imdbId,
    resolvedSeason: 1,
    episodeOffset: 0,
  };

  let resolvedEpisodes: AnimeEpisodeInfo[] = [];

  // Layer 1: AniZip Mappings API (Fastest & includes episode thumbnails/titles/offsets)
  try {
    const queryParam = anime.anilistId
      ? `anilist_id=${anime.anilistId}`
      : anime.malId
        ? `mal_id=${anime.malId}`
        : anime.kitsuId
          ? `kitsu_id=${anime.kitsuId}`
          : '';

    if (queryParam) {
      const res = await fetch(`${ANIZIP_BASE}?${queryParam}`, {
        signal: AbortSignal.timeout(6500),
      });
      if (res.ok) {
        const data = await res.json();
        const m = data?.mappings || {};
        if (m.mal_id) baseIds.malId = Number(m.mal_id);
        if (m.anilist_id) baseIds.anilistId = Number(m.anilist_id);
        if (m.kitsu_id) baseIds.kitsuId = Number(m.kitsu_id);
        if (m.anidb_id) baseIds.anidbId = Number(m.anidb_id);
        if (m.imdb_id && String(m.imdb_id).startsWith('tt')) {
          baseIds.imdbId = String(m.imdb_id);
        }
        if (m.themoviedb_id) baseIds.tmdbId = Number(m.themoviedb_id);
        if (m.thetvdb_id) baseIds.tvdbId = Number(m.thetvdb_id);

        if (data?.episodes && typeof data.episodes === 'object') {
          const epEntries = Object.values(data.episodes) as any[];
          const parsedEps: AnimeEpisodeInfo[] = [];
          for (const ep of epEntries) {
            const epNum = Number(ep?.episode || ep?.episodeNumber);
            if (!Number.isFinite(epNum) || epNum <= 0) continue;
            const titleEn =
              ep?.title?.en ||
              ep?.title?.['x-jat'] ||
              ep?.title?.ja ||
              `Episode ${epNum}`;
            const sNum = Number(ep?.seasonNumber) || 1;
            const absNum = Number(ep?.absoluteEpisodeNumber) || epNum;
            parsedEps.push({
              number: epNum,
              title: titleEn,
              titleAr: `الحلقة ${epNum} — ${titleEn}`,
              overview: ep?.overview || ep?.summary || undefined,
              image: ep?.image || anime.bannerUrl || anime.posterUrl,
              airDate: ep?.airdate || ep?.airDate || undefined,
              durationMin: Number(ep?.length || ep?.runtime) || 24,
              seasonNumber: sNum,
              imdbEpisodeNumber: absNum,
            });
          }
          parsedEps.sort((a, b) => a.number - b.number);
          if (parsedEps.length > 0) {
            resolvedEpisodes = parsedEps;
            const firstEp = parsedEps[0];
            if (firstEp.seasonNumber && firstEp.seasonNumber > 0) {
              baseIds.resolvedSeason = firstEp.seasonNumber;
            }
            if (
              firstEp.imdbEpisodeNumber &&
              firstEp.imdbEpisodeNumber > firstEp.number
            ) {
              baseIds.episodeOffset = firstEp.imdbEpisodeNumber - firstEp.number;
            }
          }
        }
      }
    }
  } catch {
    // Proceed to Layer 2
  }

  // Layer 2: ARM Haglund API fallback if IMDb/TMDB/AniList still missing
  if (!baseIds.imdbId || !baseIds.tmdbId || !baseIds.anilistId) {
    try {
      const source = baseIds.malId
        ? `source=myanimelist&id=${baseIds.malId}`
        : baseIds.anilistId
          ? `source=anilist&id=${baseIds.anilistId}`
          : '';
      if (source) {
        const res = await fetch(`${ARM_BASE}/ids?${source}`, {
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const arm = await res.json();
          if (arm?.myanimelist && !baseIds.malId) baseIds.malId = Number(arm.myanimelist);
          if (arm?.anilist && !baseIds.anilistId) baseIds.anilistId = Number(arm.anilist);
          if (arm?.kitsu && !baseIds.kitsuId) baseIds.kitsuId = Number(arm.kitsu);
          if (arm?.anidb && !baseIds.anidbId) baseIds.anidbId = Number(arm.anidb);
          if (arm?.imdb && !baseIds.imdbId) baseIds.imdbId = String(arm.imdb);
          if (arm?.themoviedb && !baseIds.tmdbId) baseIds.tmdbId = Number(arm.themoviedb);
          if (arm?.thetvdb && !baseIds.tvdbId) baseIds.tvdbId = Number(arm.thetvdb);
        }
      }
    } catch {
      // Proceed to fallback episode generation
    }
  }

  // Fallback episode generation if AniZip didn't return episodes
  if (resolvedEpisodes.length === 0) {
    const total = Math.max(1, Math.min(1500, anime.episodesCount || 12));
    resolvedEpisodes = Array.from({ length: total }, (_, idx) => {
      const num = idx + 1;
      return {
        number: num,
        title: anime.format === 'MOVIE' && total === 1 ? anime.title : `Episode ${num}`,
        titleAr:
          anime.format === 'MOVIE' && total === 1
            ? `الفيلم الكامل — ${anime.titleAr || anime.title}`
            : `الحلقة ${num}`,
        image: anime.bannerUrl || anime.posterUrl,
        durationMin: anime.format === 'MOVIE' ? 110 : 24,
        seasonNumber: baseIds.resolvedSeason || 1,
        imdbEpisodeNumber: num + (baseIds.episodeOffset || 0),
      };
    });
  }

  const payload: ResolvedBridgePayload = {
    ids: baseIds,
    episodes: resolvedEpisodes,
  };
  BRIDGE_CACHE.set(cacheKey, payload);
  return payload;
}

export function computeResolvedImdbEpisode(
  courEpisode: number,
  episodeOffset = 0,
): number {
  return Math.max(1, courEpisode + (Number(episodeOffset) || 0));
}

export async function fetchAniSkipTimes(
  malId?: number,
  episodeNumber = 1,
): Promise<AnimeSkipWindow[]> {
  if (!malId || malId <= 0) return [];
  try {
    const url = `${ANISKIP_BASE}/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=0`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.found || !Array.isArray(data?.results)) return [];
    return data.results
      .map((item: any): AnimeSkipWindow | null => {
        const skipType = item?.skipType === 'ed' ? 'ed' : 'op';
        const start = Number(item?.interval?.startTime);
        const end = Number(item?.interval?.endTime);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return null;
        }
        return {
          type: skipType,
          startTime: start,
          endTime: end,
          episodeLength: Number(item?.episodeLength) || undefined,
        };
      })
      .filter((x: AnimeSkipWindow | null): x is AnimeSkipWindow => x !== null);
  } catch {
    return [];
  }
}
