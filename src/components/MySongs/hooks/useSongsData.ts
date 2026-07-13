import { useEffect, useState, useMemo, useRef } from 'react';
import { Song, LyricLine } from '../../../types';
import { loadSession, saveSession } from '../../../utils/sessionState';
import { ASSETS, SONG_BG_FALLBACK } from '../../../constants/assets';
import { preloadAllSongs, preloadSong } from '../../../hooks/useHlsAudio';
import { parseLRC } from '../../LyricsEngine';
import { safeFetch, safeFetchJson, SafeFetchError } from '../../../utils/safeFetch';

interface SongApiRow {
  id: number;
  title: string;
  url: string;
  hasLrc?: boolean;
  lrcFile?: string | null;
  bgIndex?: number;
}

export function shouldUseAggressiveSongPreload(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const saveData = navigator.connection?.saveData === true;
  const slowNetwork = navigator.connection?.effectiveType === '2g'
    || navigator.connection?.effectiveType === 'slow-2g';
  const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 2
    || (navigator.deviceMemory ?? 4) <= 1;
  return !mobile && !saveData && !slowNetwork && !lowEnd;
}

export function useSongsData(opts: { visibleIds?: Set<number | string> } = {}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const durationCache = useMemo(() => loadSession().durationCache, []);

  const visibleIdsRef = useRef(opts.visibleIds);
  useEffect(() => {
    visibleIdsRef.current = opts.visibleIds;
  }, [opts.visibleIds]);

  useEffect(() => {
    setError(false);
    let mounted = true;
    let observer: IntersectionObserver | null = null;
    const localTimers: ReturnType<typeof setTimeout>[] = [];
    const ctrl = new AbortController();
    const base = import.meta.env.BASE_URL || './';
    let idleId: number | null = null;

    safeFetchJson<unknown>(`${base}data/songs.json`, {
      signal: ctrl.signal,
      timeoutMs: 10_000,
    })
      .then((data: unknown) => {
        if (!mounted) return;
        if (!Array.isArray(data)) throw new Error('songs.json: expected array');
        const rows = data as SongApiRow[];
        const mapped: Song[] = rows.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          lrc: s.hasLrc && s.lrcFile ? `${base}lrc/${s.lrcFile}` : null,
          backgroundImage:
            (typeof s.bgIndex === 'number' && ASSETS.songs.backgrounds[s.bgIndex]) ||
            SONG_BG_FALLBACK,
        }));
        setSongs(mapped);

        // ─── Strategic preload (visibility-gated) ──────────────────────
        const sectionEl = document.getElementById('my-songs-section');
        if (sectionEl && 'IntersectionObserver' in window) {
          observer = new IntersectionObserver(
            (entries) => {
              if (!mounted || !observer || !entries[0].isIntersecting) return;
              observer.disconnect();
              observer = null;
              if (!shouldUseAggressiveSongPreload()) return;
              localTimers.push(setTimeout(() => {
                if (!mounted) return;
                mapped.slice(0, 3).forEach((s) => preloadSong(s.url));
              }, 5000));
              const startPhase2 = () => {
                if (!mounted) return;
                const visible = visibleIdsRef.current;
                const prioritized = visible
                  ? mapped.filter(s => visible.has(s.id) || visible.has(String(s.id))).map(s => s.url)
                  : mapped.slice(0, 6).map(s => s.url);

                // Preload ONLY the first few visible songs. The remaining streams
                // load on demand (on selection) via useHlsAudio, so we no longer
                // saturate the network by prefetching all ~48 HLS streams.
                localTimers.push(setTimeout(() => {
                  if (!mounted) return;
                  preloadAllSongs(prioritized.slice(0, 6), 8, 2, 300);
                }, 5000));
              };
              if (typeof window.requestIdleCallback === 'function') {
                idleId = window.requestIdleCallback(startPhase2, { timeout: 2000 });
              } else {
                localTimers.push(setTimeout(startPhase2, 1000));
              }
            },
            { rootMargin: '400px 0px' }
          );
          observer.observe(sectionEl);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof SafeFetchError && err.kind === 'abort') return;
        console.error('[useSongsData] fetch error:', err);
        setError(true);
      });

    return () => {
      mounted = false;
      ctrl.abort();
      if (observer) { try { observer.disconnect(); } catch {} observer = null; }
      if (idleId !== null && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
      localTimers.forEach((id) => clearTimeout(id));
    };
  }, [retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return { songs, error, retry, durationCache } as const;
}

/**
 * Preload LRC for current + next + prev songs. Abortable on activeId change.
 * يبقى منفصلاً عن useSongsData لتقليل re-renders.
 */
export function useLrcPreload(songs: Song[], activeId: number | null) {
  useEffect(() => {
    if (!songs.length || activeId == null) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    if (idx === -1) return;

    const targets = [
      songs[idx],
      songs[(idx + 1) % songs.length],
      songs[(idx - 1 + songs.length) % songs.length],
    ].filter((s): s is Song & { lrc: string } => Boolean(s?.lrc));

    const base = import.meta.env.BASE_URL || './';
    const ctrl = new AbortController();
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    targets.forEach((s, i) => {
      if (loadSession().lrcCache[s.id]?.length) return;
      const filename = s.lrc.split('/').pop() || '';
      const delay = i * 60;
      const tid = setTimeout(() => {
        if (ctrl.signal.aborted) return;
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
            saveSession({ lrcCache: { ...cur.lrcCache, [s.id]: parsed } });
            window.dispatchEvent(new CustomEvent('lrc-ready', {
              detail: { songId: s.id, lyrics: parsed },
            }));
          })
          .catch((err) => {
            if (err instanceof SafeFetchError && err.kind === 'abort') return;
            console.warn('[LRC preload]', s.id, err?.message ?? err);
          });
      }, delay);
      timeoutIds.push(tid);
    });

    return () => {
      ctrl.abort();
      timeoutIds.forEach((t) => clearTimeout(t));
    };
  }, [activeId, songs]);
}

export function loadLrcCacheSnapshot(): Record<number, LyricLine[]> {
  return loadSession().lrcCache;
}
