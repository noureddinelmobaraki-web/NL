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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) {
        onNext();
      } else {
        onPrev();
      }
    } else if (onClose && dy > 120 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    }
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
}
