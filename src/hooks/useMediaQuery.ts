/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    () => false,
  );
}

export const useIsPhone = (): boolean => useMediaQuery('(max-width: 640px)');
export const useIsTouch = (): boolean => useMediaQuery('(pointer: coarse)');
