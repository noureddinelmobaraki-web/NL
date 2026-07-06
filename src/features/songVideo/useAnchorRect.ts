import { useEffect, useState } from 'react';

export interface Rect { x: number; y: number; width: number; height: number; }

export function useAnchorRect(el: HTMLElement | null, active: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!active || !el) { setRect(null); return; }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [el, active]);

  return rect;
}
