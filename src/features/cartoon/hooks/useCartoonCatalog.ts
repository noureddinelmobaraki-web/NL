/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Cartoon Catalog, Spacetoon Planets Filter, Studio Filter,
 * Live Archive.org Search & TMDB Global Animation Discovery
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SPACETOON_ARCHIVE_REGISTRY,
  SPACETOON_PLANETS,
} from '../services/spacetoonArchiveRegistry';
import { searchOpenArchiveCartoons } from '../services/archiveOrgStreamResolver';
import {
  enrichCartoonWithTmdbPoster,
  fetchGlobalAnimationCatalog,
} from '../services/cartoonMetadataClient';
import type {
  CartoonSeriesItem,
  DubbingStudioTag,
  SpacetoonPlanetId,
} from '../types/cartoon.types';

export function useCartoonCatalog() {
  // User Confirmed Choice 2: Open with comprehensive Spacetoon Hero + 10 Planets Bar at top ('all')
  const [selectedPlanet, setSelectedPlanet] = useState<SpacetoonPlanetId>('all');
  const [selectedStudio, setSelectedStudio] = useState<DubbingStudioTag | 'all'>('all');

  const [spacetoonList, setSpacetoonList] = useState<CartoonSeriesItem[]>(
    SPACETOON_ARCHIVE_REGISTRY,
  );
  const [globalList, setGlobalList] = useState<CartoonSeriesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveArchiveResults, setLiveArchiveResults] = useState<CartoonSeriesItem[]>([]);
  const [isSearchingArchive, setIsSearchingArchive] = useState<boolean>(false);

  // Enrich TMDB posters & load Global Animation catalog
  useEffect(() => {
    let cancelled = false;

    const initCatalog = async () => {
      const [enriched, globalItems] = await Promise.all([
        Promise.all(
          SPACETOON_ARCHIVE_REGISTRY.map((item) => enrichCartoonWithTmdbPoster(item)),
        ),
        fetchGlobalAnimationCatalog(),
      ]);
      if (cancelled) return;
      setSpacetoonList(enriched);
      setGlobalList(globalItems);
    };

    void initCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live Open Search in Archive.org AdvancedSearch API
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setLiveArchiveResults([]);
      setIsSearchingArchive(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearchingArchive(true);

    const timer = setTimeout(async () => {
      const openResults = await searchOpenArchiveCartoons(q);
      if (!cancelled) {
        setLiveArchiveResults(openResults);
        setIsSearchingArchive(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const allCombinedItems = useMemo(() => {
    return [...spacetoonList, ...globalList];
  }, [spacetoonList, globalList]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const localMatches = allCombinedItems.filter(
        (item) =>
          item.titleAr.toLowerCase().includes(q) ||
          item.titleEn.toLowerCase().includes(q) ||
          item.synopsisAr.toLowerCase().includes(q) ||
          item.studio.toLowerCase().includes(q),
      );
      return [...localMatches, ...liveArchiveResults];
    }

    return allCombinedItems.filter((item) => {
      const planetOk =
        selectedPlanet === 'all' || item.planet === selectedPlanet;
      const studioOk =
        selectedStudio === 'all' || item.studio === selectedStudio;
      return planetOk && studioOk;
    });
  }, [
    searchQuery,
    allCombinedItems,
    liveArchiveResults,
    selectedPlanet,
    selectedStudio,
  ]);

  const heroBannerItems = useMemo(() => {
    return spacetoonList.slice(0, 6);
  }, [spacetoonList]);

  const findCartoonById = useCallback(
    (id: string): CartoonSeriesItem | null => {
      return (
        allCombinedItems.find((c) => c.id === id) ||
        liveArchiveResults.find((c) => c.id === id) ||
        null
      );
    },
    [allCombinedItems, liveArchiveResults],
  );

  return {
    planets: SPACETOON_PLANETS,
    selectedPlanet,
    setSelectedPlanet,
    selectedStudio,
    setSelectedStudio,
    spacetoonList,
    globalList,
    heroBannerItems,
    filteredItems,
    searchQuery,
    setSearchQuery,
    isSearchingArchive,
    findCartoonById,
  };
}
