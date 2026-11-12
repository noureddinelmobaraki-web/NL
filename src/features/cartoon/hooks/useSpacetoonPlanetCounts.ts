/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from 'react';
import type { CartoonSeriesItem, SpacetoonPlanetId } from '../types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from '../services/spacetoonArchiveRegistry';
import { SPACETOON_OST_TRACKS } from '../components/ost/SpacetoonOstGlassStage';

export function useSpacetoonPlanetCounts() {
  const planetCounts = useMemo(() => {
    const counts: Partial<Record<SpacetoonPlanetId, number>> = {
      all: SPACETOON_ARCHIVE_REGISTRY.length,
      songs: SPACETOON_OST_TRACKS.length,
    };
    SPACETOON_ARCHIVE_REGISTRY.forEach((item: CartoonSeriesItem) => {
      counts[item.planet] = (counts[item.planet] || 0) + 1;
    });
    return counts;
  }, []);

  return {
    planetCounts,
  };
}

export type UseSpacetoonPlanetCountsResult = ReturnType<typeof useSpacetoonPlanetCounts>;
