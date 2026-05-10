import React from 'react';

export function useDeviceType() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.matchMedia('(max-width: 768px)').matches
  );
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  
  return { isMobile, isTouch };
}
