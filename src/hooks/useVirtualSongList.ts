import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseVirtualSongListOptions {
  /** rootMargin للـ observer — يحدد متى يُكشف الكرت قبل دخوله viewport */
  rootMargin?: string;
  /** threshold للظهور */
  threshold?: number | number[];
  /** IDs يجب أن تكون دائماً visible (active, isActiveInBar...) */
  forcedVisibleIds?: Set<number | string>;
  /** عدد الكروت الأولى المكشوفة فوراً (above-the-fold) */
  initialVisibleCount?: number;
  /** Callback يُستدعى عندما يكشف كرت لأول مرة */
  onCardRevealed?: (id: number | string) => void;
}

export interface UseVirtualSongListReturn {
  /** register element by id — to be called in ref callback */
  observe: (id: number | string, el: HTMLElement | null) => void;
  /** true إذا الكرت ظهر مرة واحدة على الأقل (sticky reveal) */
  isRevealed: (id: number | string) => boolean;
}

/**
 * Lazy-reveal hook: يبدأ كل الكروت كـ skeletons، ثم يكشفها واحدة واحدة
 * بناءً على IntersectionObserver. الكشف "sticky" — بمجرد ظهور كرت يبقى
 * مكشوفاً (لا re-skeleton عند الـ scroll للأعلى).
 *
 * - يعتمد IntersectionObserver V2 patterns 2026 حيث متاح.
 * - لا يكسر شكل الـ bento grid (الكرت skeleton يحجز نفس الـ box).
 */
export function useVirtualSongList(
  options: UseVirtualSongListOptions = {}
): UseVirtualSongListReturn {
  const {
    rootMargin = '300px 0px 300px 0px',
    threshold = 0,
    forcedVisibleIds,
    initialVisibleCount = 6,
    onCardRevealed,
  } = options;

  // sticky set of revealed ids
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementToIdRef = useRef<WeakMap<Element, string>>(new WeakMap());
  const idToElementRef = useRef<Map<string, HTMLElement>>(new Map());
  const observeOrderRef = useRef<string[]>([]);

  const onCardRevealedRef = useRef(onCardRevealed);
  useEffect(() => {
    onCardRevealedRef.current = onCardRevealed;
  }, [onCardRevealed]);

  // Initialize observer once
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // SSR / very old browsers: reveal كل شيء
      setRevealed((prev) => {
        const next = new Set(prev);
        idToElementRef.current.forEach((_, id) => {
          next.add(id);
        });
        return next;
      });
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let dirty = false;
        const additions: string[] = [];
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = elementToIdRef.current.get(entry.target);
          if (!id) return;
          additions.push(id);
          dirty = true;
          // sticky — stop observing once revealed
          observerRef.current?.unobserve(entry.target);
        });
        if (dirty) {
          setRevealed((prev) => {
            const next = new Set(prev);
            additions.forEach((id) => next.add(id));
            return next;
          });
        }
      },
      { rootMargin, threshold }
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [rootMargin, threshold]);

  // Pre-reveal first N cards (above-the-fold safety)
  useEffect(() => {
    if (initialVisibleCount <= 0) return;
    // delay to next frame so observe() refs are populated
    const id = requestAnimationFrame(() => {
      setRevealed((prev) => {
        const next = new Set(prev);
        observeOrderRef.current.slice(0, initialVisibleCount).forEach((cid) => {
          next.add(cid);
          const el = idToElementRef.current.get(cid);
          if (el) observerRef.current?.unobserve(el);
        });
        return next;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [initialVisibleCount]);

  // ── Hard safety net: اكشف كل الكروت بعد 2.5s مهما كان ──
  // يطابق سلوك useFadeInOnView. يمنع "المساحة الفارغة" إذا فشل الـ observer.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setRevealed((prev) => {
        const next = new Set(prev);
        observeOrderRef.current.forEach((id) => next.add(id));
        idToElementRef.current.forEach((_, id) => next.add(id));
        return next;
      });
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  // Safe effect to trigger callbacks for revealed IDs asynchronously
  const lastTriggeredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    revealed.forEach((id) => {
      if (!lastTriggeredRef.current.has(id)) {
        lastTriggeredRef.current.add(id);
        onCardRevealedRef.current?.(id);
      }
    });
  }, [revealed]);

  const observe = useCallback((id: number | string, el: HTMLElement | null) => {
    const sid = String(id);
    // unmount path
    if (!el) {
      const prev = idToElementRef.current.get(sid);
      if (prev) {
        observerRef.current?.unobserve(prev);
        elementToIdRef.current.delete(prev);
      }
      idToElementRef.current.delete(sid);
      return;
    }
    // already revealed? no need to observe
    idToElementRef.current.set(sid, el);
    elementToIdRef.current.set(el, sid);
    if (!observeOrderRef.current.includes(sid)) {
      observeOrderRef.current.push(sid);
    }
    if (revealed.has(sid)) return;
    observerRef.current?.observe(el);
  }, [revealed]);

  const isRevealed = useCallback(
    (id: number | string) => {
      const sid = String(id);
      if (forcedVisibleIds?.has(id) || forcedVisibleIds?.has(sid)) return true;
      return revealed.has(sid);
    },
    [revealed, forcedVisibleIds]
  );

  return { observe, isRevealed };
}
