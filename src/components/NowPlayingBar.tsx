import { 
  Play, 
  Pause, 
  X, 
  SkipForward, 
  SkipBack, 
  Share2, 
  Check, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  ListMusic, 
  Volume2, 
  VolumeX 
} from "lucide-react";
import { ActiveSong } from "../types";
import { useState, useCallback } from "react";
import { useDeviceType } from "../hooks/useDeviceType";
import { motion, AnimatePresence } from "framer-motion";

interface NowPlayingBarProps {
  activeSong: ActiveSong | null;
  onClose: () => void;
}

export const NowPlayingBar = ({
  activeSong,
  onClose,
}: NowPlayingBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const [isHovered, setIsHovered] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  
  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSong) {
      activeSong.onShare();
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [activeSong]);
  
  const isVisible = !!activeSong;
  const progress = (activeSong?.duration || 0) > 0 
    ? ((activeSong?.currentTime || 0) / (activeSong?.duration || 0)) * 100 
    : 0;

  if (!isVisible || activeSong?.suppressMiniBar) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQueue(false);
      }}
      role="region"
      aria-label="Music Player"
      style={{
        position: "fixed",
        bottom: (isMobile || isTablet) ? "calc(70px + 12px)" : "24px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "540px",
        width: "95vw",
        minHeight: isHovered && !isMobile && !isTablet ? "100px" : "64px",
        background: 'linear-gradient(135deg, rgba(var(--ambient-rgb, 20,20,30), 0.35), rgba(15,15,20,0.55))',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRadius: "28px",
        border: '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        zIndex: 8000,
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        transition: "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        overflow: "visible",
      }}
    >
      {/* Queue Popover */}
      <AnimatePresence>
        {showQueue && activeSong?.nextSongs && activeSong.nextSongs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              right: '16px',
              width: '240px',
              background: 'rgba(20, 20, 25, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 8001
            }}
          >
            <h4 style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '12px' }}>UP NEXT</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSong.nextSongs.map(song => (
                <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={song.cover} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '12px', color: 'white', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        height: "64px",
        flexShrink: 0
      }}>
        {/* Left: Cover Art */}
        <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
          <div 
            style={{ 
              position: 'absolute', 
              inset: '-4px', 
              borderRadius: '50%', 
              background: `rgba(var(--ambient-rgb), 0.3)`, 
              filter: 'blur(8px)',
              opacity: activeSong?.isPlaying ? 1 : 0,
              transition: 'opacity 1s'
            }} 
          />
          {activeSong?.cover ? (
            <img 
              src={activeSong.cover} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: activeSong.isPlaying ? 'spin 12s linear infinite' : 'none'
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
            fontSize: "14px", 
            fontWeight: "700", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em"
          }}>
            {activeSong?.title}
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '0.15em', marginTop: '1px' }}>
            NOW PLAYING
          </span>
        </div>

        {/* Desktop Extra Controls (Middle-Right) */}
        {!isMobile && !isTablet && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
            <button
               onClick={() => activeSong?.onShuffleToggle()}
               style={{ color: activeSong?.isShuffle ? '#818cf8' : 'rgba(255,255,255,0.4)', padding: '8px' }}
               className="hover:scale-110 active:scale-95 transition-all"
               title="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button
               onClick={() => activeSong?.onRepeatToggle()}
               style={{ color: activeSong?.repeatMode !== 'off' ? '#818cf8' : 'rgba(255,255,255,0.4)', padding: '8px' }}
               className="hover:scale-110 active:scale-95 transition-all"
               title="Repeat"
            >
              {activeSong?.repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>
        )}

        {/* Right: Primary Controls */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {!isMobile && !isTablet && (
            <button
              onClick={() => activeSong?.onPrev()}
              style={{ color: "rgba(255,255,255,0.6)", padding: "10px" }}
              className="hover:bg-white/5 rounded-full transition-all"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); activeSong?.onPlayPause(); }}
            aria-label={activeSong?.isPlaying ? "Pause" : "Play"}
            style={{ 
              width: "48px", 
              height: "48px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: "50%", 
              background: "white", 
              color: "black",
              boxShadow: '0 4px 15px rgba(255,255,255,0.2)',
              margin: '0 4px'
            }}
            className="hover:scale-105 active:scale-95 shadow-lg"
          >
            {activeSong?.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          {!isMobile && !isTablet && (
            <button
              onClick={() => activeSong?.onNext()}
              style={{ color: "rgba(255,255,255,0.6)", padding: "10px" }}
              className="hover:bg-white/5 rounded-full transition-all"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
          )}

          {/* Desktop Hover Controls (Volume/Queue) */}
          {!isMobile && !isTablet && isHovered && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100px' }}>
                   {activeSong?.volume === 0 ? <VolumeX size={16} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <Volume2 size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                   <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={activeSong?.volume}
                      onChange={(e) => activeSong?.onVolumeChange(parseFloat(e.target.value))}
                      className="volume-slider"
                      style={{ flex: 1, height: '3px', cursor: 'pointer', accentColor: 'white' }}
                   />
                </div>
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  style={{ color: showQueue ? 'white' : 'rgba(255,255,255,0.4)', padding: '8px' }}
                  className="hover:text-white transition-colors"
                  title="Queue"
                >
                  <ListMusic size={18} />
                </button>
             </div>
          )}

          <button
            onClick={handleShare}
            style={{ 
              color: showCopied ? "#4ade80" : "rgba(255,255,255,0.4)", 
              padding: "10px", 
              borderRadius: "50%", 
              transition: "all 0.3s",
              position: 'relative'
            }}
            className="hover:bg-white/5"
            title="Share"
          >
            {showCopied ? <Check size={18} /> : <Share2 size={18} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ 
              color: "rgba(255,255,255,0.3)", 
              padding: "10px", 
            }}
            className="hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Seek Section (Desktop Hover + Tablet/Mobile) */}
      {(isHovered || isMobile || isTablet) && (
        <div style={{
          padding: "0 12px 12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ position: 'relative', flex: 1, height: '24px', display: 'flex', alignItems: 'center' }}>
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
              style={{ 
                width: '100%', 
                height: '4px',
                background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
                appearance: 'none',
                cursor: 'pointer',
                borderRadius: '2px',
                outline: 'none'
              }}
              className="seek-slider"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
            <span>{formatTime(activeSong?.currentTime || 0)}</span>
            <span>{formatTime(activeSong?.duration || 0)}</span>
          </div>
        </div>
      )}

      {/* Progress line indicator (Visible when not expanded) */}
      {!isHovered && !isMobile && !isTablet && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(to right, white ${progress}%, transparent ${progress}%)`,
          opacity: 0.8,
          transition: "opacity 300ms",
          borderBottomLeftRadius: '28px',
          borderBottomRightRadius: '28px',
        }} />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .seek-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        .seek-slider:hover::-webkit-slider-thumb {
          transform: scale(1.75);
        }
        .seek-slider:active::-webkit-slider-thumb {
          transform: scale(1.5);
        }
        .volume-slider::-webkit-slider-thumb {
           -webkit-appearance: none;
           width: 10px;
           height: 10px;
           background: white;
           border-radius: 50%;
        }
      `}</style>
    </div>
  );
};
