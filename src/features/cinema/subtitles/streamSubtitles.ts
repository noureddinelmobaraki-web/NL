// src/features/cinema/subtitles/streamSubtitles.ts
import type { ExtractedSubtitleTrack, SubtitleCue } from "../../../services/videoExtractor";
import { getLanguageLabel, normalizeLangCode } from "./languages";

const MAX_SEGMENTS = 1500;
const CONCURRENCY = 12;

export function isHlsPlaylistText(text: string): boolean {
  return /^\uFEFF?\s*#EXTM3U/.test(text);
}

export function stripVttHeader(raw: string): string {
  const t = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^WEBVTT/.test(t)) return t.trim();
  const idx = t.indexOf("\n\n");
  return idx === -1 ? "" : t.slice(idx + 2).trim();
}

function firstSubtitleMediaUri(text: string): string | null {
  for (const line of text.split("\n")) {
    if (!line.startsWith("#EXT-X-MEDIA:") || !/TYPE=SUBTITLES/i.test(line)) continue;
    const m = line.match(/URI="([^"]+)"/i);
    if (m) return m[1];
  }
  return null;
}

export async function mergeHlsVttPlaylist(
  playlistText: string,
  baseUrl: string,
  fetchText: (url: string) => Promise<string>,
  depth = 0,
): Promise<string> {
  const text = playlistText.replace(/\r\n?/g, "\n");
  const childUri = firstSubtitleMediaUri(text);
  if (childUri && depth < 1) {
    const childUrl = new URL(childUri, baseUrl).href;
    return mergeHlsVttPlaylist(await fetchText(childUrl), childUrl, fetchText, depth + 1);
  }
  const segs = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .slice(0, MAX_SEGMENTS)
    .map((l) => {
      try {
        return new URL(l, baseUrl).href;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  if (!segs.length) throw new Error("Empty HLS subtitle playlist");

  const parts: string[] = new Array(segs.length).fill("");
  let cursor = 0;
  const run = async () => {
    while (cursor < segs.length) {
      const i = cursor;
      cursor += 1;
      try {
        parts[i] = stripVttHeader(await fetchText(segs[i]));
      } catch {
        parts[i] = "";
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, segs.length) }, run));
  const body = parts.filter(Boolean).join("\n\n");
  if (!body.trim()) throw new Error("HLS subtitle segments empty");
  return `WEBVTT\n\n${body}\n`;
}

export function dedupeCues(cues: SubtitleCue[]): SubtitleCue[] {
  const seen = new Set<string>();
  return cues.filter((c) => {
    const k = `${Math.round(c.start * 10)}|${Math.round(c.end * 10)}|${c.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const FPS_FIXES = [23.976 / 25, 24 / 25];

export function autoRetimeCues(
  cues: SubtitleCue[],
  mediaDurationSec: number,
): { cues: SubtitleCue[]; factor: number } {
  if (!cues.length || !(mediaDurationSec > 600)) return { cues, factor: 1 };
  const maxEnd = cues.reduce((m, c) => Math.max(m, c.end), 0);
  if (maxEnd <= mediaDurationSec * 1.01) return { cues, factor: 1 };
  const inv = mediaDurationSec / maxEnd;
  for (const f of FPS_FIXES) {
    if (maxEnd * f <= mediaDurationSec * 1.01 && Math.abs(f - inv) <= 0.05) {
      return {
        cues: cues.map((c) => ({ ...c, start: c.start * f, end: c.end * f })),
        factor: f,
      };
    }
  }
  return { cues, factor: 1 };
}

interface HlsSubtitleLike {
  url?: string;
  lang?: string;
  name?: string;
}

export function hlsTracksToSubtitleTracks(hls: { subtitleTracks?: HlsSubtitleLike[] }): ExtractedSubtitleTrack[] {
  const list = Array.isArray(hls.subtitleTracks) ? hls.subtitleTracks : [];
  return list
    .filter((t) => typeof t?.url === "string" && t.url)
    .map((t, i): ExtractedSubtitleTrack => {
      const lang = normalizeLangCode(t.lang || t.name);
      return {
        id: `stream:${i}:${lang}`,
        provider: "stream",
        lang,
        label: `${getLanguageLabel(lang)} · Stream`,
        release: String(t.name || "").slice(0, 120),
        remoteUrl: t.url as string,
        url: "",
        proxiedUrl: "",
        loaded: false,
      };
    });
}

export function mergeStreamFirst(
  stream: ExtractedSubtitleTrack[],
  rest: ExtractedSubtitleTrack[],
): ExtractedSubtitleTrack[] {
  const seenKeys = new Set<string>();
  const out: ExtractedSubtitleTrack[] = [];
  for (const t of [...stream, ...rest]) {
    const key = t.id || `${t.lang}:${t.remoteUrl || t.proxiedUrl || t.url}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    out.push(t);
  }
  return out;
}
