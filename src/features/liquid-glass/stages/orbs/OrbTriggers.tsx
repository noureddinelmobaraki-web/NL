/**
 * src/features/liquid-glass/stages/orbs/OrbTriggers.tsx
 *
 * Rotating Earth, Rotating Sun, and 3D Wireframe Sphere Orb triggers.
 */

import React from 'react';

const STAR_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
const MERIDIAN_INDICES = Array.from({ length: 36 }, (_, i) => i + 1);
const LATITUDE_CLASSES = [
  'l300',
  'l290',
  'l280',
  'l270',
  'l260',
  'l235',
  'l30',
  'l90',
  'l80',
  'l70',
  'l60',
  'l35',
] as const;

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const RotatingEarthButton = React.memo(function RotatingEarthButton({
  onActivate,
  hidden,
}: {
  onActivate: () => void;
  hidden: boolean;
}) {
  return (
    <button
      type="button"
      className={`lg-earth-trigger${hidden ? ' lg-earth-trigger--morphed' : ''}`}
      onClick={onActivate}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label="اضغط على كوكب الأرض لبدء عرض الفيديوهات"
    >
      <div className="lg-earth-scale-wrap">
        <div className="lg-section-banner">
          {STAR_IDS.map((n) => (
            <div key={n} className={`lg-star lg-star-${n}`} aria-hidden="true">
              <div className="lg-curved-corner-star">
                <div className="lg-cc-br" />
                <div className="lg-cc-bl" />
              </div>
              <div className="lg-curved-corner-star">
                <div className="lg-cc-tr" />
                <div className="lg-cc-tl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
});

export const RotatingSunButton = React.memo(function RotatingSunButton({
  onActivate,
  hidden,
}: {
  onActivate: () => void;
  hidden: boolean;
}) {
  return (
    <button
      type="button"
      className={`lg-sun-trigger${hidden ? ' lg-sun-trigger--morphed' : ''}`}
      onClick={onActivate}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label="اضغط على مجسم الشمس لفتح الألبومات"
    >
      <div className="lg-sun-scale-wrap">
        <div className="lg-section-banner-sun">
          {STAR_IDS.map((n) => (
            <div key={n} className={`lg-sun-star lg-sun-star-${n}`} aria-hidden="true">
              <div className="lg-curved-corner-star">
                <div className="lg-cc-br" />
                <div className="lg-cc-bl" />
              </div>
              <div className="lg-curved-corner-star">
                <div className="lg-cc-tr" />
                <div className="lg-cc-tl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
});

export const WireframeSphereOrbButton = React.memo(function WireframeSphereOrbButton({
  variant,
  onActivate,
  ariaLabel,
}: {
  variant: 'books' | 'audiobooks';
  onActivate: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className={`lg-wireframe-trigger lg-wireframe-trigger--${variant}`}
      onClick={onActivate}
      aria-label={ariaLabel}
    >
      <div className="lg-wireframe-scale-wrap">
        <div className={`lg-sphere-wrapper lg-sphere-wrapper--${variant}`}>
          <div className="lg-wf-plane lg-wf-equator" />
          <div className="lg-wf-plane lg-wf-prime-meridian" />
          {MERIDIAN_INDICES.map((m) => (
            <div key={m} className={`lg-wf-meridian lg-wf-m${m}`} />
          ))}
          {LATITUDE_CLASSES.map((lat) => (
            <div key={lat} className={`lg-wf-latitude lg-wf-${lat}`} />
          ))}
          <div className="lg-wf-axis" />
          <div className="lg-wf-axis lg-wf-a90" />
        </div>
      </div>
    </button>
  );
});
