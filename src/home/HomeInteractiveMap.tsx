// src/home/HomeInteractiveMap.tsx
import { memo, type ReactNode, useRef, useCallback, useState } from 'react';
import { Station } from './Station';
import { HomeCords } from './HomeCords';
import { CORD_LINKS, CORD_NODES } from './cords.config';
import type { StationWeight } from './StationWindow';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';
import { useHomeMotionMode } from './motion/useHomeMotionMode';
import { useA777StationPhysics } from './motion/useA777StationPhysics';
import { HomeMotionToggle } from './HomeMotionToggle';
import { useA777PerformanceGuard } from './motion/useA777PerformanceGuard';

export interface HomeStationInput {
  id: string;
  node: ReactNode;
  bare?: boolean;
}

interface HomeInteractiveMapProps {
  stations: HomeStationInput[];
}

const TITLES: Record<string, string> = {
  profile: 'profile',
  bio: 'bio',
  streaming: 'streaming',
  social: 'social',
  highlights: 'highlights',
  gallery: 'gallery',
  songs: 'songs',
  contact: 'contact',
  drawings: 'drawings',
};

const WEIGHTS: Record<string, StationWeight> = {
  profile: 'sm',
  bio: 'lg',
  streaming: 'lg',
  social: 'md',
  highlights: 'md',
  gallery: 'lg',
  songs: 'lg',
  contact: 'md',
  drawings: 'lg',
};

export const HomeInteractiveMap = memo(function HomeInteractiveMap({
  stations,
}: HomeInteractiveMapProps) {
  const { lightMode } = useAdaptivePerformance();
  const lite = lightMode;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const { effectiveMode, toggleMode, setMode } = useHomeMotionMode();
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const handleAutomaticFallback = useCallback(() => {
    setMode('normal');
    setFallbackNotice('AUTO-RETURNED TO NORMAL: FRAME PRESSURE');
    window.setTimeout(() => setFallbackNotice(null), 6000);
  }, [setMode]);

  const guardState = useA777PerformanceGuard({
    enabled: effectiveMode === 'a777',
    onFallback: handleAutomaticFallback,
  });

  useA777StationPhysics(rootRef, effectiveMode === 'a777');

  const handleToggle = useCallback(() => {
    setFallbackNotice(null);
    toggleMode();
  }, [toggleMode]);

  return (
    <div
      ref={rootRef}
      className="nl-home-map"
      data-lite={lite ? 'true' : 'false'}
      data-motion-mode={effectiveMode}
    >
      <HomeMotionToggle
        mode={effectiveMode}
        guardState={guardState}
        fallbackNotice={fallbackNotice}
        onToggle={handleToggle}
      />
      <div className="nl-home-spine" aria-hidden="true" />
      <HomeCords links={CORD_LINKS} nodes={CORD_NODES} motionMode={effectiveMode} />
      {stations.map((s) => (
        <Station
          key={s.id}
          id={s.id}
          title={TITLES[s.id] ?? s.id}
          weight={WEIGHTS[s.id] ?? 'md'}
          lite={lite}
          bare
          motionMode={effectiveMode}
        >
          {s.node}
        </Station>
      ))}
    </div>
  );
});
