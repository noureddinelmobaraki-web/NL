import { useRef } from 'react';
import type React from 'react';
import { useTouchGestures } from './useTouchGestures';

export interface UseMeBitSwipeParams {
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  ref?: React.RefObject<HTMLElement | null>;
}

export interface UseMeBitSwipeReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Backward-compatible wrapper. Prefer using useTouchGestures directly in new code.
 * Keeps the legacy onTouchStart/onTouchEnd API to avoid breaking MeBitGallery
 * during incremental migration.
 */
export function useMeBitSwipe({ onNext, onPrev, onClose, ref }: UseMeBitSwipeParams): UseMeBitSwipeReturn {
  const fallbackRef = useRef<HTMLElement | null>(null);
  useTouchGestures(ref ?? fallbackRef, {
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    onSwipeDown: onClose,
    threshold: 60,
    velocityThreshold: 0.5,
    enabled: true,
  });

  // Legacy noop returns — kept so MeBitGallery doesn't crash; the actual
  // gestures are bound via the Pointer Events listeners installed by the hook.
  return {
    onTouchStart: () => {},
    onTouchEnd: () => {},
  };
}
