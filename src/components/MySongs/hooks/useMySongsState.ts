import { useState, useEffect, useMemo } from 'react';
import { loadPrefs } from '../../../utils/userPrefs';
import type { RepeatMode } from '../../../utils/userPrefs';
import { extractDominantColorCached } from '../../../utils/extractColors';
import { useSongsData, useLrcPreload, loadLrcCacheSnapshot } from './useSongsData';

const initialPrefs = loadPrefs();

export interface UseMySongsStateProps {
  onAmbientColorChange?: (color: string | null) => void;
  visibleIds?: Set<number | string>;
}

export function useMySongsState({ onAmbientColorChange, visibleIds }: UseMySongsStateProps = {}) {
  // ─── Data layer (separate hook) ────────────────────────────────────────
  const { songs, error, retry, durationCache } = useSongsData({ visibleIds });

  // ─── UI state (kept minimal here) ──────────────────────────────────────
  const [activeId, setActiveId] = useState<number | null>(null);
  const [volume, setVolume] = useState(initialPrefs.lastVolume);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isShuffle, setIsShuffle] = useState(initialPrefs.isShuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initialPrefs.repeatMode);
  const [ambientColor, setAmbientColor] = useState('20, 20, 30');

  const currentSong = useMemo(
    () => songs.find((s) => s.id === activeId) || null,
    [activeId, songs]
  );

  // Reset lyrics/karaoke on no active
  useEffect(() => {
    if (activeId === null) {
      setLyricsOpen(false);
      setKaraokeMode(false);
    }
  }, [activeId]);

  // LRC preload — separate hook now
  useLrcPreload(songs, activeId);

  // Ambient color (kept here as it's tied to currentSong)
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
    lrcCache: loadLrcCacheSnapshot(),
    error,
    retry,
  } as const;
}

