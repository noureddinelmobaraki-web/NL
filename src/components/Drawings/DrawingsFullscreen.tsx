import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { getGenieOrigin, genieOriginToTransformOrigin } from '../../transitions/genieOrigin';
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
      onUserInteract();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Touch listener to show progress counter on any user interaction
  useEffect(() => {
    const handleTouch = () => {
      onUserInteract();
    };
    window.addEventListener('touchstart', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

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

  const onUserInteract = useCallback(() => {
    resetAutoHideTimer();
    dismissSwipeHint();
  }, [resetAutoHideTimer, dismissSwipeHint]);

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
  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, videos.length - 1));
    const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
    const child = children?.[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth' });
  }, [videos.length]);

  // DESKTOP: mouse-wheel navigation — one drawing per gesture (TikTok-style)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      if (locked) return;
      locked = true;
      goTo(activeIndex + (e.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => { locked = false; }, 550);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [activeIndex, goTo]);

  const railStyle = { right: railRight, bottom: railBottom };

  const buttonClass = "nld-rail-btn pointer-events-auto cursor-pointer";

  const buttonSize = isTablet
    ? { width: '56px', height: '56px', minWidth: '56px', minHeight: '56px', touchAction: 'manipulation' as const }
    : { width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', touchAction: 'manipulation' as const };

  return (
    <div
      id="drawings-fullscreen-overlay"
      className={`fixed inset-0 overflow-hidden genie-surface ${resolvedTheme === 'light' ? 'bg-white' : 'bg-black'}`}
      data-genie="open"
      style={{
        ['--genie-origin' as string]: genieOriginToTransformOrigin(getGenieOrigin()),
        transformOrigin: 'var(--genie-origin)',
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

        {/* Action rail: previous / mute / next (glass) */}
        <div
          className={`absolute flex flex-col items-center z-[200] ${railGap}`}
          style={railStyle}
        >
          {/* Previous (up) */}
          <button
            onClick={() => { triggerVibration(); goTo(activeIndex - 1); }}
            className={buttonClass}
            style={buttonSize}
            aria-label="Previous drawing"
            disabled={activeIndex === 0}
          >
            <ChevronUp size={isTablet ? 28 : 22} className="text-white" />
          </button>

          {/* Mute / unmute */}
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

          {/* Next (down) */}
          <button
            onClick={() => { triggerVibration(); goTo(activeIndex + 1); }}
            className={buttonClass}
            style={buttonSize}
            aria-label="Next drawing"
            disabled={activeIndex === videos.length - 1}
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
      </div>

    </div>
  );
};
