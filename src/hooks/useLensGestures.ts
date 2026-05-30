import React, { useRef, useState } from 'react';

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
  handleDoubleTap: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useLensGestures({
  onNavigate,
  onClose,
  isMobile,
}: UseLensGesturesParams): UseLensGesturesReturn {
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);

  const touchStartX = useRef(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Zoom / Gesture refs
  const lastTapTime = useRef(0);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);

  const resetZoom = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const delay = now - lastTapTime.current;
    if (delay < 300) {
      if (zoomScale > 1) {
        resetZoom();
      } else {
        setZoomScale(2.5);
      }
    }
    lastTapTime.current = now;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDist.current = dist;
      initialZoom.current = zoomScale;
    } else {
      touchStartX.current = e.touches[0].clientX; 
      startY.current = e.touches[0].clientY;
      handleDoubleTap();
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = (dist / initialPinchDist.current) * initialZoom.current;
      setZoomScale(Math.min(Math.max(scale, 1), 4));
    } else if (e.touches.length === 1) {
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - touchStartX.current;
      
      if (zoomScale > 1.05) {
        setPan(p => ({ x: p.x + dx * 0.5, y: p.y + dy * 0.5 }));
        touchStartX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
      } else if (isMobile) {
        if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
          currentY.current = dy;
          setDragY(dy);
        }
      }
    }
  };

  const onTouchEnd = () => {
    initialPinchDist.current = null;
    if (zoomScale > 1.05) {
      return; 
    }

    if (isMobile && currentY.current > 120) {
      onClose();
      currentY.current = 0;
      setDragY(0);
      return;
    }
    if (isMobile) {
      setDragY(0);
      currentY.current = 0;
    }
    
    // Handled in touch ended event with changedTouches in component if needed
  };

  return {
    dragY,
    zoomScale,
    setZoomScale,
    pan,
    setPan,
    resetZoom,
    handleDoubleTap,
    onTouchStart,
    onTouchMove,
    onTouchEnd: (e: React.TouchEvent) => {
      onTouchEnd();
      if (zoomScale > 1.05) return;
      if (e.changedTouches.length === 1) {
        const delta = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) onNavigate(delta > 0 ? 1 : -1);
      }
    },
  };
}
