/**
 * Interactive iOS 26 / iPhone 18 Liquid Glass Physics Engine
 * Provides 60fps GPU-friendly pointer/touch specular light tracking (--lx, --ly)
 * and elastic liquid squish/stretch states (data-liquid-pressed, data-liquid-hover)
 * across all buttons, cards, windows, lattice nodes, and the floating NotchIsland droplet.
 */

const LIQUID_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '.nl-home-window-glass',
  '.os-window-glass',
  '.nl-lattice-glass',
  '.manga-card',
  '.song-card',
  '.notch-island',
  '.notch-btn',
  '.notch-pill',
  '.notch-tree__root',
  '.notch-tree__leaf',
  '.nl-top-nav__button',
  '.nl-bottom-nav__item',
  '.nl-youtube-drawer-card',
  '.nl-youtube-modal-card',
  '.nl-tube-root',
  '.nl-tube-card',
  '.nl-tube-tab',
  '.nl-tube-ctl',
  '.nl-tube-close',
  '.nl-tube-more',
  '.nl-hl-player',
  '.nl-contact-card',
  '.nl-contact-chip',
  '.nl-contact-mode__button',
  '.nl-contact-submit',
  '.nl-tv-sidebar',
  '.nl-tv-country-item',
  '.nl-tv-channel-card',
  '.nl-tv-controls-bar',
  '.nl-games-window',
  '.nl-game-item',
  '.nl-screen-btn',
  '.nl-touch-btn',
  '.nl-music-list-panel',
  '.nl-music-player-panel',
  '.nl-acct-card',
  '.nl-acc-card',
  '.nl-public-card',
  '.nl-pub',
  '.auth-modal',
  '.auth-oauth-btn',
  '.auth-primary',
  '.nl-cta',
  '.nl-chip'
].join(', ');

const LIQUID_SURFACE_SELECTOR = [
  '.nl-home-window-glass',
  '.os-window-glass',
  '.notch-island',
  '.nl-lattice-glass',
  '.manga-card',
  '.song-card',
  '.nl-youtube-modal-card',
  '.nl-tube-root',
  '.nl-tube-card',
  '.nl-contact-card',
  '.nl-tv-sidebar',
  '.nl-tv-controls-bar',
  '.nl-games-window',
  '.nl-music-list-panel',
  '.nl-music-player-panel',
  '.nl-acct-card',
  '.nl-public-card',
  '.auth-modal'
].join(', ');

export function initLiquidGlassPhysics(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let rafId: number | null = null;
  let lastPointerEvent: PointerEvent | null = null;
  let activePressedElements = new Set<HTMLElement>();

  const updateLightPosition = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    el.style.setProperty('--lx', `${x.toFixed(1)}%`);
    el.style.setProperty('--ly', `${y.toFixed(1)}%`);

    // Subtle 3D liquid tilt ratios (-1 to 1)
    const tiltX = ((x - 50) / 50).toFixed(2);
    const tiltY = ((y - 50) / 50).toFixed(2);
    el.style.setProperty('--ltilt-x', tiltX);
    el.style.setProperty('--ltilt-y', tiltY);
  };

  const processPointerMove = () => {
    rafId = null;
    if (!lastPointerEvent) return;

    const { clientX, clientY, target } = lastPointerEvent;
    if (!(target instanceof Element)) return;

    const interactiveEl = target.closest<HTMLElement>(LIQUID_SELECTOR);
    if (interactiveEl) {
      updateLightPosition(interactiveEl, clientX, clientY);
    }

    const surfaceEl = target.closest<HTMLElement>(LIQUID_SURFACE_SELECTOR);
    if (surfaceEl && surfaceEl !== interactiveEl) {
      updateLightPosition(surfaceEl, clientX, clientY);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    lastPointerEvent = e;
    if (rafId === null) {
      rafId = window.requestAnimationFrame(processPointerMove);
    }
  };

  const clearPressedElements = () => {
    activePressedElements.forEach((el) => {
      el.removeAttribute('data-liquid-pressed');
      el.setAttribute('data-liquid-rebound', 'true');
      window.setTimeout(() => {
        el.removeAttribute('data-liquid-rebound');
      }, 420);
    });
    activePressedElements.clear();
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!(e.target instanceof Element)) return;

    const interactiveEl = e.target.closest<HTMLElement>(LIQUID_SELECTOR);
    if (interactiveEl) {
      updateLightPosition(interactiveEl, e.clientX, e.clientY);
      interactiveEl.removeAttribute('data-liquid-rebound');
      interactiveEl.setAttribute('data-liquid-pressed', 'true');
      activePressedElements.add(interactiveEl);
    }

    const surfaceEl = e.target.closest<HTMLElement>(LIQUID_SURFACE_SELECTOR);
    if (surfaceEl && surfaceEl !== interactiveEl) {
      updateLightPosition(surfaceEl, e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    if (activePressedElements.size > 0) {
      clearPressedElements();
    }
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerUp, { passive: true });
  window.addEventListener('blur', handlePointerUp, { passive: true });

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    window.removeEventListener('blur', handlePointerUp);
  };
}
