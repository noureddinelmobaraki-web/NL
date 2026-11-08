// src/services/subtitleService.ts
import { PUBLIC_OPENSUBTITLES_KEY, PUBLIC_WYZIE_KEY } from "../config/publicKeys";
import { WORKER_ENDPOINT, type ExtractedSubtitleTrack, type SubtitleCue } from "./videoExtractor";
import { LEGACY_ENCODING, getLanguageLabel, normalizeLangCode } from "../features/cinema/subtitles/languages";
import { getSubtitlePrefs } from "../features/cinema/subtitles/subtitlePrefs";
import { dedupeCues, isHlsPlaylistText, mergeHlsVttPlaylist } from "../features/cinema/subtitles/streamSubtitles";
import { fetchYtsListMovies } from "./ytsApiClient";

/** "1" once the Worker routes /subs/* are deployed with the WYZIE_KEY secret (Phase 3). */
const USE_WORKER_SUBS_PROXY = import.meta.env.VITE_USE_WORKER_SUBS_PROXY === "1";
const WYZIE_KEY = USE_WORKER_SUBS_PROXY ? "" : import.meta.env.VITE_WYZIE_API_KEY || PUBLIC_WYZIE_KEY;
const OS_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY || PUBLIC_OPENSUBTITLES_KEY;
const MAX_VERSIONS_PER_LANG = 6;

export interface SubtitleFetchParams {
  tmdbId: number;
  imdbId?: string;
  title?: string;
  year?: string | number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  signal?: AbortSignal;
  languages?: string[];
}

/* ---------- parsing ---------- */

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().replace(",", ".").split(":").map((p) => Number(p) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Wyzie free-tier notice + common provider ads. Strong = anywhere, weak = only first/last 3 cues. */
const STRONG_AD = [/wyzie/i, /store\.wyzie/i, /you'?re on the free plan/i, /ad-?free subs/i];
const WEAK_AD = [
  /opensubtitles/i, /subtitles? (by|ripped|downloaded)/i, /sync(ed)? (&|and) correct/i,
  /support us and become vip/i, /advertise your product/i, /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i, /https?:\/\//i,
];

export function stripAdCues(cues: SubtitleCue[]): SubtitleCue[] {
  const n = cues.length;
  return cues.filter((cue, i) => {
    if (STRONG_AD.some((re) => re.test(cue.text))) return false;
    const edge = i < 3 || i >= n - 3;
    return !(edge && WEAK_AD.some((re) => re.test(cue.text)));
  });
}

export function parseSubtitleCues(rawText: string): SubtitleCue[] {
  const normalized = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})/;
  const cues: SubtitleCue[] = [];
  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length || lines[0].startsWith("NOTE") || lines[0].startsWith("STYLE")) continue;
    let idx = -1;
    let match: RegExpMatchArray | null = null;
    for (let i = 0; i < Math.min(lines.length, 3); i += 1) {
      const m = lines[i].match(timeRegex);
      if (m) { idx = i; match = m; break; }
    }
    if (idx === -1 || !match) continue;
    const start = parseTimestampToSeconds(match[1]);
    const end = parseTimestampToSeconds(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const text = lines
      .slice(idx + 1)
      .map((l) => l.replace(/\{[^}]*\}/g, "").replace(/<\/?[^>]+(>|$)/g, "").trim())
      .filter(Boolean)
      .join("\n");
    if (text) cues.push({ start, end, text });
  }
  cues.sort((a, b) => a.start - b.start);
  return stripAdCues(cues);
}

const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, "0");
const vttTime = (s: number) =>
  `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}.${pad(Math.round((s % 1) * 1000) % 1000, 3)}`;

export function cuesToVttBlobUrl(cues: SubtitleCue[]): string {
  const body = cues.map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`).join("\n\n");
  return URL.createObjectURL(new Blob([`WEBVTT\n\n${body}\n`], { type: "text/vtt;charset=utf-8" }));
}

/** Kept for backward compatibility; now also strips ads. */
export function convertSrtToVttBlobUrl(rawText: string): string {
  const cues = parseSubtitleCues(rawText);
  if (!cues.length) throw new Error("Empty subtitle content");
  return cuesToVttBlobUrl(cues);
}

export function revokeSubtitleBlobUrls(tracks?: ExtractedSubtitleTrack[] | null): void {
  if (!Array.isArray(tracks)) return;
  for (const track of tracks) {
    for (const c of [track?.url, track?.proxiedUrl]) {
      if (typeof c === "string" && c.startsWith("blob:")) {
        try { URL.revokeObjectURL(c); } catch { /* ignore */ }
      }
    }
  }
}

/** UTF-8 first; fall back to the language's legacy code page or windows-1256 (fixes legacy Arabic .srt). */
export function decodeSubtitleBytes(buf: ArrayBuffer, lang?: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    const enc = (lang && LEGACY_ENCODING[lang]) || "windows-1256";
    try { return new TextDecoder(enc).decode(buf); } catch { return new TextDecoder("utf-8").decode(buf); }
  }
}

async function fetchSubtitleText(url: string, lang: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Subtitle HTTP ${res.status}`);
  return decodeSubtitleBytes(await res.arrayBuffer(), lang);
}

