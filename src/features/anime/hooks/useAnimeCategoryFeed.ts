/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useState } from 'react';
import type { AnimeCategoryFilter, AnimeItem } from '../types/anime.types';
import { CURATED_ARABIC_DUB_ANIME } from '../services/animeCatalogClient';
import { loadAnimeByCategory } from '../services/animeCategoryLoader';

export function useAnimeCategoryFeed(
  activeTab: AnimeCategoryFilter,
  debouncedQuery: string
) {
  const [animeList, setAnimeList] = useState<AnimeItem[]>(CURATED_ARABIC_DUB_ANIME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAnimeByCategory(activeTab, debouncedQuery)
      .then((items) => {
        if (!cancelled) {
          setAnimeList(items.length > 0 ? items : CURATED_ARABIC_DUB_ANIME);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedQuery]);

  return {
    animeList,
    loading,
  };
}

export type UseAnimeCategoryFeedResult = ReturnType<typeof useAnimeCategoryFeed>;
