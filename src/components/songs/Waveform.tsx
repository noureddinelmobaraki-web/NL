import React from 'react';
import { useWaveAnimation } from '../../hooks/useWaveAnimation';

/**
 * Animated Waveform indicator. CSS-driven animation; this component only
 * controls `animationPlayState` via useWaveAnimation. When the user prefers
 * reduced motion, bars render at a static mid-height with no animation.
 *
 * Visual output (running case) is byte-identical to the previous version:
 *   • 5 bars, 3px wide, #a78bfa, 0.1s stagger, 0.8s ease-in-out infinite.
 */
export const Waveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const { playState, prefersReducedMotion } = useWaveAnimation({ isActive: isPlaying });

  return (
    <div
      className="waveform"
      style={{
        display: 'flex',
        gap: '3px',
        alignItems: 'flex-end',
        height: '16px',
      }}
      aria-hidden="true"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: '3px',
            background: '#a78bfa',
            borderRadius: '1px',
            animation: prefersReducedMotion ? 'none' : 'wave 0.8s ease-in-out infinite',
            animationDelay: `calc(${i} * 0.1s)`,
            animationPlayState: playState,
            // When reduced-motion is on, bars render at static mid-height.
            height: prefersReducedMotion ? '10px' : undefined,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

