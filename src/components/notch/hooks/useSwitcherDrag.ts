import { useCallback, useRef, useState } from 'react';

const KEY = 'nl:notch:pos';
type Pos = { x: number; y: number };

export function clampOffset(
  base: { left: number; right: number; top: number; bottom: number },
  dx: number, dy: number, vw: number, vh: number, margin = 8,
): Pos {
  let nx = dx, ny = dy;
  if (base.left + nx < margin) nx += margin - (base.left + nx);
  if (base.right + nx > vw - margin) nx -= base.right + nx - (vw - margin);
  if (base.top + ny < margin) ny += margin - (base.top + ny);
  if (base.bottom + ny > vh - margin) ny -= base.bottom + ny - (vh - margin);
  return { x: nx, y: ny };
}

function readSaved(): Pos {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return { x: 0, y: 0 };
    const p = JSON.parse(s);
    const isDesk = window.innerWidth >= 1024;
    if (p.device === (isDesk ? 'desktop' : 'mobile')) return { x: p.x, y: p.y };
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

export function useSwitcherDrag(opts: { disabled: boolean; surfaceRef: React.RefObject<HTMLElement | null> }) {
  const { disabled, surfaceRef } = opts;
  const [offset, setOffset] = useState<Pos>(readSaved);
  const [dragging, setDragging] = useState(false);
  const activeRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<Pos>({ x: 0, y: 0 });
  const baseRef = useRef<Pos>({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activeRef.current = true; movedRef.current = false; setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY };
    baseRef.current = { ...offset };
  }, [disabled, offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 6) movedRef.current = true;
    if (movedRef.current) setOffset({ x: baseRef.current.x + dx, y: baseRef.current.y + dy });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!activeRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    activeRef.current = false; setDragging(false);
    if (!movedRef.current) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const isDesk = vw >= 1024;
    const rect = surfaceRef.current?.getBoundingClientRect();
    let final = offset;
    if (rect) {
      if (isDesk) {
        final = clampOffset(
          { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          offset.x, offset.y, vw, vh,
        );
      } else {
        // التصاق بأقرب حافّة أفقيّة على الهاتف
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const m = 16;
        final = {
          x: cx < vw / 2 ? -(vw - rect.width - m * 2) : 0,
          y: cy < vh / 2 ? -(vh - rect.height - m * 2) : 0,
        };
      }
    }
    setOffset(final);
    try { localStorage.setItem(KEY, JSON.stringify({ ...final, device: isDesk ? 'desktop' : 'mobile' })); } catch { /* ignore */ }
  }, [offset, surfaceRef]);

  return { offset, dragging, movedRef, onPointerDown, onPointerMove, onPointerUp };
}
