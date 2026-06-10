import { useEffect, useRef, RefObject } from 'react';

export interface UseTouchGesturesOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  onPinchEnd?: () => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
  /** Minimum distance (px) to qualify as a swipe. Default 50. */
  threshold?: number;
  /** Minimum velocity (px/ms) for a flick. Default 0.5. */
  velocityThreshold?: number;
  /** Max time (ms) between taps to register as double-tap. Default 300. */
  doubleTapDelay?: number;
  /** Conditional enable — pass `isMobile || isTablet`. */
  enabled?: boolean;
}

interface PointerSnapshot { x: number; y: number; t: number; }

/**
 * 2025-grade unified touch gestures hook.
 * - Pointer Events API (touch + pen + mouse-as-pointer unified).
 * - Multi-pointer aware: pinch fires only when 2 pointers are active.
 * - Respects CSS `touch-action` (caller can set `touch-action: pan-y` etc.).
 * - All swipes are dominant-axis (no false positives on diagonal moves).
 * - SetPointerCapture is used so dragging outside the element still emits up.
 */
export function useTouchGestures(
  ref: RefObject<HTMLElement | null>,
  {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onPinch,
    onPinchEnd,
    onDoubleTap,
    threshold = 50,
    velocityThreshold = 0.5,
    doubleTapDelay = 300,
    enabled = true,
  }: UseTouchGesturesOptions
): void {
  const pointers = useRef<Map<number, PointerSnapshot>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const lastTapTime = useRef(0);
  const startSnap = useRef<PointerSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const distance = (a: PointerSnapshot, b: PointerSnapshot) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const center = (a: PointerSnapshot, b: PointerSnapshot) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });

    const handlePointerDown = (e: PointerEvent) => {
      // Only capture touch and pen — leave mouse alone on hybrid devices
      if (e.pointerType === 'mouse') return;
      try { el.setPointerCapture(e.pointerId); } catch {}
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });

      if (pointers.current.size === 1) {
        startSnap.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        // Double-tap detection
        if (onDoubleTap) {
          const now = e.timeStamp;
          if (now - lastTapTime.current < doubleTapDelay) {
            onDoubleTap({ x: e.clientX, y: e.clientY });
            lastTapTime.current = 0;
          } else {
            lastTapTime.current = now;
          }
        }
      } else if (pointers.current.size === 2) {
        // Initialize pinch
        const [a, b] = Array.from(pointers.current.values());
        initialPinchDist.current = distance(a, b);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });

      if (pointers.current.size === 2 && initialPinchDist.current !== null && onPinch) {
        const [a, b] = Array.from(pointers.current.values());
        const dist = distance(a, b);
        const scale = dist / initialPinchDist.current;
        onPinch(scale, center(a, b));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      try { el.releasePointerCapture(e.pointerId); } catch {}
      const wasPinching = pointers.current.size === 2;
      pointers.current.delete(e.pointerId);

      if (wasPinching && pointers.current.size < 2) {
        initialPinchDist.current = null;
        onPinchEnd?.();
      }

      // Swipe detection only on the LAST pointer release
      if (pointers.current.size === 0 && startSnap.current) {
        const dx = e.clientX - startSnap.current.x;
        const dy = e.clientY - startSnap.current.y;
        const dt = Math.max(1, e.timeStamp - startSnap.current.t);
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        const isHorizontal = adx > ady;
        const dist = isHorizontal ? adx : ady;
        const velocity = dist / dt;

        if (dist >= threshold || velocity >= velocityThreshold) {
          if (isHorizontal) {
            if (dx > 0) onSwipeRight?.();
            else onSwipeLeft?.();
          } else {
            if (dy > 0) onSwipeDown?.();
            else onSwipeUp?.();
          }
        }
        startSnap.current = null;
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      try { el.releasePointerCapture(e.pointerId); } catch {}
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) initialPinchDist.current = null;
      if (pointers.current.size === 0) startSnap.current = null;
    };

    el.addEventListener('pointerdown', handlePointerDown, { passive: true });
    el.addEventListener('pointermove', handlePointerMove, { passive: true });
    el.addEventListener('pointerup', handlePointerUp, { passive: true });
    el.addEventListener('pointercancel', handlePointerCancel, { passive: true });

    const currentPointers = pointers.current;
    const currentPinchDist = initialPinchDist;
    const currentStartSnap = startSnap;

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerCancel);
      currentPointers.clear();
      currentPinchDist.current = null;
      currentStartSnap.current = null;
    };
  }, [
    ref, enabled, threshold, velocityThreshold, doubleTapDelay,
    onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight,
    onPinch, onPinchEnd, onDoubleTap,
  ]);
}
