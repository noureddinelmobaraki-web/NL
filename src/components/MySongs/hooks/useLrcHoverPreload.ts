import { useEffect, useRef, useCallback } from 'react';
import { loadSession, saveSession } from '../../../utils/sessionState';
import { parseLRC } from '../../LyricsEngine';
import { safeFetch, SafeFetchError } from '../../../utils/safeFetch';
import { Song } from '../../../types';

/**
 * Returns a `prefetchLrc(songId)` function safe to call repeatedly.
 * - dedup عبر in-flight Map
 * - abort عند unmount
 * - لا fetch إذا cached مسبقاً
 */
export function useLrcHoverPreload(songs: Song[]) {
  const inflightRef = useRef<Map<number, AbortController>>(new Map());

  useEffect(() => {
    const inflight = inflightRef.current;
    return () => {
      inflight.forEach((c) => c.abort());
      inflight.clear();
    };
  }, []);

  const prefetchLrc = useCallback((songId: number) => {
    const song = songs.find((s) => s.id === songId);
    if (!song?.lrc) return;
    if (loadSession().lrcCache[songId]?.length) return;
    if (inflightRef.current.has(songId)) return;

    const ctrl = new AbortController();
    inflightRef.current.set(songId, ctrl);
    const base = import.meta.env.BASE_URL || './';
    const filename = song.lrc.split('/').pop() || '';

    safeFetch(`${base}lrc/${encodeURIComponent(filename)}`, {
      signal: ctrl.signal,
      timeoutMs: 8000,
      retryOnFailure: false,
    })
      .then((r) => r.text())
      .then((txt) => {
        if (ctrl.signal.aborted) return;
        const parsed = parseLRC(txt);
        if (!parsed.length) return;
        const cur = loadSession();
        saveSession({ lrcCache: { ...cur.lrcCache, [songId]: parsed } });
        window.dispatchEvent(new CustomEvent('lrc-ready', {
          detail: { songId, lyrics: parsed },
        }));
      })
      .catch((err) => {
        if (err instanceof SafeFetchError && err.kind === 'abort') return;
        console.warn('[LRC hover prefetch]', songId, err?.message ?? err);
      })
      .finally(() => {
        inflightRef.current.delete(songId);
      });
  }, [songs]);

  return { prefetchLrc };
}
