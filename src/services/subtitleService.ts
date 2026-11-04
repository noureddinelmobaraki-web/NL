// src/services/subtitleService.ts

import {
  PUBLIC_OPENSUBTITLES_KEY,
  PUBLIC_WYZIE_KEY,
} from "../config/publicKeys";
import type { ExtractedSubtitleTrack } from "./videoExtractor";

const WYZIE_KEY = import.meta.env.VITE_WYZIE_API_KEY || PUBLIC_WYZIE_KEY;
const OS_KEY =
  import.meta.env.VITE_OPENSUBTITLES_API_KEY || PUBLIC_OPENSUBTITLES_KEY;

export interface SubtitleFetchParams {
  tmdbId: number;
  imdbId?: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  signal?: AbortSignal;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
};

function normalizeLangCode(raw?: string): "ar" | "en" | "fr" | string {
  const clean = String(raw || "")
    .trim()
    .toLowerCase();
  if (clean.startsWith("ar") || clean.includes("arab")) return "ar";
  if (clean.startsWith("fr") || clean.includes("fre") || clean.includes("fra"))
    return "fr";
  if (clean.startsWith("en") || clean.includes("eng")) return "en";
  return clean || "en";
}

/**
 * Converts SRT or raw subtitle text into valid WebVTT format (`WEBVTT\n\n` with `.` decimal separators)
 * and creates a local UTF-8 Blob URL so `<track>` loads immediately without CORS errors.
 */
export function convertSrtToVttBlobUrl(rawText: string): string {
  const trimmed = rawText.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("Empty subtitle content");
  }

  let vttBody = trimmed.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!vttBody.startsWith("WEBVTT")) {
    // Replace SRT timestamp commas (00:00:00,000 --> 00:00:02,500) with dots (00:00:00.000 --> 00:00:02.500)
    vttBody = vttBody.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2",
    );
    vttBody = `WEBVTT\n\n${vttBody}`;
  }

  const blob = new Blob([vttBody], { type: "text/vtt;charset=utf-8" });
  return URL.createObjectURL(blob);
}

/**
 * Revokes any `blob:` URLs previously created for subtitle tracks to avoid memory leaks.
 */
export function revokeSubtitleBlobUrls(
  tracks?: ExtractedSubtitleTrack[] | null,
): void {
  if (!Array.isArray(tracks)) return;
  for (const track of tracks) {
    for (const candidate of [track?.url, track?.proxiedUrl]) {
      if (typeof candidate === "string" && candidate.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(candidate);
        } catch {
          // Ignore revoke errors
        }
      }
    }
  }
}

