import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { LyricLine } from '../../types';
import { findActiveIndex } from './activeIndex';

interface EngineArgs {
  lines: LyricLine[];
  getCurrentTime: () => number;
  containerRef: RefObject<HTMLDivElement | null>;
  lineElsRef: RefObject<Array<HTMLElement | null>>;
  enabled: boolean;
}

/**
 * ONE requestAnimationFrame loop drives everything imperatively:
 *  - toggles the .is-active class only when the active line changes,
 *  - centres the active line inside the box (never scrolls the page),
 *  - writes the --wp CSS var on the active line's word spans (karaoke wipe).
 * No React state is touched per frame. Pauses when the tab is hidden.
 */
export function useLyricEngine({
  lines,
  getCurrentTime,
  containerRef,
  lineElsRef,
  enabled,
}: EngineArgs): void {
  useEffect(() => {
    if (!enabled || lines.length === 0) return;

    let raf = 0;
    let activeIdx = -1;
    let scrolledIdx = -1;

    const centre = (el: HTMLElement) => {
      const c = containerRef.current;
      if (!c) return;
      const cr = c.getBoundingClientRect();
      const ar = el.getBoundingClientRect();
      const delta = (ar.top - cr.top) - (c.clientHeight / 2 - el.clientHeight / 2);
      c.scrollTo({ top: Math.max(0, c.scrollTop + delta), behavior: 'smooth' });
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (typeof document !== 'undefined' && document.hidden) return;

      const t = getCurrentTime();
      const idx = findActiveIndex(lines, t);

      if (idx !== activeIdx) {
        const prev = lineElsRef.current[activeIdx];
        if (prev) prev.classList.remove('is-active');
        const cur = lineElsRef.current[idx];
        if (cur) cur.classList.add('is-active');
        activeIdx = idx;
      }

      if (idx !== scrolledIdx) {
        const cur = lineElsRef.current[idx];
        if (cur) centre(cur);
        scrolledIdx = idx;
      }

      const line = lines[idx];
      const activeEl = lineElsRef.current[idx];
      if (activeEl && line && line.words && line.words.length > 1) {
        const spans = activeEl.querySelectorAll<HTMLElement>('.nl-lw');
        for (let w = 0; w < line.words.length; w++) {
          const word = line.words[w];
          const end = word.endTime ?? word.time + 1;
          const pct = end > word.time
            ? Math.min(100, Math.max(0, ((t - word.time) / (end - word.time)) * 100))
            : (t >= word.time ? 100 : 0);
          const span = spans[w];
          if (span) {
            const rounded = String(Math.round(pct));
            if (span.dataset.p !== rounded) {
              span.dataset.p = rounded;
              span.style.setProperty('--wp', rounded + '%');
            }
          }
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [lines, getCurrentTime, enabled, containerRef, lineElsRef]);
}
