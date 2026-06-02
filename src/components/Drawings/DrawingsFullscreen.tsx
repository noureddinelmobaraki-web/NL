import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX, Heart, Info } from 'lucide-react'; // MOBILE-ONLY
import { VideoData } from './types';
import { VideoCard } from './VideoCard';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY
import { useAutoHideUI } from '../../hooks/useAutoHideUI';
import { useOrientationListener } from '../../hooks/useOrientationListener';
import { useFullscreenManager } from '../../hooks/useFullscreenManager';


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

  // FIXED: CSS fullscreen only — no requestFullscreen API (crashes iOS Safari).
  // FIXED: Removed History API (pushState/popstate/history.go) — the cleanup
  // function runs twice in React StrictMode, causing unexpected navigation away
  // from the page. ESC key handles desktop close, the X button handles all touch
  // devices. Android system back will simply leave the SPA (acceptable & stable).
  // Scroll lock is handled exclusively by DrawingsPage to avoid double-lock race.
  useFullscreenManager(true /* always open while component is mounted */, {
    bodyClass: 'drawings-fullscreen-active',
    onEscape: onClose,
    lockOrientation: 'portrait',
    enabled: isMobile || isTablet,
  });

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
      dismissSwipeHint();
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
      dismissSwipeHint();
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

  // Swipe hint state & dismissal helper
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  const dismissSwipeHint = useCallback(() => {
    setShowSwipeHint((prev) => {
      if (prev) {
        localStorage.setItem('drawings_scroll_guided', 'true');
        return false;
      }
      return prev;
    });
  }, []);

  // Smooth scroll wrapper that temporarily disables scroll-snap to bypass iOS/Android stiffness
  const smoothScrollTo = (targetIdx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    triggerVibration();
    
    if (onIndexChange) {
      onIndexChange(targetIdx);
    }

    const currentSnap = container.style.scrollSnapType;
    container.style.scrollSnapType = 'none';

    const targetTop = targetIdx * container.clientHeight;
    container.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });

    // Restore snapping behavior once smooth animation finishes
    setTimeout(() => {
      if (container) {
        container.style.scrollSnapType = currentSnap;
      }
    }, 450);
  };

  // Show swipe guide only on first open and preform a physical bounce
  useEffect(() => {
    const guided = localStorage.getItem('drawings_scroll_guided');
    let bounceTimer: number;
    let hideTimer: number;
    if (!guided) {
      // Auto-show elegant guide overlay
      setShowSwipeHint(true);
      
      // Gently bounce/reveal the content after a slight delay
      bounceTimer = window.setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const originalSnap = container.style.scrollSnapType;
          container.style.scrollSnapType = 'none';
          
          // Physically scroll viewport downwards by 120px to show a portion of the video below
          container.scrollTo({ top: 110, behavior: 'smooth' });
          
          setTimeout(() => {
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });
              
              setTimeout(() => {
                if (container) {
                  container.style.scrollSnapType = originalSnap;
                }
              }, 700);
            }
          }, 950);
        }
      }, 1000);

      // Hide the hint overlay after exactly 4 seconds
      hideTimer = window.setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('drawings_scroll_guided', 'true');
      }, 4000);
    }
    return () => {
      if (bounceTimer) clearTimeout(bounceTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartTimeRef.current = Date.now();
    dismissSwipeHint();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    dismissSwipeHint();
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartYRef.current - touchEndY; // positive is swipe up (scroll down to next)
    const deltaX = touchStartXRef.current - touchEndX;
    const deltaTime = Date.now() - touchStartTimeRef.current;

    // Swipe down on the first slide exits the gallery
    if (activeIndex === 0 && deltaY < -80 && Math.abs(deltaX) < 50) {
      onClose();
      return;
    }

    // Professional and ultra-responsive lightweight gesture swipe detection:
    // Any vertical swipe offset of >25px inside a reasonable swipe timeframe (<400ms)
    // instantaneously and smoothly triggers a transition to next/prev video.
    if (Math.abs(deltaY) > 25 && Math.abs(deltaX) < 50 && deltaTime < 400) {
      const nextIdx = deltaY > 0 
        ? Math.min(activeIndex + 1, videos.length - 1)
        : Math.max(activeIndex - 1, 0);

      if (nextIdx !== activeIndex) {
        smoothScrollTo(nextIdx);
      }
    }
  };

  // Right action rail position calculations to support various phone/tablet sizes
  const isSmallPhone = isMobile && viewportHeight < 600;
  const railBottom = isSmallPhone
    ? 'calc(env(safe-area-inset-bottom, 0px) + 60px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 120px)';
  const railRight = '12px';
  const railGap = isSmallPhone ? 'gap-3' : 'gap-5';

  // Keyboard navigation for desktop viewports matching TikTok arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(activeIndex + 1, videos.length - 1);
        const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
        const child = children?.[nextIdx] as HTMLElement;
        child?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(activeIndex - 1, 0);
        const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
        const child = children?.[prevIdx] as HTMLElement;
        child?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length]);

  // FIXED: All touch targets are guaranteed ≥44x44px (iOS HIG) via min-width/height
  const buttonClass = "rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] active:scale-[0.92] transition-transform duration-150 pointer-events-auto cursor-pointer";

  const buttonSize = isTablet
    ? { width: '56px', height: '56px', minWidth: '56px', minHeight: '56px', touchAction: 'manipulation' as const }
    : { width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', touchAction: 'manipulation' as const };

  return (
    <div
      id="drawings-fullscreen-overlay"
      className={`fixed inset-0 overflow-hidden ${resolvedTheme === 'light' ? 'bg-white' : 'bg-black'}`}
      style={{
        zIndex: 9010,
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        overscrollBehavior: 'none',
        contain: 'strict',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Centered TikTok ratio layout container block */}
      <div
        className="relative w-full h-full flex flex-col justify-center items-center"
        style={{
          maxWidth: (isMobile || isTablet) ? '100%' : '430px',
          height: '100dvh',
          minHeight: '-webkit-fill-available',
          position: 'relative',
          backgroundColor: '#000000',
          boxShadow: isMobile ? 'none' : '0 24px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          borderRadius: isMobile ? '0px' : '16px',
        }}
      >
        {/* Video cards — scrolling Tiktok-style container */}
        <div
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full no-scrollbar relative"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100dvh',
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
              {activeIndex + 1} / {videos.length}
            </span>
          </div>

          <div style={{ width: '44px' }} />
        </div>

        {/* Action rail bar overlaid on content */}
        <div
          className={`absolute flex flex-col items-center z-[200] ${railGap}`}
          style={{
            right: railRight,
            bottom: railBottom,
            opacity: isUIVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
            pointerEvents: isUIVisible ? 'all' : 'none',
          }}
        >
          {/* Mute/unmute button */}
          <button
            onClick={() => {
              triggerVibration();
              onToggleMute();
            }}
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

          {/* Like action */}
          <button
            onClick={() => {
              triggerVibration();
              setLikedVideos((prev) => ({ ...prev, [activeIndex]: !prev[activeIndex] }));
            }}
            className={buttonClass}
            style={buttonSize}
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
            style={buttonSize}
            aria-label="Video information"
          >
            <Info size={isTablet ? 28 : 22} className="text-white" />
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
            {videos[activeIndex]?.title}
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
              <span className="text-white/95">اسحب للأعلى للاستكشاف</span>
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
      </div>

      {/* Slide up drawer / popup overlay for Info action */}
      {showInfo && (
        <div
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-[300] p-6 text-white cursor-pointer"
          onClick={() => setShowInfo(false)}
          style={{ touchAction: 'manipulation' }}
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
              style={{ minHeight: '44px', touchAction: 'manipulation' }}
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
