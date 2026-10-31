import React from 'react';

interface AppBackgroundFxProps {
  resolvedTheme: string;
  ambientColor: string | null;
  parallaxRef: React.Ref<HTMLDivElement>;
  heroBgUrl: string;
}

/**
 * Full-page ambient Liquid Glass backdrops aligned with the 7 Prompts:
 *   - midnight (Prompt 3): 3D glassmorphism deep space with vibrant neon cyan, violet & magenta ambient blooms
 *   - light (Prompt 1): Serene pastel pink & mint-green frosted/glossy ambient atmosphere
 *   - dark (Prompt 4): Dramatic deep black canvas with iridescent blue, purple & pink reflections
 *   - bit (Prompt 6): Calming emerald/sage green & warm earthy frosted glass ambient depth
 *   - lite (Prompt 7): Sleek dark monochromatic liquid glass with subtle silver-obsidian highlights
 */
const CODED_BG_THEMES = new Set(['midnight', 'light']);

const CODED_BG_CSS = `
.nl-cbg { position: fixed; inset: 0; z-index: -2; overflow: hidden; pointer-events: none; }

/* ===== Default Home Mode (midnight): Bright Royal Red with Dark Edge Vignette ===== */
.nl-cbg-midnight { background-color: #160206; }
.nl-cbg-midnight .royal-red-canvas {
  position: absolute; inset: 0;
  background:
    radial-gradient(62% 54% at 50% 38%, rgba(239, 35, 60, 0.78) 0%, rgba(217, 4, 41, 0.52) 42%, rgba(120, 6, 26, 0.24) 72%, transparent 100%),
    radial-gradient(48% 42% at 20% 22%, rgba(255, 77, 109, 0.44) 0%, transparent 66%),
    radial-gradient(50% 44% at 82% 28%, rgba(225, 29, 72, 0.42) 0%, transparent 68%),
    radial-gradient(58% 48% at 50% 82%, rgba(190, 18, 60, 0.38) 0%, transparent 70%),
    linear-gradient(180deg, #3b040e 0%, #7a091e 45%, #2b0208 84%, #0f0103 100%);
}
.nl-cbg-midnight .royal-red-vignette {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 78% 72% at 50% 46%, transparent 32%, rgba(28, 2, 7, 0.62) 74%, rgba(8, 0, 2, 0.92) 100%);
  box-shadow: inset 0 0 130px rgba(5, 0, 2, 0.85);
}

/* ===== Prompt 1: Light Theme — Serene Pastel Pink & Mint-Green Ambient Glass ===== */
.nl-cbg-light .ocean-backdrop {
  position: absolute; inset: 0;
  background:
    radial-gradient(62% 52% at 16% 18%, rgba(255, 194, 222, 0.72) 0%, transparent 66%),
    radial-gradient(58% 50% at 84% 24%, rgba(167, 243, 208, 0.68) 0%, transparent 66%),
    radial-gradient(65% 56% at 48% 84%, rgba(253, 226, 243, 0.65) 0%, transparent 70%),
    radial-gradient(52% 44% at 72% 76%, rgba(187, 247, 208, 0.58) 0%, transparent 68%),
    linear-gradient(160deg, #fff5f9 0%, #f2fdf7 48%, #fdf2f8 100%);
}
.nl-cbg-light .island-backdrop {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle 28vmin at 22% 28%, rgba(255, 255, 255, 0.65) 0%, rgba(251, 207, 232, 0.28) 48%, transparent 74%),
    radial-gradient(circle 32vmin at 78% 32%, rgba(255, 255, 255, 0.62) 0%, rgba(167, 243, 208, 0.30) 50%, transparent 75%),
    radial-gradient(circle 30vmin at 52% 76%, rgba(255, 255, 255, 0.58) 0%, rgba(199, 210, 254, 0.24) 52%, transparent 76%);
}
`;

