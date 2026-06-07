import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useSongPlayer } from '../../songs/SongPlayer';
import { savePrefs } from '../../../utils/userPrefs';
import type { RepeatMode } from '../../../utils/userPrefs';
import { loadSession } from '../../../utils/sessionState';
import { Song, ActiveSong, LyricLine } from '../../../types';
import { audioManager } from '../../../audio/audioManager';

export interface UseMySongsPlaybackProps {
  songs: Song[];
  activeId: number | null;
  setActiveId: (id: number | null) => void;
  currentSong: Song | null;
  volume: number;
  setVolume: (v: number) => void;
  lyricsOpen: boolean;
  isDismissed: boolean;
  setIsDismissed: (b: boolean) => void;
  isShuffle: boolean;
  setIsShuffle: (b: boolean | ((p: boolean) => boolean)) => void;
  repeatMode: RepeatMode;
  setRepeatMode: (m: RepeatMode | ((p: RepeatMode) => RepeatMode)) => void;
  lrcCache: Record<number, LyricLine[]>;
  onSongPlay: () => void;
  onSongStop?: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
}

export function useMySongsPlayback({
  songs,
  activeId,
  setActiveId,
  currentSong,
  volume,
  setVolume,
  lyricsOpen,
  isDismissed,
  setIsDismissed,
  isShuffle,
  setIsShuffle,
  repeatMode,
  setRepeatMode,
  lrcCache,
  onSongPlay,
  onSongStop,
  onActiveSongChange,
}: UseMySongsPlaybackProps) {
  const {
    audioTagRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    pendingPlayRef,
    handlePlayPause,
    handleSeek,
  } = useSongPlayer({
    currentSong,
    onSongEnd: () => handleNext(),
    onTimeUpdate: () => {},
    onPlay: onSongPlay,
    onPause: () => onSongStop?.(),
    onNext: () => handleNext(),
    onPrev: () => handlePrev(),
  });

  const SWITCH_COOLDOWN_MS = 180;
  const lastSwitchAtRef = useRef(0);

  const handlePlayToggle = useCallback(
    (song?: Song) => {
      if (song && song.id !== activeId) {
        const now = performance.now();
        if (now - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS) return;
        lastSwitchAtRef.current = now;

        audioManager.stop('song');

        pendingPlayRef.current = true;
        setActiveId(song.id);
        setIsDismissed(false);
        onSongPlay();
        savePrefs({ lastSongId: song.id });
      } else {
        handlePlayPause();
      }
    },
    [activeId, handlePlayPause, onSongPlay, setActiveId, setIsDismissed, pendingPlayRef]
  );

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    if (performance.now() - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let nIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx + 1) % songs.length;
    if (isShuffle && nIdx === idx && songs.length > 1) nIdx = (nIdx + 1) % songs.length;
    handlePlayToggle(songs[nIdx]);
  }, [activeId, songs, isShuffle, handlePlayToggle]);

  const handlePrev = useCallback(() => {
    if (!songs.length) return;
    if (performance.now() - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let pIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx - 1 + songs.length) % songs.length;
    if (isShuffle && pIdx === idx && songs.length > 1) pIdx = (pIdx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[pIdx]);
  }, [activeId, songs, isShuffle, handlePlayToggle]);

  // Sync volume with physical player
  useEffect(() => {
    if (audioTagRef.current) {
      const safeVol = Math.max(0, Math.min(volume, 1));
      audioTagRef.current.volume = safeVol;
      savePrefs({ lastVolume: safeVol });
    }
  }, [volume, audioTagRef]);

  // Sync loop/repeat
  useEffect(() => {
    if (audioTagRef.current) audioTagRef.current.loop = repeatMode === 'one';
  }, [repeatMode, audioTagRef]);

  // Current lyric line memoization
  const currentLyricLine = useMemo(() => {
    if (!activeId) return null;
    const sessionLrc = loadSession().lrcCache;
    const lines = sessionLrc[activeId] || lrcCache[activeId];
    if (!lines) return null;
    let line = null;
    for (const l of lines) {
      if (l.time <= currentTime) line = l.text;
      else break;
    }
    return line;
  }, [activeId, lrcCache, currentTime]);

  // Sync activeSong state with parent
  useEffect(() => {
    if (!isDismissed && activeId && currentSong) {
      onActiveSongChange({
        id: activeId,
        title: currentSong.title,
        cover: currentSong.cover || currentSong.backgroundImage,
        audioRef: { current: audioTagRef.current },
        isPlaying,
        currentTime,
        duration,
        onPlayPause: () => handlePlayToggle(),
        onPrev: handlePrev,
        onNext: handleNext,
        onDismiss: () => {
          audioManager.stop('song');
          if (audioTagRef.current) {
            audioTagRef.current.pause();
            audioTagRef.current.src = '';
            audioTagRef.current.load();
          }
          setActiveId(null);
          setIsDismissed(true);
        },
        suppressMiniBar: activeId !== null && lyricsOpen,
        isShuffle,
        onShuffleToggle: () =>
          setIsShuffle((p) => {
            savePrefs({ isShuffle: !p });
            return !p;
          }),
        repeatMode,
        onRepeatToggle: () =>
          setRepeatMode((prev) => {
            const next: RepeatMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
            savePrefs({ repeatMode: next });
            return next;
          }),
        volume,
        onVolumeChange: (v) => {
          setVolume(v);
          savePrefs({ lastVolume: v });
        },
        nextSongs: songs
          .slice(songs.findIndex((s) => s.id === activeId) + 1, songs.findIndex((s) => s.id === activeId) + 6)
          .map((s) => ({ id: s.id, title: s.title, cover: s.cover || s.backgroundImage })),
      });
    } else {
      onActiveSongChange(null);
    }
  }, [
    activeId,
    isPlaying,
    currentTime,
    duration,
    songs,
    isShuffle,
    repeatMode,
    volume,
    isDismissed,
    lyricsOpen,
    currentSong,
    onActiveSongChange,
    handlePrev,
    handleNext,
    handlePlayToggle,
    setActiveId,
    setIsDismissed,
    setIsShuffle,
    setRepeatMode,
    setVolume,
    audioTagRef,
  ]);

  // Share URL param parameter routing
  useEffect(() => {
    const songId = new URLSearchParams(window.location.search).get('s');
    if (!songId || !songs.length) return;
    const s = songs.find((x) => x.id === parseInt(songId));
    if (!s) return;
    const t = setTimeout(() => {
      handlePlayToggle(s);
      document.getElementById('my-songs-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
    return () => clearTimeout(t);
  }, [songs, handlePlayToggle]);

  return {
    audioTagRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    currentLyricLine,
    handlePlayToggle,
    handlePrev,
    handleNext,
    handleSeek,
    handlePlayPause,
  };
}
