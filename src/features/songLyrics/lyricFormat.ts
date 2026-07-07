import type { LyricLine, LyricWord } from '../../types';

const SECTION_KEYWORDS = [
  'intro', 'verse', 'chorus', 'hook', 'bridge',
  'outro', 'solo', 'instrumental', 'pre-chorus', 'refrain',
];

/** Short bracketed/parenthesised section labels like [Chorus] or (Hook). */
export function isSectionHeader(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[[\]()]/g, '');
  if (!t || t.length > 24) return false;
  return SECTION_KEYWORDS.some(
    (k) => t === k || t.startsWith(k + ' ') || t.endsWith(' ' + k),
  );
}

/** Empty text and no words → instrumental break. */
export function isInstrumental(line: LyricLine): boolean {
  return !line.text.trim() && (!line.words || line.words.length === 0);
}

/** True when the concatenation of word texts contains no whitespace at all. */
export function wordsAreGlued(words: LyricWord[]): boolean {
  if (words.length < 2) return false;
  return !/\s/.test(words.map((w) => w.text).join(''));
}

/** Insert a single trailing space after each word except the last. */
export function spaceOutWords(words: LyricWord[]): LyricWord[] {
  return words.map((w, i) => {
    const t = w.text.replace(/\s+$/, '');
    return i === words.length - 1 ? { ...w, text: t } : { ...w, text: t + ' ' };
  });
}