export function AppBackgroundFx({
  resolvedTheme,
  ambientColor,
  parallaxRef,
  heroBgUrl,
}: AppBackgroundFxProps) {
  const usesCodedBg = CODED_BG_THEMES.has(resolvedTheme);

  const svgHiddenStyle: React.CSSProperties = { position: 'absolute' };

  // Prompt 4: Dark theme dramatic lighting against deep black with iridescent blue, purple & pink
  const darkVignetteStyle: React.CSSProperties = {
    background:
      'radial-gradient(55% 45% at 20% 18%, rgba(59, 130, 246, 0.20) 0%, transparent 62%), ' +
      'radial-gradient(52% 44% at 82% 26%, rgba(236, 72, 153, 0.18) 0%, transparent 62%), ' +
      'radial-gradient(60% 50% at 50% 85%, rgba(168, 85, 247, 0.20) 0%, transparent 66%), ' +
      'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(2, 3, 8, 0.86) 100%)',
    contain: 'strict',
    willChange: 'opacity',
  };

  const scanLineStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.22), rgba(168, 85, 247, 0.28), rgba(236, 72, 153, 0.22), transparent)',
    animation: 'scan-line 9s linear infinite',
    boxShadow: '0 0 14px rgba(168, 85, 247, 0.35)',
  };

  // Prompt 6: Bit theme calming green and earthy ambient glow
  const bitAmbientStyle: React.CSSProperties = {
    background:
      'radial-gradient(58% 48% at 18% 20%, rgba(52, 211, 153, 0.20) 0%, transparent 64%), ' +
      'radial-gradient(54% 46% at 82% 76%, rgba(214, 200, 180, 0.16) 0%, transparent 64%), ' +
      'radial-gradient(60% 50% at 50% 50%, rgba(16, 185, 129, 0.10) 0%, rgba(7, 19, 16, 0.88) 100%)',
    contain: 'strict',
  };

  // Prompt 7: Lite theme sleek dark monochromatic liquid glass ambient lighting
  const liteFillStyle: React.CSSProperties = {
    background:
      'radial-gradient(50% 40% at 50% 12%, rgba(255, 255, 255, 0.08) 0%, transparent 65%), ' +
      'linear-gradient(180deg, #090a0f 0%, #040507 100%)',
  };

  const parallaxStyle: React.CSSProperties = {
    backgroundImage:
      resolvedTheme === 'lite' || usesCodedBg ? 'none' : `url('${heroBgUrl}')`,
    backgroundColor: resolvedTheme === 'lite' ? '#050608' : undefined,
  };

  const ambientStyle: React.CSSProperties = {
    backgroundImage: ambientColor
      ? `radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0), linear-gradient(to bottom, ${ambientColor}22 0%, var(--hero-overlay) 45%)`
      : 'radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0)',
    backgroundColor: ambientColor ? undefined : 'var(--hero-overlay)',
    backgroundSize: ambientColor ? '40px 40px, auto' : '40px 40px',
    transition: 'background-color 1.2s ease, background-image 1.2s ease',
    willChange: 'auto',
  };

  return (
    <>
      <svg width="0" height="0" style={svgHiddenStyle}>
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
            style={darkVignetteStyle}
          />
          <div
            className="fixed left-0 right-0 h-px z-[var(--z-bg-effects)] pointer-events-none"
            style={scanLineStyle}
          />
        </>
      )}

      {resolvedTheme === 'bit' && (
        <div
          className="fixed inset-0 z-[var(--z-bg-effects)] pointer-events-none"
          style={bitAmbientStyle}
        />
      )}

      {resolvedTheme === 'lite' && (
        <div className="fixed inset-0 z-[-1] pointer-events-none" style={liteFillStyle} />
      )}

      {usesCodedBg && <style>{CODED_BG_CSS}</style>}
      {resolvedTheme === 'midnight' && (
        <div className="nl-cbg nl-cbg-midnight" aria-hidden="true">
          <div className="royal-red-canvas">
            <div className="royal-red-vignette" />
          </div>
        </div>
      )}
      {resolvedTheme === 'light' && (
        <div className="nl-cbg nl-cbg-light" aria-hidden="true">
          <div className="ocean-backdrop">
            <div className="island-backdrop" />
          </div>
        </div>
      )}

      <div
        ref={parallaxRef}
        className="fixed inset-[-5%] z-[-2] bg-cover bg-center parallax-bg"
        style={parallaxStyle}
      />
      <div className="fixed inset-0 z-[-1] pointer-events-none" style={ambientStyle} />
    </>
  );
}
