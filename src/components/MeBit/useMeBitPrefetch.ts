import { useEffect } from 'react';
import { ASSETS } from '../../constants/assets';

export function useMeBitPrefetch(opts: {
  ctaRef: React.RefObject<HTMLElement | null>;
  isMobile: boolean;
  onPrefetch: () => void;
}) {
  const { ctaRef, isMobile, onPrefetch } = opts;

  // Desktop: prefetch on hover
  useEffect(() => {
    if (isMobile || !ctaRef.current) return;
    const el = ctaRef.current;
    let fired = false;

    const onHover = () => {
      if (fired) return;
      fired = true;
      // Hint browser to start fetching the manifest
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      link.href = ASSETS.media.meBitMusic;
      document.head.appendChild(link);
      onPrefetch();
    };

    el.addEventListener('mouseenter', onHover, { once: true });
    el.addEventListener('focusin',   onHover, { once: true });
    return () => {
      el.removeEventListener('mouseenter', onHover);
      el.removeEventListener('focusin', onHover);
    };
  }, [ctaRef, isMobile, onPrefetch]);

  // Mobile: prefetch on intersection
  useEffect(() => {
    if (!isMobile || !ctaRef.current) return;
    const el = ctaRef.current;
    let fired = false;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !fired) {
          fired = true;
          onPrefetch();
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: '200px', threshold: 0.1 });

    io.observe(el);
    return () => io.disconnect();
  }, [ctaRef, isMobile, onPrefetch]);
}