async function fetchFromWyzie(
  params: SubtitleFetchParams,
): Promise<ExtractedSubtitleTrack[]> {
  const targetId =
    params.imdbId && /^tt\d+$/i.test(params.imdbId.trim())
      ? params.imdbId.trim()
      : String(params.tmdbId);

  const searchUrl = new URL("https://sub.wyzie.io/search");
  searchUrl.searchParams.set("id", targetId);
  searchUrl.searchParams.set("language", "ar,en,fr");
  if (WYZIE_KEY) {
    searchUrl.searchParams.set("key", WYZIE_KEY);
  }
  if (params.mediaType === "tv") {
    searchUrl.searchParams.set("season", String(Math.max(1, params.season || 1)));
    searchUrl.searchParams.set("episode", String(Math.max(1, params.episode || 1)));
  }

  const res = await fetch(searchUrl.toString(), {
    method: "GET",
    signal: params.signal ?? AbortSignal.timeout(9000),
  });
  if (!res.ok) {
    throw new Error(`Wyzie search failed: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.subtitles)
      ? payload.subtitles
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  // Pick first valid item per target language (ar, en, fr)
  const pickedByLang = new Map<string, any>();
  for (const item of list) {
    if (!item || typeof item.url !== "string" || !item.url.trim()) continue;
    const lang = normalizeLangCode(item.language || item.lang || item.iso639);
    if (!["ar", "en", "fr"].includes(lang)) continue;
    if (!pickedByLang.has(lang)) {
      pickedByLang.set(lang, item);
    }
  }

  const tracks: ExtractedSubtitleTrack[] = [];
  await Promise.allSettled(
    Array.from(pickedByLang.entries()).map(async ([lang, item]) => {
      const subRes = await fetch(item.url, {
        method: "GET",
        signal: params.signal ?? AbortSignal.timeout(8000),
      });
      if (!subRes.ok) return;
      const srtText = await subRes.text();
      const blobUrl = convertSrtToVttBlobUrl(srtText);
      const label =
        LANGUAGE_LABELS[lang] || item.display || item.label || lang.toUpperCase();
      tracks.push({
        url: blobUrl,
        proxiedUrl: blobUrl,
        lang,
        label: `${label} (Wyzie)`,
        default: lang === "ar",
      });
    }),
  );

  return tracks;
}

async function fetchFromOpenSubtitles(
  params: SubtitleFetchParams,
): Promise<ExtractedSubtitleTrack[]> {
  if (!OS_KEY) {
    return [];
  }

  const numericImdb = params.imdbId
    ? params.imdbId.replace(/^tt/i, "").replace(/\D/g, "")
    : "";

  // Build alphabetically sorted query parameters as required by OpenSubtitles REST API v1
  const queryEntries: Array<[string, string]> = [];
  if (params.mediaType === "tv") {
    queryEntries.push([
      "episode_number",
      String(Math.max(1, params.episode || 1)),
    ]);
    queryEntries.push(["languages", "ar,en,fr"]);
    if (numericImdb) {
      queryEntries.push(["parent_imdb_id", numericImdb]);
    } else {
      queryEntries.push(["parent_tmdb_id", String(params.tmdbId)]);
    }
    queryEntries.push([
      "season_number",
      String(Math.max(1, params.season || 1)),
    ]);
  } else {
    if (numericImdb) {
      queryEntries.push(["imdb_id", numericImdb]);
    } else {
      queryEntries.push(["tmdb_id", String(params.tmdbId)]);
    }
    queryEntries.push(["languages", "ar,en,fr"]);
  }

  queryEntries.sort(([a], [b]) => a.localeCompare(b));
  const searchParams = new URLSearchParams(queryEntries);
  const searchEndpoint = `https://api.opensubtitles.com/api/v1/subtitles?${searchParams.toString()}`;

  const headers: Record<string, string> = {
    "Api-Key": OS_KEY,
    "User-Agent": "NLfilms v1.0",
    Accept: "application/json",
  };

  const searchRes = await fetch(searchEndpoint, {
    method: "GET",
    headers,
    signal: params.signal ?? AbortSignal.timeout(9000),
  });
  if (!searchRes.ok) {
    throw new Error(`OpenSubtitles search failed: HTTP ${searchRes.status}`);
  }

  const searchJson = await searchRes.json();
  const dataList: any[] = Array.isArray(searchJson?.data)
    ? searchJson.data
    : [];

  // Pick the first subtitle per language that has attributes.files[0].file_id
  const fileIdByLang = new Map<string, number>();
  for (const entry of dataList) {
    const attrs = entry?.attributes;
    const fileId = attrs?.files?.[0]?.file_id;
    if (typeof fileId !== "number") continue;
    const lang = normalizeLangCode(attrs?.language);
    if (!["ar", "en", "fr"].includes(lang)) continue;
    if (!fileIdByLang.has(lang)) {
      fileIdByLang.set(lang, fileId);
    }
  }

  const tracks: ExtractedSubtitleTrack[] = [];
  await Promise.allSettled(
    Array.from(fileIdByLang.entries()).map(async ([lang, fileId]) => {
      const dlRes = await fetch(
        "https://api.opensubtitles.com/api/v1/download",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_id: fileId,
            sub_format: "srt",
          }),
          signal: params.signal ?? AbortSignal.timeout(9000),
        },
      );
      if (!dlRes.ok) return;
      const dlJson = await dlRes.json();
      const downloadLink = dlJson?.link;
      if (typeof downloadLink !== "string" || !downloadLink) return;

      const srtRes = await fetch(downloadLink, {
        method: "GET",
        signal: params.signal ?? AbortSignal.timeout(8000),
      });
      if (!srtRes.ok) return;
      const srtText = await srtRes.text();
      const blobUrl = convertSrtToVttBlobUrl(srtText);
      const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();
      tracks.push({
        url: blobUrl,
        proxiedUrl: blobUrl,
        lang,
        label: `${label} (OpenSubtitles)`,
        default: lang === "ar",
      });
    }),
  );

  return tracks;
}

/**
 * Fetches Arabic (ar), English (en), and French (fr) subtitles in parallel from
 * Wyzie Subs API and OpenSubtitles REST API, converts SRT to WebVTT Blob URLs,
 * and prioritizes Arabic (`lang === 'ar'`) at the front with `default: true`.
 */
export async function fetchExternalSubtitles(
  params: SubtitleFetchParams,
): Promise<ExtractedSubtitleTrack[]> {
  const settled = await Promise.allSettled([
    fetchFromWyzie(params),
    fetchFromOpenSubtitles(params),
  ]);

  const combined: ExtractedSubtitleTrack[] = [];
  const seenLangLabel = new Set<string>();

  for (const res of settled) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      for (const track of res.value) {
        const key = `${track.lang}:${track.label}`;
        if (!seenLangLabel.has(key)) {
          seenLangLabel.add(key);
          combined.push(track);
        }
      }
    }
  }

  const langPriority: Record<string, number> = { ar: 0, en: 1, fr: 2 };
  combined.sort((a, b) => {
    const pa = langPriority[a.lang] ?? 99;
    const pb = langPriority[b.lang] ?? 99;
    return pa - pb;
  });

  let defaultAssigned = false;
  return combined.map((track, idx) => {
    const isDefault =
      !defaultAssigned && (track.lang === "ar" || idx === 0);
    if (isDefault) defaultAssigned = true;
    return {
      ...track,
      default: isDefault,
    };
  });
}
