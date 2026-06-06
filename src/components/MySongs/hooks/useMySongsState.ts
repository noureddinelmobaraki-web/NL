import { useState, useEffect, useMemo } from 'react';
import { Song, LyricLine } from '../../../types';
import { loadPrefs } from '../../../utils/userPrefs';
import type { RepeatMode } from '../../../utils/userPrefs';
import { loadSession, saveSession } from '../../../utils/sessionState';
import { ASSETS, SONG_BG_FALLBACK } from '../../../constants/assets';
import { preloadAllSongs, preloadSong } from '../../../hooks/useHlsAudio';
import { extractDominantColorCached } from '../../../utils/extractColors';
import { parseLRC } from '../../../components/LyricsEngine';
import { safeFetch, safeFetchJson, SafeFetchError } from '../../../utils/safeFetch';

const initialPrefs = loadPrefs();

export interface UseMySongsStateProps {
  onAmbientColorChange?: (color: string | null) => void;
}

export function useMySongsState({ onAmbientColorChange }: UseMySongsStateProps = {}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [volume, setVolume] = useState(initialPrefs.lastVolume);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [durationCache] = useState<Record<number, number>>(loadSession().durationCache);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isShuffle, setIsShuffle] = useState(initialPrefs.isShuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initialPrefs.repeatMode);
  const getLrcCache = (): Record<number, LyricLine[]> => loadSession().lrcCache;
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');

  const currentSong = useMemo(() => songs.find((s) => s.id === activeId) || null, [activeId, songs]);

  // Reset lyrics/karaoke on activeId change
  useEffect(() => {
    if (activeId === null) {
      setLyricsOpen(false);
      setKaraokeMode(false);
    }
  }, [activeId]);

  // ─── Eagerly preload LRC for current + next + prev songs ───────────────
  useEffect(() => {
    if (!songs.length || activeId == null) return;

    const idx = songs.findIndex((s) => s.id === activeId);
    if (idx === -1) return;

    // Build priority list: [current, next, previous]
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
      const delay = i * 60; // 0 / 60 / 120 ms stagger

      const timeoutId = setTimeout(() => {
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
            window.dispatchEvent(
              new CustomEvent('lrc-ready', { detail: { songId: s.id, lyrics: parsed } })
            );
          })
          .catch((err) => {
            if (err instanceof SafeFetchError && err.kind === 'abort') return;
            console.warn('[LRC preload]', s.id, err?.message ?? err);
          });
      }, delay);
      timeoutIds.push(timeoutId);
    });

    return () => {
      ctrl.abort();
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [activeId, songs]);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch songs
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
        if (!Array.isArray(data)) throw new Error('songs.json: expected an array');

        interface SongApiRow {
          id: number;
          title: string;
          url: string;
          hasLrc?: boolean;
          lrcFile?: string | null;
          bgIndex?: number;
        }

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

        const sectionEl = document.getElementById('my-songs-section');
        if (sectionEl && 'IntersectionObserver' in window) {
          observer = new IntersectionObserver(
            (entries) => {
              if (!mounted || !observer) return;
              if (entries[0].isIntersecting) {
                observer.disconnect();
                observer = null;
                localTimers.push(setTimeout(() => {
                  if (!mounted) return;
                  mapped.slice(0, 3).forEach((s) => preloadSong(s.url));
                }, 5000));
                const startPhase2 = () => {
                  if (!mounted) return;
                  const allUrls = mapped.map((s) => s.url);
                  localTimers.push(setTimeout(() => {
                    if (!mounted) return;
                    preloadAllSongs(allUrls.slice(0, 8), 8, 2, 300);
                    localTimers.push(setTimeout(() => {
                      if (!mounted) return;
                      preloadAllSongs(allUrls.slice(8), 8, 1, 800);
                    }, 3000));
                  }, 5000));
                };
                if (typeof window.requestIdleCallback === 'function') {
                   idleId = window.requestIdleCallback(startPhase2, { timeout: 2000 });
                } else {
                  localTimers.push(setTimeout(startPhase2, 1000));
                }
              }
            },
            { rootMargin: '400px 0px' }
          );
          observer.observe(sectionEl);
        } else {
          localTimers.push(setTimeout(() => {
            if (!mounted) return;
            mapped.forEach((s) => preloadSong(s.url));
          }, 5000));
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof SafeFetchError && err.kind === 'abort') return;
        console.error('[useMySongsState] fetch error:', err);
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

  // Sync ambient color
  useEffect(() => {
    const coverUrl = currentSong?.cover || currentSong?.backgroundImage;
    if (coverUrl) {
      extractDominantColorCached(coverUrl, (color) => {
        setAmbientColor(color);
        onAmbientColorChange?.(`rgb(${color})`);
      });
    } else {
      setAmbientColor('20, 20, 30');
      onAmbientColorChange?.(null);
    }
  }, [activeId, currentSong, onAmbientColorChange]);

  return {
    songs,
    activeId,
    setActiveId,
    currentSong,
    volume,
    setVolume,
    lyricsOpen,
    setLyricsOpen,
    karaokeMode,
    setKaraokeMode,
    isDismissed,
    setIsDismissed,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    ambientColor,
    setAmbientColor,
    durationCache,
    lrcCache: getLrcCache(),
    error,
    retry: () => setRetryCount((c) => c + 1),
  } as const;
}
