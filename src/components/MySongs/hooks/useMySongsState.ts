import { useState, useEffect, useMemo } from 'react';
import { Song, LyricLine } from '../../../types';
import { loadPrefs } from '../../../utils/userPrefs';
import type { RepeatMode } from '../../../utils/userPrefs';
import { loadSession, saveSession } from '../../../utils/sessionState';
import { ASSETS, SONG_BG_FALLBACK } from '../../../constants/assets';
import { preloadAllSongs, preloadSong } from '../../../hooks/useHlsAudio';
import { extractDominantColorCached } from '../../../utils/extractColors';
import { parseLRC } from '../../../components/LyricsEngine';

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
    ].filter((s) => Boolean(s.lrc));

    const base = import.meta.env.BASE_URL || './';
    const ctrl = new AbortController();

    targets.forEach((s, i) => {
      // Skip if already in session cache
      if (loadSession().lrcCache[s.id]?.length) return;

      const filename = s.lrc!.split('/').pop()!;
      const delay = i * 60; // 0 ms, 60 ms, 120 ms stagger

      setTimeout(() => {
        if (ctrl.signal.aborted) return;
        fetch(`${base}lrc/${encodeURIComponent(filename)}`, {
          signal: ctrl.signal,
        })
          .then((r) => {
            if (!r.ok) throw new Error(`LRC ${r.status}`);
            return r.text();
          })
          .then((txt) => {
            const parsed = parseLRC(txt);
            if (!parsed.length) return;

            // Persist to session so any consumer can read it
            const cur = loadSession();
            saveSession({ lrcCache: { ...cur.lrcCache, [s.id]: parsed } });

            // Notify any mounted SongCard without prop-drilling
            window.dispatchEvent(
              new CustomEvent('lrc-ready', {
                detail: { songId: s.id, lyrics: parsed },
              })
            );
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('[LRC preload]', s.id, err.message);
            }
          });
      }, delay);
    });

    return () => ctrl.abort();
  }, [activeId, songs]);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch songs
  useEffect(() => {
    setError(false);
    const base = import.meta.env.BASE_URL || './';
    fetch(`${base}data/songs.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.json();
      })
      .then((data: any[]) => {
        const mapped: Song[] = data.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          lrc: s.hasLrc && s.lrcFile ? `${base}lrc/${s.lrcFile}` : null,
          backgroundImage: ASSETS.songs.backgrounds[s.bgIndex] || SONG_BG_FALLBACK,
        }));
        setSongs(mapped);

        const sectionEl = document.getElementById('my-songs-section');
        if (sectionEl && 'IntersectionObserver' in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                observer.disconnect();
                setTimeout(() => {
                  mapped.slice(0, 3).forEach((s) => preloadSong(s.url));
                }, 5000);
                const startPhase2 = () => {
                  const allUrls = mapped.map((s) => s.url);
                  setTimeout(() => {
                    preloadAllSongs(allUrls.slice(0, 8), 8, 2, 300);
                    setTimeout(() => preloadAllSongs(allUrls.slice(8), 8, 1, 800), 3000);
                  }, 5000);
                };
                if ('requestIdleCallback' in window) {
                   (window as any).requestIdleCallback(startPhase2, { timeout: 2000 });
                } else {
                  setTimeout(startPhase2, 1000);
                }
              }
            },
            { rootMargin: '400px 0px' }
          );
          observer.observe(sectionEl);
        } else {
          setTimeout(() => {
            mapped.forEach((s) => preloadSong(s.url));
          }, 5000);
        }
      })
      .catch((err) => {
        console.error('[useMySongsState] fetch error:', err);
        setError(true);
      });
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
