import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX, Heart, Info } from 'lucide-react'; // MOBILE-ONLY
import { VideoData } from './types';
import { VideoCard } from './VideoCard';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY
import { useAutoHideUI } from '../../hooks/useAutoHideUI';
import { useOrientationListener } from '../../hooks/useOrientationListener';


interface DrawingsFullscreenProps {
  videos: VideoData[];
  activeIndex: number;
  onIndexChange?: (index: number) => void; // MOBILE-ONLY
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onNext: () => void; // VIEWPORT-AWARE
  onPrev: () => void; // VIEWPORT-AWARE
  onTouchStart: (e: React.TouchEvent) => void; // VIEWPORT-AWARE
  onTouchEnd: (e: React.TouchEvent) => void; // VIEWPORT-AWARE
  onRef: (el: HTMLVideoElement | null, i: number) => void;
}

export const DrawingsFullscreen = ({
  videos,
  activeIndex,
  onIndexChange,
  isMuted,
  onClose,
  onToggleMute,
  onNext,
  onPrev,
  onTouchStart,
  onTouchEnd,
  onRef,
}: DrawingsFullscreenProps) => {
  const resolvedTheme = useResolvedTheme();
  const { isMobile, isTablet } = useDeviceType(); // MOBILE-ONLY
  const scrollContainerRef = useRef<HTMLDivElement>(null); // MOBILE-ONLY
  const initialActiveIndexRef = useRef(activeIndex); // MOBILE-ONLY
  const isUIVisible = useAutoHideUI(true, 2000);

  useOrientationListener(useCallback(() => {
    if (scrollContainerRef.current) {
      const children = scrollContainerRef.current.querySelectorAll('.video-card-wrapper');
      const child = children[activeIndex] as HTMLElement;
      child?.scrollIntoView({ behavior: 'instant' });
    }
  }, [activeIndex]));


  const [likedVideos, setLikedVideos] = useState<Record<number, boolean>>({});
  const [showInfo, setShowInfo] = useState(false);
  const [showProgressCounter, setShowProgressCounter] = useState(true);
  const autoHideTimeoutRef = useRef<number | null>(null);

  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  // Suppress unused props in typescript
  void onNext;
  void onPrev;
  void onTouchStart;
  void onTouchEnd;

  // Track viewport height to identify small phones
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Request fullscreen and body scroll lock on mount
  useEffect(() => {
    // Capture original values
    const origOverflow = document.body.style.overflow;
    const origPosition = document.body.style.position;
    const origWidth = document.body.style.width;

    // Apply strict locks
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Add active context class
    document.body.classList.add('drawings-fullscreen-active');

    // Request fullscreen best-effort
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }

    return () => {
      // Restore on unmount
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.width = origWidth;

      document.body.classList.remove('drawings-fullscreen-active');
    };
  }, []);

  // Auto-hides progress counter after 2 seconds of inactivity
  const resetAutoHideTimer = useCallback(() => {
    setShowProgressCounter(true);
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    autoHideTimeoutRef.current = window.setTimeout(() => {
      setShowProgressCounter(false);
    }, 2000);
  }, []);

  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
  }, [resetAutoHideTimer]);

  // Hook up scroll listener to trigger auto-hide timer reset
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      resetAutoHideTimer();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [resetAutoHideTimer]);

  // Touch listener to show progress counter on any user interaction
  useEffect(() => {
    const handleTouch = () => {
      resetAutoHideTimer();
    };
    window.addEventListener('touchstart', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [resetAutoHideTimer]);

  // MOBILE-ONLY: Intersection observer for scroll-snap detection with threshold 0.6
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const children = container.querySelectorAll('.video-card-wrapper');
    const initialIndex = initialActiveIndexRef.current;
    if (children[initialIndex]) {
      children[initialIndex].scrollIntoView({ behavior: 'instant' });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx) && onIndexChange) {
              onIndexChange(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // Fire when 60% of video is visible
      }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [videos.length, onIndexChange]);

  // Gaptic & vibration helper
  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  // Touch gesture state for swipe down to close
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeIndex !== 0) return; // Only allow swipe down to close on very first video
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartXRef.current);

    if (deltaY > 120 && deltaX < 40) {
      onClose();
    }
  };

  // Right action rail position calculations to support various phone/tablet sizes
  const isSmallPhone = isMobile && viewportHeight < 600;
  const railBottom = isSmallPhone
    ? 'calc(env(safe-area-inset-bottom, 0px) + 60px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 120px)';
  const railRight = isTablet ? '20px' : '12px';
  const railGap = isSmallPhone ? 'gap-3' : 'gap-5';

  const buttonClass = isTablet
    ? "w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] active:scale-[0.92] transition-transform duration-150 pointer-events-auto cursor-pointer"
    : "w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] active:scale-[0.92] transition-transform duration-150 pointer-events-auto cursor-pointer";

  return (
    <div
      id="drawings-fullscreen-overlay"
      className={`fixed inset-0 overflow-hidden ${resolvedTheme === 'light' ? 'bg-white' : 'bg-black'}`}
      style={{ zIndex: 9010 }}
    >
      {/* Video cards — scrolling Tiktok-style container */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-full no-scrollbar"
        style={{
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehaviorY: 'contain',
          willChange: 'scroll-position',
          scrollBehavior: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {videos.map((video, idx) => (
          <VideoCard
            key={video.id}
            video={video}
            index={idx}
            activeIndex={activeIndex}
            isMobileView={true}
            isMuted={isMuted}
            total={videos.length}
            onRef={(el) => onRef(el, idx)}
            onLikeToggle={(i) => {
              triggerVibration();
              setLikedVideos((prev) => ({ ...prev, [i]: !prev[i] }));
            }}
          />
        ))}
      </div>

      {/* Top bar: close + counter (Centered) */}
      <div
        className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 text-white"
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
          style={{ width: '44px', height: '44px' }}
          aria-label="Close Fullscreen Drawings"
        >
          <X size={22} className="text-white" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <span
            className="font-mono text-sm px-3 py-1 rounded-full text-white bg-black/30 backdrop-blur-sm transition-opacity duration-[400ms]"
            style={{ fontVariantNumeric: 'tabular-nums', opacity: showProgressCounter ? 1 : 0 }}
          >
            {activeIndex + 1} / {videos.length}
          </span>
        </div>

        {/* Dummy div to align Center-layout perfectly */}
        <div style={{ width: '44px' }} />
      </div>

      {/* MOBILE-ONLY: Right-side action bar */}
      <div
        className={`fixed flex flex-col items-center z-[200] ${railGap}`}
        style={{
          right: railRight,
          bottom: railBottom,
          opacity: isUIVisible ? 1 : 0,
          transition: 'opacity 400ms ease',
          pointerEvents: isUIVisible ? 'all' : 'none',
        }}
      >
        {/* Mute/unmute button vertically arranged */}
        <button
          onClick={() => {
            triggerVibration();
            onToggleMute();
          }}
          className={buttonClass}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX size={isTablet ? 28 : 22} className="text-white" />
          ) : (
            <Volume2 size={isTablet ? 28 : 22} className="text-white" />
          )}
        </button>

        {/* Like action */}
        <button
          onClick={() => {
            triggerVibration();
            setLikedVideos((prev) => ({ ...prev, [activeIndex]: !prev[activeIndex] }));
          }}
          className={buttonClass}
          aria-label="Like video"
        >
          <Heart
            size={isTablet ? 28 : 22}
            className={`transition-all duration-150 ${
              likedVideos[activeIndex] ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
            }`}
          />
        </button>

        {/* Info action */}
        <button
          onClick={() => {
            triggerVibration();
            setShowInfo(true);
          }}
          className={buttonClass}
          aria-label="Video information"
        >
          <Info size={isTablet ? 28 : 22} className="text-white" />
        </button>
      </div>

      {/* MOBILE-ONLY: TikTok-style Caption area at bottom left */}
      <div
        key={activeIndex}
        className="fixed z-[200] text-left pointer-events-none animate-fade-in-caption"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          left: '16px',
          right: isTablet ? '100px' : '80px',
        }}
      >
        <h3 className="font-bold text-[18px] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {videos[activeIndex]?.title}
        </h3>
      </div>

      {/* Dialogue slide up drawer / popup overlay for Info action */}
      {showInfo && (
        <div
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-[300] p-6 text-white cursor-pointer"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center space-y-4 cursor-default shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold">{videos[activeIndex]?.title || 'Story'}</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              {videos[activeIndex]?.desc || 'A short vertical drawing story.'}
            </p>
            <button
              className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full font-bold text-sm cursor-pointer transition-colors active:scale-95"
              onClick={() => setShowInfo(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
