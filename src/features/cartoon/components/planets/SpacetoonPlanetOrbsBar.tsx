import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SpacetoonPlanetId } from '../../types/cartoon.types';
import { SPACETOON_PLANET_ORBS, type SpacetoonPlanetConfig } from './spacetoonPlanetTextures';
import { CelestialPlanetOrb } from './CelestialPlanetOrb';
import './spacetoon-planet-orbs.css';

export interface SpacetoonPlanetOrbsBarProps {
  activePlanet: SpacetoonPlanetId;
  onSelectPlanet: (planetId: SpacetoonPlanetId) => void;
  planetCounts?: Partial<Record<SpacetoonPlanetId, number>>;
}

export const SpacetoonPlanetOrbsBar: React.FC<SpacetoonPlanetOrbsBarProps> = ({
  activePlanet,
  onSelectPlanet,
  planetCounts = {},
}) => {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -340 : 340;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleSelect = (planet: SpacetoonPlanetConfig) => {
    onSelectPlanet(planet.id);
  };

  return (
    <section
      className="st-orbs-stage-wrapper relative w-full select-none"
      aria-label="كواكب سبيستون ثلاثية الأبعاد"
    >
      {/* Desktop Navigation Arrows */}
      <button
        type="button"
        onClick={() => scrollRail('right')}
        className="st-orbs-nav-btn st-orbs-nav-btn--right hidden md:flex"
        aria-label="السابق"
      >
        <ChevronRight size={20} />
      </button>

      <button
        type="button"
        onClick={() => scrollRail('left')}
        className="st-orbs-nav-btn st-orbs-nav-btn--left hidden md:flex"
        aria-label="التالي"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Horizontal 3D Orbs Rail (Desktop & Mobile Touch Snap) */}
      <div ref={railRef} className="st-orbs-rail no-scrollbar">
        {SPACETOON_PLANET_ORBS.map((planet) => (
          <CelestialPlanetOrb
            key={planet.id}
            planet={planet}
            active={activePlanet === planet.id}
            count={planetCounts[planet.id]}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </section>
  );
};
