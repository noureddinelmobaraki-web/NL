import { useEffect, useRef, useState } from 'react';

export interface PosterCrossfade {
  cur: number;
  prev: number;
}

/**
 * Cycles the "front" poster index every `intervalMs`, but ONLY while `active`.
 * When the window is off-screen the timer is torn down, so it costs nothing and
 * never wakes a phone that is parked at the top of the page.
 */
export function usePosterCrossfade(
  count: number,
  active: boolean,
  intervalMs = 2000,
): PosterCrossfade {
  const [cur, setCur] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!active || count <= 1) return;
    const id = window.setInterval(() => {
      setCur((c) => {
        prevRef.current = c;
        return (c + 1) % count;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, count, intervalMs]);

  return { cur, prev: prevRef.current };
}
