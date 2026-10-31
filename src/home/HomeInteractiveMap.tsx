// src/home/HomeInteractiveMap.tsx
import { memo, type ReactNode, useRef } from 'react';
import { Station } from './Station';
import type { StationWeight } from './StationWindow';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';
import { useHomeMotionMode } from './motion/useHomeMotionMode';

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
  profile: 'lg',
  bio: 'lg',
  streaming: 'lg',
  social: 'md',
  highlights: 'lg',
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
  const { effectiveMode } = useHomeMotionMode();

  return (
    <div
      ref={rootRef}
      className="nl-home-map nl-home-spatial"
      data-lite={lite ? 'true' : 'false'}
      data-motion-mode={effectiveMode}
    >
      {stations.map((s, idx) => (
        <Station
          key={s.id}
          id={s.id}
          index={idx + 1}
          title={TITLES[s.id] ?? s.id}
          weight={WEIGHTS[s.id] ?? 'lg'}
          lite={lite}
          bare={s.bare ?? true}
          motionMode={effectiveMode}
        >
          {s.node}
        </Station>
      ))}
    </div>
  );
});


