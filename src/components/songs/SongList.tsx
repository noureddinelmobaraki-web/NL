import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Song, LyricLine } from '../../types';
import { SongCard } from './SongCard';
import { preloadSong } from '../../hooks/useHlsAudio';
import { useDeviceType } from '../../hooks/useDeviceType';

export interface SongListProps {
  songs: Song[];
  currentSong: Song | null;
  onSelect: (song: Song) => void;
  isPlaying?: boolean;
  isWaiting?: boolean;
  currentTime?: number;
  duration?: number;
  durationCache?: Record<number, number>;
  onSeek?: (val: number) => void;
  volume?: number;
  onVolumeChange?: (val: number) => void;
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  lyricsOpen?: boolean;
  setLyricsOpen?: (val: boolean | ((prev: boolean) => boolean)) => void;
  lrcCache?: Record<number, LyricLine[]>;
  karaokeMode?: boolean;
  setKaraokeMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentLyricLine?: string | null;
  onAmbientColorChange?: (color: string) => void;
}

export const SongList = ({
  songs,
  currentSong,
  onSelect,
  isPlaying = false,
  isWaiting = false,
  currentTime = 0,
  duration = 0,
  durationCache = {},
  onSeek,
  volume = 0.7,
  onVolumeChange,
  onPlayPause,
  onPrev,
  onNext,
  lyricsOpen = false,
  setLyricsOpen = () => {},
  lrcCache = {},
  karaokeMode = false,
  setKaraokeMode = () => {},
  currentLyricLine = null,
  onAmbientColorChange,
}: SongListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { isMobile } = useDeviceType();

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    return songs.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [songs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Dynamic Search/Filter Input */}
      <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : 'max-w-sm'}`}>
        <input
          type="text"
          placeholder="بحث عن أغنية... (البحث بـ العنوان)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full rounded-full focus:outline-none transition-all ${isMobile ? 'max-w-none px-[16px] py-[10px] text-[16px] font-sans' : 'px-5 py-2 text-xs font-mono'}`}
          style={{
            background: 'var(--bg-glass-strong, rgba(20,20,30,0.5))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            color: 'var(--text-primary, #ffffff)',
            fontSize: '16px', // Prevents iOS keyboard zoom
          }}
          inputMode="search"
          enterKeyHint="search"
          aria-label="Search songs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] font-mono uppercase bg-zinc-800/80 text-zinc-400 px-3 py-1.5 rounded-full hover:text-white transition-colors"
          >
            مسح
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
        <AnimatePresence mode="popLayout">
          {filteredSongs.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onMouseEnter={() => preloadSong(song.url)}
                style={{ display: 'contents' }}
              >
                <SongCard
                  index={i}
                  song={song}
                  isActive={isActive}
                  isActiveInBar={isActive}
                  isPlaying={isActive && isPlaying}
                  isWaiting={isActive && isWaiting}
                  currentTime={currentTime}
                  duration={isActive ? duration : durationCache[song.id]}
                  onSeek={onSeek}
                  volume={volume}
                  onVolumeChange={onVolumeChange}
                  onPlay={() => onSelect(song)}
                  onPlayPause={onPlayPause}
                  onPrev={onPrev}
                  onNext={onNext}
                  setLyricsOpen={setLyricsOpen}
                  isLyricsOpen={isActive && lyricsOpen}
                  lyrics={lrcCache[song.id] || []}
                  karaokeMode={karaokeMode}
                  setKaraokeMode={setKaraokeMode}
                  currentLyricLine={isActive ? currentLyricLine : null}
                  onAmbientColorChange={onAmbientColorChange}
                />
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SongList;
