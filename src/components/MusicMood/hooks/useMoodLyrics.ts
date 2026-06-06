import { useState, useEffect, useRef } from 'react';
import type { Song, LyricLine } from '../../../types';
import { parseLRC } from '../../LyricsEngine';
import { safeFetchText, SafeFetchError } from '../../../utils/safeFetch';

interface UseMoodLyricsProps {
  activeSong: Song | null;
  currentTime: number;
}

export function useMoodLyrics({ activeSong, currentTime }: UseMoodLyricsProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [previousLine, setPreviousLine] = useState<LyricLine | null>(null);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [nextLine, setNextLine] = useState<LyricLine | null>(null);

  // ── جلب وتحليل الـ LRC
  useEffect(() => {
    setLyrics([]);
    setPreviousLine(null);
    setCurrentLine(null);
    setNextLine(null);

    if (!activeSong?.lrc) return;

    const ctrl = new AbortController();
    const filename = activeSong.lrc.split('/').pop() || '';
    const encoded = encodeURIComponent(filename);

    safeFetchText(`${import.meta.env.BASE_URL}lrc/${encoded}`, {
      signal: ctrl.signal,
      timeoutMs: 10000,
    })
      .then((text) => parseLRC(text))
      .then((parsed) => setLyrics(parsed))
      .catch((err) => {
        if (err instanceof SafeFetchError && err.kind === 'abort') return;
      });

    return () => ctrl.abort();
  }, [activeSong]);

  const lastIndexRef = useRef(-1);

  useEffect(() => {
    lastIndexRef.current = -1;
  }, [activeSong]);

  // ── تحديد الكلمات الحالية بناءً على الوقت
  useEffect(() => {
    if (!lyrics.length) return;

    // 1) تحقق سريع من الـ cache
    const cached = lastIndexRef.current;
    if (
      cached >= 0 && cached < lyrics.length &&
      lyrics[cached].time <= currentTime &&
      (cached + 1 >= lyrics.length || lyrics[cached + 1].time > currentTime)
    ) {
      return; // ما زلنا على نفس السطر، لا تحديث
    }

    // 2) binary search
    let lo = 0, hi = lyrics.length - 1, idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lyrics[mid].time <= currentTime) { idx = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    if (idx !== cached) {
      lastIndexRef.current = idx;
      setPreviousLine(idx > 0 ? lyrics[idx - 1] : null);
      setCurrentLine(idx >= 0 ? lyrics[idx] : null);
      setNextLine(idx + 1 < lyrics.length ? lyrics[idx + 1] : null);
    }
  }, [currentTime, lyrics]);

  return {
    lyrics,
    previousLine,
    currentLine,
    nextLine,
    setLyrics,
  };
}
