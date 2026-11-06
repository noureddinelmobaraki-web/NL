import { X, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { triggerVibration } from './useDrawingsFullscreenGestures';

export interface DrawingsFullscreenHudProps {
  activeIndex: number;
  totalVideos: number;
  activeTitle?: string;
  isUIVisible: boolean;
  showProgressCounter: boolean;
  showSwipeHint: boolean;
  isMuted: boolean;
  isMobile: boolean;
  isTablet: boolean;
  viewportHeight: number;
  onClose: () => void;
  onToggleMute: () => void;
  onGoTo: (index: number) => void;
}

export const DrawingsFullscreenHud = ({
  activeIndex,
  totalVideos,
  activeTitle,
  isUIVisible,
  showProgressCounter,
  showSwipeHint,
  isMuted,
  isMobile,
  isTablet,
  viewportHeight,
  onClose,
  onToggleMute,
  onGoTo,
}: DrawingsFullscreenHudProps) => {
  const isSmallPhone = isMobile && viewportHeight < 600;
  const railBottom = isSmallPhone
    ? 'calc(env(safe-area-inset-bottom, 0px) + 60px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 120px)';
  const railRight = '12px';
  const railGap = isSmallPhone ? 'gap-3' : 'gap-5';
  const railStyle = { right: railRight, bottom: railBottom };
  const buttonClass = 'nld-rail-btn pointer-events-auto cursor-pointer';

  const buttonSize = isTablet
    ? { width: '56px', height: '56px', minWidth: '56px', minHeight: '56px', touchAction: 'manipulation' as const }
    : { width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', touchAction: 'manipulation' as const };

  return (
    <>
      {/* Top bar: close + counter (Centered) */}
      <div
        className="absolute top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 text-white"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          paddingBottom: '16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
          pointerEvents: isUIVisible ? 'auto' : 'none',
          opacity: isUIVisible ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      >
        <button
          onClick={onClose}
          className="backdrop-blur-md flex items-center justify-center rounded-full border bg-black/50 border-white/20 text-white shadow-lg pointer-events-auto cursor-pointer transition-transform active:scale-95"
          style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            touchAction: 'manipulation',
          }}
          aria-label="Close Fullscreen Drawings"
        >
          <X size={22} className="text-white" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <span
            className="font-mono text-sm px-3 py-1 rounded-full text-white bg-black/30 backdrop-blur-sm transition-opacity duration-[400ms]"
            style={{ fontVariantNumeric: 'tabular-nums', opacity: showProgressCounter ? 1 : 0 }}
          >
            {activeIndex + 1} / {totalVideos}
          </span>
        </div>

        <div style={{ width: '44px' }} />
      </div>

      {/* Action rail: previous / mute / next (glass) */}
      <div
        className={`absolute flex flex-col items-center z-[200] ${railGap}`}
        style={railStyle}
      >
        <button
          onClick={() => { triggerVibration(); onGoTo(activeIndex - 1); }}
          className={buttonClass}
          style={buttonSize}
          aria-label="Previous drawing"
          disabled={activeIndex === 0}
        >
          <ChevronUp size={isTablet ? 28 : 22} className="text-white" />
        </button>

        <button
          onClick={() => { triggerVibration(); onToggleMute(); }}
          className={buttonClass}
          style={buttonSize}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX size={isTablet ? 28 : 22} className="text-white" />
          ) : (
            <Volume2 size={isTablet ? 28 : 22} className="text-white" />
          )}
        </button>

        <button
          onClick={() => { triggerVibration(); onGoTo(activeIndex + 1); }}
          className={buttonClass}
          style={buttonSize}
          aria-label="Next drawing"
          disabled={activeIndex === totalVideos - 1}
        >
          <ChevronDown size={isTablet ? 28 : 22} className="text-white" />
        </button>
      </div>

      {/* Caption Area Overlay */}
      <div
        key={activeIndex}
        className="absolute z-[200] text-left pointer-events-none animate-fade-in-caption"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          left: '16px',
          right: '80px',
        }}
      >
        <h3 className="font-bold text-[18px] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {activeTitle}
        </h3>
      </div>

      {/* Swipe hint guidance overlay with smooth fade-out */}
      <div
        className="absolute bottom-[35%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none transition-all duration-500 ease-in-out"
        style={{
          zIndex: 9200,
          opacity: showSwipeHint ? 0.95 : 0,
          transform: `translate(-50%, ${showSwipeHint ? '0px' : '20px'})`,
          pointerEvents: 'none',
        }}
      >
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 text-white px-6 py-4 rounded-2xl flex flex-col items-center gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-bounce">
          <div className="text-sm font-medium tracking-wide text-center flex items-center gap-2">
            <span className="text-white/95">Swipe up to explore</span>
          </div>
          <div className="text-[10px] text-white/50 font-mono tracking-widest uppercase">
            Swipe up to explore
          </div>
          <div className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center mt-2 bg-white/5">
            <svg
              className="w-4 h-4 text-[#41fae6]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
