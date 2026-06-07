import { useState, useEffect } from 'react';

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface ViewportInfo {
  mode: ViewportMode;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  isCoarsePointer: boolean;
}

const computeMode = (): ViewportInfo => {
  if (typeof window === 'undefined') {
    return {
      mode: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
      prefersReducedMotion: false, isCoarsePointer: false
    };
  }
  const w = window.innerWidth;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isMobile = w < 768 || (coarse && mobileUA);
  const isTablet = !isMobile && w >= 768 && w < 1024;
  const isDesktop = !isMobile && !isTablet;
  return {
    mode: isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile',
    isMobile, isTablet, isDesktop,
    prefersReducedMotion: reduced,
    isCoarsePointer: coarse
  };
};

export const useViewportMode = (): ViewportInfo => {
  const [info, setInfo] = useState<ViewportInfo>(computeMode);
  useEffect(() => {
    const update = () => setInfo(computeMode());
    window.addEventListener('resize', update);
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    mql.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mql.removeEventListener('change', update);
    };
  }, []);
  return info;
};
