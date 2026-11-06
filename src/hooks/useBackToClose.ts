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

    let poppedByBrowser = false;
    try {
      window.history.pushState({ ...(window.history.state || {}), lgLayer: true }, '');
    } catch {
      /* ignore history state errors */
    }

    const onPop = () => {
      poppedByBrowser = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBrowser && window.history.state?.lgLayer) {
        try {
          window.history.back();
        } catch {
          /* ignore */
        }
      }
    };
  }, [active]);
}
