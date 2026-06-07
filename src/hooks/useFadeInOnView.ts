import { useEffect, useRef } from 'react';

export function useFadeInOnView<T extends HTMLElement>(
  rootMargin = '-100px'
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback 1: reduced-motion users or no IO support → show immediately
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);

    // Fallback 2: hard safety net — ensure visible after 3s no matter what
    const safety = window.setTimeout(() => el.classList.add('is-visible'), 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
    };
  }, [rootMargin]);

  return ref;
}
