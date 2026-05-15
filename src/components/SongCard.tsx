import { useState, memo } from 'react';
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song, LyricLine } from '../types';
import { LyricsWindowContent } from './LyricsEngine';
import { useDeviceType } from '../hooks/useDeviceType';

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
  currentLyricLine
}: SongCardProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { isMobile, isTablet } = useDeviceType();

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
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
        song-card relative overflow-hidden rounded-2xl flex flex-col transition-all duration-700 cursor-pointer
        ${isActive ? 'active shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 sm:p-8' : 'shadow-lg hover:shadow-xl p-5 sm:p-6'}
      `}
      style={{
        backgroundImage: `url('${song.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        gridColumn: isActive && !isMobile ? 'span 2' : 'span 1'
      }}
    >
      {/* Bento expansion handle */}
      {isActive && (
        <div className="absolute top-4 left-4 z-30 scale-75 sm:scale-100">
          <Waveform isPlaying={isPlaying} />
        </div>
      )}

      {/* Background Image with Animation */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${song.backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: isActive ? 'slow-zoom 8s ease-in-out infinite alternate' : 'none',
        }}
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 z-10 transition-all duration-600"
        style={{
          background: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.65)',
          backdropFilter: (isActive || isTablet) ? 'none' : 'blur(1px)',
          WebkitBackdropFilter: (isActive || isTablet) ? 'none' : 'blur(1px)',
        }} 
      />

      {/* Content wrapper */}
      <div className="relative z-20 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <span className={`font-mono text-xs font-bold ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`}>
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div className="flex flex-col min-w-0">
              <h3 
                className="font-bold text-lg tracking-tight rainbow-text"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                }}
              >
                {song.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${song.lrc ? 'bg-indigo-500/40 text-indigo-200' : 'bg-zinc-800/80 text-zinc-400'}`}>
                  {song.lrc ? "LRC" : "INST"}
                </span>
                {duration && !isActive && (
                  <span style={{
                    fontSize: '10px', fontWeight: 'bold', 
                    padding: '2px 6px', borderRadius: '3px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                  }}>
                    {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                  </span>
                )}
                <span className="text-[10px] text-zinc-300/60 font-medium uppercase tracking-widest">NRADIO</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {song.lrc && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setLyricsOpen(prev => !prev); }}
                  className={`lyrics-btn ${isLyricsOpen ? 'lyrics-btn-active' : ''}`}
                  style={{
                    minWidth: (isMobile || isTablet) ? '80px' : 'auto',
                    minHeight: (isMobile || isTablet) ? '44px' : 'auto',
                  }}
                  title="Lyrics"
                >
                  ◉ LYRICS ✦
                </button>
                {isLyricsOpen && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setKaraokeMode?.(k => !k); 
                    }}
                    style={{
                      background: karaokeMode ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.2)',
                      border: '1px solid rgba(139,92,246,0.6)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-manga)',
                      letterSpacing: '0.1em',
                      minHeight: (isMobile || isTablet) ? '44px' : 'auto',
                      minWidth: (isMobile || isTablet) ? '100px' : 'auto',
                    }}
                  >
                    {karaokeMode ? 'NORMAL' : '🎤 KARAOKE'}
                  </button>
                )}
              </div>
            )}
            {!isActiveInBar && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareClick}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isCopied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'}`}
                  title="Share"
                >
                  {isCopied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  )}
                </button>
                <button
                  onClick={onPlay}
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                    ${isActive && isPlaying 
                      ? 'bg-white text-black scale-110' 
                      : 'bg-indigo-600/90 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95'}
                  `}
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
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '8px',
            }}>
              {/* Previous Song */}
              <button
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                style={{
                  width: isMobile ? '52px' : '40px', 
                  height: isMobile ? '52px' : '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
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
                  borderRadius: '50%',
                  background: isPlaying ? 'rgba(255,255,255,0.95)' : 'white',
                  color: 'black',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
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
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
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
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/60">
                <span>{formatTime(currentTime || 0)}</span>
                <span>{formatTime(duration || 0)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 pt-2">
              <Volume2 size={isMobile ? 18 : 14} className="text-white/60" />
              <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume || 0.7}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
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
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '12px',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-manga)',
                      fontSize: 'clamp(1.2rem, 4vw, 2rem)',
                      color: '#e0f0ff',
                      textAlign: 'center',
                      letterSpacing: '0.05em',
                      textShadow: '0 0 20px rgba(100,180,255,0.6)',
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
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '12px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }} className="no-scrollbar">
                    <LyricsWindowContent
                      currentTime={currentTime || 0}
                      onSeek={onSeek || (() => {})}
                      lyrics={lyrics}
                      isMobilePlayer={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
