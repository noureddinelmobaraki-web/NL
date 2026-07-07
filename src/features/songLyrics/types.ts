import type { LyricLine, Song } from '../../types';

export type LyricsMode = 'word' | 'line';

export interface NormalizedLyrics {
  lines: LyricLine[];
  mode: LyricsMode;
  hasTranslations: boolean;
}

export interface OpenLyricsArgs {
  song: Song;
  anchorEl: HTMLElement;
  getCurrentTime: () => number;
  onSeek: (t: number) => void;
}
