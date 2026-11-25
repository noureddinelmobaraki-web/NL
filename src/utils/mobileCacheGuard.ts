/**
 * Lightweight zero-dependency mobile/standalone PWA detection guard.
 * Kept separate from mobileSuperCache.ts so desktop bundles never load
 * or execute the background song pre-caching engine.
 */

export const CACHE_MOBILE_SONGS = 'nl-mobile-songs-v1';
export const CACHE_MOBILE_API = 'nl-mobile-api-v1';
export const CACHE_MOBILE_POSTERS = 'nl-mobile-posters-v1';
export const CACHE_MOBILE_META = 'nl-mobile-meta-v1';

export function isMobileSuperCacheDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  try {
    return (
      window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}
