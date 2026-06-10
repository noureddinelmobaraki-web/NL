import { useEffect, useRef, useState } from 'react';

/**
 * يرجع ref + isCentered=true عندما يمرّ العنصر بشريط منتصف الشاشة عموديًّا.
 * يُستخدم لإبراز خانة ME bit (إضاءة + ظلال) حين تتوسّط الشاشة.
 */
export function useCenterSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsCentered(entry.isIntersecting),
      { root: null, rootMargin: '-42% 0px -42% 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, isCentered };
}
