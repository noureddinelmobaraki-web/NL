import { useRef } from 'react';
import type React from 'react';

export interface UseMeBitSwipeParams {
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
}

export interface UseMeBitSwipeReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useMeBitSwipe({ onNext, onPrev, onClose }: UseMeBitSwipeParams): UseMeBitSwipeReturn {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0); // MOBILE-ONLY

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now(); // MOBILE-ONLY
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dt = Date.now() - touchStartTime.current; // MOBILE-ONLY
    const vx = Math.abs(dx) / (dt || 1); // MOBILE-ONLY

    // MOBILE-ONLY: Modified threshold, velocity check, and haptics
    if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 60 || vx > 0.5)) {
      try { navigator.vibrate?.(8); } catch(e) {} // MOBILE-ONLY
      if (dx > 0) {
        onNext();
      } else {
        onPrev();
      }
    } else if (onClose && dy < -100 && Math.abs(dx) < 40) { // Mobile: swipe down to close
      try { navigator.vibrate?.(8); } catch(e) {} // MOBILE-ONLY
      onClose();
    }
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
}
