import { useCallback, useEffect, useRef, useState } from 'react';

export interface StageMetrics {
  /** Stage edge length in CSS pixels. The stage is always square. */
  size: number;
  /** Device pixel ratio, clamped by the caller's maxDpr. */
  dpr: number;
}

/**
 * Observes the square stage element and reports its edge length.
 *
 * ResizeObserver is used rather than a window resize listener so the hook
 * also reacts to mobile browser chrome collapsing, orientation changes, and
 * any future layout change around the stage — none of which reliably fire a
 * window resize event.
 */
export function useStageMetrics(maxDpr: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<StageMetrics>({ size: 0, dpr: 1 });

  const measure = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const size = Math.round(Math.min(rect.width, rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      setMetrics((prev) =>
        prev.size === size && prev.dpr === dpr ? prev : { size, dpr },
      );
    },
    [maxDpr],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure(el);

    const ro = new ResizeObserver(() => measure(el));
    ro.observe(el);

    // devicePixelRatio changes when the window moves between monitors or the
    // user zooms; ResizeObserver alone will not catch a pure DPR change.
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDpr = () => measure(el);
    mq.addEventListener('change', onDpr);

    return () => {
      ro.disconnect();
      mq.removeEventListener('change', onDpr);
    };
  }, [measure]);

  return { ref, metrics };
}
