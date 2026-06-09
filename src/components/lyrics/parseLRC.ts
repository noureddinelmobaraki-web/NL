import { LyricLine, LyricWord } from '../../types';

/**
 * parseLRC — 2026 edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports:
 *   • Standard LRC          [00:12.34]Line text
 *   • Enhanced LRC          [00:12.34]<00:12.50>Word <00:12.80>by word
 *   • Walaoke / per-word    same syntax, capped to 3s per word
 *   • Metadata tags         [ar:Artist] [ti:Title] [al:Album] [au:Songwriter]
 *                           [by:Editor] [length:mm:ss] [offset:±ms]
 *                           [re:tool] [ve:version] [la:language]
 *   • Translation tracks    [00:12.34]Original / Translation
 *   • Multi-timestamp       [00:01.00][00:02.50]Repeated chorus line
 *   • Instrumental breaks   [00:30.00]       ← empty text preserved
 *   • Robust whitespace     BOM, CRLF, tabs, NBSP all tolerated
 *
 * Legacy SBV / SRT detection paths are preserved so existing files in
 * `public/lrc/*.sbv` / `*.srt` continue to work.
 *
 * Public API:
 *   parseLRC(text)        → LyricLine[]   (back-compat)
 *   parseLRCWithMeta(text) → { lines, metadata }
 */

export interface LRCMetadata {
  artist?: string;     // [ar:]
  title?: string;      // [ti:]
  album?: string;      // [al:]
  author?: string;     // [au:]
  editor?: string;     // [by:]
  length?: string;     // [length:]
  offset?: number;     // [offset:] in milliseconds (positive = delay)
  tool?: string;       // [re:]
  version?: string;    // [ve:]
  language?: string;   // [la:]
  extra: Record<string, string>;
}

export interface LRCDocument {
  lines: LyricLine[];
  metadata: LRCMetadata;
}

// Internal type with optional translation passed through the pipeline.
type LyricLineWithTranslation = LyricLine & { translation?: string };

const METADATA_KEYS: Record<string, keyof Omit<LRCMetadata, 'extra'>> = {
  ar: 'artist', ti: 'title', al: 'album', au: 'author',
  by: 'editor', length: 'length', re: 'tool', ve: 'version', la: 'language',
};

function splitTranslation(text: string): { primary: string; translation?: string } {
  const idx = text.search(/\s\/\s/);
  if (idx === -1) return { primary: text };
  return {
    primary: text.slice(0, idx).trim(),
    translation: text.slice(idx + 3).trim() || undefined,
  };
}

function detectFormat(text: string): 'lrc' | 'sbv' | 'srt' {
  if (text.includes(' --> ')) return 'srt';
  if (/^\d+:\d{2}:\d{2}\.\d+,/m.test(text)) return 'sbv';
  return 'lrc';
}

function parseSBV(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const parts = block.trim().split('\n');
    if (parts.length < 2) continue;
    const m = parts[0].trim().match(
      /^(\d+):(\d{2}):(\d{2})\.(\d+),(\d+):(\d{2}):(\d{2})\.(\d+)/,
    );
    if (!m) continue;
    const startTime = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
    const endTime   = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000;
    const lyricText = parts.slice(1).join(' ').trim();
    if (lyricText) lines.push({ time: startTime, endTime, text: lyricText });
  }
  return lines;
}

function parseSRT(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const parts = block.trim().split('\n');
    const idx = parts.findIndex((p) => p.includes(' --> '));
    if (idx === -1) continue;
    const m = parts[idx].match(
      /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/,
    );
    if (!m) continue;
    const startTime = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
    const endTime   = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000;
    const lyricText = parts.slice(idx + 1).join(' ').trim();
    if (lyricText) lines.push({ time: startTime, endTime, text: lyricText });
  }
  return lines;
}

const TIMESTAMP_TAG    = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
const TIMESTAMP_ANCHOR = /^\[(\d+):(\d+(?:\.\d+)?)\]/;
const METADATA_TAG     = /^\[([a-zA-Z]+):\s*([^\]]*)\]\s*$/;

function parseMetadataTag(line: string, meta: LRCMetadata): boolean {
  const m = line.match(METADATA_TAG);
  if (!m) return false;
  const key = m[1].toLowerCase();
  const value = m[2].trim();

  if (key === 'offset') {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) meta.offset = n;
    return true;
  }
  const mapped = METADATA_KEYS[key];
  if (mapped) (meta as unknown as Record<string, unknown>)[mapped] = value;
  else meta.extra[key] = value;
  return true;
}

