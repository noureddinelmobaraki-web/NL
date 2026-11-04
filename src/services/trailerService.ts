import { WORKER_ENDPOINT } from "./videoExtractor";

export type TrailerSource =
  | { kind: "imdb"; videoId: string; embedUrl: string }
  | { kind: "youtube"; key: string };

const CACHE_KEY = "nl_trailer_cache_v1";
const HIT_TTL = 7 * 864e5;
const MISS_TTL = 6 * 36e5;
type Entry = { v: string | null; t: number };

const readCache = (): Record<string, Entry> => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
};
const writeCache = (id: string, v: string | null) => {
  try {
    const c = readCache();
    c[id] = { v, t: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > 300) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - 300).forEach((k) => delete c[k]);
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch { /* quota/private mode */ }
};

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  const any = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  return signal && any ? any([signal, timeout]) : signal ?? timeout;
}

let imdbApiDevDown = false; // session circuit breaker (service reported offline)

async function fromImdbApiDev(imdbId: string, signal?: AbortSignal): Promise<string | null> {
  if (imdbApiDevDown) return null;
  try {
    const r = await fetch(`https://api.imdbapi.dev/titles/${imdbId}/videos?pageSize=10`, { signal: withTimeout(signal, 2500) });
    if (!r.ok) return null;
    const j: any = await r.json();
    const list: any[] = j?.videos ?? j?.items ?? [];
    const pick = list.find((v) => /trailer/i.test(String(v?.type ?? v?.contentType ?? v?.name ?? ""))) ?? list[0];
    const id = String(pick?.id ?? "");
    return /^vi\d+$/.test(id) ? id : null;
  } catch (e) {
    if ((e as Error)?.name !== "AbortError") imdbApiDevDown = true;
    return null;
  }
}

async function fromWorker(imdbId: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const u = new URL("trailer/imdb", WORKER_ENDPOINT);
    u.searchParams.set("id", imdbId);
    const r = await fetch(u.toString(), { signal: withTimeout(signal, 3500) });
    if (!r.ok) return null;
    const j: any = await r.json();
    return /^vi\d+$/.test(String(j?.videoId ?? "")) ? j.videoId : null;
  } catch {
    return null;
  }
}

export async function resolveTrailer(opts: {
  imdbId?: string;
  youtubeKey?: string;
  signal?: AbortSignal;
}): Promise<TrailerSource | null> {
  const ytKey = (opts.youtubeKey || "").trim();
  if (ytKey) {
    return { kind: "youtube", key: ytKey };
  }
  const imdbId = (opts.imdbId || "").trim();
  if (/^tt\d{5,10}$/.test(imdbId)) {
    const c = readCache()[imdbId];
    let vi: string | null;
    if (c && Date.now() - c.t < (c.v ? HIT_TTL : MISS_TTL)) {
      vi = c.v;
    } else {
      vi = (await fromImdbApiDev(imdbId, opts.signal)) ?? (await fromWorker(imdbId, opts.signal));
      if (!opts.signal?.aborted) writeCache(imdbId, vi);
    }
    if (vi) return { kind: "imdb", videoId: vi, embedUrl: `https://www.imdb.com/video/embed/${vi}/` };
  }
  return null;
}
