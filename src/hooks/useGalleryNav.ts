import { useState, useCallback, useEffect } from 'react';

interface UseGalleryNavOptions {
  total: number;
  initialIndex?: number;
  loop?: boolean;
  enableKeyboard?: boolean;
  isActive?: boolean;
  onChange?: (index: number) => void;
}

export function useGalleryNav({
  total, initialIndex = 0, loop = true, enableKeyboard = false, isActive = true, onChange,
}: UseGalleryNavOptions) {
  const [index, setIndex] = useState(initialIndex);

  const go = useCallback((newIdx: number) => {
    if (total === 0) return;
    let next = newIdx;
    if (loop) {
      next = ((newIdx % total) + total) % total;
    } else {
      next = Math.max(0, Math.min(total - 1, newIdx));
    }
    setIndex(next);
    onChange?.(next);
  }, [total, loop, onChange]);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const select = useCallback((i: number) => go(i), [go]);

  useEffect(() => {
    if (!enableKeyboard || !isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableKeyboard, isActive, next, prev, go, total]);

  return { index, next, prev, select, hasNext: loop || index < total - 1, hasPrev: loop || index > 0 };
}
