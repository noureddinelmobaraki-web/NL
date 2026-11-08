import { useCallback, useRef, useSyncExternalStore } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import type { CinemaDownloadSnapshot } from '../types';

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a as object);
  if (ka.length !== Object.keys(b as object).length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Re-renders only when the selected slice changes (shallow). */
export function useCinemaDownloadSelector<T>(
  selector: (s: CinemaDownloadSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = shallowEqual,
): T {
  const cache = useRef<{ snap: CinemaDownloadSnapshot; value: T } | null>(null);
  const getSelected = useCallback(() => {
    const snap = cinemaDownloadManager.getSnapshot();
    if (cache.current?.snap === snap) return cache.current.value;
    const next = selector(snap);
    if (cache.current && isEqual(cache.current.value, next)) {
      cache.current = { snap, value: cache.current.value };
      return cache.current.value;
    }
    cache.current = { snap, value: next };
    return next;
  }, [selector, isEqual]);
  return useSyncExternalStore(cinemaDownloadManager.subscribe, getSelected, getSelected);
}