/* ---------- providers (search only; download is lazy) ---------- */

const SEARCH_CACHE = new Map<string, ExtractedSubtitleTrack[]>();

async function searchWyzie(params: SubtitleFetchParams, langs: string[]): Promise<ExtractedSubtitleTrack[]> {
  const imdb = params.imdbId && /^tt\d+$/i.test(params.imdbId.trim()) ? params.imdbId.trim() : "";
  const ids = imdb ? [imdb, String(params.tmdbId)] : [String(params.tmdbId)];
  for (const id of ids) {
    const u = USE_WORKER_SUBS_PROXY ? new URL("subs/search", WORKER_ENDPOINT) : new URL("https://sub.wyzie.io/search");
    u.searchParams.set("id", id);
    u.searchParams.set("language", langs.join(","));
    if (WYZIE_KEY) u.searchParams.set("key", WYZIE_KEY);
    if (params.mediaType === "tv") {
      u.searchParams.set("season", String(Math.max(1, params.season || 1)));
      u.searchParams.set("episode", String(Math.max(1, params.episode || 1)));
    }
    try {
      const res = await fetch(u.toString(), { signal: params.signal ?? AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      const payload = await res.json();
      const list: any[] = Array.isArray(payload) ? payload : payload?.subtitles ?? payload?.results ?? [];
      const tracks = list
        .filter((it) => it && typeof it.url === "string" && it.url.trim())
        .map((it, i): ExtractedSubtitleTrack => {
          const lang = normalizeLangCode(it.language || it.lang || it.iso639);
          const release = String(it.release || it.fileName || it.media || it.display || "").slice(0, 120);
          return {
            id: `wyzie:${it.id ?? i}:${lang}`,
            provider: "wyzie",
            lang,
            label: getLanguageLabel(lang),
            release,
            hearingImpaired: Boolean(it.isHearingImpaired ?? it.hearingImpaired),
            remoteUrl: it.url,
            url: "",
            proxiedUrl: "",
            loaded: false,
          };
        });
      if (tracks.length) return tracks;
    } catch { /* try next id */ }
  }
  return [];
}

async function searchOpenSubtitles(params: SubtitleFetchParams, langs: string[]): Promise<ExtractedSubtitleTrack[]> {
  if (!OS_KEY) return [];
  const numericImdb = params.imdbId ? params.imdbId.replace(/^tt/i, "").replace(/\D/g, "") : "";
  const q: Array<[string, string]> = [["languages", langs.join(",")]];
  if (params.mediaType === "tv") {
    q.push(["episode_number", String(Math.max(1, params.episode || 1))]);
    q.push(["season_number", String(Math.max(1, params.season || 1))]);
    q.push(numericImdb ? ["parent_imdb_id", numericImdb] : ["parent_tmdb_id", String(params.tmdbId)]);
  } else {
    q.push(numericImdb ? ["imdb_id", numericImdb] : ["tmdb_id", String(params.tmdbId)]);
  }
  q.sort(([a], [b]) => a.localeCompare(b));
  const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${new URLSearchParams(q)}`, {
    headers: { "Api-Key": OS_KEY, "User-Agent": "NLfilms v1.0", Accept: "application/json" },
    signal: params.signal ?? AbortSignal.timeout(9000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (Array.isArray(json?.data) ? json.data : [])
    .map((entry: any): ExtractedSubtitleTrack | null => {
      const a = entry?.attributes;
      const fileId = a?.files?.[0]?.file_id;
      if (typeof fileId !== "number") return null;
      const lang = normalizeLangCode(a?.language);
      return {
        id: `os:${fileId}`,
        provider: "opensubtitles",
        lang,
        label: getLanguageLabel(lang),
        release: String(a?.release || a?.files?.[0]?.file_name || "").slice(0, 120),
        hearingImpaired: Boolean(a?.hearing_impaired),
        osFileId: fileId,
        url: "",
        proxiedUrl: "",
        loaded: false,
      };
    })
    .filter(Boolean) as ExtractedSubtitleTrack[];
}

async function downloadOpenSubtitles(fileId: number, lang: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("https://api.opensubtitles.com/api/v1/download", {
    method: "POST",
    headers: { "Api-Key": OS_KEY, "User-Agent": "NLfilms v1.0", Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, sub_format: "srt" }),
    signal: signal ?? AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`OpenSubtitles download HTTP ${res.status}`);
  const link = (await res.json())?.link;
  if (typeof link !== "string" || !link) throw new Error("No download link");
  return fetchSubtitleText(link, lang, signal);
}

/* ---------- lazy loading ---------- */

const INFLIGHT = new Map<string, Promise<ExtractedSubtitleTrack>>();

/** Downloads, decodes, merges HLS WebVTT segments if needed, ad-filters and converts a lazy track. */
export function ensureTrackLoaded(track: ExtractedSubtitleTrack, signal?: AbortSignal): Promise<ExtractedSubtitleTrack> {
  if (track.loaded !== false && Array.isArray(track.cues) && track.cues.length) return Promise.resolve(track);
  const key = track.id || track.remoteUrl || track.proxiedUrl || track.url;
  const existing = INFLIGHT.get(key);
  if (existing) return existing;
  const p = (async () => {
    const src = track.remoteUrl || track.proxiedUrl || track.url;
    let text =
      track.provider === "opensubtitles" && typeof track.osFileId === "number"
        ? await downloadOpenSubtitles(track.osFileId, track.lang, signal)
        : await fetchSubtitleText(src, track.lang, signal);
    if (isHlsPlaylistText(text)) {
      text = await mergeHlsVttPlaylist(text, src, (u) => fetchSubtitleText(u, track.lang, signal));
    }
    let cues = parseSubtitleCues(text);
    if (track.provider === "stream" || track.provider === "worker" || !track.provider) {
      cues = dedupeCues(cues);
    }
    if (!cues.length) throw new Error("Subtitle has no cues");
    const blob = cuesToVttBlobUrl(cues);
    track.cues = cues;
    track.url = blob;
    track.proxiedUrl = blob;
    track.loaded = true;
    return track;
  })().finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, p);
  return p;
}

/** Backward-compatible: returns cues, loading lazily when needed. */
export async function loadTrackCuesIfNeeded(track: ExtractedSubtitleTrack, signal?: AbortSignal): Promise<SubtitleCue[]> {
  if (Array.isArray(track.cues) && track.cues.length > 0) return track.cues;
  try {
    if (track.loaded === false || track.remoteUrl || track.osFileId) {
      return (await ensureTrackLoaded(track, signal)).cues ?? [];
    }
    const src = track.proxiedUrl || track.url;
    if (!src) return [];
    track.cues = parseSubtitleCues(await fetchSubtitleText(src, track.lang, signal));
    return track.cues;
  } catch {
    return [];
  }
}

export async function createLocalSubtitleTrack(file: File): Promise<ExtractedSubtitleTrack> {
  const text = decodeSubtitleBytes(await file.arrayBuffer(), getSubtitlePrefs().preferredLang);
  const cues = parseSubtitleCues(text);
  if (!cues.length) throw new Error("Invalid subtitle file");
  const blob = cuesToVttBlobUrl(cues);
  return {
    id: `local:${file.name}:${file.size}`,
    provider: "local",
    lang: "local",
    label: file.name.replace(/\.(srt|vtt)$/i, ""),
    url: blob,
    proxiedUrl: blob,
    cues,
    loaded: true,
  };
}

/**
 * Searches all chosen languages (1 request per provider), returns LAZY tracks sorted by preference,
 * and eagerly loads only the best track of the preferred language so subtitles start instantly.
 */
export async function fetchExternalSubtitles(params: SubtitleFetchParams): Promise<ExtractedSubtitleTrack[]> {
  if (params.mediaType === "movie" && !params.imdbId && params.title) {
    try {
      const ytsMovies = await fetchYtsListMovies({ query_term: params.title, limit: 3 }, params.signal);
      const targetYear = params.year ? Number(String(params.year).slice(0, 4)) : undefined;
      const match =
        ytsMovies.find(
          (m) => m.imdb_code && (!targetYear || !m.year || Math.abs(m.year - targetYear) <= 1),
        ) || ytsMovies.find((m) => m.imdb_code);
      if (match?.imdb_code) {
        params = { ...params, imdbId: match.imdb_code };
      }
    } catch {
      // ignore YTS lookup error
    }
  }

  const prefs = getSubtitlePrefs();
  const langs = (params.languages?.length ? params.languages : prefs.languages).slice(0, 8);
  const cacheKey = `${params.mediaType}:${params.tmdbId}:${params.season ?? 0}:${params.episode ?? 0}:${langs.join(",")}`;

  let all = SEARCH_CACHE.get(cacheKey);
  if (!all) {
    const settled = await Promise.allSettled([searchWyzie(params, langs), searchOpenSubtitles(params, langs)]);
    all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    SEARCH_CACHE.set(cacheKey, all);
  }

  const order = (l: string) => (l === prefs.preferredLang ? -1 : langs.indexOf(l) === -1 ? 99 : langs.indexOf(l));
  const perLang = new Map<string, number>();
  const result = all
    .filter((t) => langs.includes(t.lang))
    .sort(
      (a, b) =>
        order(a.lang) - order(b.lang) ||
        Number(Boolean(a.hearingImpaired) === prefs.hideHearingImpaired) -
          Number(Boolean(b.hearingImpaired) === prefs.hideHearingImpaired) ||
        (a.provider === "wyzie" ? -1 : 1) - (b.provider === "wyzie" ? -1 : 1),
    )
    .filter((t) => {
      const c = perLang.get(t.lang) ?? 0;
      perLang.set(t.lang, c + 1);
      return c < MAX_VERSIONS_PER_LANG;
    })
    .map((t) => ({ ...t, default: false }));

  for (const candidate of result.slice(0, 3)) {
    try {
      await ensureTrackLoaded(candidate, params.signal);
      candidate.default = true;
      break;
    } catch { /* try next version */ }
  }
  return result;
}
