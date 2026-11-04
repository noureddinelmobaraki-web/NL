// src/config/servers.ts
// Single source of truth for Cinema (Movies & TV Series) embed servers and their CSP frame-src origins.
// IMPORTANT: Keep index.html frame-src synchronized with ALL_SERVER_FRAME_ORIGINS (verified by scripts/check-csp.mjs).

export interface ServerIds {
  imdb?: string | null;
  tmdb?: string | number | null;
}

export interface SanitizedServerIds {
  imdb: string;
  tmdb: string;
  preferred: string;
}

export interface CinemaServerConfig {
  id: string;
  label: string;
  host: string;
  origins: string[];
  supports: {
    imdb: boolean;
    tmdb: boolean;
  };
  timeoutMs: number;
  movie: (ids: ServerIds) => string;
  tv: (ids: ServerIds, season?: number, episode?: number, fullSeason?: boolean) => string;
}

const IMDB_ID_REGEX = /^tt\d+$/;
const TMDB_ID_REGEX = /^\d+$/;

export function extractValidImdbId(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const match = trimmed.match(/(tt\d+)/);
  const candidate = match ? match[1] : trimmed;
  return IMDB_ID_REGEX.test(candidate) ? candidate : '';
}

export function extractValidTmdbId(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  const candidate = String(raw).trim();
  return TMDB_ID_REGEX.test(candidate) ? candidate : '';
}

export function sanitizeServerIds(ids: ServerIds): SanitizedServerIds {
  const imdb = extractValidImdbId(ids.imdb);
  const tmdb = extractValidTmdbId(ids.tmdb);
  const preferred = imdb || tmdb;
  return {
    imdb: imdb ? encodeURIComponent(imdb) : '',
    tmdb: tmdb ? encodeURIComponent(tmdb) : '',
    preferred: preferred ? encodeURIComponent(preferred) : '',
  };
}

function normalizeSeasonEpisode(season?: number, episode?: number): { s: string; e: string } {
  const sNum = Number.isFinite(Number(season)) && Number(season) > 0 ? Math.floor(Number(season)) : 1;
  const eNum = Number.isFinite(Number(episode)) && Number(episode) > 0 ? Math.floor(Number(episode)) : 1;
  return {
    s: encodeURIComponent(String(sNum)),
    e: encodeURIComponent(String(eNum)),
  };
}

// Ordered with Server 7 as the default primary server (index 0), and Servers 3, 4, 5 permanently removed.
export const CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-7',
    label: 'Server 7',
    host: 'streamimdb.ru',
    origins: ['https://streamimdb.ru', 'https://player.imdb.su'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://streamimdb.ru/embed/movie/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://streamimdb.ru/embed/tv/${preferred}/${s}/${e}`;
    },
  },
  {
    id: 'server-1',
    label: 'Server 1',
    host: '2embed.cc',
    origins: ['https://www.2embed.cc', 'https://2embed.cc'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://www.2embed.cc/embed/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1, fullSeason = false) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      if (fullSeason) {
        return `https://www.2embed.cc/embedtvfull/${preferred}`;
      }
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://www.2embed.cc/embedtv/${preferred}&s=${s}&e=${e}`;
    },
  },
  {
    id: 'server-2',
    label: 'Server 2',
    host: '2embed.skin',
    origins: ['https://www.2embed.skin', 'https://2embed.skin'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://www.2embed.skin/embed/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1, fullSeason = false) => {
      const { preferred } = sanitizeServerIds(ids);
      if (!preferred) return '';
      if (fullSeason) {
        return `https://www.2embed.skin/embedtvfull/${preferred}`;
      }
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://www.2embed.skin/embedtv/${preferred}&s=${s}&e=${e}`;
    },
  },
  {
    id: 'server-6',
    label: 'Server 6',
    host: 'multiembed.mov',
    origins: ['https://multiembed.mov', 'https://streamingnow.mov'],
    supports: { imdb: true, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { imdb, tmdb } = sanitizeServerIds(ids);
      if (imdb) return `https://multiembed.mov/?video_id=${imdb}`;
      if (tmdb) return `https://multiembed.mov/?video_id=${tmdb}&tmdb=1`;
      return '';
    },
    tv: (ids, season = 1, episode = 1) => {
      const { imdb, tmdb } = sanitizeServerIds(ids);
      const { s, e } = normalizeSeasonEpisode(season, episode);
      if (imdb) return `https://multiembed.mov/?video_id=${imdb}&s=${s}&e=${e}`;
      if (tmdb) return `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${s}&e=${e}`;
      return '';
    },
  },
];

export const ALL_SERVER_FRAME_ORIGINS: string[] = Array.from(
  new Set(CINEMA_SERVERS.flatMap((srv) => srv.origins)),
);
