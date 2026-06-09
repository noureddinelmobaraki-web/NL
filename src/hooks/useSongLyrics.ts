/**
 * useSongLyrics — single source of truth for one song's lyrics.
 *
 * Consolidates 4 scattered behaviors previously in SongCard.tsx:
 *   A. Parent-passed lyrics prop (instant path).
 *   B. Session-storage LRC cache (warm path).
 *   C. lrc-ready event from preloader (broadcast path).
 *   D. Self-fetch fallback gated on enableSelfFetch (network path).
 *
 * One AbortController per-effect → opening/closing the panel rapidly cannot
 * leak pending fetches. The hook NEVER clears an already-loaded value to
 * prevent UI flicker.
 */
import { useEffect, useRef, useState } from 'react';
import type { Song, LyricLine } from '../types';
import { parseLRC } from '../components/lyrics/parseLRC';
import { loadSession, saveSession } from '../utils/sessionState';

interface UseSongLyricsOptions {
  song: Pick<Song, 'id' | 'lrc'>;
  externalLyrics?: LyricLine[];
  enableSelfFetch?: boolean;
}

interface UseSongLyricsResult {
  lyrics: LyricLine[];
  isLoading: boolean;
}

const readSessionLyrics = (id: number): LyricLine[] | undefined => {
  try {
    const cached = loadSession().lrcCache?.[id];
    return Array.isArray(cached) && cached.length ? (cached as LyricLine[]) : undefined;
  } catch { return undefined; }
};

const writeSessionLyrics = (id: number, lyrics: LyricLine[]): void => {
  try {
    const cur = loadSession();
    saveSession({ lrcCache: { ...cur.lrcCache, [id]: lyrics } });
  } catch { /* sessionStorage unavailable */ }
};

export function useSongLyrics({
  song,
  externalLyrics,
  enableSelfFetch = false,
}: UseSongLyricsOptions): UseSongLyricsResult {
  const [lyrics, setLyrics] = useState<LyricLine[]>(() => {
    if (externalLyrics && externalLyrics.length > 0) return externalLyrics;
    return readSessionLyrics(song.id) ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Latest lyrics in a ref so self-fetch doesn't re-run on every update.
  const lyricsRef = useRef(lyrics);
  lyricsRef.current = lyrics;

  // ── A: parent prop / warm cache ─────────────────────────────────
  useEffect(() => {
    if (externalLyrics && externalLyrics.length > 0) {
      setLyrics(externalLyrics);
      return;
    }
    const cached = readSessionLyrics(song.id);
    if (cached) setLyrics(cached);
    // Never call setLyrics([]) here.
  }, [song.id, externalLyrics]);

  // ── B: preloader broadcast ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ songId: number; lyrics: LyricLine[] }>).detail;
      if (detail?.songId === song.id && detail.lyrics?.length) {
        setLyrics(detail.lyrics);
      }
    };
    window.addEventListener('lrc-ready', handler);
    return () => window.removeEventListener('lrc-ready', handler);
  }, [song.id]);

  // ── C: self-fetch fallback ──────────────────────────────────────
  useEffect(() => {
    if (!enableSelfFetch || !song.lrc) return;
    if (lyricsRef.current.length > 0) return;

    const cached = readSessionLyrics(song.id);
    if (cached) { setLyrics(cached); return; }

    const filename = song.lrc.split('/').pop() || '';
    const encoded = encodeURIComponent(filename);
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`${import.meta.env.BASE_URL}lrc/${encoded}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`LRC ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const parsed = parseLRC(text);
        if (!parsed.length) return;
        setLyrics(parsed);
        writeSessionLyrics(song.id, parsed);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[useSongLyrics] fallback fetch failed:', err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
    // lyricsRef intentionally not in deps — fire on panel open only.
  }, [enableSelfFetch, song.id, song.lrc]);

  return { lyrics, isLoading };
}
