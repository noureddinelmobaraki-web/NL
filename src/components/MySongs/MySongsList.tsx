import { useMemo } from 'react';
import { Song, LyricLine } from '../../types';
import { SongList } from '../songs/SongList';
import { useVirtualSongList } from '../../hooks/useVirtualSongList';

export interface MySongsListProps {
  songs: Song[];
  activeId: number | null;
  isPlaying: boolean;
  isWaiting: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  lyricsOpen: boolean;
  karaokeMode: boolean;
  currentLyricLine: string | null;
  durationCache: Record<number, number>;
  lrcCache?: Record<number, LyricLine[]>;
  onPlay: (song: Song) => void;
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSeek: (v: number) => void;
  onVolumeChange: (v: number) => void;
  setLyricsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setKaraokeMode: (v: boolean | ((p: boolean) => boolean)) => void;
  onAmbientColorChange: (c: string) => void;
  onCardRevealed?: (id: number | string) => void;
  onHoverPrefetchLrc?: (id: number) => void;
}

export const MySongsList = (props: MySongsListProps) => {
  const {
    songs,
    activeId,
    isPlaying,
    isWaiting,
    currentTime,
    duration,
    volume,
    lyricsOpen,
    karaokeMode,
    currentLyricLine,
    durationCache,
    lrcCache = {},
    onPlay,
    onPlayPause,
    onPrev,
    onNext,
    onSeek,
    onVolumeChange,
    setLyricsOpen,
    setKaraokeMode,
    onAmbientColorChange,
    onCardRevealed,
    onHoverPrefetchLrc,
  } = props;

  const currentSong = songs.find((s) => s.id === activeId) || null;

  const forcedVisibleIds = useMemo(() => {
    const s = new Set<number | string>();
    if (activeId != null) s.add(activeId);
    return s;
  }, [activeId]);

  const { observe, isRevealed } = useVirtualSongList({
    rootMargin: '300px 0px 300px 0px',
    initialVisibleCount: 6,
    forcedVisibleIds,
    onCardRevealed,
  });

  return (
    <SongList
      songs={songs}
      currentSong={currentSong}
      onSelect={onPlay}
      onPlayPause={onPlayPause}
      onPrev={onPrev}
      onNext={onNext}
      isPlaying={isPlaying}
      isWaiting={isWaiting}
      currentTime={currentTime}
      duration={duration}
      durationCache={durationCache}
      onSeek={onSeek}
      volume={volume}
      onVolumeChange={onVolumeChange}
      lyricsOpen={lyricsOpen}
      setLyricsOpen={setLyricsOpen}
      lrcCache={lrcCache}
      karaokeMode={karaokeMode}
      setKaraokeMode={setKaraokeMode}
      currentLyricLine={currentLyricLine}
      onAmbientColorChange={onAmbientColorChange}
      observeCard={observe}
      isCardRevealed={isRevealed}
      onHoverPrefetchLrc={onHoverPrefetchLrc}
    />
  );
};
