import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'nl:notch:pos:v2';
export type Pos = { x: number; y: number };

interface PointerSample {
  t: number;
  x: number;
  y: number;
}

const DECEL = 0.998;
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);

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
 * Generates the 8 canonical perimeter dock slots for Desktop:
 * top-left, top-center, top-right, left-mid, right-mid, bottom-left, bottom-center, bottom-right
 */
function buildDesktopPerimeterSlots(vw: number, vh: number, bw = 48, bh = 48): Pos[] {
  const margin = 16;
  const topAnchorY = 14;
  const halfW = Math.max(24, bw / 2);

  const leftCX = margin + halfW;
  const centerCX = vw / 2;
  const rightCX = Math.max(leftCX, vw - margin - halfW);

  const topY = margin;
  const midY = Math.round(vh * 0.5 - bh / 2);
  const bottomY = Math.max(topY + bh, vh - margin - bh);

  const toOffset = (centerX: number, topEdgeY: number): Pos => ({
    x: Math.round(centerX - vw / 2),
    y: Math.round(topEdgeY - topAnchorY),
  });

  return [
    toOffset(leftCX, topY),     // top-left
    toOffset(centerCX, topY),   // top-center
    toOffset(rightCX, topY),    // top-right
    toOffset(leftCX, midY),     // left-mid
    toOffset(rightCX, midY),    // right-mid
    toOffset(leftCX, bottomY),  // bottom-left
    toOffset(centerCX, bottomY),// bottom-center
    toOffset(rightCX, bottomY), // bottom-right
  ];
}

