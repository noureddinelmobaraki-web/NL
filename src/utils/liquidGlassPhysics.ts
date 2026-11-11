/**
 * Interactive iOS 26 / iPhone 18 Liquid Glass Physics Engine
 * Provides GPU-friendly pointer/touch specular light tracking (--lx, --ly)
 * with a smart 24fps throttle on mobile devices (< 768px) and 60fps on desktop,
 * plus elastic liquid squish/stretch states (data-liquid-pressed, data-liquid-rebound)
 * across all buttons, cards, windows, lattice nodes, profile modals, and floating controls.
 */

const LIQUID_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '.fab-button',
  '.auth-launcher',
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
  '.notch-tool',
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
  '.profile-shell',
  '.profile-card',
  '.profile-section',
  '.profile-theme-edit',
  '.profile-cam',
  '.nl-theme-song',
  '.btn-accent',
  '.btn-ghost',
  '.btn-danger',
  '.icon-btn',
  '.fav-card',
  '.picker-panel',
  '.picker-card',
  '.nl-tsp',
  '.nl-tsp__row',
  '.nl-tsp__choose',
  '.nl-tsp__save',
  '.nl-avpick__icon',
  '.nl-avpick__arrow',
  '.nl-crop',
  '.udp-panel',
  '.nl-delete-modal',
  '.nl-inbox-panel',
  '.nl-cta',
  '.nl-chip'
].join(', ');

const LIQUID_SURFACE_SELECTOR = [
  '.nl-home-window-glass',
  '.os-window-glass',
  '.notch-island',
  '.nl-top-nav--worm',
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
  '.auth-modal',
  '.profile-shell',
  '.profile-card',
  '.profile-section',
  '.picker-panel',
  '.nl-tsp',
  '.nl-crop',
  '.udp-panel',
  '.nl-delete-modal',
  '.nl-inbox-panel'
].join(', ');

const MOBILE_FRAME_MS = 1000 / 24; // 24 FPS cap on mobile for smooth battery/GPU performance

export function initLiquidGlassPhysics(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let rafId: number | null = null;
  let lastPointerEvent: PointerEvent | null = null;
  let lastProcessTime = 0;
  const activePressedElements = new Set<HTMLElement>();

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

  const processPointerMove = (now: number) => {
    rafId = null;
    if (!lastPointerEvent) return;

    const isMobile = window.innerWidth < 768;
    if (isMobile && now - lastProcessTime < MOBILE_FRAME_MS) {
      return;
    }
    lastProcessTime = now;

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
    if (e.pointerType === 'touch' || window.innerWidth < 768) return;
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

    const isTouchOrMobile = e.pointerType === 'touch' || window.innerWidth < 768;

    const interactiveEl = e.target.closest<HTMLElement>(LIQUID_SELECTOR);
    if (interactiveEl) {
      if (!isTouchOrMobile) {
        updateLightPosition(interactiveEl, e.clientX, e.clientY);
      }
      interactiveEl.removeAttribute('data-liquid-rebound');
      interactiveEl.setAttribute('data-liquid-pressed', 'true');
      activePressedElements.add(interactiveEl);
    }

    if (!isTouchOrMobile) {
      const surfaceEl = e.target.closest<HTMLElement>(LIQUID_SURFACE_SELECTOR);
      if (surfaceEl && surfaceEl !== interactiveEl) {
        updateLightPosition(surfaceEl, e.clientX, e.clientY);
      }
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

/**
 * Generates an R/G normal-map displacement data URL on an offscreen canvas
 * for SVG feDisplacementMap Liquid Glass refraction.
 */
export function generateDisplacementMapDataUrl(
  width = 256,
  height = 64,
  bezelWidth = 18
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      const dist = Math.min(dx, dy);

      let r = 128;
      let g = 128;

      if (dist < bezelWidth) {
        const u = 1 - dist / bezelWidth;
        const slope = Math.pow(1 - Math.pow(1 - u, 4), 0.25);
        const dirX = x < width / 2 ? -1 : 1;
        const dirY = y < height / 2 ? -1 : 1;
        r = Math.round(128 + dirX * slope * 127);
        g = Math.round(128 + dirY * slope * 127);
      }

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

