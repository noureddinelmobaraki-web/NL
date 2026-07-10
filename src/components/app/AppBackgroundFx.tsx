import React from 'react';

interface AppBackgroundFxProps {
  resolvedTheme: string;
  ambientColor: string | null;
  parallaxRef: React.Ref<HTMLDivElement>;
  heroBgUrl: string;
}

/**
 * Themes whose full-page hero background is drawn purely in CSS/SVG ("coded")
 * instead of loading a hero image:
 *   - midnight (the default "home" theme): animated starry night sky
 *   - light: hand-drawn ocean + islands backdrop
 * All other themes (dark, bit, lite, retro, ...) keep the original image.
 */
const CODED_BG_THEMES = new Set(['midnight', 'light']);

/* Scoped under .nl-cbg-midnight / .nl-cbg-light so nothing leaks into the app.
   Keyframes are namespaced nl-cbg-*. */
const CODED_BG_CSS = `
.nl-cbg { position: fixed; inset: 0; z-index: -2; overflow: hidden; pointer-events: none; }

/* ===== Midnight sky — Uiverse.io by kiranmayee-abbireddy ===== */
.nl-cbg-midnight { background-color: #050505; }
.nl-cbg-midnight .sky-canvas { position: absolute; inset: 0; background: #050505; }
.nl-cbg-midnight .stars { position: absolute; inset: 0; background-repeat: repeat; }
.nl-cbg-midnight .stars-1 {
  background-image:
    radial-gradient(1px 1px at 10% 10%, #fff, transparent),
    radial-gradient(1px 1px at 30% 20%, #fff, transparent),
    radial-gradient(1px 1px at 50% 50%, #fff, transparent),
    radial-gradient(1px 1px at 70% 30%, #fff, transparent),
    radial-gradient(1px 1px at 90% 10%, #fff, transparent);
  background-size: 200px 200px;
  animation: nl-cbg-twinkle 3s ease-in-out infinite;
}
.nl-cbg-midnight .stars-2 {
  background-image:
    radial-gradient(1.5px 1.5px at 20% 40%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 60% 85%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 85% 65%, #fff, transparent);
  background-size: 300px 300px;
  animation: nl-cbg-twinkle 5s ease-in-out infinite 1s;
}
.nl-cbg-midnight .stars-3 {
  background-image:
    radial-gradient(2px 2px at 40% 70%, #fff, transparent),
    radial-gradient(2px 2px at 10% 80%, #fff, transparent),
    radial-gradient(2px 2px at 80% 40%, #fff, transparent);
  background-size: 400px 400px;
  animation: nl-cbg-twinkle 7s ease-in-out infinite 2s;
}
.nl-cbg-midnight .meteor {
  position: absolute; width: 2px; height: 2px; background: #fff; border-radius: 50%;
  box-shadow: 0 0 10px 2px rgba(255,255,255,0.5); opacity: 0;
}
.nl-cbg-midnight .meteor::after {
  content: ""; position: absolute; top: 50%; transform: translateY(-50%);
  width: 80px; height: 1px; background: linear-gradient(90deg, #fff, transparent);
}
.nl-cbg-midnight .m1 { top: 10%; left: 110%; animation: nl-cbg-shoot 8s linear infinite; }
.nl-cbg-midnight .m2 { top: 30%; left: 110%; animation: nl-cbg-shoot 12s linear infinite 4s; }
.nl-cbg-midnight .m3 { top: 50%; left: 110%; animation: nl-cbg-shoot 10s linear infinite 2s; }
.nl-cbg-midnight .moon {
  position: absolute; top: 15%; right: 15%; width: 80px; height: 80px; border-radius: 50%;
  background: transparent; box-shadow: 15px 15px 0 0 #fdfbd3;
  filter: drop-shadow(0 0 15px rgba(253,251,211,0.4)); z-index: 10;
}
@keyframes nl-cbg-twinkle { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
@keyframes nl-cbg-shoot {
  0% { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 0; }
  5% { opacity: 1; }
  15% { transform: translateX(-1500px) translateY(1000px) rotate(-35deg); opacity: 0; }
  100% { transform: translateX(-1500px) translateY(1000px) rotate(-35deg); opacity: 0; }
}

/* ===== Light ocean + islands — Uiverse.io by AatreyuShau ===== */
.nl-cbg-light .ocean-backdrop {
  --ocean-deep: #0b3a57; --ocean: #0f4e72;
  position: absolute; inset: 0;
  background: linear-gradient(180deg, var(--ocean) 75%, var(--ocean-deep) 100%);
  background-repeat: no-repeat;
}
.nl-cbg-light .island-backdrop {
  filter: url(#handDrawnNoise);
  --ocean-deep: #194f71; --ocean: #216a94; --shallow: #3ec8cfb1; --foam: #ffffffa3;
  --sand: #f6e7b4; --dune: #ecd899; --land: #93c66b; --land-dark: #79ab4f;
  position: absolute; inset: 0;
  background-image:
    radial-gradient(ellipse 8vmin 10vmin at 20% 25%, var(--land-dark) 0 70%, transparent 71%),
    radial-gradient(ellipse 16vmin 12vmin at 20% 25%, var(--land) 0 70%, transparent 71%),
    radial-gradient(ellipse 18vmin 14vmin at 20% 25%, var(--dune) 0 70%, transparent 71%),
    radial-gradient(ellipse 20vmin 16vmin at 20% 25%, var(--sand) 0 70%, transparent 71%),
    radial-gradient(ellipse 22vmin 18vmin at 20% 25%, var(--foam) 0 70%, transparent 71%),
    radial-gradient(ellipse 24vmin 20vmin at 20% 25%, var(--shallow) 0 70%, transparent 71%),
    radial-gradient(ellipse 6vmin 11vmin at 75% 30%, var(--land-dark) 0 70%, transparent 71%),
    radial-gradient(ellipse 17vmin 13vmin at 75% 30%, var(--land) 0 70%, transparent 71%),
    radial-gradient(ellipse 19vmin 15vmin at 75% 30%, var(--dune) 0 70%, transparent 71%),
    radial-gradient(ellipse 21vmin 17vmin at 75% 30%, var(--sand) 0 70%, transparent 71%),
    radial-gradient(ellipse 23vmin 19vmin at 75% 30%, var(--foam) 0 70%, transparent 71%),
    radial-gradient(ellipse 25vmin 21vmin at 75% 30%, var(--shallow) 0 70%, transparent 71%),
    radial-gradient(ellipse 6vmin 10vmin at 50% 75%, var(--land-dark) 0 70%, transparent 71%),
    radial-gradient(ellipse 15vmin 12vmin at 50% 75%, var(--land) 0 70%, transparent 71%),
    radial-gradient(ellipse 17vmin 14vmin at 50% 75%, var(--dune) 0 70%, transparent 71%),
    radial-gradient(ellipse 19vmin 16vmin at 50% 75%, var(--sand) 0 70%, transparent 71%),
    radial-gradient(ellipse 21vmin 18vmin at 50% 75%, var(--foam) 0 70%, transparent 71%),
    radial-gradient(ellipse 23vmin 20vmin at 50% 75%, var(--shallow) 0 70%, transparent 71%),
    linear-gradient(180deg, var(--ocean) 0%, var(--ocean-deep) 80%);
  background-repeat: repeat;
}

@media (prefers-reduced-motion: reduce) {
  .nl-cbg-midnight .stars,
  .nl-cbg-midnight .meteor { animation: none !important; }
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
  const darkVignetteStyle: React.CSSProperties = {
    background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)',
    contain: 'strict',
    willChange: 'opacity',
  };
  const scanLineStyle: React.CSSProperties = {
    background: 'rgba(184,255,63,0.1)',
    animation: 'scan-line 7s linear infinite',
    boxShadow: '0 0 8px rgba(184,255,63,0.3)',
  };
  const liteFillStyle: React.CSSProperties = { backgroundColor: '#000000' };

  const parallaxStyle: React.CSSProperties = {
    backgroundImage:
      resolvedTheme === 'lite' || usesCodedBg ? 'none' : `url('${heroBgUrl}')`,
    backgroundColor: resolvedTheme === 'lite' ? '#000000' : undefined,
  };

  const ambientStyle: React.CSSProperties = {
    backgroundImage: ambientColor
      ? `radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0), linear-gradient(to bottom, ${ambientColor}18 0%, var(--hero-overlay) 40%)`
      : 'radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0)',
    backgroundColor: ambientColor ? undefined : 'var(--hero-overlay)',
    backgroundSize: ambientColor ? '40px 40px, auto' : '40px 40px',
    transition: 'background-color 1.5s ease, background-image 1.5s ease',
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

      {resolvedTheme === 'lite' && (
        <div className="fixed inset-0 z-[-1] pointer-events-none" style={liteFillStyle} />
      )}

      {/* Coded (CSS/SVG) full-page backgrounds that replace the hero image */}
      {usesCodedBg && <style>{CODED_BG_CSS}</style>}
      {resolvedTheme === 'midnight' && (
        <div className="nl-cbg nl-cbg-midnight" aria-hidden="true">
          <div className="sky-canvas">
            <div className="stars stars-1" />
            <div className="stars stars-2" />
            <div className="stars stars-3" />
            <div className="meteor m1" />
            <div className="meteor m2" />
            <div className="meteor m3" />
            <div className="moon" />
          </div>
        </div>
      )}
      {resolvedTheme === 'light' && (
        <div className="nl-cbg nl-cbg-light" aria-hidden="true">
          <div className="ocean-backdrop">
            <div className="island-backdrop" />
          </div>
          <svg height="0" width="0">
            <filter id="handDrawnNoise">
              <feTurbulence result="noise" numOctaves="5" baseFrequency="0.0065" type="fractalNoise" />
              <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale="900" in2="noise" in="SourceGraphic" />
            </filter>
          </svg>
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
