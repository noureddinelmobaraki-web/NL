import { useRef, useEffect } from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { ResponsiveImage } from '../ResponsiveImage';
import { useViewportSize } from '../../hooks/useViewportSize';

export interface MeBitThumbnailsProps {
  images: string[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  isMeBitPlaying: boolean;
  onToggleAudio: () => void;
}

export const MeBitThumbnails = ({
  images,
  selectedIndex,
  onSelectIndex,
  isMeBitPlaying: _isMeBitPlaying,
  onToggleAudio: _onToggleAudio,
}: MeBitThumbnailsProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const viewport = useViewportSize();
  const scrollContainerRef = useRef<HTMLDivElement>(null); // MOBILE-ONLY
  const activeThumbRef = useRef<HTMLButtonElement>(null); // MOBILE-ONLY

  // MOBILE-ONLY: Auto-center active thumbnail
  useEffect(() => {
    if ((isMobile || isTablet) && activeThumbRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeThumbRef.current;
      
      const containerWidth = container.offsetWidth;
      const elementWidth = element.offsetWidth;
      const elementLeft = element.offsetLeft;
      
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [selectedIndex, isMobile, isTablet]);

  // Mobile / Tablet vertical sidebar when in landscape mode (short screens)
  if ((isMobile || isTablet) && viewport.isLandscape) {
    return (
      <div 
        ref={scrollContainerRef}
        className="order-2 w-24 flex flex-col items-center gap-2 px-2 py-4 border-l border-white/10 bg-black/50 backdrop-blur-md"
        style={{
          height: '100%',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch', // MOBILE-ONLY
          touchAction: 'pan-y',
          overscrollBehaviorY: 'contain'
        }}
      >
        {images.map((src, idx) => {
          const isActive = selectedIndex === idx;
          return (
            <button
              key={src}
              ref={isActive ? activeThumbRef : null}
              onClick={() => onSelectIndex(idx)}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSelectIndex(idx);
              }}
              className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-300 pointer-events-auto
                ${isActive ? 'border-2 border-white scale-100 opacity-100' : 'border-2 border-transparent opacity-45 scale-[0.92]'}`}
              style={{
                width: '72px',
                height: '96px',
                scrollSnapAlign: 'center' // MOBILE-ONLY
              }}
              aria-label={`View moment ${idx + 1}`}
            >
              <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    );
  }

  // Mobile thumbnail strip
  if (isMobile) {
    return (
      <div 
        ref={scrollContainerRef}
        className="order-2 w-full flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md"
        style={{
          height: '15dvh',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', // MOBILE-ONLY
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain'
        }}
      >
        {images.map((src, idx) => {
          const isActive = selectedIndex === idx;
          return (
            <button
              key={src}
              ref={isActive ? activeThumbRef : null}
              onClick={() => onSelectIndex(idx)}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSelectIndex(idx);
              }}
              className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-300 pointer-events-auto
                ${isActive ? 'border-2 border-white scale-100 opacity-100' : 'border-2 border-transparent opacity-45 scale-[0.92]'}`}
              style={{
                width: '72px',
                height: 'calc(15dvh - 16px)', // Padding compensation
                scrollSnapAlign: 'center' // MOBILE-ONLY
              }}
              aria-label={`View moment ${idx + 1}`}
            >
              <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    );
  }

  // Tablet thumbnail strip
  if (isTablet) {
    return (
      <div 
        ref={scrollContainerRef}
        className="order-2 w-full flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-black/50"
        style={{
          height: '15dvh',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', // MOBILE-ONLY
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain'
        }}
      >
        {images.map((src, idx) => {
          const isActive = selectedIndex === idx;
          return (
            <button
              key={src}
              ref={isActive ? activeThumbRef : null}
              onClick={() => onSelectIndex(idx)}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSelectIndex(idx);
              }}
              className={`relative shrink-0 rounded-xl overflow-hidden transition-all duration-300 pointer-events-auto
                ${isActive ? 'border-2 border-white scale-100 opacity-100' : 'border-2 border-transparent opacity-50 scale-[0.92]'}`}
              style={{
                width: '90px',
                height: 'calc(15dvh - 24px)', // Padding compensation
                scrollSnapAlign: 'center' // MOBILE-ONLY
              }}
              aria-label={`View moment ${idx + 1}`}
            >
              <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="w-full md:w-96 flex flex-col gap-6 glass-morphism p-6 rounded-3xl overflow-hidden shadow-2xl">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col">
          <h3 className="font-manga text-white text-2xl tracking-tight leading-none uppercase">Shot Archive</h3>
          <span className="font-hand text-zinc-400 text-sm mt-1 italic">Moments in time</span>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full text-zinc-100 font-mono text-xs">
          {selectedIndex !== null ? selectedIndex + 1 : 0} / {images.length}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-2 custom-scrollbar pb-4 content-start">
        {images.map((src, idx) => (
          <button
            key={src}
            onClick={() => onSelectIndex(idx)}
            className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 transform
              ${selectedIndex === idx
                ? 'border-white scale-95 shadow-[0_0_20px_white/20] ring-4 ring-white/10'
                : 'border-transparent hover:border-white/30 opacity-40 hover:opacity-100 hover:scale-[1.02]'}`}
            aria-label={`Select archive moment ${idx + 1}`}
          >
            <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
            {selectedIndex === idx && (
              <div className="absolute inset-0 bg-white/10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
