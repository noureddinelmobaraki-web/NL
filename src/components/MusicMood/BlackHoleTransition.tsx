import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MOOD_TRANSITION_VIDEOS } from '../../constants/assets';
import { useViewportMode } from '../../hooks/useViewportMode';

interface BlackHoleTransitionProps {
  onComplete: () => void;
  onNearComplete?: () => void;
}

// Kept for backward compatibility with MySongsPage hover preload
export const preloadBlackHoleTransition = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    const url = isMobile ? MOOD_TRANSITION_VIDEOS.mobile : MOOD_TRANSITION_VIDEOS.desktop;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = url;
    link.type = 'video/webm';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    setTimeout(() => { try { document.head.removeChild(link); } catch {} }, 30000);
  } catch {}
};

export const BlackHoleTransition = ({ onComplete }: BlackHoleTransitionProps) => {
  const { isMobile, isTablet } = useViewportMode();
  const videoUrl = (isMobile || isTablet) ? MOOD_TRANSITION_VIDEOS.mobile : MOOD_TRANSITION_VIDEOS.desktop;
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('bh-transitioning');
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.classList.remove('bh-transitioning');
    };
  }, []);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const v = videoRef.current;
    let fallbackTimer: number;
    let duration = 3000;

    // Safety net that ALWAYS fires, even if v.play() promise hangs (e.g. iOS low power mode)
    const safetyTimer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    }, 3500);

    if (v) {
      v.muted = true;
      v.play().then(() => {
         // Fallback timer slightly longer than the video to ensure it runs even if onEnded drops
         duration = (v.duration && !isNaN(v.duration) && v.duration > 0) ? (v.duration * 1000) + 200 : 3000;
         fallbackTimer = window.setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onCompleteRef.current();
            }
         }, duration);
      }).catch(() => {
        console.warn('[MoodTransition] video play blocked, jumping instantly');
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      });
    } else {
        fallbackTimer = window.setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onCompleteRef.current();
            }
        }, duration);
    }

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647,
        width: '100dvw', height: '100dvh',
        pointerEvents: 'auto', overflow: 'hidden',
        background: '#050010',
      }}
    >
      <video
        ref={videoRef}
        key={videoUrl}
        autoPlay muted playsInline preload="auto"
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current();
          }
        }}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
        }}
      >
        <source src={videoUrl.replace('.webm', '.mp4')} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
      </video>
    </div>,
    document.body
  );
};
