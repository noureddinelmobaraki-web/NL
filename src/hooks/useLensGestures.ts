import React, { useRef, useState, useEffect } from 'react';

interface UseLensGesturesParams {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onNavigate: (dir: 1 | -1) => void;
  onClose: () => void;
  isMobile: boolean;
}

interface UseLensGesturesReturn {
  dragY: number;
  zoomScale: number;
  setZoomScale: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  resetZoom: () => void;
  handleDoubleTap: (e: React.PointerEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export function useLensGestures({
  onNavigate,
  onClose,
  isMobile,
  containerRef,
}: UseLensGesturesParams): UseLensGesturesReturn {
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);

  // Pointer tracking
  const pointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);
  const lastPanPoint = useRef<{ x: number, y: number } | null>(null);

  // Single finger tracking (Swipe / Edge / Inertia)
  const startX = useRef(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const startTime = useRef(0);
  const lastPointerDownEdge = useRef<string | null>(null);

  // Double tap
  const lastTapTime = useRef(0);

  // Prevent scroll during horizontal swipe (native touchmove listener)
  useEffect(() => {
    if (!isMobile || !containerRef?.current) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;
      const isHoriz = Math.abs(deltaX) > Math.abs(deltaY) + 10;
      
      if (isHoriz && zoomScale === 1) {
        e.preventDefault();
      }
    };

    const el = containerRef.current;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [isMobile, containerRef, zoomScale]);

  const resetZoom = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleTap = (e: React.PointerEvent) => {
    const now = Date.now();
    const delay = now - lastTapTime.current;
    if (delay < 300) {
      if (zoomScale > 1) {
        resetZoom();
      } else {
        // Zoom to 2x centered on tap point
        setZoomScale(2);
        
        // Calculate pan to center the tap point
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;
        setPan({ x: -offsetX, y: -offsetY });
      }
    }
    lastTapTime.current = now;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // Setup pinch
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchDist.current = dist;
      initialZoom.current = zoomScale;
      lastPanPoint.current = null;
    } else if (pointers.current.size === 1) {
      startX.current = e.clientX;
      startY.current = e.clientY;
      startTime.current = Date.now();
      
      // Edge swipe detection
      if (isMobile) {
        if (e.clientX < 40) lastPointerDownEdge.current = 'left';
        else if (window.innerWidth - e.clientX < 40) lastPointerDownEdge.current = 'right';
        else lastPointerDownEdge.current = null;
      }
      
      if (zoomScale > 1) {
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      }
      handleDoubleTap(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && initialPinchDist.current !== null) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = (dist / initialPinchDist.current) * initialZoom.current;
      setZoomScale(Math.min(Math.max(scale, 1), isMobile ? 3.5 : 3)); 
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (zoomScale > 1 && lastPanPoint.current) {
        const panDx = e.clientX - lastPanPoint.current.x;
        const panDy = e.clientY - lastPanPoint.current.y;
        setPan(p => ({ x: p.x + panDx, y: p.y + panDy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      } else if (isMobile && zoomScale === 1) {
        // Vertical swipe tracking
        if (Math.abs(dy) > Math.abs(dx)) {
          currentY.current = dy;
          setDragY(dy);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      initialPinchDist.current = null;
    }

    if (pointers.current.size === 0) {
      if (zoomScale > 1) {
        lastPanPoint.current = null;
        return;
      }

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      const dt = Date.now() - startTime.current;
      const vX = Math.abs(dx) / (dt || 1);

      if (isMobile) {
        // Vertical swipe DOWN (deltaY > 80px, deltaX < 30px)
        if (dy > 80 && Math.abs(dx) < 30) {
          onClose();
          setDragY(0);
          currentY.current = 0;
          return;
        }
        setDragY(0);
        currentY.current = 0;
      }

      // Edge swipes
      if (isMobile && lastPointerDownEdge.current === 'left' && dx > 30) {
        onNavigate(-1);
        lastPointerDownEdge.current = null;
        return;
      }
      if (isMobile && lastPointerDownEdge.current === 'right' && dx < -30) {
        onNavigate(1);
        lastPointerDownEdge.current = null;
        return;
      }

      // Normal Swipe trigger
      if (Math.abs(dx) > 50 || vX > 0.5) {
        onNavigate(dx > 0 ? -1 : 1);
      }
    }
  };

  return {
    dragY,
    zoomScale,
    setZoomScale,
    pan,
    setPan,
    resetZoom,
    handleDoubleTap,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };
}
