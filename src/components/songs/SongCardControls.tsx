import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react';
import type { Song } from '../../types';
import { formatTime } from './formatTime';

interface SongCardControlsProps {
  isMobile: boolean;
  resolvedTheme: string;
  currentTime: number;
  duration: number;
  volume: number;
  onSeek: (v: number) => void;
  onVolumeChange: (v: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  isPlaying: boolean;
  isWaiting: boolean;
  song: Song;
}

export const SongCardControls = ({
  resolvedTheme,
  currentTime,
  duration,
  volume,
  onSeek,
  onVolumeChange,
  onPrev,
  onNext,
  onPlayPause,
  isPlaying,
  isWaiting,
}: SongCardControlsProps) => {
  return (
    <>
      {/* Full Playback Controls */}
      <div className="song-card-controls-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 0 16px',
        borderBottom: '1px solid var(--card-border-line)',
        marginBottom: '8px',
      }}>
        {/* Previous Song */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          style={{
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
          className="song-card-controls-btn-nav hover:bg-white/15 hover:text-white hover:scale-105 active:scale-90"
          aria-label="Previous song"
        >
          <SkipBack className="song-card-controls-icon-nav" fill="currentColor" />
        </button>

        {/* Play / Pause — main CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause?.();
          }}
          style={{
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
          className="song-card-controls-btn-play hover:scale-110 active:scale-90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
        >
          {isWaiting ? (
            <div className="song-card-controls-spinner" style={{
              border: '3px solid rgba(0,0,0,0.3)',
              borderTopColor: 'black',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : isPlaying ? (
            <Pause className="song-card-controls-icon-play" fill="currentColor" />
          ) : (
            <Play className="song-card-controls-icon-play" fill="currentColor" style={{ marginLeft: '2px' }} />
          )}
        </button>

        {/* Next Song */}
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          style={{
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
          className="song-card-controls-btn-nav hover:bg-white/15 hover:text-white hover:scale-105 active:scale-90"
          aria-label="Next song"
        >
          <SkipForward className="song-card-controls-icon-nav" fill="currentColor" />
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
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer w-full"
          style={{ background: 'var(--seek-track-bg)', accentColor: 'var(--accent-indigo)' }}
        />
        <div className={`flex justify-between text-[10px] font-mono ${resolvedTheme === 'light' ? 'text-black/60' : 'text-white/60'}`}>
          <span>{formatTime(currentTime || 0)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 pt-2">
        <Volume2 className={`song-card-controls-icon-vol ${resolvedTheme === 'light' ? 'text-black/60' : 'text-white/60'}`} />
        <input 
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume || 0.7}
          onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{ background: 'var(--seek-track-bg)', accentColor: 'var(--accent-indigo)' }}
        />
      </div>
    </>
  );
};
