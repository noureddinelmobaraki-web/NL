import React from 'react';
import { LIQUID_GLASS_BACKGROUNDS } from '../stages/orbs/useQuadLensWebGL';
import '../stages/orbs/portal.css';

export interface LiquidGlassBooksBackdropProps {
  /**
   * Controls the translucent radial glass tint over the books background photo.
   * Default 0.52 preserves full visibility of the books background artwork.
   */
  dimmerOpacity?: number;
}

export const LiquidGlassBooksBackdrop: React.FC<LiquidGlassBooksBackdropProps> = ({
  dimmerOpacity = 0.52,
}) => {
  return (
    <>
      <picture className="lg-bg-picture pointer-events-none select-none" aria-hidden="true">
        <source
          media={LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery}
          srcSet={LIQUID_GLASS_BACKGROUNDS.phone}
        />
        <img
          src={LIQUID_GLASS_BACKGROUNDS.pc}
          alt=""
          className="lg-bg-img"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </picture>

      <div
        className="fixed inset-0 pointer-events-none select-none z-[1]"
        style={{
          opacity: dimmerOpacity,
          background:
            'radial-gradient(ellipse at 50% 24%, rgba(16, 12, 24, 0.34) 0%, rgba(10, 8, 16, 0.52) 62%, rgba(6, 5, 12, 0.68) 100%)',
          backdropFilter: 'blur(10px) saturate(145%)',
          WebkitBackdropFilter: 'blur(10px) saturate(145%)',
        }}
        aria-hidden="true"
      />
    </>
  );
};
