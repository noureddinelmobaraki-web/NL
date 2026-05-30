import { useEffect, useCallback, useMemo } from 'react';
import { useDeviceType } from '../../../hooks/useDeviceType';
import { useSongPlayer } from '../../songs/SongPlayer';
import { savePrefs } from '../../../utils/userPrefs';
import type { RepeatMode } from '../../../utils/userPrefs';
import { loadSession } from '../../../utils/sessionState';
import { Song, ActiveSong, LyricLine } from '../../../types';

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
  const { isMobile } = useDeviceType();

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let nIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx + 1) % songs.length;
    if (isShuffle && nIdx === idx && songs.length > 1) nIdx = (nIdx + 1) % songs.length;
    handlePlayToggle(songs[nIdx]);
  }, [activeId, songs, isShuffle]);

  const handlePrev = useCallback(() => {
    if (!songs.length) return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let pIdx = isShuffle ? Math.floor(Math.random() * songs.length) : (idx - 1 + songs.length) % songs.length;
    if (isShuffle && pIdx === idx && songs.length > 1) pIdx = (pIdx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[pIdx]);
  }, [activeId, songs, isShuffle]);

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
    onSongEnd: handleNext,
    onTimeUpdate: () => {},
    onPlay: onSongPlay,
    onPause: () => onSongStop?.(),
    onNext: handleNext,
    onPrev: handlePrev,
  });

  const handlePlayToggle = useCallback(
    (song?: Song) => {
      if (song && song.id !== activeId) {
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

  // Sync volume with physical player
  useEffect(() => {
    if (audioTagRef.current) {
      audioTagRef.current.volume = volume;
      savePrefs({ lastVolume: volume });
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

  // Handle sharing URL formatting
  const handleShare = useCallback((song: Song) => {
    const baseUrl = window.location.origin + import.meta.env.BASE_URL;
    const shareUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}share/song-${song.id}.html`;
    if (navigator.share && isMobile) {
      navigator.share({ title: song.title, text: `Listen to ${song.title}`, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [isMobile]);

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
        onShare: () => handleShare(currentSong),
        onDismiss: () => {
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
    handleShare,
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
    if (songId && songs.length) {
      const s = songs.find((x) => x.id === parseInt(songId));
      if (s) {
        setTimeout(() => {
          handlePlayToggle(s);
          document.getElementById('my-songs-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 1000);
      }
    }
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
    handleShare,
  };
}
