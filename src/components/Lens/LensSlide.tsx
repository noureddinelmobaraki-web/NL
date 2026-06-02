import { useState } from 'react'; // MOBILE-ONLY
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY

export interface LensSlideProps {
  photoUrl: string;
  slotOffset: number; // result of `index - activeIndex`
  zoomScale: number;
  pan: { x: number; y: number };
  dragY: number;
  isActive: boolean;
}

export const getSlotScale = (slotOffset: number): number => {
  const abs = Math.abs(slotOffset);
  if (abs === 0) return 1.0;      // center: full size
  if (abs === 1) return 0.75;     // ±1: 75%
  if (abs === 2) return 0.55;     // ±2: 55%
  return 0.40;                    // ±3+: 40%
};

export const getSlotOpacity = (slotOffset: number): number => {
  const abs = Math.abs(slotOffset);
  if (abs === 0) return 1.0;
  if (abs === 1) return 0.7;
  if (abs === 2) return 0.45;
  return 0.25;
};

export const LensSlide = ({
  photoUrl,
  slotOffset,
  zoomScale,
  pan,
  dragY,
  isActive,
}: LensSlideProps) => {
  const scale = getSlotScale(slotOffset);
  const opacity = getSlotOpacity(slotOffset);
  const { isMobile } = useDeviceType(); // MOBILE-ONLY
  const [isLoaded, setIsLoaded] = useState(false); // MOBILE-ONLY

  return (
    <div 
      style={{
        width: '100%', 
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: isMobile ? '#000' : 'transparent', // MOBILE-ONLY
        transform: isActive 
          ? `scale(${zoomScale}) translate(${pan.x / zoomScale}px, ${pan.y / zoomScale}px)`
          : `scale(${scale})`,
        opacity: isActive ? 1 : opacity,
        transition: (isActive && zoomScale === 1 && dragY === 0) ? 'transform 300ms ease, opacity 350ms ease' : 'none'
      }}
    >
      {/* MOBILE-ONLY */}
      {!isLoaded && isMobile && (
        <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse z-[1]" />
      )}
      <img
        src={photoUrl}
        alt="Gallery slide"
        onLoad={() => setIsLoaded(true)} // MOBILE-ONLY
        style={{
          position: 'relative', 
          zIndex: 2,
          maxWidth: '100%', 
          maxHeight: '100%',
          objectFit: 'contain', 
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: (isMobile && !isLoaded) ? 0 : 1, // MOBILE-ONLY
          transition: 'opacity 300ms ease', // MOBILE-ONLY
          WebkitTouchCallout: 'none',
          userSelect: 'none'
        }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
