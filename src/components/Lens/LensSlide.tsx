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

  return (
    <div 
      style={{
        width: '100%', 
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        transform: isActive 
          ? `scale(${zoomScale}) translate(${pan.x / zoomScale}px, ${pan.y / zoomScale}px)`
          : `scale(${scale})`,
        opacity: isActive ? 1 : opacity,
        transition: (isActive && zoomScale === 1 && dragY === 0) ? 'transform 300ms ease, opacity 350ms ease' : 'none'
      }}
    >
      <img
        src={photoUrl}
        alt=""
        style={{
          position: 'relative', 
          zIndex: 2,
          maxWidth: '100%', 
          maxHeight: '100%',
          objectFit: 'contain', 
          display: 'block',
          width: '100%',
          height: '100%',
        }}
        draggable={false}
      />
    </div>
  );
};