function extractWords(rawText: string, lineTime: number): {
  cleanText: string;
  words: LyricWord[];
} {
  const cleanText = rawText.replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
  const words: LyricWord[] = [];
  if (!rawText.includes('<')) return { cleanText, words };

  let lastIndex = 0;
  let currentWordTime = lineTime;
  const tagRegex = /<(\d+):(\d+(?:\.\d+)?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawText)) !== null) {
    const chunk = rawText.substring(lastIndex, match.index);
    if (chunk) words.push({ text: chunk, time: currentWordTime });
    currentWordTime = +match[1] * 60 + parseFloat(match[2]);
    lastIndex = tagRegex.lastIndex;
  }
  const tail = rawText.substring(lastIndex);
  if (tail) words.push({ text: tail, time: currentWordTime });

  // Trim only boundary words — Enhanced LRC may intentionally use
  // leading/trailing spaces to control word grouping.
  if (words.length > 0) {
    words[0] = { ...words[0], text: words[0].text.replace(/^\s+/, '') };
    const last = words[words.length - 1];
    words[words.length - 1] = { ...last, text: last.text.replace(/\s+$/, '') };
  }
  return { cleanText, words };
}

interface ParsedLineSpec {
  time: number;
  text: string;
  words?: LyricWord[];
  translation?: string;
}

function parseLRCFormat(text: string): { lines: LyricLine[]; metadata: LRCMetadata } {
  const metadata: LRCMetadata = { extra: {} };
  const specs: ParsedLineSpec[] = [];

  for (let rawLine of text.split('\n')) {
    // Normalise stray whitespace
    rawLine = rawLine
      .replace(/^\uFEFF/, '')
      .replace(/\t/g, ' ')
      .replace(/\u00A0/g, ' ');
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Metadata tags MUST have no timestamp prefix.
    if (!TIMESTAMP_ANCHOR.test(trimmed) && parseMetadataTag(trimmed, metadata)) {
      continue;
    }

    // Collect leading [mm:ss.xx] timestamps (LRC allows repeats).
    TIMESTAMP_TAG.lastIndex = 0;
    const times: number[] = [];
    let consumed = 0;
    let m: RegExpExecArray | null;
    while ((m = TIMESTAMP_TAG.exec(trimmed)) !== null) {
      if (m.index !== consumed) break;
      times.push(+m[1] * 60 + parseFloat(m[2]));
      consumed = TIMESTAMP_TAG.lastIndex;
    }
    if (times.length === 0) continue;

    const rawBody = trimmed.slice(consumed);
    let translation: string | undefined;
    let body = rawBody;
    // Translation split only when no per-word tags inside the body.
    if (!rawBody.includes('<')) {
      const split = splitTranslation(rawBody);
      body = split.primary;
      translation = split.translation;
    }

    for (const t of times) {
      const { cleanText, words } = extractWords(body, t);
      specs.push({
        time: t,
        text: cleanText,
        ...(words.length > 0 ? { words } : {}),
        ...(translation ? { translation } : {}),
      });
    }
  }

  // Apply offset (positive offset DELAYS playback).
  if (metadata.offset && Number.isFinite(metadata.offset)) {
    const shift = metadata.offset / 1000;
    for (const s of specs) {
      s.time = Math.max(0, s.time + shift);
      if (s.words) s.words = s.words.map((w) => ({ ...w, time: Math.max(0, w.time + shift) }));
    }
  }

  specs.sort((a, b) => a.time - b.time);

  const lines: LyricLine[] = specs.map((s) => {
    const line: LyricLineWithTranslation = { time: s.time, text: s.text };
    if (s.words) line.words = s.words;
    if (s.translation) line.translation = s.translation;
    return line;
  });

  return { lines, metadata };
}

export function parseLRCWithMeta(text: string): LRCDocument {
  const empty: LRCDocument = { lines: [], metadata: { extra: {} } };
  if (!text) return empty;
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return empty;

  const format = detectFormat(normalized);
  let doc: LRCDocument;
  try {
    if (format === 'sbv')      doc = { lines: parseSBV(normalized), metadata: { extra: {} } };
    else if (format === 'srt') doc = { lines: parseSRT(normalized), metadata: { extra: {} } };
    else                       doc = parseLRCFormat(normalized);
  } catch (err) {
    console.warn('Error parsing lyrics file:', err);
    return empty;
  }

  // endTime second pass — kept IDENTICAL to previous version to avoid
  // karaoke timing regressions.
  for (let i = 0; i < doc.lines.length; i++) {
    const current = doc.lines[i];
    if (current.endTime === undefined) {
      current.endTime = i < doc.lines.length - 1 ? doc.lines[i + 1].time : Infinity;
    }
    if (current.words && current.words.length > 0) {
      for (let w = 0; w < current.words.length; w++) {
        const word = current.words[w];
        word.endTime = w < current.words.length - 1
          ? current.words[w + 1].time
          : current.endTime;
        const MAX_WORD_DURATION = 3.0;
        if ((word.endTime ?? Infinity) - word.time > MAX_WORD_DURATION) {
          word.endTime = word.time + MAX_WORD_DURATION;
        }
      }
    }
  }
  return doc;
}

/** Back-compat entry-point. Returns just the parsed lines. */
export function parseLRC(text: string): LyricLine[] {
  return parseLRCWithMeta(text).lines;
}

export type { LyricLine };
