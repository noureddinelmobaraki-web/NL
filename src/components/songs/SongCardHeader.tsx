import { Play, Pause } from 'lucide-react';
import type { Song } from '../../types';

interface SongCardHeaderProps {
  song: Song;
  index: number;
  isActive: boolean;
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  isMobile: boolean;
  isTablet: boolean;
  resolvedTheme: string;
  isLyricsOpen: boolean;
  duration?: number;
  onPlay: () => void;
  onPlayPause?: () => void;
  onToggleLyrics: () => void;
}

export const SongCardHeader = ({
  song,
  index,
  isActive,
  isActiveInBar,
  isPlaying,
  isWaiting,
  isMobile,
  isTablet,
  resolvedTheme,
  isLyricsOpen,
  duration,
  onPlay,
  onPlayPause,
  onToggleLyrics,
}: SongCardHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <span className={`font-mono text-xs font-bold ${isActive ? (resolvedTheme === 'light' ? 'text-[#0000CC]' : 'text-indigo-400') : (resolvedTheme === 'light' ? 'text-[#777]' : 'text-zinc-400')}`}>
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <div className="flex flex-col min-w-0">
          <h3 
            lang="ar"
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
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleLyrics(); }}
            className={`lyrics-btn ${isLyricsOpen ? 'lyrics-btn-active' : ''} ${resolvedTheme === 'light' ? '!font-["Geneva",sans-serif] !text-[10px] !bg-white !text-black !border !border-[#999] !shadow-none' : ''}`}
            style={{
              minWidth: (isMobile || isTablet) ? '80px' : 'auto',
              minHeight: (isMobile || isTablet) ? '44px' : 'auto',
              ...(resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {}),
              ...(!song.lrc ? { opacity: 0.4 } : {})
            }}
            title={song.lrc ? "Lyrics" : "الكلمات غير متوفرة"}
            aria-label={song.lrc ? "Lyrics" : "الكلمات غير متوفرة"}
          >
            ◉ LYRICS ✦
          </button>
        </div>
        {!isActiveInBar && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isActive && onPlayPause) {
                  onPlayPause();
                } else {
                  onPlay();
                }
              }}
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
  );
};
