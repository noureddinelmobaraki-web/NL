import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface InViewportOptions {
  /** grow the observed box so work can start slightly before it scrolls in */
  rootMargin?: string;
  threshold?: number;
  /** latch to true on the first intersection and stop observing */
  once?: boolean;
}

/**
 * Reports whether `ref` is (near) the viewport using a single
 * IntersectionObserver. Falls back to `true` when IO is unavailable so content
 * is never hidden.
 *
 * This is the gate that keeps the pendulum completely idle while the user is
 * elsewhere on the page: no rAF, no listeners, no timers until it is in view.
 */
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = '200px 0px', threshold = 0, once = false }: InViewportOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && once) {
          setInView(true);
          io.disconnect();
          return;
        }
        setInView(visible);
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold, once]);

  return inView;
}
