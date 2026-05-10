import { useState, useEffect } from 'react';

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 768px)').matches
  );
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { isMobile, isTouch, isIOS, isAndroid };
}
