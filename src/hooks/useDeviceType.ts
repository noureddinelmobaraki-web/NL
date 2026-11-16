import { useState, useEffect, useMemo } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const ORDERED_BREAKPOINTS: ReadonlyArray<readonly [Exclude<Breakpoint, 'xs'>, string]> = [
  ['xl', '(min-width: 1280px)'],
  ['lg', '(min-width: 1024px)'],
  ['md', '(min-width: 768px)'],
  ['sm', '(min-width: 480px)'],
];

function getActiveBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'lg';
  for (const [bp, query] of ORDERED_BREAKPOINTS) {
    if (window.matchMedia(query).matches) return bp;
  }
  return 'xs';
}

export function useDeviceType() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getActiveBreakpoint);
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const handlers: (() => void)[] = [];
    const syncBreakpoint = () => setBreakpoint(getActiveBreakpoint());

    ORDERED_BREAKPOINTS.forEach(([, query]) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', syncBreakpoint);
      handlers.push(() => mq.removeEventListener('change', syncBreakpoint));
    });

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionHandler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    motionMq.addEventListener('change', motionHandler);
    handlers.push(() => motionMq.removeEventListener('change', motionHandler));

    return () => handlers.forEach(h => h());
  }, []);

  const deviceFlags = useMemo(() => {
    if (typeof window === 'undefined') return { isTouch: false, isIOS: false, isAndroid: false };
    return {
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isIOS:
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      isAndroid: /Android/.test(navigator.userAgent),
    };
  }, []);

  return useMemo(() => ({
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',  // <768px
    isTablet: breakpoint === 'md',                           // 768–1023.99px
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',  // ≥1024px
    isSmallMobile: breakpoint === 'xs',                      // <480px
    isLargeScreen: breakpoint === 'xl',                      // ≥1280px
    isReducedMotion,
    ...deviceFlags,
  }), [breakpoint, isReducedMotion, deviceFlags]);
}
