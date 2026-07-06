// src/home/HomeInteractiveMap.tsx
import { memo, type ReactNode } from 'react';
import { Station } from './Station';
import { HomeFallbackList } from './HomeFallbackList';
import type { StationWeight } from './StationWindow';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';

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
  const { lightMode, reduced } = useAdaptivePerformance();
  const lite = lightMode;

  if (reduced) {
    const items = stations.map((s) => ({
      id: s.id,
      title: TITLES[s.id] ?? s.id,
      node: s.node,
    }));
    return <HomeFallbackList items={items} />;
  }

  return (
    <div className="nl-home-map" data-lite={lite ? 'true' : 'false'}>
      <div className="nl-home-spine" aria-hidden="true" />
      {stations.map((s) => (
        <Station
          key={s.id}
          id={s.id}
          title={TITLES[s.id] ?? s.id}
          weight={WEIGHTS[s.id] ?? 'md'}
          lite={lite}
          bare={s.bare}
        >
          {s.node}
        </Station>
      ))}
    </div>
  );
});
