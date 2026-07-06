// src/home/HomeInteractiveMap.tsx
// المنسّق: يقرّر lite/reduced، يرسم العمود المركزي، ويحوّل كل عقدة قسم إلى محطّة.
import { memo } from 'react';
import { Station } from './Station';
import { HomeFallbackList } from './HomeFallbackList';
import { sideFor, type HomeStationInput } from './home.stations';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';

interface HomeInteractiveMapProps {
  stations: HomeStationInput[];
}

const TITLES: Record<string, string> = {
  profile: 'noureddin_el_mobaraki.profile',
  streaming: 'STREAMING_PLATFORMS.exe',
  highlights: 'HIGHLIGHTS',
  gallery: 'GALLERY',
  songs: 'MY_SONGS',
  contact: 'CONTACT',
  drawings: 'DRAWINGS',
};

export const HomeInteractiveMap = memo(function HomeInteractiveMap({
  stations,
}: HomeInteractiveMapProps) {
  const { lightMode, reduced } = useAdaptivePerformance();
  const lite = lightMode; // هاتف/ضعيف/save-data → خيوط جاهزة

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
      {stations.map((s, i) => (
        <Station
          key={s.id}
          id={s.id}
          side={sideFor(s.id, i)}
          title={TITLES[s.id] ?? s.id}
          lite={lite}
          reduced={reduced}
          bare={s.bare}
        >
          {s.node}
        </Station>
      ))}
    </div>
  );
});
