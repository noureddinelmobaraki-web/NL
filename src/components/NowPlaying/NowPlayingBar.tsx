import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActiveSong } from "../../types";
import { useDeviceType } from "../../hooks/useDeviceType";
import { formatTime } from "../songs/formatTime";
import type { BarGeometry } from "../../hooks/useBarOrchestrator";
import { NowPlayingBarDesktop } from "./NowPlayingBarDesktop";
import { NowPlayingBarMobile } from "./NowPlayingBarMobile";
import { QueuePopover } from "./QueuePopover";

export interface NowPlayingBarProps {
  activeSong: ActiveSong | null;
  isBarVisible: boolean;
  geometry: BarGeometry;
  onClose: () => void;
}

export const NowPlayingBar = ({
  activeSong,
  isBarVisible,
  geometry,
  onClose,
}: NowPlayingBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const [isHovered, setIsHovered] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const progress = (activeSong?.duration || 0) > 0 
    ? ((activeSong?.currentTime || 0) / (activeSong?.duration || 0)) * 100 
    : 0;

  return (
    <AnimatePresence>
      {isBarVisible && activeSong && (
        <motion.div
          key="now-playing-bar"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setShowQueue(false);
          }}
          role="region"
          aria-label="Music Player"
          initial={{ opacity: 0, y: 24, scale: geometry.scale * 0.95 }}
          animate={{ 
            opacity: geometry.opacity, 
            y: 0, 
            scale: geometry.scale,
            transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
          }}
          exit={{ 
            opacity: 0, 
            y: 16, 
            scale: geometry.scale * 0.95,
            transition: { duration: 0.25, ease: [0.4, 0, 1, 1] }
          }}
          style={{
            position: "fixed",
            bottom: geometry.bottom,
            left: geometry.left,
            right: geometry.right,
            transform: geometry.transform,
            transformOrigin: "bottom center",
            maxWidth: geometry.maxWidth,
            width: geometry.width,
            minHeight: isHovered && !isMobile && !isTablet ? "120px" : (isMobile || isTablet ? "auto" : "64px"),
            background: 'linear-gradient(135deg, rgba(var(--bg-page-rgb), 0.7), rgba(var(--bg-page-rgb), 0.8))',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            borderRadius: geometry.borderRadius,
            border: '1px solid var(--border-strong)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 var(--border-subtle)',
            zIndex: 8000,
            padding: (isMobile || isTablet) ? "8px 16px 12px" : "0 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "visible",
          }}
        >
          {/* Queue Popover */}
      <AnimatePresence>
        {showQueue && activeSong?.nextSongs && activeSong.nextSongs.length > 0 && (
          <QueuePopover 
            nextSongs={activeSong.nextSongs}
            isMobile={isMobile || isTablet}
            onClose={() => setShowQueue(false)}
          />
        )}
      </AnimatePresence>

      {/* Responsive View Switcher */}
      {isMobile || isTablet ? (
        <NowPlayingBarMobile 
          activeSong={activeSong}
          isPlaying={activeSong.isPlaying}
          currentTime={activeSong.currentTime}
          duration={activeSong.duration}
          progress={progress}
          formatTime={formatTime}
          onPrev={() => activeSong.onPrev()}
          onNext={() => activeSong.onNext()}
          onPlayPause={() => activeSong.onPlayPause()}
          onClose={onClose}
        />
      ) : (
        <NowPlayingBarDesktop 
          activeSong={activeSong}
          isPlaying={activeSong.isPlaying}
          currentTime={activeSong.currentTime}
          duration={activeSong.duration}
          progress={progress}
          isShuffle={activeSong.isShuffle}
          repeatMode={activeSong.repeatMode}
          volume={activeSong.volume}
          isHovered={isHovered}
          showQueue={showQueue}
          formatTime={formatTime}
          onPrev={() => activeSong.onPrev()}
          onNext={() => activeSong.onNext()}
          onPlayPause={() => activeSong.onPlayPause()}
          onVolumeChange={(v) => activeSong.onVolumeChange(v)}
          onShuffleToggle={() => activeSong.onShuffleToggle()}
          onRepeatToggle={() => activeSong.onRepeatToggle()}
          onToggleQueue={() => setShowQueue(prev => !prev)}
          onClose={onClose}
        />
      )}

      {/* Styling elements */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .seek-bar::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0,0,0,0.5);
          border: 2px solid var(--text-primary);
        }
        .seek-bar::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--text-primary);
          cursor: pointer;
        }
        .volume-slider::-webkit-slider-thumb {
           -webkit-appearance: none;
           width: 10px;
           height: 10px;
           background: var(--text-primary);
           border-radius: 50%;
        }
      `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
