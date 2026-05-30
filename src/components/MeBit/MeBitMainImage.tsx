import type React from 'react';
import { motion } from 'framer-motion';
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

  return (
    <div
      className={`flex-1 ${(isMobile || isTablet) ? 'order-1' : ''} 
        glass-morphism rounded-3xl relative flex items-center justify-center overflow-hidden shadow-inner group`}
      style={{
        background: resolvedTheme === 'light' ? 'white' : 'black'
      }}
      onTouchStart={onSwipeStart}
      onTouchEnd={onSwipeEnd}
    >
      {isMobile && (
        <div className="absolute top-4 right-4 z-50 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[var(--text-primary)] text-xs font-mono border border-white/10">
          {selectedIndex + 1} / {totalImages}
        </div>
      )}

      {imageUrl ? (
        <motion.div
          key={selectedIndex}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`w-full h-full flex items-center justify-center cursor-zoom-in
            ${(isMobile || isTablet) ? 'p-0' : 'p-4 sm:p-8'}`}
        >
          <ResponsiveImage
            src={imageUrl}
            alt="Selected Shot"
            className="w-full h-full object-contain rounded-sm transition-transform duration-700 hover:scale-110"
            loading="lazy"
          />

          {/* Desktop nav arrows */}
          {!isMobile && !isTablet && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
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
        </motion.div>
      ) : (
        <div className="text-zinc-600 font-manga text-3xl animate-pulse tracking-widest">
          SELECT A MOMENT
        </div>
      )}
    </div>
  );
};
