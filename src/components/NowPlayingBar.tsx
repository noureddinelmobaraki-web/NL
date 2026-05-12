import { Play, Pause, X, SkipForward, SkipBack } from "lucide-react";
import { ActiveSong } from "../types";
import { useState } from "react";
import { useDeviceType } from "../hooks/useDeviceType";

interface NowPlayingBarProps {
  activeSong: ActiveSong | null;
  onClose: () => void;
}

export const NowPlayingBar = ({
  activeSong,
  onClose,
}: NowPlayingBarProps) => {
  const { isMobile } = useDeviceType();
  const [isHovered, setIsHovered] = useState(false);
  
  const isVisible = !!activeSong;
  const progress = (activeSong?.duration || 0) > 0 
    ? ((activeSong?.currentTime || 0) / (activeSong?.duration || 0)) * 100 
    : 0;

  if (!isVisible) return null;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Music Player"
      style={{
        position: "fixed",
        bottom: isMobile ? "calc(56px + 12px)" : "24px",
        left: "50%",
        transform: isVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(120px)",
        maxWidth: "420px",
        width: "90vw",
        height: isHovered ? "80px" : "60px",
        background: "rgba(18, 18, 22, 0.88)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderRadius: isHovered ? "24px" : "100px",
        border: "0.5px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        zIndex: 8000,
        padding: "0 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        height: "60px",
        flexShrink: 0
      }}>
        {/* Left: Cover Art */}
        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
          {activeSong?.cover ? (
            <img 
              src={activeSong.cover} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
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
            color: "white", 
            fontSize: "13px", 
            fontWeight: "700", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis" 
          }}>
            {activeSong?.title}
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
            NOW PLAYING
          </span>
        </div>

        {/* Right: Controls */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <button
            onClick={(e) => { e.stopPropagation(); activeSong?.onPrev(); }}
            style={{ color: "rgba(255,255,255,0.6)", padding: "8px", borderRadius: "50%", transition: "all 0.2s" }}
            className="hover:bg-white/10"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); activeSong?.onPlayPause(); }}
            aria-label={activeSong?.isPlaying ? "Pause" : "Play"}
            aria-pressed={activeSong?.isPlaying}
            style={{ 
              width: "36px", 
              height: "36px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: "50%", 
              background: "white", 
              color: "black",
              transition: "transform 0.2s"
            }}
            className="hover:scale-110 active:scale-95"
          >
            {activeSong?.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); activeSong?.onNext(); }}
            style={{ color: "rgba(255,255,255,0.6)", padding: "8px", borderRadius: "50%", transition: "all 0.2s" }}
            className="hover:bg-white/10"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ color: "rgba(255,255,255,0.3)", padding: "4px", marginLeft: '4px' }}
            className="hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Seek Bar (Desktop Hover) */}
      <div style={{
        height: isHovered ? "20px" : "0px",
        opacity: isHovered ? 1 : 0,
        transition: "all 200ms ease",
        padding: "0 12px 12px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", width: '25px' }}>
          {activeSong ? `${Math.floor(activeSong.currentTime / 60)}:${Math.floor(activeSong.currentTime % 60).toString().padStart(2, '0')}` : "0:00"}
        </span>
        <input
          type="range"
          min={0}
          max={activeSong?.duration || 0}
          value={activeSong?.currentTime || 0}
          step={0.1}
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.floor(activeSong?.duration || 0)}
          aria-valuenow={Math.floor(activeSong?.currentTime || 0)}
          onChange={(e) => {
            if (activeSong?.audioRef.current) {
              activeSong.audioRef.current.currentTime = parseFloat(e.target.value);
            }
          }}
          style={{ flex: 1, pointerEvents: isHovered ? "auto" : "none" }}
          className="h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
        />
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", width: '25px', textAlign: 'right' }}>
          {activeSong ? `${Math.floor(activeSong.duration / 60)}:${Math.floor(activeSong.duration % 60).toString().padStart(2, '0')}` : "0:00"}
        </span>
      </div>

      {/* Progress line footer (Visible when not hovered) */}
      {!isHovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: '16px', right: '16px',
          height: '2px', borderRadius: '1px',
          background: `linear-gradient(to right, rgba(255,255,255,0.7) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
          transition: "opacity 200ms"
        }} />
      )}
    </div>
  );
};
