import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'nl:notch:pos:v2';
export type Pos = { x: number; y: number };

const OBSTACLE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '.nl-top-nav__button',
  '.nl-top-nav--worm',
  '.nl-lattice-node',
  '.nl-lattice-node-label',
  '.song-card',
  '.nl-song-card',
  '.nl-hl-player',
  '#vault-playlist',
  '.me-bit-cta',
  '.nl-lens-cta',
  '.hero-profile-container',
  '.nl-contact-submit',
  '.nl-contact-chip',
  '.nlag-frame',
  '.nlag-tabs',
  '.nlag-close',
  '.nlav-btn',
  '.nlav-counter',
].join(', ');

export function clampOffset(
  base: { left: number; right: number; top: number; bottom: number },
  dx: number,
  dy: number,
  vw: number,
  vh: number,
  margin = 10,
): Pos {
  let nx = dx;
  let ny = dy;
  if (base.left + nx < margin) nx += margin - (base.left + nx);
  if (base.right + nx > vw - margin) nx -= base.right + nx - (vw - margin);
  if (base.top + ny < margin) ny += margin - (base.top + ny);
  if (base.bottom + ny > vh - margin) ny -= base.bottom + ny - (vh - margin);
  return { x: Math.round(nx), y: Math.round(ny) };
}

/**
 * Generates candidate positions along all 4 edges (top, right, bottom, left)
 * of the current viewport, expressed as (x, y) offsets from the default
 * top-center anchor (vw / 2, topInset).
 */
function buildPerimeterSlots(vw: number, vh: number, bw: number, bh: number): Pos[] {
  const margin = vw < 640 ? 10 : 16;
  const topAnchorY = 14;
  const halfW = Math.max(24, bw / 2);

  const minCenterX = margin + halfW;
  const maxCenterX = Math.max(minCenterX, vw - margin - halfW);
  const topY = margin;
  const bottomY = Math.max(topY + bh, vh - margin - bh);

  const toOffset = (centerX: number, topEdgeY: number): Pos => ({
    x: Math.round(centerX - vw / 2),
    y: Math.round(topEdgeY - topAnchorY),
  });

  const slots: Pos[] = [
    // Top edge (center, right-ish, left-ish, corners)
    toOffset(vw * 0.5, topY),
    toOffset(vw * 0.78, topY),
    toOffset(vw * 0.22, topY),
    toOffset(maxCenterX, topY),
    toOffset(minCenterX, topY),
    // Right edge (upper, upper-mid, mid, lower-mid, lower)
    toOffset(maxCenterX, vh * 0.18),
    toOffset(maxCenterX, vh * 0.34),
    toOffset(maxCenterX, vh * 0.52),
    toOffset(maxCenterX, vh * 0.68),
    toOffset(maxCenterX, vh * 0.82),
    // Left edge (upper, upper-mid, mid, lower-mid, lower)
    toOffset(minCenterX, vh * 0.18),
    toOffset(minCenterX, vh * 0.34),
    toOffset(minCenterX, vh * 0.52),
    toOffset(minCenterX, vh * 0.68),
    toOffset(minCenterX, vh * 0.82),
    // Bottom edge (corners & quarter points)
    toOffset(maxCenterX, bottomY),
    toOffset(minCenterX, bottomY),
    toOffset(vw * 0.72, bottomY),
    toOffset(vw * 0.28, bottomY),
  ];

  return slots;
}

/**
 * Snaps an arbitrary (x, y) offset to the closest point on the viewport's
 * 4-edge perimeter frame so manual drags always dock cleanly on the screen border.
 */
function snapToPerimeterFrame(
  rawOffset: Pos,
  vw: number,
  vh: number,
  bw: number,
  bh: number,
): Pos {
  const margin = vw < 640 ? 10 : 16;
  const topAnchorY = 14;
  const halfW = Math.max(24, bw / 2);

  const minCX = margin + halfW;
  const maxCX = Math.max(minCX, vw - margin - halfW);
  const minTY = margin;
  const maxTY = Math.max(minTY, vh - margin - bh);

  const cx = Math.min(maxCX, Math.max(minCX, vw / 2 + rawOffset.x));
  const ty = Math.min(maxTY, Math.max(minTY, topAnchorY + rawOffset.y));

  const dTop = Math.abs(ty - minTY);
  const dBottom = Math.abs(maxTY - ty);
  const dLeft = Math.abs(cx - minCX);
  const dRight = Math.abs(maxCX - cx);
  const minDist = Math.min(dTop, dBottom, dLeft, dRight);

  let snappedCX = cx;
  let snappedTY = ty;
  if (minDist === dTop) snappedTY = minTY;
  else if (minDist === dBottom) snappedTY = maxTY;
  else if (minDist === dLeft) snappedCX = minCX;
  else snappedCX = maxCX;

  return {
    x: Math.round(snappedCX - vw / 2),
    y: Math.round(snappedTY - topAnchorY),
  };
}

/**
 * Checks whether a candidate bounding box on screen overlaps any interactive UI obstacle.
 */
function hasObstacleAtBox(
  left: number,
  top: number,
  width: number,
  height: number,
  notchEl: HTMLElement,
): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 4;
  const samplePoints: Array<[number, number]> = [
    [left + width * 0.5, top + height * 0.5],
    [left + pad, top + pad],
    [left + width - pad, top + pad],
    [left + pad, top + height - pad],
    [left + width - pad, top + height - pad],
  ];

  for (const [px, py] of samplePoints) {
    if (px < 2 || px > vw - 2 || py < 2 || py > vh - 2) continue;
    const stack = document.elementsFromPoint(px, py);
    for (const el of stack) {
      if (!(el instanceof HTMLElement)) continue;
      if (notchEl.contains(el) || el.closest('.notch-anchor')) continue;
      if (el === document.body || el === document.documentElement) continue;
      const hit = el.closest(OBSTACLE_SELECTOR);
      if (hit && !notchEl.contains(hit)) {
        return true;
      }
    }
  }
  return false;
}

