import { useState, useCallback, useMemo } from 'react';
import { savePrefs, loadPrefs } from '../utils/userPrefs';
import type { RepeatMode } from '../utils/userPrefs';

interface Song { id: number; src: string; title: string; }

export function useSongQueue(allSongs: Song[]) {
  const prefs = loadPrefs();
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState(prefs.isShuffle);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(prefs.repeatMode);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);

  const currentSong = currentIndex >= 0 ? allSongs[currentIndex] : null;

  const generateShuffleOrder = useCallback((excludeIdx: number) => {
    const indices = allSongs.map((_, i) => i).filter(i => i !== excludeIdx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return excludeIdx >= 0 ? [excludeIdx, ...indices] : indices;
  }, [allSongs]);

  const play = useCallback((idx: number) => {
    setCurrentIndex(idx);
    if (isShuffle) setShuffleOrder(generateShuffleOrder(idx));
  }, [isShuffle, generateShuffleOrder]);

  const next = useCallback(() => {
    if (currentIndex < 0) return;
    if (repeatMode === 'one') return; // ابق على نفس الأغنية
    const order = isShuffle ? shuffleOrder : allSongs.map((_, i) => i);
    const pos = order.indexOf(currentIndex);
    if (pos < order.length - 1) {
      setCurrentIndex(order[pos + 1]);
    } else if (repeatMode === 'all') {
      setCurrentIndex(order[0]);
    }
  }, [currentIndex, repeatMode, isShuffle, shuffleOrder, allSongs]);

  const prev = useCallback(() => {
    if (currentIndex < 0) return;
    const order = isShuffle ? shuffleOrder : allSongs.map((_, i) => i);
    const pos = order.indexOf(currentIndex);
    if (pos > 0) setCurrentIndex(order[pos - 1]);
    else if (repeatMode === 'all') setCurrentIndex(order[order.length - 1]);
  }, [currentIndex, isShuffle, shuffleOrder, repeatMode, allSongs]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(s => {
      const next = !s;
      savePrefs({ isShuffle: next });
      if (next && currentIndex >= 0) setShuffleOrder(generateShuffleOrder(currentIndex));
      return next;
    });
  }, [currentIndex, generateShuffleOrder]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(m => {
      const next: RepeatMode = m === 'off' ? 'all' : m === 'all' ? 'one' : 'off';
      savePrefs({ repeatMode: next });
      return next;
    });
  }, []);

  return useMemo(() => ({
    currentSong, currentIndex, isShuffle, repeatMode,
    play, next, prev, toggleShuffle, cycleRepeat,
    hasNext: currentIndex >= 0 && (repeatMode !== 'off' || currentIndex < allSongs.length - 1),
    hasPrev: currentIndex > 0 || repeatMode === 'all',
  }), [currentSong, currentIndex, isShuffle, repeatMode, play, next, prev, toggleShuffle, cycleRepeat, allSongs.length]);
}
