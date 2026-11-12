/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from 'react';
import type { CartoonSeriesItem, SpacetoonPlanetId } from '../types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from '../services/spacetoonArchiveRegistry';
import {
  adaptCartoonToCinemaItem,
  getCartoonNumericId,
} from '../adapters/cartoonToCinemaAdapter';

export function useCartoonCatalogView(
  activePlanet: SpacetoonPlanetId,
  searchQuery: string
) {
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPACETOON_ARCHIVE_REGISTRY.filter((item: CartoonSeriesItem) => {
      const matchesPlanet =
        activePlanet === 'all' ||
        activePlanet === 'songs' ||
        item.planet === activePlanet;
      if (!matchesPlanet) return false;
      if (!q) return true;
      return (
        item.titleAr.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.synopsisAr.toLowerCase().includes(q)
      );
    });
  }, [activePlanet, searchQuery]);

  const seriesByNumericId = useMemo(() => {
    const map = new Map<number, CartoonSeriesItem>();
    SPACETOON_ARCHIVE_REGISTRY.forEach((series: CartoonSeriesItem, idx: number) => {
      map.set(getCartoonNumericId(series, idx), series);
    });
    return map;
  }, []);

  const cinemaItems = useMemo(
    () =>
      filteredCatalog.map((series: CartoonSeriesItem) => {
        const masterIdx = SPACETOON_ARCHIVE_REGISTRY.indexOf(series);
        return adaptCartoonToCinemaItem(series, masterIdx >= 0 ? masterIdx : 0);
      }),
    [filteredCatalog]
  );

  return {
    filteredCatalog,
    seriesByNumericId,
    cinemaItems,
  };
}

export type UseCartoonCatalogViewResult = ReturnType<typeof useCartoonCatalogView>;
