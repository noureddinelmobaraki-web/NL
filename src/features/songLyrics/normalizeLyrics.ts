import type { LyricLine } from '../../types';
import type { NormalizedLyrics } from './types';
import { spaceOutWords, wordsAreGlued } from './lyricFormat';

/** ≥40% of non-empty lines must carry per-word timing to call the file 'word'. */
const WORD_MODE_MIN_RATIO = 0.4;

export function normalizeLyrics(input: LyricLine[]): NormalizedLyrics {
  if (!input || input.length === 0) {
    return { lines: [], mode: 'line', hasTranslations: false };
  }

  let wordLineCount = 0;
  let hasTranslations = false;

  const lines: LyricLine[] = input.map((line) => {
    if (line.translation) hasTranslations = true;

    if (line.words && line.words.length > 1) {
      wordLineCount++;
      const words = wordsAreGlued(line.words) ? spaceOutWords(line.words) : line.words;
      const text = words.map((w) => w.text).join('').trim() || line.text;
      return { ...line, words, text };
    }
    return line;
  });

  const nonEmpty = lines.filter((l) => l.text.trim().length > 0).length || 1;
  const mode = wordLineCount / nonEmpty >= WORD_MODE_MIN_RATIO ? 'word' : 'line';
  return { lines, mode, hasTranslations };
}
