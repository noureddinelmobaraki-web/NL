/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * ASS / SSA Colored Subtitle Parser & WebVTT Converter
 * - Parses [Events] Dialogue lines from .ass / .ssa subtitle scripts
 * - Preserves line breaks (\N, \n) and converts inline ASS override tags
 * - Returns sorted SubtitleCue[] compatible with the unified player engine
 */

import type { SubtitleCue } from '../videoExtractor';

function parseAssTime(raw: string): number {
  // Format: H:MM:SS.cc (centiseconds)
  const parts = raw.trim().split(':');
  if (parts.length !== 3) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const secParts = parts[2].split('.');
  const s = parseInt(secParts[0], 10) || 0;
  const cs = secParts[1] ? parseInt(secParts[1].padEnd(2, '0').slice(0, 2), 10) : 0;
  return h * 3600 + m * 60 + s + cs / 100;
}

export function isAssOrSsaSubtitle(rawText: string): boolean {
  return (
    /\[Script Info\]/i.test(rawText) ||
    /\[Events\]/i.test(rawText) ||
    /^Dialogue:\s*\d+,/m.test(rawText)
  );
}

export function parseAssSubtitleCues(rawText: string): SubtitleCue[] {
  const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const cues: SubtitleCue[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('Dialogue:')) continue;

    const afterPrefix = trimmed.slice('Dialogue:'.length).trim();
    // Standard ASS format has 10 comma-separated fields; the 10th field is Text (which may contain commas)
    const parts = afterPrefix.split(',');
    if (parts.length < 10) continue;

    const start = parseAssTime(parts[1]);
    const end = parseAssTime(parts[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      continue;
    }

    const rawDialogue = parts.slice(9).join(',');
    // Skip vector drawing commands {\p1}...{\p0}
    if (/\{\\p[1-9]\}/i.test(rawDialogue)) continue;

    const cleanedText = rawDialogue
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\h/g, ' ')
      .replace(/\{[^}]*\}/g, '')
      .trim();

    if (cleanedText) {
      cues.push({ start, end, text: cleanedText });
    }
  }

  cues.sort((a, b) => a.start - b.start);
  return cues;
}
