import { useState, useEffect, useMemo, RefObject } from 'react';

interface VirtualRowsOptions {
  count: number;
  rowHeight: number;
  overscan: number;
  scrollElRef: RefObject<HTMLElement | null>;
}

export function useVirtualRows({ count, rowHeight, overscan, scrollElRef }: VirtualRowsOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;

    const handleScroll = () => setScrollTop(el.scrollTop);
    const handleResize = () => setClientHeight(el.clientHeight);

    handleScroll();
    handleResize();
    // قياس إضافي بعد أول رسم لضمان الحصول على ارتفاع صحيح
    requestAnimationFrame(handleResize);

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(handleResize);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, [scrollElRef]);

  // احتياطي: إن لم يُقَس الارتفاع بعد، استخدم 800px مؤقتًا حتى لا تختفي الصفوف
  const viewport = clientHeight || 800;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(count - 1, Math.floor((scrollTop + viewport) / rowHeight) + overscan);

  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({ index: i, offsetTop: i * rowHeight });
    }
    return items;
  }, [startIndex, endIndex, rowHeight]);

  return {
    virtualItems,
    totalHeight: count * rowHeight,
    startIndex,
    endIndex,
  };
}
