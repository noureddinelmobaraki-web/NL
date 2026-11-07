/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect } from 'react';

const injectedOrigins = new Set<string>();

/**
 * Dynamically injects `<link rel="preconnect">` and `<link rel="dns-prefetch">`
 * hints into `<head>` only when a stage that needs those origins mounts.
 */
export function usePreconnect(origins: readonly string[], crossOrigin = true): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    for (const origin of origins) {
      const key = `${origin}:${crossOrigin ? 'cors' : 'no-cors'}`;
      if (injectedOrigins.has(key)) continue;
      injectedOrigins.add(key);

      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      if (crossOrigin) {
        preconnect.crossOrigin = 'anonymous';
      }
      document.head.appendChild(preconnect);

      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = origin;
      document.head.appendChild(dnsPrefetch);
    }
  }, [origins, crossOrigin]);
}
