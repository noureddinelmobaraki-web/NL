import { useEffect } from 'react';

interface UseMoodGesturesProps {
  onExit: () => void;
  handlePlayPause: () => void;
}

export function useMoodGestures({ onExit, handlePlayPause }: UseMoodGesturesProps) {
  // ── ESC للخروج
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, handlePlayPause]);

  // ── إضافة gesture للخروج على الموبايل (swipe up)
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (diff > 80) onExit(); // swipe up = خروج
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onExit]);
}
