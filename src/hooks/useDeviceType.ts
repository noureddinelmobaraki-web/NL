import { useState, useEffect, useMemo } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BREAKPOINTS = {
  xs: '(max-width: 479px)',        // small mobile
  sm: '(min-width: 480px) and (max-width: 767px)',  // large mobile
  md: '(min-width: 768px) and (max-width: 1023px)', // tablet
  lg: '(min-width: 1024px) and (max-width: 1279px)', // small desktop
  xl: '(min-width: 1280px)',       // large desktop
} as const;

function getActiveBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'lg';
  for (const [bp, query] of Object.entries(BREAKPOINTS)) {
    if (window.matchMedia(query).matches) return bp as Breakpoint;
  }
  return 'lg';
}

export function useDeviceType() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getActiveBreakpoint);
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const handlers: (() => void)[] = [];
    
    Object.entries(BREAKPOINTS).forEach(([bp, query]) => {
      const mq = window.matchMedia(query);
      const handler = () => { if (mq.matches) setBreakpoint(bp as Breakpoint); };
      mq.addEventListener('change', handler);
      handlers.push(() => mq.removeEventListener('change', handler));
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
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
    };
  }, []);

  return useMemo(() => ({
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',  // ≤767px
    isTablet: breakpoint === 'md',                           // 768-1023px
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',  // ≥1024px
    isSmallMobile: breakpoint === 'xs',                      // ≤479px
    isLargeScreen: breakpoint === 'xl',                      // ≥1280px
    isReducedMotion,
    ...deviceFlags,
  }), [breakpoint, isReducedMotion, deviceFlags]);
}
