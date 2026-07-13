import { useEffect, useState, type RefObject } from 'react';
import { REVEAL_TIMINGS } from './revealTimings';
import { isRenderableRect, rectsAreStable, type RectLike } from './stableRect';

interface RectSubscriber {
  callback: () => void;
}

const subscribers = new WeakMap<Element, RectSubscriber>();
const sharedObserver = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((entries) => {
      entries.forEach((entry) => subscribers.get(entry.target)?.callback());
    })
  : null;

export function useStableRect<T extends Element>(
  ref: RefObject<T | null>,
  enabled = true,
): boolean {
  const [stable, setStable] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setStable(false);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let previous: RectLike | null = null;
    let stableFrames = 0;

    const sample = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        const rect = element.getBoundingClientRect();
        const next: RectLike = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
        if (!isRenderableRect(next)) {
          stableFrames = 0;
          previous = next;
          setStable(false);
          return;
        }
        stableFrames = rectsAreStable(previous, next, REVEAL_TIMINGS.rectTolerancePx)
          ? stableFrames + 1
          : 0;
        previous = next;
        if (stableFrames >= REVEAL_TIMINGS.stableFrames) {
          setStable(true);
          return;
        }
        raf = requestAnimationFrame(sample);
      });
    };

    subscribers.set(element, { callback: () => {
      setStable(false);
      stableFrames = 0;
      sample();
    } });
    sharedObserver?.observe(element);
    sample();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      sharedObserver?.unobserve(element);
      subscribers.delete(element);
    };
  }, [enabled, ref]);

  return stable;
}
