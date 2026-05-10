import { Play, Pause, X, SkipForward, SkipBack } from "lucide-react";
import { ActiveSong } from "../App";

interface NowPlayingBarProps {
  activeSong: ActiveSong | null;
  onClose: () => void;
}

export const NowPlayingBar = ({
  activeSong,
  onClose,
}: NowPlayingBarProps) => {
  const isVisible = !!activeSong;
  const progress = (activeSong?.duration || 0) > 0 
    ? ((activeSong?.currentTime || 0) / (activeSong?.duration || 0)) * 100 
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "64px",
        background: "rgba(10, 10, 10, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        zIndex: 8000,
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        transform: isVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Visual Progress Line at the very top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "2px",
          width: `${progress}%`,
          background: "white",
          pointerEvents: "none",
          transition: "width 200ms linear",
        }}
      />

      {/* Left: Info */}
      <div className="flex items-center gap-3 overflow-hidden min-w-[120px] sm:min-w-[200px]">
        <div className="hidden sm:flex flex-col overflow-hidden">
          <span className="text-white text-sm font-bold truncate">
            {activeSong?.title || "No track active"}
          </span>
          <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
            NL
          </span>
        </div>
      </div>

      {/* Center: Interactive Seek Bar */}
      <div className="flex-1 max-w-md hidden md:flex items-center gap-3">
        <span className="text-[10px] tabular-nums text-white/40 min-w-[32px]">
          {activeSong ? `${Math.floor(activeSong.currentTime / 60)}:${Math.floor(activeSong.currentTime % 60).toString().padStart(2, '0')}` : "0:00"}
        </span>
        <input
          type="range"
          min={0}
          max={activeSong?.duration || 0}
          value={activeSong?.currentTime || 0}
          step={0.1}
          onChange={(e) => {
            if (activeSong?.audioRef.current) {
              activeSong.audioRef.current.currentTime = parseFloat(e.target.value);
            }
          }}
          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-indigo-400 transition-all [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
        <span className="text-[10px] tabular-nums text-white/40 min-w-[32px]">
          {activeSong ? `${Math.floor(activeSong.duration / 60)}:${Math.floor(activeSong.duration % 60).toString().padStart(2, '0')}` : "0:00"}
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => activeSong?.onPrev()}
          disabled={!activeSong}
          className="text-white/60 hover:text-white transition-colors disabled:opacity-20"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button
          onClick={() => activeSong?.onPlayPause()}
          disabled={!activeSong}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-20"
        >
          {activeSong?.isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <button
          onClick={() => activeSong?.onNext()}
          disabled={!activeSong}
          className="text-white/60 hover:text-white transition-colors disabled:opacity-20"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      {/* Close button - now with border as requested */}
      <div className="flex items-center border-l border-white/10 pl-4 ml-2">
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
