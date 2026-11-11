/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Extended Cinema & TV Series Embed Servers:
 * - VidPlus (player.vidplus.to)
 * - VidSrc (vidsrcme.ru)
 * - Videasy (player.videasy.net)
 * - VidRock (vidrock.net)
 * - MoviesAPI (moviesapi.club)
 */

import {
  type CinemaServerConfig,
  type ServerIds,
  sanitizeServerIds,
} from './servers';

function normalizeSeasonEpisode(
  season?: number,
  episode?: number,
): { s: string; e: string } {
  const sNum =
    Number.isFinite(Number(season)) && Number(season) > 0
      ? Math.floor(Number(season))
      : 1;
  const eNum =
    Number.isFinite(Number(episode)) && Number(episode) > 0
      ? Math.floor(Number(episode))
      : 1;
  return {
    s: encodeURIComponent(String(sNum)),
    e: encodeURIComponent(String(eNum)),
  };
}

export const EXTENDED_CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-vidplus',
    label: 'VidPlus',
    host: 'player.vidplus.to',
    origins: ['https://player.vidplus.to'],
    supports: { imdb: false, tmdb: true },
    timeoutMs: 12000,
    movie: (ids: ServerIds) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb
        ? `https://player.vidplus.to/embed/movie/${tmdb}?autoplay=true`
        : '';
    },
    tv: (ids: ServerIds, season = 1, episode = 1) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://player.vidplus.to/embed/tv/${tmdb}/${s}/${e}?autoplay=true&autonext=true`;
    },
  },
  {
    id: 'server-vidsrc',
    label: 'VidSrc',
    host: 'vidsrcme.ru',
    origins: ['https://vidsrcme.ru'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids: ServerIds) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred
        ? `https://vidsrcme.ru/embed/movie/${preferred}`
        : '';
    },
    tv: (ids: ServerIds, season = 1, episode = 1) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://vidsrcme.ru/embed/tv/${preferred}/${s}/${e}?autonext=1`;
    },
  },
  {
    id: 'server-videasy',
    label: 'Videasy',
    host: 'player.videasy.net',
    origins: ['https://player.videasy.net'],
    supports: { imdb: false, tmdb: true },
    timeoutMs: 12000,
    movie: (ids: ServerIds) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://player.videasy.net/movie/${tmdb}` : '';
    },
    tv: (ids: ServerIds, season = 1, episode = 1) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://player.videasy.net/tv/${tmdb}/${s}/${e}?nextEpisode=true&episodeSelector=true`;
    },
  },
  {
    id: 'server-vidrock',
    label: 'VidRock',
    host: 'vidrock.net',
    origins: ['https://vidrock.net'],
    supports: { imdb: false, tmdb: true },
    timeoutMs: 12000,
    movie: (ids: ServerIds) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://vidrock.net/embed/movie/${tmdb}` : '';
    },
    tv: (ids: ServerIds, season = 1, episode = 1) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://vidrock.net/embed/tv/${tmdb}/${s}/${e}`;
    },
  },
  {
    id: 'server-moviesapi',
    label: 'MoviesAPI',
    host: 'moviesapi.club',
    origins: ['https://moviesapi.club'],
    supports: { imdb: false, tmdb: true },
    timeoutMs: 12000,
    movie: (ids: ServerIds) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://moviesapi.club/movie/${tmdb}` : '';
    },
    tv: (ids: ServerIds, season = 1, episode = 1) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://moviesapi.club/tv/${tmdb}-${s}-${e}`;
    },
  },
];