function readSaved(): Pos {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return { x: 0, y: 0 };
    const p = JSON.parse(s);
    if (typeof p?.x === 'number' && typeof p?.y === 'number') {
      return snapToPerimeterFrame({ x: p.x, y: p.y }, window.innerWidth, window.innerHeight, 52, 46);
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 };
}

export function useSwitcherDrag(opts: {
  disabled: boolean;
  surfaceRef: React.RefObject<HTMLElement | null>;
}) {
  const { disabled, surfaceRef } = opts;
  const [offset, setOffset] = useState<Pos>(readSaved);
  const [dragging, setDragging] = useState(false);
  const [autoDodging, setAutoDodging] = useState(false);
  const activeRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<Pos>({ x: 0, y: 0 });
  const baseRef = useRef<Pos>({ x: 0, y: 0 });
  const offsetRef = useRef<Pos>(offset);
  offsetRef.current = offset;

  // Smart obstacle detection & perimeter auto-dodge
  const checkAndDodge = useCallback(() => {
    if (disabled || activeRef.current) return;
    const el = surfaceRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const bw = Math.max(44, rect.width);
    const bh = Math.max(44, rect.height);

    // Ensure current offset is within viewport bounds on resize
    const current = offsetRef.current;
    const clampedCurrent = snapToPerimeterFrame(current, vw, vh, bw, bh);

    const topAnchorY = 14;
    const curLeft = vw / 2 + clampedCurrent.x - bw / 2;
    const curTop = topAnchorY + clampedCurrent.y;

    const isBlocked = hasObstacleAtBox(curLeft, curTop, bw, bh, el);
    if (!isBlocked) {
      if (clampedCurrent.x !== current.x || clampedCurrent.y !== current.y) {
        setOffset(clampedCurrent);
      }
      return;
    }

    // Current position covers an interactive button/element! Find nearest clear perimeter slot
    const candidates = buildPerimeterSlots(vw, vh, bw, bh);
    candidates.sort((a, b) => {
      const da = Math.hypot(a.x - clampedCurrent.x, a.y - clampedCurrent.y);
      const db = Math.hypot(b.x - clampedCurrent.x, b.y - clampedCurrent.y);
      return da - db;
    });

    for (const slot of candidates) {
      const sLeft = vw / 2 + slot.x - bw / 2;
      const sTop = topAnchorY + slot.y;
      if (!hasObstacleAtBox(sLeft, sTop, bw, bh, el)) {
        if (Math.hypot(slot.x - current.x, slot.y - current.y) > 8) {
          setAutoDodging(true);
          setOffset(slot);
          window.setTimeout(() => setAutoDodging(false), 520);
        }
        return;
      }
    }
  }, [disabled, surfaceRef]);

  // When panel opens, clamp offset so the expanded panel (330x340) never clips off-screen
  useEffect(() => {
    if (!disabled) return; // disabled === true means `open === true`
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(vw * 0.92, 340);
    const panelH = 340;
    const margin = 12;
    const topAnchorY = 14;
    const cur = offsetRef.current;

    const minX = margin + panelW / 2 - vw / 2;
    const maxX = vw - margin - panelW / 2 - vw / 2;
    const minY = margin - topAnchorY;
    const maxY = Math.max(minY, vh - margin - panelH - topAnchorY);

    const safeX = Math.round(Math.min(maxX, Math.max(minX, cur.x)));
    const safeY = Math.round(Math.min(maxY, Math.max(minY, cur.y)));
    if (safeX !== cur.x || safeY !== cur.y) {
      setOffset({ x: safeX, y: safeY });
    }
  }, [disabled]);

  useEffect(() => {
    let rafId = 0;
    let timerId = 0;
    const scheduleCheck = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        rafId = requestAnimationFrame(checkAndDodge);
      }, 90);
    };

    scheduleCheck();
    window.addEventListener('scroll', scheduleCheck, { passive: true, capture: true });
    window.addEventListener('resize', scheduleCheck, { passive: true });
    const intervalId = window.setInterval(scheduleCheck, 1400);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
      window.clearInterval(intervalId);
      window.removeEventListener('scroll', scheduleCheck, true);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [checkAndDodge]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      activeRef.current = true;
      movedRef.current = false;
      setDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY };
      baseRef.current = { ...offsetRef.current };
    },
    [disabled],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 6) movedRef.current = true;
    if (movedRef.current) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 10;
      const nextX = Math.max(-vw / 2 + 28, Math.min(vw / 2 - 28, baseRef.current.x + dx));
      const nextY = Math.max(-8, Math.min(vh - 64 - margin, baseRef.current.y + dy));
      setOffset({ x: Math.round(nextX), y: Math.round(nextY) });
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      activeRef.current = false;
      setDragging(false);
      if (!movedRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = surfaceRef.current?.getBoundingClientRect();
      const bw = rect ? rect.width : 48;
      const bh = rect ? rect.height : 46;

      const final = snapToPerimeterFrame(offsetRef.current, vw, vh, bw, bh);
      setOffset(final);
      try {
        localStorage.setItem(KEY, JSON.stringify(final));
      } catch {
        /* ignore */
      }
      window.setTimeout(checkAndDodge, 180);
    },
    [checkAndDodge, surfaceRef],
  );

  return {
    offset,
    dragging,
    autoDodging,
    movedRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

