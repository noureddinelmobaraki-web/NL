import { useEffect, type RefObject } from 'react';
import type { GlassTier } from './useGlassTier';

const GLASS_TARGET_SELECTOR = '.nl-node, .nl-topbar-btn, .nl-sound-btn, .nl-topbar-orb';

function resetGlassVars(el: HTMLElement): void {
  el.style.setProperty('--gx', '30%');
  el.style.setProperty('--gy', '0%');
  el.style.setProperty('--rim-angle', '200deg');
  el.style.setProperty('--mx', '0px');
  el.style.setProperty('--my', '0px');
}

export function useGlassPointer(
  stageRef: RefObject<HTMLElement | null>,
  tier: GlassTier,
): void {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || tier !== 'liquid') return;

    let activeEl: HTMLElement | null = null;
    let cachedRect: DOMRect | null = null;
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;

    const flushFrame = () => {
      rafId = 0;
      if (!activeEl || !cachedRect || cachedRect.width <= 0 || cachedRect.height <= 0) return;

      const px = Math.max(0, Math.min(1, (pendingX - cachedRect.left) / cachedRect.width));
      const py = Math.max(0, Math.min(1, (pendingY - cachedRect.top) / cachedRect.height));
      const angleDeg = Math.atan2(py - 0.5, px - 0.5) * (180 / Math.PI) + 180;
      const mx = (px - 0.5) * 6;
      const my = (py - 0.5) * 4;

      activeEl.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      activeEl.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      activeEl.style.setProperty('--rim-angle', `${angleDeg.toFixed(1)}deg`);
      activeEl.style.setProperty('--mx', `${mx.toFixed(2)}px`);
      activeEl.style.setProperty('--my', `${my.toFixed(2)}px`);
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(GLASS_TARGET_SELECTOR) ?? null;
      if (target === activeEl) return;
      if (activeEl) {
        resetGlassVars(activeEl);
      }
      activeEl = target;
      cachedRect = activeEl ? activeEl.getBoundingClientRect() : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(GLASS_TARGET_SELECTOR) ?? null;
      if (target !== activeEl) {
        if (activeEl) resetGlassVars(activeEl);
        activeEl = target;
        cachedRect = activeEl ? activeEl.getBoundingClientRect() : null;
      }
      if (!activeEl || !cachedRect) return;
      pendingX = event.clientX;
      pendingY = event.clientY;
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(flushFrame);
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!activeEl) return;
      const related = event.relatedTarget as Node | null;
      if (related && activeEl.contains(related)) return;
      resetGlassVars(activeEl);
      activeEl = null;
      cachedRect = null;
    };

    const handlePointerLeaveStage = () => {
      if (activeEl) {
        resetGlassVars(activeEl);
        activeEl = null;
        cachedRect = null;
      }
    };

    const handleResize = () => {
      if (activeEl) {
        cachedRect = activeEl.getBoundingClientRect();
      }
    };

    stage.addEventListener('pointerover', handlePointerOver, { passive: true });
    stage.addEventListener('pointermove', handlePointerMove, { passive: true });
    stage.addEventListener('pointerout', handlePointerOut, { passive: true });
    stage.addEventListener('pointerleave', handlePointerLeaveStage, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      if (activeEl) {
        resetGlassVars(activeEl);
      }
      stage.removeEventListener('pointerover', handlePointerOver);
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerout', handlePointerOut);
      stage.removeEventListener('pointerleave', handlePointerLeaveStage);
      window.removeEventListener('resize', handleResize);
    };
  }, [stageRef, tier]);
}
