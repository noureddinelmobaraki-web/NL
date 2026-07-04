// src/components/launcher/useStageSize.ts
// Measures the launcher stage element in px and keeps it fresh via ResizeObserver.
// All graph geometry is derived from this size, so it must be measured, not guessed.

import { useLayoutEffect, useRef, useState } from 'react';

export interface Size {
  w: number;
  h: number;
}

export function useStageSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      // clientWidth/Height exclude scrollbars; the stage never scrolls anyway.
      setSize((prev) => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return { ref, size };
}
