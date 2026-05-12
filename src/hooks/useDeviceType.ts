import { useState, useEffect, useMemo } from 'react';

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileMq = window.matchMedia('(max-width: 768px)');
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const mobileHandler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const motionHandler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);

    mobileMq.addEventListener('change', mobileHandler);
    motionMq.addEventListener('change', motionHandler);

    return () => {
      mobileMq.removeEventListener('change', mobileHandler);
      motionMq.removeEventListener('change', motionHandler);
    };
  }, []);

  const deviceFlags = useMemo(() => {
    if (typeof window === 'undefined') {
      return { isTouch: false, isIOS: false, isAndroid: false };
    }
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    return { isTouch, isIOS, isAndroid };
  }, []);

  return useMemo(() => ({
    isMobile,
    isReducedMotion,
    ...deviceFlags
  }), [isMobile, isReducedMotion, deviceFlags]);
}
