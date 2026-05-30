import { Song, LyricLine } from '../../types';
import { SongList } from '../songs/SongList';

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
  onSeek: (v: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleLyrics: () => void;
  setKaraokeMode: (v: boolean | ((p: boolean) => boolean)) => void;
  onShare: (song: Song) => void;
  onAmbientColorChange: (c: string) => void;
}

export const MySongsList = ({
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
  onSeek,
  onVolumeChange,
  onToggleLyrics,
  setKaraokeMode,
  onShare,
  onAmbientColorChange,
}: MySongsListProps) => {
  const currentSong = songs.find((s) => s.id === activeId) || null;

  return (
    <SongList
      songs={songs}
      currentSong={currentSong}
      onSelect={onPlay}
      isPlaying={isPlaying}
      isWaiting={isWaiting}
      currentTime={currentTime}
      duration={duration}
      durationCache={durationCache}
      onSeek={onSeek}
      volume={volume}
      onVolumeChange={onVolumeChange}
      onShare={onShare}
      lyricsOpen={lyricsOpen}
      setLyricsOpen={onToggleLyrics}
      lrcCache={lrcCache}
      karaokeMode={karaokeMode}
      setKaraokeMode={setKaraokeMode}
      currentLyricLine={currentLyricLine}
      onAmbientColorChange={onAmbientColorChange}
    />
  );
};