function snapToDesktopSlot(
  projectedOffset: Pos,
  vw: number,
  vh: number,
  bw = 48,
  bh = 48,
): Pos {
  const slots = buildDesktopPerimeterSlots(vw, vh, bw, bh);
  let best = slots[1]; // top-center default
  let bestDist = Infinity;
  for (const s of slots) {
    const d = Math.hypot(projectedOffset.x - s.x, projectedOffset.y - s.y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function snapToMobileTopEdge(projectedX: number, vw: number, bw = 48): Pos {
  const margin = 12;
  const halfW = Math.max(24, bw / 2);
  const leftX = Math.round(margin + halfW - vw / 2);
  const centerX = 0;
  const rightX = Math.round(vw / 2 - margin - halfW);

  const slots = [leftX, centerX, rightX];
  let best = centerX;
  let bestDist = Infinity;
  for (const s of slots) {
    const d = Math.abs(projectedX - s);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return { x: best, y: 0 };
}

function readSaved(): Pos {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobileViewport = vw < 768;
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return { x: 0, y: 0 };
    const p = JSON.parse(s);
    if (typeof p?.x === 'number' && typeof p?.y === 'number') {
      if (isMobileViewport) {
        return snapToMobileTopEdge(p.x, vw, 48);
      }
      return snapToDesktopSlot({ x: p.x, y: p.y }, vw, vh, 48, 48);
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 };
}

export function useSwitcherDrag(opts: {
  disabled: boolean;
  isMobile?: boolean;
  surfaceRef: React.RefObject<HTMLElement | null>;
}) {
  const { disabled, isMobile = false, surfaceRef } = opts;
  const [offset, setOffset] = useState<Pos>(readSaved);
  const [dragging, setDragging] = useState(false);
  const autoDodging = false;

  const activeRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<Pos>({ x: 0, y: 0 });
  const baseRef = useRef<Pos>({ x: 0, y: 0 });
  const offsetRef = useRef<Pos>(offset);
  offsetRef.current = offset;

  const liveOffsetRef = useRef<Pos>(offset);
  const samplesRef = useRef<PointerSample[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // On mobile, ensure the collapsed bubble always stays at the top of the screen (y = 0)
  useEffect(() => {
    if (!isMobile && window.innerWidth >= 768) return;
    const cur = offsetRef.current;
    const snapped = snapToMobileTopEdge(cur.x, window.innerWidth, 48);
    if (cur.x !== snapped.x || cur.y !== 0) {
      liveOffsetRef.current = snapped;
      setOffset(snapped);
    }
  }, [isMobile]);

  // When panel opens on DESKTOP, clamp offset so the expanded panel (368x520) never clips off-screen.
  useEffect(() => {
    if (!disabled) return; // disabled === true means `open === true`
    if (isMobile || window.innerWidth < 768) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(vw * 0.94, 368);
    const panelH = Math.min(vh * 0.84, 480);
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
      const next = { x: safeX, y: safeY };
      liveOffsetRef.current = next;
      setOffset(next);
    }
  }, [disabled, isMobile]);

  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cur = offsetRef.current;
      if (isMobile || vw < 768) {
        const snapped = snapToMobileTopEdge(cur.x, vw, 48);
        if (cur.x !== snapped.x || cur.y !== 0) {
          liveOffsetRef.current = snapped;
          setOffset(snapped);
        }
      } else {
        const snapped = snapToDesktopSlot(cur, vw, vh, 48, 48);
        if (cur.x !== snapped.x || cur.y !== snapped.y) {
          liveOffsetRef.current = snapped;
          setOffset(snapped);
        }
      }
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isMobile]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      activeRef.current = true;
      movedRef.current = false;
      setDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY };
      baseRef.current = { ...offsetRef.current };
      liveOffsetRef.current = { ...offsetRef.current };
      samplesRef.current = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      const mobileMode = isMobile || window.innerWidth < 768;
      const dist = mobileMode ? Math.abs(dx) : Math.hypot(dx, dy);
      if (!movedRef.current && dist > 6) movedRef.current = true;
      if (!movedRef.current) return;

      const samples = samplesRef.current;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (samples.length > 6) samples.shift();

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 10;
      const nextX = Math.round(
        Math.max(-vw / 2 + 28, Math.min(vw / 2 - 28, baseRef.current.x + dx)),
      );
      const nextY = mobileMode
        ? 0
        : Math.round(Math.max(-8, Math.min(vh - 64 - margin, baseRef.current.y + dy)));

      liveOffsetRef.current = { x: nextX, y: nextY };

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const el = surfaceRef.current;
          if (el) {
            el.style.transform = `translate3d(${liveOffsetRef.current.x}px, ${
              mobileMode ? 0 : liveOffsetRef.current.y
            }px, 0)`;
          }
        });
      }
    },
    [isMobile, surfaceRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      activeRef.current = false;
      setDragging(false);
      if (!movedRef.current) return;

      const samples = samplesRef.current;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (samples.length > 6) samples.shift();

      // Compute release velocity (px/sec) from last 100ms of pointer samples
      let vx = 0;
      let vy = 0;
      const latest = samples[samples.length - 1];
      let anchor = samples[0];
      for (let i = samples.length - 2; i >= 0; i--) {
        if (latest.t - samples[i].t <= 100) {
          anchor = samples[i];
        } else {
          break;
        }
      }
      const dt = latest.t - anchor.t;
      if (dt > 4 && dt <= 160) {
        vx = ((latest.x - anchor.x) / dt) * 1000;
        vy = ((latest.y - anchor.y) / dt) * 1000;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobileMode = isMobile || vw < 768;
      const cur = liveOffsetRef.current;

      const projectedX = cur.x + project(vx);
      const projectedY = cur.y + project(vy);

      const finalPos = mobileMode
        ? snapToMobileTopEdge(projectedX, vw, 48)
        : snapToDesktopSlot({ x: projectedX, y: projectedY }, vw, vh, 48, 48);

      liveOffsetRef.current = finalPos;
      setOffset(finalPos);
      try {
        localStorage.setItem(KEY, JSON.stringify(finalPos));
      } catch {
        /* ignore */
      }
    },
    [isMobile],
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


