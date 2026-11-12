/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import {
  adaptCartoonToCinemaItem,
  getCartoonNumericId,
} from '../adapters/cartoonToCinemaAdapter';
import { SPACETOON_ARCHIVE_REGISTRY } from '../services/spacetoonArchiveRegistry';
import {
  enrichCartoonCatalogPosters,
  fetchGlobalAnimationCatalog,
} from '../services/cartoonMetadataClient';
import type {
  CartoonSeriesItem,
  SpacetoonPlanetId,
} from '../types/cartoon.types';

export function useCartoonCatalogView(
  activePlanet: SpacetoonPlanetId,
  searchQuery: string,
) {
  const [catalogItems, setCatalogItems] = useState<CartoonSeriesItem[]>(
    SPACETOON_ARCHIVE_REGISTRY,
  );

  useEffect(() => {
    let cancelled = false;
    async function hydrateCatalogPostersAndGlobal() {
      const [enrichedSpacetoon, globalAnimation] = await Promise.all([
        enrichCartoonCatalogPosters(SPACETOON_ARCHIVE_REGISTRY),
        fetchGlobalAnimationCatalog(1),
      ]);
      if (cancelled) return;
      const seen = new Set(enrichedSpacetoon.map((i) => i.id));
      const merged = [
        ...enrichedSpacetoon,
        ...globalAnimation.filter((g) => !seen.has(g.id)),
      ];
      setCatalogItems(merged);
    }
    void hydrateCatalogPostersAndGlobal();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogItems.filter((item) => {
      const planetOk =
        activePlanet === 'all' ||
        activePlanet === 'songs' ||
        (activePlanet === 'global' && item.studio === 'أنيميشن عالمي') ||
        item.planet === activePlanet;

      if (!planetOk) return false;
      if (!q) return true;

      return (
        item.titleAr.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.synopsisAr.toLowerCase().includes(q) ||
        item.planetLabelAr.toLowerCase().includes(q) ||
        item.studio.toLowerCase().includes(q)
      );
    });
  }, [activePlanet, catalogItems, searchQuery]);

  const { seriesByNumericId, cinemaItems } = useMemo(() => {
    const map = new Map<number, CartoonSeriesItem>();
    const items: CinemaItem[] = filteredCatalog.map((series, idx) => {
      const numId = getCartoonNumericId(series, idx);
      map.set(numId, series);
      return adaptCartoonToCinemaItem(series, idx);
    });
    return {
      seriesByNumericId: map,
      cinemaItems: items,
    };
  }, [filteredCatalog]);

  return {
    filteredCatalog,
    seriesByNumericId,
    cinemaItems,
  };
}

export type UseCartoonCatalogViewResult = ReturnType<
  typeof useCartoonCatalogView
>;
