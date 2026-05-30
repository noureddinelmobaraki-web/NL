import { memo, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Song, LyricLine } from '../../types';
import { parseLRC } from '../LyricsEngine';
import { useDeviceType } from '../../hooks/useDeviceType';
import { loadSession, saveSession } from '../../utils/sessionState';
import { extractDominantColorCached } from '../../utils/extractColors';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { Waveform } from './Waveform';
import { SongCardHeader } from './SongCardHeader';
import { SongCardControls } from './SongCardControls';
import { SongCardLyricsPanel } from './SongCardLyricsPanel';

export interface SongCardProps {
  song: Song;
  index: number;
  isActive: boolean;
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  onPlay: () => void;
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  setLyricsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  isLyricsOpen?: boolean;
  lyrics?: LyricLine[];
  currentTime?: number;
  duration?: number;
  onSeek?: (val: number) => void;
  volume?: number;
  onVolumeChange?: (val: number) => void;
  onShare?: () => void;
  karaokeMode?: boolean;
  setKaraokeMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentLyricLine?: string | null;
  onAmbientColorChange?: (color: string) => void;
}

/**
 * Individual Song Card component for the bento grid
 */
export const SongCard = memo(({ 
  song, 
  index,
  isActive, 
  isActiveInBar,
  isPlaying,
  isWaiting,
  onPlay,
  onPlayPause,
  onPrev,
  onNext,
  setLyricsOpen,
  isLyricsOpen = false,
  lyrics = [],
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onShare,
  karaokeMode = false,
  setKaraokeMode,
  currentLyricLine,
  onAmbientColorChange
}: SongCardProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const resolvedTheme = useResolvedTheme();

  // ─── Local lyrics state (fetches LRC file independently) ───
  const [localLyrics, setLocalLyrics] = useState<LyricLine[]>(() => {
    if (lyrics && lyrics.length > 0) return lyrics;
    const session = loadSession();
    if (session.lrcCache && session.lrcCache[song.id]) {
      return session.lrcCache[song.id];
    }
    return [];
  });

  const currentLineIndex = useMemo(() => {
    if (!localLyrics || localLyrics.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < localLyrics.length; i++) {
      if (localLyrics[i].time <= (currentTime || 0)) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [localLyrics, currentTime]);

  useEffect(() => {
    if (resolvedTheme === 'light' && isLyricsOpen && currentLineIndex !== -1) {
      const activeEl = document.getElementById(`light-lyric-line-${currentLineIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex, isLyricsOpen, resolvedTheme]);

  useEffect(() => {
    // If parent already passed lyrics, use them
    if (lyrics && lyrics.length > 0) {
      setLocalLyrics(lyrics);
      return;
    }

    // Check session cache first
    const session = loadSession();
    if (session.lrcCache && session.lrcCache[song.id] && session.lrcCache[song.id].length > 0) {
      setLocalLyrics(session.lrcCache[song.id]);
      return;
    }

    // Only fetch when lyrics panel is open and song has an lrc file
    if (!isLyricsOpen || !song.lrc) {
      setLocalLyrics([]);
      return;
    }

    // Fetch the .lrc file directly
    const filename = song.lrc.split('/').pop() || '';
    const encoded = encodeURIComponent(filename);
    const controller = new AbortController();

    fetch(`${import.meta.env.BASE_URL}lrc/${encoded}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('LRC not found');
        return res.text();
      })
      .then(text => {
        const parsed = parseLRC(text);
        setLocalLyrics(parsed);
        saveSession({
          lrcCache: { ...loadSession().lrcCache, [song.id]: parsed }
        });
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.warn('SongCard LRC fetch:', err);
      });

    return () => controller.abort();
  }, [isLyricsOpen, song.lrc, song.id, lyrics]);

  useEffect(() => {
    const coverUrl = song.cover || song.backgroundImage;
    if (!coverUrl) return;

    // Check session cache
    const session = loadSession();
    if (session.dominantColors[coverUrl]) {
      const color = session.dominantColors[coverUrl];
      if (isActive) onAmbientColorChange?.(color);
      return;
    }

    extractDominantColorCached(coverUrl, (color) => {
      saveSession({ dominantColors: { ...session.dominantColors, [coverUrl]: color } });
      if (isActive) onAmbientColorChange?.(color);
    });
  }, [song.cover, song.backgroundImage, isActive, onAmbientColorChange]);

  const renderContent = () => (
    <motion.div 
      layout
      layoutId={`song-${song.id}`}
      onClick={onPlay}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play song ${song.title}`}
      onPointerEnter={() => {
        if (song.url.includes('.m3u8')) {
          import('../../hooks/useHlsAudio').then(({ preloadAllSongs }) => {
            preloadAllSongs([song.url], 4, 1, 0);
          });
        }
      }}
      className={`
        song-card relative ${(resolvedTheme === 'light' && isLyricsOpen) ? 'overflow-visible' : 'overflow-hidden'} flex flex-col transition-all cursor-pointer
        ${resolvedTheme === 'dark' ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 rounded-2xl' : (resolvedTheme === 'light' ? 'bg-[#F0EBE3]' : (isActive ? 'active shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-8 rounded-2xl' : 'shadow-lg hover:shadow-xl p-5 sm:p-6 rounded-2xl'))}
        ${isActive && resolvedTheme !== 'dark' && resolvedTheme !== 'light' ? 'p-6 sm:p-8' : ''}
      `}
      style={{
        backgroundImage: resolvedTheme === 'light' ? 'none' : `url('${song.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        gridColumn: isActive && !isMobile ? 'span 2' : 'span 1',
        transitionDuration: resolvedTheme === 'dark' ? '500ms' : '700ms'
      }}
    >
      {/* Bento expansion handle */}
      {isActive && resolvedTheme !== 'light' && (
        <div className="absolute top-4 left-4 z-30 scale-75 sm:scale-100">
          <Waveform isPlaying={isPlaying} />
        </div>
      )}

      {/* Background Image with Animation */}
      {resolvedTheme !== 'light' && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('${song.backgroundImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: isActive ? 'slow-zoom 8s ease-in-out infinite alternate' : 'none',
          }}
        />
      )}

      {/* Overlay */}
      {resolvedTheme !== 'light' && (
        <div 
          className="absolute inset-0 z-10 transition-all duration-600"
          style={{
            background: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.65)',
            backdropFilter: (isActive || isTablet) ? 'none' : 'blur(1px)',
            WebkitBackdropFilter: (isActive || isTablet) ? 'none' : 'blur(1px)',
          }} 
        />
      )}

      {/* Content wrapper */}
      <div className="relative z-20 flex flex-col gap-4">
        {/* Header (Block B) */}
        <SongCardHeader
          song={song}
          index={index}
          isActive={isActive}
          isActiveInBar={isActiveInBar}
          isPlaying={isPlaying}
          isWaiting={isWaiting}
          isMobile={isMobile}
          isTablet={isTablet}
          resolvedTheme={resolvedTheme}
          isLyricsOpen={isLyricsOpen}
          duration={duration}
          onPlay={onPlay}
          onToggleLyrics={() => setLyricsOpen(prev => !prev)}
        />

        {/* Controls shown when active (Block C/D) */}
        {isActive && (
          <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <SongCardControls
              isMobile={isMobile}
              resolvedTheme={resolvedTheme}
              currentTime={currentTime || 0}
              duration={duration || 0}
              volume={volume || 0.7}
              onSeek={onSeek || (() => {})}
              onVolumeChange={onVolumeChange || (() => {})}
              onPrev={onPrev || (() => {})}
              onNext={onNext || (() => {})}
              onPlayPause={onPlayPause || (() => {})}
              onShare={onShare}
              isPlaying={isPlaying}
              isWaiting={isWaiting}
              song={song}
            />

            {/* Inline lyrics panel for non-light themes */}
            <SongCardLyricsPanel
              layoutType="inline"
              song={song}
              isLyricsOpen={isLyricsOpen}
              resolvedTheme={resolvedTheme}
              karaokeMode={karaokeMode}
              setKaraokeMode={setKaraokeMode}
              localLyrics={localLyrics}
              currentLineIndex={currentLineIndex}
              currentLyricLine={currentLyricLine}
              currentTime={currentTime}
              onSeek={onSeek}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* Floating Light Lyrics Popover Window */}
      <SongCardLyricsPanel
        layoutType="popover"
        song={song}
        isLyricsOpen={isLyricsOpen}
        resolvedTheme={resolvedTheme}
        karaokeMode={karaokeMode}
        setKaraokeMode={setKaraokeMode}
        localLyrics={localLyrics}
        currentLineIndex={currentLineIndex}
        currentLyricLine={currentLyricLine}
        currentTime={currentTime}
        onSeek={onSeek}
        isMobile={isMobile}
      />
    </motion.div>
  );

  if (resolvedTheme === 'light') {
    return (
      <OsWindow 
        title={`song_card.${song.id}`} 
        className={isActive && !isMobile ? 'col-span-2' : ''}
        overflow={isLyricsOpen ? 'visible' : 'hidden'}
      >
        {renderContent()}
      </OsWindow>
    );
  }

  return renderContent();
});
