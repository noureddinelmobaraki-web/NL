import { useState, useEffect, useRef, memo } from 'react';
import Hls from 'hls.js';
import { Heart } from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { VideoData } from './types';

export const VideoCard = memo(({
  video, index, activeIndex, isMobileView, isMuted, total, onRef, onLikeToggle
}: {
  video: VideoData;
  index: number;
  activeIndex: number;
  isMobileView: boolean;
  isMuted: boolean;
  total: number;
  onRef: (el: HTMLVideoElement | null, idx: number) => void;
  onLikeToggle?: (idx: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isActive = index === activeIndex;
  const [shouldLoad, setShouldLoad] = useState(() => Math.abs(index - activeIndex) <= 2);
  const resolvedTheme = useResolvedTheme();

  // Helper to run code on idle
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(cb);
    } else {
      setTimeout(cb, 1);
    }
  };

  // Preload and HLS instance management: cards >2 away are destroyed
  useEffect(() => {
    const isFar = Math.abs(index - activeIndex) > 2;
    if (isFar) {
      const destroyHls = () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
        setShouldLoad(false);
      };
      runIdle(destroyHls);
    } else {
      setShouldLoad(true);
    }
  }, [activeIndex, index]);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const videoEl = videoRef.current;
    const source = video.hls || video.src;

    if (!hlsRef.current && Hls.isSupported() && source.includes('.m3u8')) {
      const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hls.loadSource(source);
      hls.attachMedia(videoEl);
      hlsRef.current = hls;
    } else if (!videoEl.src) {
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = source;
      } else {
        videoEl.src = video.src;
      }
    }

    if (isActive) {
      videoEl.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [shouldLoad, video.src, video.hls, isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // MOBILE-ONLY: Local states for TikTok-style features
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const tapTimeoutRef = useRef<number | null>(null);
  const [showHeart, setShowHeart] = useState(false);

  const wasLongPressed = useRef(false);

  // Keep play state in sync with isActive
  useEffect(() => {
    setIsPlaying(isActive);
    if (!isActive) {
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current && shouldLoad) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isActive, shouldLoad]);

  const handleMobileTouchStart = () => {
    wasLongPressed.current = false;
    tapTimeoutRef.current = window.setTimeout(() => {
      setIsLongPressing(true);
      wasLongPressed.current = true;
      if (videoRef.current) videoRef.current.muted = true;
    }, 500);
  };

  const handleMobileTouchEnd = () => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    if (isLongPressing) {
      setIsLongPressing(false);
      if (videoRef.current) videoRef.current.muted = isMuted;
    }
  };

  const lastTapRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);

  const handleMobileClick = () => {
    const now = Date.now();
    // Double-tap debounce
    if (now - lastTapRef.current < 150) return;
    lastTapRef.current = now;

    if (isLongPressing) return;
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      return;
    }

    const diff = now - lastClickTimeRef.current;
    if (diff < 300) {
      // Double tap detected -> Like + Big Center Heart
      setShowHeart(true);
      if (onLikeToggle) {
        onLikeToggle(index);
      }
      setTimeout(() => setShowHeart(false), 600);
    } else {
      // Single tap -> Play/Pause
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
        setShowPlayOverlay(true);
        setTimeout(() => setShowPlayOverlay(false), 600);
      }
    }
    lastClickTimeRef.current = now;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100;
      setProgress(p);
    }
  };

  // ── MOBILE/TABLET FULLSCREEN LAYOUT ──────────────────────────────────────
  if (isMobileView) {
    return (
      <div
        ref={containerRef}
        className="relative flex items-center justify-center bg-black video-card-wrapper" // MOBILE-ONLY: added video-card-wrapper
        data-index={index} // MOBILE-ONLY
        style={{
          width: '100vw',
          height: '100dvh',
          scrollSnapAlign: 'start', // MOBILE-ONLY
          scrollSnapStop: 'always', // MOBILE-ONLY
          WebkitTransform: 'translate3d(0,0,0)', // Ensure hw acceleration
          transform: 'translate3d(0,0,0)',
        }}
        onClick={handleMobileClick}
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
        onTouchCancel={handleMobileTouchEnd}
      >
        <video
          ref={el => { videoRef.current = el; onRef(el, index); }}
          aria-label={`Drawing work ${index + 1} of ${total}`}
          playsInline // MOBILE-ONLY
          {...{ "webkit-playsinline": "true" }} // MOBILE-ONLY
          loop
          muted={isMuted || isLongPressing}
          autoPlay={isActive}
          onTimeUpdate={handleTimeUpdate} // MOBILE-ONLY
          preload={Math.abs(index - activeIndex) <= 1 ? "auto" : "metadata"}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // MOBILE-ONLY: fixed to contain
            background: resolvedTheme === 'light' ? '#fff' : '#000', // MOBILE-ONLY: matches theme
            filter: isLongPressing ? 'brightness(0.4)' : 'none', // MOBILE-ONLY: brightness(0.4)
            transition: 'filter 200ms ease' // MOBILE-ONLY
          }}
        />

        {/* MOBILE-ONLY: Play/Pause Overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ opacity: showPlayOverlay ? 1 : 0 }}
        >
          <div className="bg-black/50 p-6 rounded-full text-white backdrop-blur-sm">
            {isPlaying ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </div>
        </div>

        {/* MOBILE-ONLY: Double Tap Heart Overlay */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-[250] pointer-events-none animate-heart-pulse">
            <Heart size={120} className="text-red-500 fill-red-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
          </div>
        )}

        {/* MOBILE-ONLY: Progress Bar AT TOP */}
        <div
          className="absolute left-0 pointer-events-none"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 0px)',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.9)',
            width: `${progress}%`,
            transition: 'width 100ms linear',
            zIndex: 300,
          }}
        />
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  const renderVideo = () => (
    <video
      ref={el => { videoRef.current = el; onRef(el, index); }}
      aria-label={`Drawing work ${index + 1} of ${total}`}
      playsInline
      loop
      muted={isMuted}
      autoPlay={isActive}
      preload={Math.abs(index - activeIndex) <= 5 ? "auto" : "none"}
      className="absolute inset-0 w-full h-full object-contain"
      style={{ background: resolvedTheme === 'light' ? 'white' : 'black' }}
    />
  );

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateX(${(index - activeIndex) * 102}%)`,
        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isActive ? 10 : 5,
        opacity: Math.abs(index - activeIndex) > 1 ? 0.05 : isActive ? 1 : 0.4,
      }}
    >
      <div
        style={{
          height: '100%',
          aspectRatio: '9 / 16',
          maxWidth: '100vw',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: resolvedTheme === 'light' ? '0px' : '16px',
          background: resolvedTheme === 'light' ? 'white' : 'black',
          transform: isActive ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 400ms ease',
          boxShadow: resolvedTheme === 'light' ? 'none' : (isActive ? '0 32px 80px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.3)'),
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        {resolvedTheme === 'light' ? (
          <OsWindow title={`player.${video.id}`} className="w-full h-full p-0">
            <div className="relative w-full h-full overflow-hidden">
              {renderVideo()}
            </div>
          </OsWindow>
        ) : (
          renderVideo()
        )}
      </div>
    </div>
  );
});
