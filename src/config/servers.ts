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
  capabilities?: {
    /** Emits verifiable postMessage timeUpdate events (iframeBridge.ts). */
    timeEvents?: boolean;
    /** Supports ?startAt=<seconds> in embed URL. */
    startAt?: boolean;
    /** Route through Cloudflare Worker /embed HTMLRewriter bridge. */
    workerBridge?: boolean;
    adShield?: boolean;
    sandbox?: string;
  };
  timeoutMs: number;
  movie: (ids: ServerIds, opts?: { startAt?: number }) => string;
  tv: (
    ids: ServerIds,
    season?: number,
    episode?: number,
    fullSeason?: boolean,
    opts?: { startAt?: number },
  ) => string;
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

function vidlinkQuery(opts?: { startAt?: number }): string {
  const p = new URLSearchParams({
    primaryColor: 'dc2626',
    secondaryColor: 'a2a2a2',
    iconColor: 'eefdec',
    icons: 'default',
    player: 'default',
    title: 'false',
    poster: 'true',
    autoplay: 'true',
    nextbutton: 'true',
  });
  if (opts?.startAt && opts.startAt > 5) {
    p.set('startAt', String(Math.floor(opts.startAt)));
  }
  return p.toString();
}

export const SANDBOX_STRICT = undefined;

// Ordered with VidLink (server-vl) as the default primary server (index 0), and Servers 3, 4, 5 permanently removed.
// All servers load their native embed URLs without iframe sandbox or /embed proxy rewriting so they never trigger
// "Please Disable Sandbox" or JWPlayer Error 232011.
export const CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-vl',
    label: 'VidLink',
    host: 'vidlink.pro',
    origins: ['https://vidlink.pro', 'https://player.vidlink.pro', 'https://cloud.vidlink.pro'],
    supports: { imdb: false, tmdb: true },
    capabilities: { timeEvents: true, startAt: true },
    timeoutMs: 12000,
    movie: (ids, opts) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://vidlink.pro/movie/${tmdb}?${vidlinkQuery(opts)}` : '';
    },
    tv: (ids, season = 1, episode = 1, _fullSeason = false, opts) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://vidlink.pro/tv/${tmdb}/${s}/${e}?${vidlinkQuery(opts)}`;
    },
  },
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
    origins: ['https://www.2embed.cc', 'https://2embed.cc', 'https://2vcdn.skin'],
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
    origins: ['https://www.2embed.skin', 'https://2embed.skin', 'https://2vcdn.skin'],
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
  {
    id: 'server-vidplus',
    label: 'VidPlus',
    host: 'player.vidplus.to',
    origins: ['https://player.vidplus.to'],
    supports: { imdb: false, tmdb: true },
    timeoutMs: 12000,
    movie: (ids) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://player.vidplus.to/embed/movie/${tmdb}?autoplay=true` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
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
    movie: (ids) => {
      const { preferred } = sanitizeServerIds(ids);
      return preferred ? `https://vidsrcme.ru/embed/movie/${preferred}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
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
    movie: (ids) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://player.videasy.net/movie/${tmdb}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
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
    movie: (ids) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://vidrock.net/embed/movie/${tmdb}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
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
    movie: (ids) => {
      const { tmdb } = sanitizeServerIds(ids);
      return tmdb ? `https://moviesapi.club/movie/${tmdb}` : '';
    },
    tv: (ids, season = 1, episode = 1) => {
      const { tmdb } = sanitizeServerIds(ids);
      if (!tmdb) return '';
      const { s, e } = normalizeSeasonEpisode(season, episode);
      return `https://moviesapi.club/tv/${tmdb}-${s}-${e}`;
    },
  },
];

export const ANIME_SERVER_FRAME_ORIGINS: string[] = [
  'https://player.vidplus.to',
  'https://vidsrcme.ru',
  'https://player.videasy.net',
  'https://vidrock.net',
  'https://moviesapi.club',
  'https://vidsrc.icu',
  'https://autoembed.co',
  'https://player.autoembed.cc',
  'https://player.twitch.tv',
  'https://slowroads.io',
  'https://hexgl.bkcore.com',
  'https://princejs.com',
  'https://gabrielecirulli.github.io',
  'https://hextris.github.io',
  'https://ellisonleao.github.io',
  'https://doublespeakgames.github.io',
  'https://sausi-7.github.io',
  'https://html5.gamedistribution.com',
  'https://itch.io',
];

export const ALL_SERVER_FRAME_ORIGINS: string[] = Array.from(
  new Set([
    ...CINEMA_SERVERS.flatMap((srv) => srv.origins),
    ...ANIME_SERVER_FRAME_ORIGINS,
  ]),
);

export const isTimeEventServer = (
  server?: { capabilities?: { timeEvents?: boolean } } | null,
): boolean => Boolean(server?.capabilities?.timeEvents);

export function toWorkerEmbedUrl(
  rawUrl: string,
  workerEndpoint: string,
  parentOrigin: string,
): string {
  if (!rawUrl || !workerEndpoint) return rawUrl;
  try {
    const base = workerEndpoint.replace(/\/+$/, '');
    const u = new URL(`${base}/embed`);
    u.searchParams.set('url', rawUrl);
    u.searchParams.set('parent', parentOrigin);
    u.searchParams.set('depth', '0');
    return u.toString();
  } catch {
    return rawUrl;
  }
}
