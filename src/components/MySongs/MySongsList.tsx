import { useCallback } from 'react';
import { Song, LyricLine } from '../../types';
import { SongListLite as SongList } from '../songs/SongListLite';

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
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  setLyricsOpen: (value: boolean | ((previous: boolean) => boolean)) => void;
  setKaraokeMode: (value: boolean | ((previous: boolean) => boolean)) => void;
  onAmbientColorChange: (color: string) => void;
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

  const currentSong = songs.find((song) => song.id === activeId) ?? null;

  // Only six cards can mount. This callback preserves the existing visibility
  // signal used by the conservative HLS-priority policy without an observer.
  const registerVisibleCard = useCallback((id: number | string, element: HTMLElement | null) => {
    if (element) onCardRevealed?.(id);
  }, [onCardRevealed]);

  const alwaysRevealed = useCallback(() => true, []);

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
      observeCard={registerVisibleCard}
      isCardRevealed={alwaysRevealed}
      onHoverPrefetchLrc={onHoverPrefetchLrc}
    />
  );
};
