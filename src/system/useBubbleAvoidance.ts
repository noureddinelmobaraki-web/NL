import { useEffect } from 'react';

const INTERACTIVE =
  'button,a,input,textarea,select,[role="button"],[data-bubble-collide],.loading-btn,.mid-nav button,.nav-button';

// A launcher should only evaporate for *floating* overlays (fixed/sticky) that
// truly sit on top of it — never for normal page content that merely scrolls
// underneath. That content-driven toggling is what caused the Login flicker.
function isFloating(node: HTMLElement | null): boolean {
  let cur: HTMLElement | null = node;
  let depth = 0;
  while (cur && depth < 8) {
    const pos = getComputedStyle(cur).position;
    if (pos === 'fixed' || pos === 'sticky') return true;
    cur = cur.parentElement;
    depth += 1;
  }
  return false;
}

/**
 * Makes a fixed “bubble” element evaporate only when a *floating* interactive
 * control (a modal / dialog / other fixed UI) actually overlaps it. It ignores
 * page content that scrolls beneath it, and it does NOT listen to scroll events,
 * which eliminates the mobile flicker entirely.
 */
export function useBubbleAvoidance(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;

    let timer = 0;
    let stableHit = false;
    let pending = 0;

    const compute = () => {
      timer = 0;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const pts: Array<[number, number]> = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 4, r.top + 4], [r.right - 4, r.top + 4],
        [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4],
      ];
      const prevPE = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      let hit = false;
      for (const [x, y] of pts) {
        const stack = document.elementsFromPoint(x, y) as HTMLElement[];
        if (stack.some((node) => {
          if (node === el || el.contains(node)) return false;
          const target = node.closest?.(INTERACTIVE) as HTMLElement | null;
          if (!target) return false;
          return isFloating(target);
        })) { hit = true; break; }
      }
      el.style.pointerEvents = prevPE;

      // Require two consecutive identical readings before flipping (anti-flicker).
      if (hit === stableHit) { pending = 0; return; }
      pending += 1;
      if (pending >= 2) {
        stableHit = hit;
        pending = 0;
        el.classList.toggle('is-evaporated', hit);
      }
    };

    // Debounced scheduler — coalesces bursts of DOM mutations into one check.
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(compute, 120);
    };

    schedule();

    // IMPORTANT: no scroll / wheel / touchmove listeners on purpose.
    // Fixed & sticky overlays don't move relative to the viewport while scrolling,
    // so scrolling can never change the outcome; listening to it only caused flicker.
    window.addEventListener('resize', schedule, { passive: true });
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-modal-context', 'data-active-page', 'aria-hidden'],
    });
    const iv = window.setInterval(schedule, 1000);

    return () => {
      window.removeEventListener('resize', schedule);
      mo.disconnect();
      window.clearInterval(iv);
      if (timer) window.clearTimeout(timer);
      el.classList.remove('is-evaporated');
    };
  }, [ref, enabled]);
}
