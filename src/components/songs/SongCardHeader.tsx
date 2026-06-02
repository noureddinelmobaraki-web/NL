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
    <div className={`flex items-center justify-between gap-3 w-full ${isMobile || isTablet ? 'h-full' : ''}`}>
      {/* Thumbnail + Title/Artist (Left) */}
      <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
        {(isMobile || isTablet) ? (
          <div className="relative w-[50px] h-[50px] flex-shrink-0">
            <img 
              src={song.cover || song.backgroundImage} 
              alt={song.title} 
              className="w-full h-full object-cover rounded-lg shadow-md"
            />
          </div>
        ) : (
          <span className={`font-mono text-xs font-bold ${isActive ? (resolvedTheme === 'light' ? 'text-[#0000CC]' : 'text-indigo-400') : (resolvedTheme === 'light' ? 'text-[#777]' : 'text-zinc-400')}`}>
            {(index + 1).toString().padStart(2, '0')}
          </span>
        )}
        <div className="flex flex-col min-w-0">
          <h3 
            lang="ar"
            className={`font-bold tracking-tight ${resolvedTheme === 'light' ? 'text-[#000]' : 'rainbow-text'} ${isMobile ? 'text-[0.95rem] leading-snug' : 'text-lg'}`}
            style={resolvedTheme === 'light' ? { fontFamily: 'Geneva, sans-serif' } : {
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
            }}
          >
            {song.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5" style={isMobile ? { fontSize: '0.65rem', opacity: 0.7 } : {}}>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${song.lrc ? (resolvedTheme === 'light' ? 'bg-[#0000CC] text-white' : 'bg-indigo-500/30 text-indigo-200') : (resolvedTheme === 'light' ? 'bg-[#999] text-white' : 'bg-zinc-800/80 text-zinc-400')}`}>
              {song.lrc ? "LRC" : "INST"}
            </span>
            <span className="text-[10px] text-zinc-400/80 font-mono uppercase">Noureddin</span>
          </div>
        </div>
      </div>
      
      {/* Duration + Play (Right) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {(isMobile || isTablet) && duration && (
          <span className="font-mono text-[11px] text-zinc-400 font-bold px-2 py-1 bg-white/5 rounded">
            {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        )}
        
        <div className="flex items-center gap-1.5">
          {song.lrc && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLyrics(); }}
              className={`lyrics-btn-compact ${isLyricsOpen ? 'active' : ''}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isLyricsOpen ? 'var(--accent-red)' : 'var(--card-control-bg)',
                color: isLyricsOpen ? 'white' : 'var(--text-muted)',
                border: 'none',
                fontSize: '10px'
              }}
              title="Lyrics"
            >
              ◉
            </button>
          )}

          {!isActiveInBar && (
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
                flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90
                ${resolvedTheme === 'light' ? 'bg-[#F0EBE3] border border-[#999] rounded-none' : 'rounded-full'}
                ${isMobile || isTablet ? 'w-[38px] h-[38px]' : 'w-11 h-11'}
                ${isActive && isPlaying && resolvedTheme !== 'light'
                  ? 'bg-white text-black scale-105' 
                  : (resolvedTheme === 'light' ? 'text-black' : 'bg-white/10 text-white hover:bg-white/20')}
              `}
              style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {}}
              aria-label={isActive && isPlaying ? "Pause" : "Play"}
            >
              {isActive && isWaiting ? (
                <div className="spinner !w-4 !h-4 border-white border-t-transparent" aria-hidden="true" />
              ) : (
                isActive && isPlaying ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="ml-0.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
