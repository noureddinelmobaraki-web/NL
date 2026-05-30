import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Share2, 
  Check, 
  X
} from "lucide-react";
import { ActiveSong } from "../../types";

export interface NowPlayingBarMobileProps {
  activeSong: ActiveSong;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  showCopied: boolean;
  formatTime: (sec: number) => string;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onShare: (e: React.MouseEvent) => void;
  onClose: () => void;
}

export const NowPlayingBarMobile = ({
  activeSong,
  isPlaying,
  currentTime,
  duration,
  progress,
  showCopied,
  formatTime,
  onPrev,
  onNext,
  onPlayPause,
  onShare,
  onClose,
}: NowPlayingBarMobileProps) => {
  return (
    <>
      {/* Mobile Handle Hint */}
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" aria-hidden="true" />

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        marginBottom: "4px",
        flexShrink: 0
      }}>
        {/* Left: Cover Art */}
        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
          <div 
            style={{ 
              position: 'absolute', 
              inset: '-4px', 
              borderRadius: '50%', 
              background: `var(--card-control-bg)`, 
              filter: 'blur(8px)',
              opacity: isPlaying ? 1 : 0,
              transition: 'opacity 1s'
            }} 
          />
          {activeSong.cover || (activeSong as any).backgroundImage ? (
            <img 
              src={activeSong.cover || (activeSong as any).backgroundImage} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: isPlaying ? 'spin 12s linear infinite' : 'none'
              }} 
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'linear-gradient(45deg, #333, #666)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} />
          )}
        </div>

        {/* Center: Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ 
            color: "var(--text-primary)", 
            fontSize: "13px", 
            fontWeight: "700", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em"
          }}>
            {activeSong.title}
          </span>
          <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.15em', marginTop: '1px' }}>
            NOW PLAYING
          </span>
        </div>

        {/* Right: Primary Controls */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <button
            onClick={onPrev}
            style={{ color: "var(--text-secondary)", padding: "12px", borderRadius: "50%" }}
            className="hover:bg-white/10 active:bg-white/20 transition-colors outline-none"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{ 
              width: "44px", 
              height: "44px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: "50%", 
              background: "var(--text-primary)", 
              color: "var(--text-inverse)",
              boxShadow: '0 4px 15px rgba(255,255,255,0.2)'
            }}
            className="hover:scale-105 active:scale-95 shadow-lg outline-none"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>
          
          <button
            onClick={onNext}
            style={{ color: "var(--text-secondary)", padding: "12px", borderRadius: "50%" }}
            className="hover:bg-white/10 active:bg-white/20 transition-colors outline-none"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={onShare}
            style={{ 
              color: showCopied ? "var(--accent-green)" : "var(--text-muted)", 
              padding: "10px", 
              borderRadius: "50%", 
              transition: "all 0.3s",
              position: 'relative'
            }}
            className="hover:bg-[var(--card-control-bg)] outline-none"
            title="Share"
            aria-label="مشاركة الأغنية"
          >
            {showCopied ? <Check size={18} /> : <Share2 size={18} />}
          </button>

          <button
            onClick={onClose}
            style={{ 
              color: "var(--text-muted)", 
              padding: "10px", 
            }}
            className="hover:text-[var(--text-primary)] transition-colors outline-none"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Seek Section */}
      <div style={{
        padding: "4px 8px 0",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}>
        <div className="relative w-full py-3 -my-3 cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            step={0.1}
            onChange={(e) => {
              if (activeSong.audioRef.current) {
                activeSong.audioRef.current.currentTime = parseFloat(e.target.value);
              }
            }}
            style={{ 
              width: '100%', 
              height: '6px',
              background: `linear-gradient(to right, var(--text-primary) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
              appearance: 'none',
              cursor: 'pointer',
              borderRadius: '3px',
              outline: 'none',
              '--thumb-size': '14px',
              accentColor: 'var(--accent-indigo)'
            } as any}
            className="seek-bar"
          />
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: "10px", 
          color: "var(--text-muted)", 
          fontVariantNumeric: "tabular-nums",
          marginTop: "0"
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </>
  );
};
