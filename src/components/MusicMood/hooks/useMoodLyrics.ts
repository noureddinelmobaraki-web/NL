import { useState, useEffect } from 'react';
import type { Song, LyricLine } from '../../../types';
import { parseLRC } from '../../LyricsEngine';

interface UseMoodLyricsProps {
  activeSong: Song | null;
  currentTime: number;
}

export function useMoodLyrics({ activeSong, currentTime }: UseMoodLyricsProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<string>('');
  const [nextLine, setNextLine] = useState<string>('');

  // ── جلب وتحليل الـ LRC
  useEffect(() => {
    if (!activeSong?.lrc) {
      setLyrics([]);
      setCurrentLine('');
      setNextLine('');
      return;
    }
    const ctrl = new AbortController();
    const filename = activeSong.lrc.split('/').pop() || '';
    const encoded = encodeURIComponent(filename);
    fetch(`${import.meta.env.BASE_URL}lrc/${encoded}`, { signal: ctrl.signal })
      .then((r) => r.text())
      .then((text) => parseLRC(text))
      .then((parsed) => setLyrics(parsed))
      .catch(() => {});
    return () => ctrl.abort();
  }, [activeSong]);

  // ── تحديد الكلمات الحالية بناءً على الوقت
  useEffect(() => {
    if (!lyrics.length) return;
    let current = '', next = '';
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        current = lyrics[i].text;
        next = lyrics[i + 1]?.text ?? '';
      }
    }
    setCurrentLine(current);
    setNextLine(next);
  }, [currentTime, lyrics]);

  return {
    lyrics,
    currentLine,
    nextLine,
    setLyrics,
  };
}
