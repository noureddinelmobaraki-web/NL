/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CartoonSeriesItem, SpacetoonPlanetId } from '../types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from '../services/spacetoonArchiveRegistry';
import {
  getSpacetoonOstTotalCount,
  subscribeSpacetoonOstTotalCount,
} from '../components/ost/SpacetoonOstGlassStage';

export function useSpacetoonPlanetCounts() {
  const [songsCount, setSongsCount] = useState<number>(() =>
    getSpacetoonOstTotalCount(),
  );

  useEffect(() => {
    return subscribeSpacetoonOstTotalCount((nextCount) => {
      setSongsCount(nextCount);
    });
  }, []);

  const planetCounts = useMemo(() => {
    const counts: Partial<Record<SpacetoonPlanetId, number>> = {
      all: SPACETOON_ARCHIVE_REGISTRY.length,
      songs: songsCount,
    };
    SPACETOON_ARCHIVE_REGISTRY.forEach((item: CartoonSeriesItem) => {
      counts[item.planet] = (counts[item.planet] || 0) + 1;
    });
    return counts;
  }, [songsCount]);

  return {
    planetCounts,
  };
}

export type UseSpacetoonPlanetCountsResult = ReturnType<typeof useSpacetoonPlanetCounts>;
