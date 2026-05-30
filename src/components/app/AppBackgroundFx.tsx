import React from 'react';

interface AppBackgroundFxProps {
  resolvedTheme: string;
  ambientColor: string | null;
  parallaxRef: React.Ref<HTMLDivElement>;
  heroBgUrl: string;
}

export function AppBackgroundFx({
  resolvedTheme,
  ambientColor,
  parallaxRef,
  heroBgUrl,
}: AppBackgroundFxProps) {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
          </filter>
        </defs>
      </svg>

      {resolvedTheme === 'dark' && (
        <>
          <div 
            className="fixed inset-0 z-[var(--z-bg-effects)] pointer-events-none" 
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)'
            }} 
          />
          <div 
            className="fixed left-0 right-0 h-px z-[var(--z-bg-effects)] pointer-events-none"
            style={{
              background: 'rgba(184,255,63,0.1)', 
              animation: 'scan-line 7s linear infinite',
              boxShadow: '0 0 8px rgba(184,255,63,0.3)'
            }} 
          />
        </>
      )}

      {resolvedTheme === 'lite' && (
        <div
          className="fixed inset-0 z-[-1] pointer-events-none"
          style={{ backgroundColor: '#000000' }}
        />
      )}

      <div 
        ref={parallaxRef}
        className="fixed inset-[-5%] z-[-2] bg-cover bg-center parallax-bg"
        style={{ 
          backgroundImage: resolvedTheme === 'lite' ? 'none' : `url('${heroBgUrl}')`,
          backgroundColor: resolvedTheme === 'lite' ? '#000000' : undefined,
        }}
      />
      <div className="fixed inset-0 z-[-1] pointer-events-none" style={{
        background: ambientColor 
          ? `linear-gradient(to bottom, ${ambientColor}18 0%, var(--hero-overlay) 40%)`
          : 'var(--hero-overlay)',
        backgroundImage: 'radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0)',
        backgroundSize: '40px 40px',
        transition: 'background 1.5s ease',
        willChange: 'auto',
      }} />
    </>
  );
}
