import React from 'react';

/**
 * Animated Waveform indicator for the active song
 */
export const Waveform = ({ isPlaying }: { isPlaying: boolean }) => (
  <div className="waveform" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '16px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{
        width: '3px',
        background: '#a78bfa',
        borderRadius: '1px',
        animation: `wave 0.8s ease-in-out infinite`,
        animationDelay: `calc(${i} * 0.1s)`,
        animationPlayState: isPlaying ? 'running' : 'paused',
      } as React.CSSProperties} />
    ))}
  </div>
);
