import { LyricLine } from '../../types';

export function parseLRC(text: string): LyricLine[] {
  return text.trim().split('\n').map(line => {
    const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!m) return null;
    return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() };
  }).filter((line): line is LyricLine => line !== null);
}

export type { LyricLine };
