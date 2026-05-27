import { memo, useEffect, useState as useLyricsState, useEffect as useLyricsEffect } from 'react';
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song, LyricLine } from '../types';
import { LyricsWindowContent, parseLRC } from './LyricsEngine';
import { useDeviceType } from '../hooks/useDeviceType';
import { loadSession, saveSession } from '../utils/sessionState';
import { extractDominantColorCached } from '../utils/extractColors';

/**
 * Shared utility for time formatting within song components
 */
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Animated Waveform indicator for the active song
 */
export const Waveform = ({ isPlaying }: { isPlaying: boolean }) => (
  <div className="waveform" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '16px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{
        width: '3px',
        background: '#a78bfa',
        borderRadius: '1px',
        animation: `wave 0.8s ease-in-out infinite`,
        animationDelay: `calc(${i} * 0.1s)`,
        animationPlayState: isPlaying ? 'running' : 'paused',
      } as React.CSSProperties} />
    ))}
  </div>
);

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

import { OsWindow } from './OsWindow';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

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
  karaokeMode = false,
  currentLyricLine,
  onAmbientColorChange
}: SongCardProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const resolvedTheme = useResolvedTheme();

  // ─── Local lyrics state (fetches LRC file independently, same as MusicMood) ───
  const [localLyrics, setLocalLyrics] = useLyricsState<LyricLine[]>(() => {
    if (lyrics && lyrics.length > 0) return lyrics;
    const session = loadSession();
    if (session.lrcCache && session.lrcCache[song.id]) {
      return session.lrcCache[song.id];
    }
    return [];
  });

  useLyricsEffect(() => {
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
  // ────────────────────────────────────────────────────────────────────────────

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
      onPointerEnter={() => {
        if (song.url.includes('.m3u8')) {
          import('../hooks/useHlsAudio').then(({ preloadAllSongs }) => {
            preloadAllSongs([song.url], 4, 1, 0);
          });
        }
      }}
      className={`
        song-card relative overflow-hidden flex flex-col transition-all cursor-pointer
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <span className={`font-mono text-xs font-bold ${isActive ? (resolvedTheme === 'light' ? 'text-[#0000CC]' : 'text-indigo-400') : (resolvedTheme === 'light' ? 'text-[#777]' : 'text-zinc-400')}`}>
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div className="flex flex-col min-w-0">
              <h3 
                className={`font-bold text-lg tracking-tight ${resolvedTheme === 'light' ? 'text-[#000]' : 'rainbow-text'}`}
                style={resolvedTheme === 'light' ? { fontFamily: 'Geneva, sans-serif' } : {
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                }}
              >
                {song.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${song.lrc ? (resolvedTheme === 'light' ? 'bg-[#0000CC] text-white' : 'bg-indigo-500/40 text-indigo-200') : (resolvedTheme === 'light' ? 'bg-[#999] text-white' : 'bg-zinc-800/80 text-zinc-400')}`}>
                  {song.lrc ? "LRC" : "INST"}
                </span>
                {duration && !isActive && (
                  <span style={{
                    fontSize: '10px', fontWeight: 'bold', 
                    padding: '2px 6px', borderRadius: '3px',
                    background: 'var(--card-control-bg)',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                  </span>
                )}
                <span className={`text-[10px] ${resolvedTheme === 'light' ? 'text-[#777]' : 'text-zinc-300/60'} font-medium uppercase tracking-widest`}>NRADIO</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {song.lrc && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setLyricsOpen(prev => !prev); }}
                  className={`lyrics-btn ${isLyricsOpen ? 'lyrics-btn-active' : ''} ${resolvedTheme === 'light' ? '!font-["Geneva",sans-serif] !text-[10px] !bg-white !text-black !border !border-[#999] !shadow-none' : ''}`}
                  style={{
                    minWidth: (isMobile || isTablet) ? '80px' : 'auto',
                    minHeight: (isMobile || isTablet) ? '44px' : 'auto',
                    ...(resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {})
                  }}
                  title="Lyrics"
                >
                  ◉ LYRICS ✦
                </button>
              </div>
            )}
            {!isActiveInBar && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onPlay}
                  className={`
                    w-11 h-11 flex items-center justify-center transition-all duration-300 shadow-lg
                    ${resolvedTheme === 'light' ? 'bg-[#F0EBE3] border border-[#999] rounded-none' : 'rounded-full'}
                    ${isActive && isPlaying && resolvedTheme !== 'light'
                      ? 'bg-white text-black scale-110' 
                      : (resolvedTheme === 'light' ? 'text-black hover:bg-[#DDD]' : 'bg-indigo-600/90 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95')}
                  `}
                  style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {}}
                  aria-label={isActive && isPlaying ? "Pause" : "Play"}
                >
                  {isActive && isWaiting ? (
                    <div className="spinner !w-5 !h-5 border-white border-t-transparent" aria-hidden="true" />
                  ) : (
                    isActive && isPlaying ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls shown when active */}
        {isActive && (
          <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Full Playback Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '24px' : '12px',
              padding: '12px 0 16px',
              borderBottom: '1px solid var(--card-border-line)',
              marginBottom: '8px',
            }}>
              {/* Previous Song */}
              <button
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                style={{
                  width: isMobile ? '52px' : '40px', 
                  height: isMobile ? '52px' : '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: resolvedTheme === 'light' ? '0' : '50%',
                  background: 'var(--card-control-bg)',
                  border: '1px solid var(--card-control-border)',
                  color: 'var(--card-control-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  ...(resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {})
                }}
                className="hover:bg-white/15 hover:text-white hover:scale-105 active:scale-90"
                aria-label="Previous song"
              >
                <SkipBack size={isMobile ? 20 : 16} fill="currentColor" />
              </button>

              {/* Play / Pause — main CTA */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause?.();
                }}
                style={{
                  width: isMobile ? '72px' : '52px', 
                  height: isMobile ? '72px' : '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: resolvedTheme === 'light' ? '0' : '50%',
                  background: isPlaying ? (resolvedTheme === 'light' ? '#DDD' : 'rgba(255,255,255,0.95)') : 'white',
                  color: 'black',
                  border: resolvedTheme === 'light' ? '1px solid #999' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: resolvedTheme === 'light' ? 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' : '0 4px 16px rgba(0,0,0,0.4)',
                  flexShrink: 0,
                }}
                className="hover:scale-110 active:scale-90"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                aria-pressed={isPlaying}
              >
                {isWaiting ? (
                  <div style={{
                    width: isMobile ? '28px' : '20px', 
                    height: isMobile ? '28px' : '20px',
                    border: '3px solid rgba(0,0,0,0.3)',
                    borderTopColor: 'black',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                ) : isPlaying ? (
                  <Pause size={isMobile ? 28 : 22} fill="currentColor" />
                ) : (
                  <Play size={isMobile ? 28 : 22} fill="currentColor" style={{ marginLeft: '2px' }} />
                )}
              </button>

              {/* Next Song */}
              <button
                onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                style={{
                  width: isMobile ? '52px' : '40px', 
                  height: isMobile ? '52px' : '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: resolvedTheme === 'light' ? '0' : '50%',
                  background: 'var(--card-control-bg)',
                  border: '1px solid var(--card-control-border)',
                  color: 'var(--card-control-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  ...(resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {})
                }}
                className="hover:bg-white/15 hover:text-white hover:scale-105 active:scale-90"
                aria-label="Next song"
              >
                <SkipForward size={isMobile ? 20 : 16} fill="currentColor" />
              </button>
            </div>

            {/* Seek Bar */}
            <div className="space-y-1">
              <input 
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime || 0}
                step={0.1}
                onChange={(e) => onSeek?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ background: 'var(--seek-track-bg)', accentColor: 'var(--accent-indigo)' }}
              />
              <div className={`flex justify-between text-[10px] font-mono ${resolvedTheme === 'light' ? 'text-black/60' : 'text-white/60'}`}>
                <span>{formatTime(currentTime || 0)}</span>
                <span>{formatTime(duration || 0)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 pt-2">
              <Volume2 size={isMobile ? 18 : 14} className={resolvedTheme === 'light' ? 'text-black/60' : 'text-white/60'} />
              <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume || 0.7}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ background: 'var(--seek-track-bg)', accentColor: 'var(--accent-indigo)' }}
              />
            </div>

            {/* Inline Lyrics Panel — shown when lyricsOpen is true */}
            {isLyricsOpen && song.lrc && (
              <>
                {karaokeMode ? (
                  <div style={{
                    marginTop: '16px',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTop: '1px solid var(--card-border-line)',
                    paddingTop: '12px',
                  }}>
                    <p style={{
                      fontFamily: resolvedTheme === 'light' ? 'Geneva, sans-serif' : 'var(--font-manga)',
                      fontSize: 'clamp(1.2rem, 4vw, 2rem)',
                      color: 'var(--lyric-active-color)',
                      textAlign: 'center',
                      letterSpacing: '0.05em',
                      textShadow: resolvedTheme === 'light' ? 'none' : '0 0 20px var(--lyric-active-shadow)',
                      transition: 'all 0.3s ease',
                      lineHeight: 1.4,
                      padding: '0 16px',
                    }}>
                      {currentLyricLine || '♪'}
                    </p>
                  </div>
                ) : (
                  <div style={{
                    marginTop: '16px',
                    borderTop: '1px solid var(--card-border-line)',
                    paddingTop: '12px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }} className="no-scrollbar">
                    {!localLyrics || localLyrics.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        opacity: 0.6,
                      }}>
                        ♪ جاري تحميل الكلمات...
                      </div>
                    ) : (
                      <LyricsWindowContent
                        currentTime={currentTime || 0}
                        onSeek={onSeek || (() => {})}
                        lyrics={localLyrics}
                        isMobilePlayer={true}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (resolvedTheme === 'light') {
    return (
      <OsWindow title={`song_card.${song.id}`} className={isActive && !isMobile ? 'col-span-2' : ''}>
        {renderContent()}
      </OsWindow>
    );
  }

  return renderContent();
});
