/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from 'react';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { CartoonSeriesItem } from '../types/cartoon.types';

export function useCartoonPlanetRows(
  cinemaItems: CinemaItem[],
  filteredCatalog: CartoonSeriesItem[]
) {
  const actionAndAdventureRow = useMemo(
    () =>
      cinemaItems.filter((_, idx: number) => {
        const raw = filteredCatalog[idx];
        return raw && (raw.planet === 'action' || raw.planet === 'adventure');
      }),
    [cinemaItems, filteredCatalog]
  );

  const zomorodaAndComedyRow = useMemo(
    () =>
      cinemaItems.filter((_, idx: number) => {
        const raw = filteredCatalog[idx];
        return (
          raw &&
          (raw.planet === 'zomoroda' || raw.planet === 'comedy' || raw.planet === 'sports')
        );
      }),
    [cinemaItems, filteredCatalog]
  );

  return {
    actionAndAdventureRow,
    zomorodaAndComedyRow,
  };
}

export type UseCartoonPlanetRowsResult = ReturnType<typeof useCartoonPlanetRows>;
