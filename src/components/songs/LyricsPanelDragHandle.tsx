/**
 * LyricsPanelDragHandle — grab pill + drag-to-dismiss surface.
 *
 * Replaces mixed PointerEvent/TouchEvent code (the source of iOS ghost-click
 * bugs). Behaviour:
 *   • PointerEvents ONLY (modern Safari 16+ supports the API fully).
 *   • Velocity-aware dismiss:
 *       distance ≥ 120px            → dismiss
 *       velocity  ≥ 0.6 px/ms       → dismiss (even short flicks)
 *   • Ghost-click prevention:
 *       1) preventDefault on pointerup after a real drag.
 *       2) Capture-phase `click` listener that swallows synthetic clicks
 *          within GHOST_CLICK_SUPPRESS_MS (350ms) of a drag-up.
 *   • setPointerCapture so the drag continues even if the finger leaves
 *     the handle bounds.
 *   • touch-action: none → browser won't fight us for native page scroll.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface LyricsPanelDragHandleProps {
  onDismiss: () => void;
  ariaLabel?: string;
}

const DISMISS_DISTANCE_PX        = 120;
const DISMISS_VELOCITY_PX_PER_MS = 0.6;
const GHOST_CLICK_SUPPRESS_MS    = 350;

export const LyricsPanelDragHandle = ({
  onDismiss,
  ariaLabel = 'اسحب لإغلاق الكلمات',
}: LyricsPanelDragHandleProps) => {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const startT = useRef<number>(0);
  const lastY  = useRef<number>(0);
  const lastT  = useRef<number>(0);
  const pointerId = useRef<number | null>(null);
  const suppressClickUntil = useRef<number>(0);

  // Capture-phase listener that swallows the synthetic click after a drag.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('click', handler, true);
    return () => window.removeEventListener('click', handler, true);
  }, []);

  const reset = useCallback(() => {
    startY.current = null;
    pointerId.current = null;
    setDragY(0);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return; // primary only
    pointerId.current = e.pointerId;
    startY.current = e.clientY;
    startT.current = performance.now();
    lastY.current = e.clientY;
    lastT.current = startT.current;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch { /* detached node */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId || startY.current == null) return;
    const dy = e.clientY - startY.current;
    if (dy < 0) { setDragY(0); return; } // downward only
    lastY.current = e.clientY;
    lastT.current = performance.now();
    setDragY(dy);
  }, []);

  const finish = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, didDrag: boolean) => {
      if (pointerId.current !== e.pointerId) return;
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch { /* noop */ }

      const dy = startY.current != null ? e.clientY - startY.current : 0;
      const dt = Math.max(1, performance.now() - lastT.current);
      // Velocity from the LAST move event — flicks at the end of a slow
      // drag should still dismiss the sheet.
      const dyRecent = e.clientY - lastY.current;
      const velocity = Math.abs(dyRecent) / dt;

      const shouldDismiss =
        dy >= DISMISS_DISTANCE_PX ||
        (dy > 16 && velocity >= DISMISS_VELOCITY_PX_PER_MS);

      if (didDrag) {
        suppressClickUntil.current = performance.now() + GHOST_CLICK_SUPPRESS_MS;
        e.preventDefault();
      }
      reset();
      if (shouldDismiss) onDismiss();
    },
    [onDismiss, reset],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const didDrag =
        startY.current != null && Math.abs(e.clientY - startY.current) > 4;
      finish(e, didDrag);
    },
    [finish],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => finish(e, false),
    [finish],
  );

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 0 6px',
        cursor: 'grab',
        touchAction: 'none',
        // Drag offset is forwarded as CSS var so the parent sheet can
        // translate while the handle stays sized.
        ['--lyrics-drag-y' as any]: `${dragY}px`,
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0
          ? 'transform 220ms cubic-bezier(.2,.8,.2,1)'
          : 'none',
        willChange: dragY === 0 ? 'auto' : 'transform',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '44px',
          height: '5px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.32)',
        }}
      />
    </div>
  );
};
