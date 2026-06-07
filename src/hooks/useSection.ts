import { useRef, useEffect, useCallback, useState } from 'react';

interface UseSectionOptions {
  id: string;
  threshold?: number;          // % المرئي قبل تفعيل fade
  rootMargin?: string;
  onEnter?: () => void;        // callback عند ظهور القسم
  onExit?: () => void;
  trackAnalytics?: boolean;
}

export function useSection<T extends HTMLElement = HTMLElement>(options: UseSectionOptions) {
  const { id, threshold = 0.1, rootMargin = '0px', onEnter, onExit, trackAnalytics = false } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible) {
          el.classList.add('is-visible');
          if (!hasEntered) {
            setHasEntered(true);
            onEnter?.();
            if (trackAnalytics && import.meta.env.PROD) {
              try {
                const log = JSON.parse(localStorage.getItem('nl-section-views') ?? '[]');
                log.push({ id, ts: Date.now() });
                localStorage.setItem('nl-section-views', JSON.stringify(log.slice(-50)));
              } catch {}
            }
          }
        } else if (hasEntered) {
          onExit?.();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, threshold, rootMargin, onEnter, onExit, trackAnalytics, hasEntered]);

  const scrollTo = useCallback((behavior: ScrollBehavior = 'smooth') => {
    ref.current?.scrollIntoView({ behavior, block: 'start' });
  }, []);

  return { ref, isVisible, hasEntered, scrollTo };
}
