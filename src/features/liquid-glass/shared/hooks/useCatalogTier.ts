/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useState } from 'react';

export type CatalogTier = 'phone' | 'medium' | 'wide';

function evaluateTier(w: number): CatalogTier {
  if (w <= 640) return 'phone';
  if (w < 1200) return 'medium';
  return 'wide';
}

/**
 * Returns current container tier:
 * - phone: <= 640px
 * - medium: 641px - 1199px
 * - wide: >= 1200px
 */
export function useCatalogTier(containerRef: React.RefObject<HTMLElement | null>): CatalogTier {
  const [tier, setTier] = useState<CatalogTier>(() =>
    typeof window !== 'undefined' ? evaluateTier(window.innerWidth) : 'wide',
  );

  useEffect(() => {
    const el = containerRef.current;
    const sync = () => {
      const width = el?.clientWidth || window.innerWidth;
      setTier(evaluateTier(width));
    };

    sync();

    window.addEventListener('resize', sync, { passive: true });
    if (el && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width || window.innerWidth;
          setTier(evaluateTier(w));
        }
      });
      ro.observe(el);
      return () => {
        window.removeEventListener('resize', sync);
        ro.disconnect();
      };
    }

    return () => {
      window.removeEventListener('resize', sync);
    };
  }, [containerRef]);

  return tier;
}
