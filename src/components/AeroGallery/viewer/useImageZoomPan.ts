/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * useImageZoomPan — unified zoom / pan / pinch / wheel / double-click engine
 * for the Aero image viewer. Framework-agnostic pointer logic (works with
 * mouse, touch and pen) so both desktop and mobile share ONE code path.
 *
 * Responsibilities:
 *   - pinch-to-zoom (two touch pointers), anchored at the pinch midpoint
 *   - wheel-to-zoom on desktop, anchored at the cursor
 *   - double-click / double-tap zoom-to-point (toggles between 1x and a preset)
 *   - drag-to-pan when zoomed in, clamped so the image never leaves the frame
 *   - swipe left / right to navigate and swipe down to close (only at 1x)
 *
 * The hook owns NO audio and NO DOM chrome; it just reports transform state
 * and fires navigation callbacks. Keep it pure and testable.
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface ZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
  swipeThreshold?: number;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  onSwipeClose?: () => void;
  /** Fired whenever the zoom level changes (used to reveal the zoom bar). */
  onZoomActivity?: () => void;
}

export interface ZoomPanApi {
  scale: number;
  offsetX: number;
  offsetY: number;
  isZoomed: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Set an absolute zoom level anchored at the frame center (zoom bar/knob). */
  setScale: (next: number) => void;
  reset: () => void;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
  };
}

type Mode = "none" | "pan" | "pinch" | "swipe";
type Axis = "h" | "v" | null;

export function useImageZoomPan(options: ZoomPanOptions = {}): ZoomPanApi {
  const {
    minScale = 1,
    maxScale = 4,
    doubleTapScale = 2.5,
    swipeThreshold = 64,
    onSwipeNext,
    onSwipePrev,
    onSwipeClose,
    onZoomActivity,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScaleState] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Synchronous mirrors so gesture math never reads stale React state.
  const s = useRef(1);
  const ox = useRef(0);
  const oy = useRef(0);

  const commit = useCallback((ns: number, nx: number, ny: number) => {
    s.current = ns;
    ox.current = nx;
    oy.current = ny;
    setScaleState(ns);
    setOffsetX(nx);
    setOffsetY(ny);
  }, []);

  const boundsFor = useCallback((sc: number) => {
    const el = containerRef.current;
    if (!el) return { mx: 0, my: 0 };
    const r = el.getBoundingClientRect();
    const mx = Math.max(0, (r.width * sc - r.width) / 2);
    const my = Math.max(0, (r.height * sc - r.height) / 2);
    return { mx, my };
  }, []);

  /** Scale to `next`, keeping the screen point (px,py) visually anchored. */
  const applyScaleAtPoint = useCallback(
    (next: number, px: number, py: number) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const pointX = px - cx;
      const pointY = py - cy;
      const s0 = s.current;
      const ns = clamp(next, minScale, maxScale);
      const ratio = ns / s0;
      let nx = ox.current * ratio + pointX * (1 - ratio);
      let ny = oy.current * ratio + pointY * (1 - ratio);
      const b = boundsFor(ns);
      nx = clamp(nx, -b.mx, b.mx);
      ny = clamp(ny, -b.my, b.my);
      if (ns <= minScale) {
        commit(minScale, 0, 0);
      } else {
        commit(ns, nx, ny);
      }
      onZoomActivity?.();
    },
    [minScale, maxScale, boundsFor, commit, onZoomActivity],
  );

  const setScale = useCallback(
    (next: number) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      applyScaleAtPoint(next, r.left + r.width / 2, r.top + r.height / 2);
    },
    [applyScaleAtPoint],
  );

  const reset = useCallback(() => commit(1, 0, 0), [commit]);

  // ---- pointer bookkeeping --------------------------------------------
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const start = useRef<{ x: number; y: number; ox: number; oy: number; t: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const mode = useRef<Mode>("none");
  const axis = useRef<Axis>(null);
  const lastTap = useRef(0);

  const twoPointerDist = () => {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  const twoPointerMid = () => {
    const pts = Array.from(pointers.current.values());
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as Element;
    if (target.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* ignore capture failures */
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      pinchStart.current = { dist: twoPointerDist(), scale: s.current };
      mode.current = "pinch";
      start.current = null;
      axis.current = null;
      return;
    }
    start.current = { x: e.clientX, y: e.clientY, ox: ox.current, oy: oy.current, t: Date.now() };
    mode.current = s.current > 1 ? "pan" : "none";
    axis.current = null;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode.current === "pinch" && pinchStart.current && pointers.current.size >= 2) {
        const d = twoPointerDist();
        if (pinchStart.current.dist > 0) {
          const m = twoPointerMid();
          applyScaleAtPoint(pinchStart.current.scale * (d / pinchStart.current.dist), m.x, m.y);
        }
        return;
      }

      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;

      if (s.current > 1) {
        const b = boundsFor(s.current);
        mode.current = "pan";
        commit(
          s.current,
          clamp(start.current.ox + dx, -b.mx, b.mx),
          clamp(start.current.oy + dy, -b.my, b.my),
        );
        return;
      }

      if (!axis.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        mode.current = "swipe";
      }
    },
    [applyScaleAtPoint, boundsFor, commit],
  );

  const finishTap = useCallback(
    (e: React.PointerEvent) => {
      // Manual double-tap detection for touch / pen (dblclick is unreliable there).
      if (e.pointerType === "mouse") return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (s.current > 1) reset();
        else applyScaleAtPoint(doubleTapScale, e.clientX, e.clientY);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [applyScaleAtPoint, doubleTapScale, reset],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const startInfo = start.current;
      const currentAxis = axis.current;
      const currentMode = mode.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinchStart.current = null;

      if (pointers.current.size === 0) {
        if (currentMode === "swipe" && startInfo && currentAxis) {
          const dx = e.clientX - startInfo.x;
          const dy = e.clientY - startInfo.y;
          if (currentAxis === "h" && Math.abs(dx) > swipeThreshold) {
            if (dx < 0) onSwipeNext?.();
            else onSwipePrev?.();
          } else if (currentAxis === "v" && dy > swipeThreshold) {
            onSwipeClose?.();
          }
        } else if (currentMode === "none" && startInfo) {
          const moved = Math.hypot(e.clientX - startInfo.x, e.clientY - startInfo.y);
          const quick = Date.now() - startInfo.t < 250;
          if (moved < 10 && quick) finishTap(e);
        }
        mode.current = "none";
        start.current = null;
        axis.current = null;
      }
    },
    [onSwipeNext, onSwipePrev, onSwipeClose, swipeThreshold, finishTap],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      mode.current = "none";
      start.current = null;
      axis.current = null;
    }
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (s.current > 1) reset();
      else applyScaleAtPoint(doubleTapScale, e.clientX, e.clientY);
    },
    [applyScaleAtPoint, doubleTapScale, reset],
  );

  // Wheel zoom must be a non-passive native listener so we can preventDefault
  // and stop the page from scrolling while zooming.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyScaleAtPoint(s.current * factor, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyScaleAtPoint]);

  return {
    scale,
    offsetX,
    offsetY,
    isZoomed: scale > 1,
    containerRef,
    setScale,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick },
  };
}

export default useImageZoomPan;
