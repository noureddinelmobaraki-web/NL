import { 
  Play, 
  Pause, 
  SkipForward, 
  X
} from "lucide-react";
import { ActiveSong } from "../../types";

export interface NowPlayingBarMobileProps {
  activeSong: ActiveSong;
  isPlaying: boolean;
  progress: number;
  onNext: () => void;
  onPlayPause: () => void;
  onClose: () => void;
}

export const NowPlayingBarMobile = ({
  activeSong,
  isPlaying,
  progress,
  onNext,
  onPlayPause,
  onClose,
}: NowPlayingBarMobileProps) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Mini Seek Progress Bar at the absolute Top */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: '12px', 
          right: '12px', 
          height: '2px', 
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '1px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            width: `${progress}%`, 
            height: '100%', 
            background: 'var(--text-primary)',
            transition: 'width 0.1s linear'
          }} 
        />
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "0 4px",
      }}>
        {/* Left: Cover Art (Smaller for 56px bar) */}
        <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
          <div 
            style={{ 
              position: 'absolute', 
              inset: '-2px', 
              borderRadius: '50%', 
              background: `var(--card-control-bg)`, 
              filter: 'blur(6px)',
              opacity: isPlaying ? 0.8 : 0,
              transition: 'opacity 1s'
            }} 
          />
          {activeSong.cover || (activeSong as any).backgroundImage ? (
            <img 
              src={activeSong.cover || (activeSong as any).backgroundImage} 
              alt={`${activeSong?.title ?? 'Song'} cover art`} 
              width={36}
              height={36}
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
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
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ 
            color: "var(--text-primary)", 
            fontSize: "12px", 
            fontWeight: "700", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
            lineHeight: "1.2"
          }}>
            {activeSong.title}
          </span>
          <span style={{ fontSize: '7px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.1em', marginTop: '1px' }}>
            NOW PLAYING
          </span>
        </div>

        {/* Right: Primary Controls */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{ 
              width: "38px", 
              height: "38px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: "50%", 
              background: "var(--text-primary)", 
              color: "var(--text-inverse)",
              boxShadow: '0 4px 10px rgba(255,255,255,0.1)'
            }}
            className="active:scale-95 transition-transform outline-none"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" style={{ marginLeft: '1px' }} aria-hidden="true" />}
          </button>
          
          <button
            onClick={onNext}
            style={{ color: "var(--text-secondary)", padding: "10px", borderRadius: "50%" }}
            aria-label="الأغنية التالية"
            className="active:bg-white/10 transition-colors outline-none"
          >
            <SkipForward size={18} fill="currentColor" aria-hidden="true" />
          </button>

          <button
            onClick={onClose}
            style={{ 
              color: "var(--text-muted)", 
              padding: "10px", 
            }}
            className="active:text-[var(--text-primary)] transition-colors outline-none"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
