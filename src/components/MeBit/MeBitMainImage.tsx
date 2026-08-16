import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveImage } from '../ResponsiveImage';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface MeBitMainImageProps {
  imageUrl: string;
  selectedIndex: number;
  totalImages: number;
  isMobile: boolean;
  isTablet: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSwipeStart: (e: React.TouchEvent) => void;
  onSwipeEnd: (e: React.TouchEvent) => void;
}

export const MeBitMainImage = ({
  imageUrl,
  selectedIndex,
  totalImages,
  isMobile,
  isTablet,
  onClose: _onClose,
  onNext,
  onPrev,
  onSwipeStart,
  onSwipeEnd,
}: MeBitMainImageProps) => {
  const resolvedTheme = useResolvedTheme();

  // MOBILE-ONLY: Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchEnd = useRef(0);
  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);
  const lastPanPoint = useRef<{x: number, y: number} | null>(null);

  // Reset scale when image changes
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [selectedIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile || isTablet) {
      if (e.touches.length === 2) {
        setIsPinching(true);
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchDistance.current = dist;
        initialScale.current = scale;
        lastPanPoint.current = null;
      } else if (e.touches.length === 1 && scale > 1) {
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 1 && scale === 1) {
        onSwipeStart(e);
      }
    } else {
      onSwipeStart(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isMobile || isTablet) {
      if (e.touches.length === 2 && initialPinchDistance.current !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newScale = Math.min(Math.max(1, initialScale.current * (dist / initialPinchDistance.current)), 4);
        setScale(newScale);
        if (newScale === 1) setPan({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && scale > 1 && lastPanPoint.current) {
        const dx = e.touches[0].clientX - lastPanPoint.current.x;
        const dy = e.touches[0].clientY - lastPanPoint.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  };

  const handleTouchEndLocal = (e: React.TouchEvent) => {
    if (isMobile || isTablet) {
      const now = Date.now();

      setIsPinching(false);
      initialPinchDistance.current = null;
      lastPanPoint.current = null;
      
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        if (now - lastTouchEnd.current < 300) {
          // Double tap
          if (scale > 1) {
            setScale(1);
            setPan({ x: 0, y: 0 });
          } else {
            setScale(2.5);
          }
          lastTouchEnd.current = 0;
        } else {
          lastTouchEnd.current = now;
          if (scale === 1) {
            onSwipeEnd(e);
          }
        }
      }
    } else {
      onSwipeEnd(e);
    }
  };

  return (
    <div
      className={`flex-1 ${(isMobile || isTablet) ? 'order-1 rounded-none w-full' : 'rounded-3xl glass-morphism'} 
        relative flex items-center justify-center overflow-hidden shadow-inner group`}
      style={{
        background: resolvedTheme === 'light' ? 'white' : 'black',
        touchAction: scale > 1 ? 'none' : 'auto',
        height: (isMobile || isTablet) ? '75dvh' : '100%'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndLocal}
    >
      {/* MOBILE-ONLY Indicator */}
      {(isMobile || isTablet) && (
        <div 
          className="absolute top-4 right-4 z-50 rounded-full text-[var(--text-inverse)] transition-opacity"
          style={{
            backdropFilter: 'blur(8px)',
            background: 'rgba(0,0,0,0.5)',
            padding: '6px 12px',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.75rem',
            opacity: scale > 1 ? 0 : 1 // Hide when zooming to keep it clean
          }}
        >
          {selectedIndex + 1} / {totalImages}
        </div>
      )}

      {imageUrl ? (
        <AnimatePresence mode="wait">
          <m.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`flex items-center justify-center
              ${(isMobile || isTablet) ? 'w-[100dvw] h-[100dvh] p-0' : 'w-full h-full p-4 sm:p-8 cursor-zoom-in'}`}
          >
            <m.div
              style={{
                x: pan.x,
                y: pan.y,
                scale: scale,
              }}
              animate={{
                x: scale === 1 ? 0 : pan.x,
                y: scale === 1 ? 0 : pan.y,
                scale: scale
              }}
              transition={{
                duration: isPinching ? 0 : 0.2, // Instantly follow finger when pinching, animate on double tap or reset
                ease: "easeOut"
              }}
              className="w-full h-full flex items-center justify-center"
            >
              <ResponsiveImage
                src={imageUrl}
                alt="Selected Shot"
                className={`object-contain transition-transform duration-700
                  ${(isMobile || isTablet) ? 'w-full h-full' : 'w-full h-full rounded-sm hover:scale-110'}`}
                loading="lazy"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              />
            </m.div>

            {/* Desktop nav arrows */}
            {!isMobile && !isTablet && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none z-10">
                <button
                  onClick={e => { e.stopPropagation(); onPrev(); }}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-10 h-10" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onNext(); }}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-10 h-10" />
                </button>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      ) : (
        <div className="text-zinc-600 font-manga text-3xl animate-pulse tracking-widest">
          SELECT A MOMENT
        </div>
      )}
    </div>
  );
};
