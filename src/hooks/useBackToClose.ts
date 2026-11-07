/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef } from 'react';

/**
 * Binds hardware/browser Back navigation (Android Back button / swipe back)
 * to close an active overlay/reader/player layer without leaving the page.
 */
export function useBackToClose(active: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;

    const mountedAt = performance.now();
    let poppedByBrowser = false;
    let pushedLayer = false;

    const timer = window.setTimeout(() => {
      try {
        window.history.pushState({ ...(window.history.state || {}), lgLayer: true }, '');
        pushedLayer = true;
      } catch {
        /* ignore */
      }
    }, 50);

    const onPop = () => {
      if (!pushedLayer) return;
      poppedByBrowser = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', onPop);
      const elapsed = performance.now() - mountedAt;
      if (pushedLayer && !poppedByBrowser && elapsed > 120 && window.history.state?.lgLayer) {
        try {
          window.history.back();
        } catch {
          /* ignore */
        }
      }
    };
  }, [active]);
}
