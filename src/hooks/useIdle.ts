import { useState, useEffect } from 'react';

export function useIdle(ms = 3000) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t: number;
    const reset = () => {
      setIdle(false);
      clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), ms);
    };
    const evts = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    evts.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      evts.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(t);
    };
  }, [ms]);
  return idle;
}
