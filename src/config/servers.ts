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
    /** Cover iframe with a click-capturing overlay so ad scripts never get user activation. */
    adShield?: boolean;
    /** iframe sandbox tokens tried first (never allow-popups). Auto-fallback handled by sandboxPolicy.ts. */
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

/** No allow-popups, no allow-top-navigation, no allow-modals. allow-same-origin is safe here: content is cross-origin. */
export const SANDBOX_STRICT = 'allow-scripts allow-same-origin allow-forms allow-presentation';

// Ordered with VidLink (server-vl) as the default primary server (index 0), and Servers 3, 4, 5 permanently removed.
export const CINEMA_SERVERS: CinemaServerConfig[] = [
  {
    id: 'server-vl',
    label: 'VidLink',
    host: 'vidlink.pro',
    origins: ['https://vidlink.pro', 'https://player.vidlink.pro', 'https://cloud.vidlink.pro'],
    supports: { imdb: false, tmdb: true },
    capabilities: {
      timeEvents: true,
      startAt: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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
    capabilities: {
      timeEvents: true,
      workerBridge: true,
      adShield: true,
      sandbox: SANDBOX_STRICT,
    },
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

export const isTimeEventServer = (
  server?: { capabilities?: { timeEvents?: boolean; workerBridge?: boolean } } | null,
): boolean => Boolean(server?.capabilities?.timeEvents || server?.capabilities?.workerBridge);

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
