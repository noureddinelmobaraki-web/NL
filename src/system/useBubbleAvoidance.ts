import { useEffect } from 'react';

const INTERACTIVE =
  'button,a,input,textarea,select,[role="button"],[data-bubble-collide],.loading-btn,.mid-nav button,.nav-button';

/**
 * Makes a fixed “bubble” element evaporate (transparent + click-through) whenever
 * an interactive control sits underneath it, and reappear once it does not.
 * Re-evaluated on scroll / wheel / touchmove / resize / DOM mutations (rAF-throttled).
 */
export function useBubbleAvoidance(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    let raf = 0;

    const sample = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const pts: Array<[number, number]> = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 4, r.top + 4], [r.right - 4, r.top + 4],
        [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4],
      ];
      // Hide our own element from hit-testing so we see what is *beneath* it.
      const prevPE = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      let hit = false;
      for (const [x, y] of pts) {
        const stack = document.elementsFromPoint(x, y) as HTMLElement[];
        if (stack.some((node) => node !== el && !el.contains(node) && node.closest?.(INTERACTIVE))) {
          hit = true; break;
        }
      }
      el.style.pointerEvents = prevPE;
      el.classList.toggle('is-evaporated', hit);
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(sample); };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('wheel', schedule, { passive: true });
    window.addEventListener('touchmove', schedule, { passive: true });
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'data-modal-context', 'data-active-page'] });
    const iv = window.setInterval(schedule, 700);

    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', schedule);
      window.removeEventListener('touchmove', schedule);
      mo.disconnect();
      window.clearInterval(iv);
      if (raf) cancelAnimationFrame(raf);
      el.classList.remove('is-evaporated');
    };
  }, [ref, enabled]);
}
