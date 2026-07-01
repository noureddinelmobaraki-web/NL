import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MOOD_TRANSITION_VIDEOS, MOOD_TRANSITION_TIMING } from '../../constants/assets';
import { useViewportMode } from '../../hooks/useViewportMode';

interface BlackHoleTransitionProps {
  onComplete: () => void;
  onNearComplete?: () => void;
}

// انتقالة "دخول الحلم" السريعة: تموّج + ضباب فوق الفيديو. المدّة محصورة بين 1.5s و2s.
const FAST_DURATION = 1600; // ms — داخل المدى المطلوب

// محتفظ بها للتوافق مع preload عند المرور على الزر
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

export const BlackHoleTransition = ({ onComplete, onNearComplete }: BlackHoleTransitionProps) => {
  const { isMobile, isTablet } = useViewportMode();
  const videoUrl = (isMobile || isTablet) ? MOOD_TRANSITION_VIDEOS.mobile : MOOD_TRANSITION_VIDEOS.desktop;
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);
  const [phase, setPhase] = useState<'enter' | 'warp'>('enter');

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
  const onNearCompleteRef = useRef(onNearComplete);
  onNearCompleteRef.current = onNearComplete;

  useEffect(() => {
    const v = videoRef.current;
    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };

    // ابدأ طور التموّج فورًا تقريبًا لإحساب "الحلم"
    const warpTimer = window.setTimeout(() => setPhase('warp'), 120);

    // كشف شاشة الـ mood قُبيل النهاية بقليل
    const nearTimer = window.setTimeout(() => {
      onNearCompleteRef.current?.();
    }, Math.max(0, FAST_DURATION - 250));

    // سقف صارم — تكتمل دائمًا بسرعة (1.5s–2s)
    const capTimer = window.setTimeout(finish, FAST_DURATION);

    if (v) {
      v.muted = true;
      // سرّع المقطع ليطابق التموّج السريع
      try {
        const total = MOOD_TRANSITION_TIMING?.total || 2000;
        v.playbackRate = Math.min(2.5, Math.max(1, total / FAST_DURATION));
      } catch {}
      v.play().catch(() => {/* مُنع التشغيل التلقائي — سقف المؤقّت سيُكمل */});
    }

    return () => {
      clearTimeout(warpTimer);
      clearTimeout(nearTimer);
      clearTimeout(capTimer);
    };
  }, []);

  return createPortal(
    <div aria-hidden="true" className={`mood-warp-root ${phase === 'warp' ? 'is-warp' : ''}`}>
      <video
        ref={videoRef}
        key={videoUrl}
        autoPlay muted playsInline preload="metadata"
        className="mood-warp-video"
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current();
          }
        }}
      >
        <source src={videoUrl.replace('.webm', '.mp4')} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
      </video>

      {/* تموّج مائي */}
      <div className="mood-warp-ripple" />
      {/* ضباب الحلم + وميض */}
      <div className="mood-warp-blur" />

      {/* فلتر التموّج (SVG) */}
      <svg className="mood-warp-svg" aria-hidden="true">
        <filter id="moodWaterWarp">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.028" numOctaves="2" seed="7" result="noise">
            <animate
              attributeName="baseFrequency"
              dur="1.6s"
              values="0.012 0.028; 0.03 0.05; 0.012 0.028"
              repeatCount="1"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="36" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </div>,
    document.body,
  );
};
