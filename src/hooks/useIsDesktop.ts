// src/hooks/useIsDesktop.ts
import { useState, useEffect } from 'react';

const MOBILE_UA_REGEX = /Mobi|Android|iPhone|iPad/i;
const DESKTOP_MIN_WIDTH = 1024;

function detectDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  const widthOK = window.innerWidth >= DESKTOP_MIN_WIDTH;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = MOBILE_UA_REGEX.test(navigator.userAgent);
  return widthOK && !isCoarsePointer && !isMobileUA;
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(detectDesktop);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let rafId = 0;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setIsDesktop(detectDesktop()));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return isDesktop;
}
