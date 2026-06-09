/**
 * useAmbientColor — Lazy, cached, visibility-aware dominant color extraction.
 *
 * Replaces the inline effect in SongCard.tsx. Three guarantees:
 *   1. Lazy: defers work until `isActive` OR card enters viewport.
 *   2. Cached: session storage + in-memory map inside extractDominantColorCached.
 *   3. Symmetric: `aliveRef` guards against post-unmount callbacks.
 */
import { useEffect, useRef } from 'react';
import { loadSession, saveSession } from '../utils/sessionState';
import { extractDominantColorCached } from '../utils/extractColors';

export interface UseAmbientColorOptions {
  /** URL of the cover image. Falsy = no-op. */
  imageUrl: string | undefined | null;
  /** When true, extraction runs immediately. */
  isActive: boolean;
  /** Called once color resolves (only while isActive is true). */
  onColor?: (rgb: string) => void;
  /** Optional ref to gate extraction on viewport visibility. */
  targetRef?: React.RefObject<HTMLElement | null>;
}

export function useAmbientColor({
  imageUrl,
  isActive,
  onColor,
  targetRef,
}: UseAmbientColorOptions): void {
  const onColorRef = useRef(onColor);
  onColorRef.current = onColor;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;

    const emit = (color: string) => {
      if (cancelled || !aliveRef.current) return;
      // Visual contract: only push when active. Cache always fills.
      if (isActive) onColorRef.current?.(color);
    };

    const cachedColor = (): string | undefined => {
      try {
        return loadSession().dominantColors?.[imageUrl];
      } catch { return undefined; }
    };

    const runExtraction = () => {
      const existing = cachedColor();
      if (existing) { emit(existing); return; }
      extractDominantColorCached(imageUrl, (color) => {
        try {
          const cur = loadSession();
          saveSession({
            dominantColors: { ...cur.dominantColors, [imageUrl]: color },
          });
        } catch { /* sessionStorage unavailable */ }
        emit(color);
      });
    };

    // Fast path
    if (cachedColor() || isActive) {
      runExtraction();
      return () => { cancelled = true; };
    }

    // Lazy path: IntersectionObserver
    const el = targetRef?.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      runExtraction();
      return () => { cancelled = true; };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            runExtraction();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [imageUrl, isActive, targetRef]);
}
