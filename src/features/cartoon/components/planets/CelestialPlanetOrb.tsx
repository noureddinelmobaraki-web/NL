import React, { useMemo } from 'react';
import type { SpacetoonPlanetConfig } from './spacetoonPlanetTextures';
import { getProceduralPlanetDataUrl } from './planetTextureGenerator';

export interface CelestialPlanetOrbProps {
  planet: SpacetoonPlanetConfig;
  active: boolean;
  count?: number;
  onSelect: (planet: SpacetoonPlanetConfig) => void;
}

const STAR_CORNERS = [
  'lg-cc-br-1',
  'lg-cc-br-2',
  'lg-cc-br-3',
  'lg-cc-bl',
  'lg-cc-tr',
  'lg-cc-tl-1',
  'lg-cc-tl-2',
] as const;

export const CelestialPlanetOrb: React.FC<CelestialPlanetOrbProps> = ({
  planet,
  active,
  count,
  onSelect,
}) => {
  const fallbackDataUrl = useMemo(() => getProceduralPlanetDataUrl(planet), [planet]);

  return (
    <button
      type="button"
      onClick={() => onSelect(planet)}
      aria-pressed={active}
      className={`st-planet-orb-trigger group ${active ? 'is-active' : ''}`}
      style={
        {
          '--st-corona-color': planet.coronaColor,
          '--st-rot-duration': `${planet.rotationDurationSec}s`,
        } as React.CSSProperties
      }
    >
      {/* Outer Liquid Glass Bubble identical to OrbsStage.tsx (.lg-main-glass) */}
      <div className="st-planet-glass-shell lg-main-glass">
        <div className="lg-main-glass__caustic" />
        <div className="lg-main-glass__rim" />
        <div className="lg-main-glass__sheen" />

        {/* Atmospheric Corona Halo */}
        <div
          className="st-planet-corona"
          style={{
            background: `radial-gradient(circle, ${planet.coronaColor} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Optional Planetary Ring (Zomoroda / Science / Movies / OST) */}
        {planet.ringColor && (
          <div
            className="st-planet-ring"
            style={{
              borderColor: planet.ringColor,
              boxShadow: `0 0 12px ${planet.ringColor}`,
            }}
          />
        )}

        {/* 3D Rotating Textured Celestial Sphere */}
        <div
          className="st-planet-sphere"
          style={{
            backgroundImage: `url("${planet.textureUrl}"), url("${fallbackDataUrl}")`,
            filter: `hue-rotate(${planet.hueRotateDeg}deg) saturate(${planet.saturate}) brightness(${planet.brightness}) contrast(${planet.contrast})`,
            boxShadow: planet.atmosphereGlow,
          }}
        >
          {/* 3D Spherical Specular & Day/Night Terminator Shading */}
          <div className="st-planet-sphere__shading" />
          <div className="st-planet-sphere__clouds" />
        </div>

        {/* 7 Curved Corner Twinkling Stars identical to OrbsStage.tsx */}
        {STAR_CORNERS.map((cls) => (
          <svg
            key={cls}
            className={`lg-curved-corner-star ${cls}`}
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path
              d="M50 0 C53 38 62 47 100 50 C62 53 53 62 50 100 C47 62 38 53 0 50 C38 47 47 38 50 0 Z"
              fill="white"
            />
          </svg>
        ))}

        {/* Item Count Pill */}
        {typeof count === 'number' && count > 0 && (
          <span className="st-planet-count-badge">{count}</span>
        )}
      </div>

      {/* Floating Glass Section Banner below the 3D Orb */}
      <div className="st-planet-banner">
        <span className="st-planet-banner__title">{planet.nameAr}</span>
        <span className="st-planet-banner__sub">{planet.subtitleAr}</span>
      </div>
    </button>
  );
};
