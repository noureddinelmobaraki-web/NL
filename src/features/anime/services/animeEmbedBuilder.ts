/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Anime Sub/Dub Embed Server Builder & Speed Sorter
 */

import { computeResolvedImdbEpisode } from './animeIdBridgeService';
import type {
  AnimeAudioMode,
  AnimeIdentifiers,
  AnimePlayServer,
} from '../types/anime.types';

export interface BuildAnimeSourcesInput {
  ids: AnimeIdentifiers;
  courEpisode: number;
  mode: AnimeAudioMode;
  isMovie?: boolean;
}

export function buildAnimeSources({
  ids,
  courEpisode,
  mode,
  isMovie = false,
}: BuildAnimeSourcesInput): AnimePlayServer[] {
  const ep = Math.max(1, Math.floor(courEpisode || 1));
  const season = Math.max(1, Math.floor(ids.resolvedSeason || 1));
  const imdbEp = computeResolvedImdbEpisode(ep, ids.episodeOffset);
  const subOrDub: AnimeAudioMode = mode === 'dub' ? 'dub' : 'sub';

  const servers: AnimePlayServer[] = [];

  // 1. VidLink Anime (Direct MAL ID + Sub/Dub toggle)
  if (ids.malId) {
    servers.push({
      id: `vidlink-anime-${subOrDub}`,
      label: subOrDub === 'dub' ? 'VidLink Anime (Dub)' : 'VidLink Anime (Sub)',
      host: 'vidlink.pro',
      url: `https://vidlink.pro/anime/${ids.malId}/${ep}/${subOrDub}?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 2. VidPlus Anime (Direct AniList ID + Sub/Dub toggle)
  if (ids.anilistId) {
    servers.push({
      id: `vidplus-anime-${subOrDub}`,
      label: subOrDub === 'dub' ? 'VidPlus Anime (Dub)' : 'VidPlus Anime (Sub)',
      host: 'player.vidplus.to',
      url: `https://player.vidplus.to/embed/anime/${ids.anilistId}/${ep}?dub=${subOrDub === 'dub'}&autoplay=true&autonext=true`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 3. TMDB / IMDb Unified Servers (using resolved season + episode_offset)
  const tmdb = ids.tmdbId ? String(ids.tmdbId) : '';
  const imdb = ids.imdbId ? String(ids.imdbId) : '';
  const preferred = imdb || tmdb;

  if (tmdb) {
    servers.push({
      id: 'vidlink-tmdb',
      label: 'VidLink Cinema',
      host: 'vidlink.pro',
      url: isMovie
        ? `https://vidlink.pro/movie/${tmdb}?primaryColor=dc2626&autoplay=true&nextbutton=true`
        : `https://vidlink.pro/tv/${tmdb}/${season}/${imdbEp}?primaryColor=dc2626&autoplay=true&nextbutton=true`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });

    servers.push({
      id: 'vidsrcme-tmdb',
      label: 'VidSrc Pro',
      host: 'vidsrcme.ru',
      url: isMovie
        ? `https://vidsrcme.ru/embed/movie/${tmdb}`
        : `https://vidsrcme.ru/embed/tv/${tmdb}/${season}/${imdbEp}?autonext=1`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });

    servers.push({
      id: 'videasy-tmdb',
      label: 'Videasy HD',
      host: 'player.videasy.net',
      url: isMovie
        ? `https://player.videasy.net/movie/${tmdb}`
        : `https://player.videasy.net/tv/${tmdb}/${season}/${imdbEp}?nextEpisode=true&episodeSelector=true`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });

    servers.push({
      id: 'vidrock-tmdb',
      label: 'VidRock Stage',
      host: 'vidrock.net',
      url: isMovie
        ? `https://vidrock.net/embed/movie/${tmdb}`
        : `https://vidrock.net/embed/tv/${tmdb}/${season}/${imdbEp}`,
      mode: subOrDub,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  if (preferred) {
    servers.push({
      id: 'streamimdb-anime',
      label: 'Server 7 (IMDb)',
      host: 'streamimdb.ru',
      url: isMovie
        ? `https://streamimdb.ru/embed/movie/${preferred}`
        : `https://streamimdb.ru/embed/tv/${preferred}/${season}/${imdbEp}`,
      mode: subOrDub,
      quality: 'HD',
      timeoutMs: 12000,
    });

    servers.push({
      id: '2embed-anime',
      label: '2Embed',
      host: 'www.2embed.cc',
      url: isMovie
        ? `https://www.2embed.cc/embed/${preferred}`
        : `https://www.2embed.cc/embedtv/${preferred}&s=${season}&e=${imdbEp}`,
      mode: subOrDub,
      quality: 'HD',
      timeoutMs: 12000,
    });
  }

  if (imdb) {
    servers.push({
      id: 'multiembed-anime',
      label: 'MultiEmbed',
      host: 'multiembed.mov',
      url: isMovie
        ? `https://multiembed.mov/?video_id=${imdb}`
        : `https://multiembed.mov/?video_id=${imdb}&s=${season}&e=${imdbEp}`,
      mode: subOrDub,
      quality: 'HD',
      timeoutMs: 12000,
    });
  }

  return servers;
}
