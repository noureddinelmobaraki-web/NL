/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { AnimeCategoryFilter, AnimeItem } from '../types/anime.types';
import {
  CURATED_ARABIC_DUB_ANIME,
  fetchAniListCatalog,
  fetchJikanEndpoint,
  hydrateMissingAnimePosters,
  searchAnimeMultiSource,
} from './animeCatalogClient';

export async function loadAnimeByCategory(
  tab: AnimeCategoryFilter,
  query: string
): Promise<AnimeItem[]> {
  if (query.trim()) {
    const results = await searchAnimeMultiSource(query.trim());
    return hydrateMissingAnimePosters(results);
  }
  if (tab === 'arabic_dub') {
    return hydrateMissingAnimePosters(CURATED_ARABIC_DUB_ANIME);
  }
  if (tab === 'movies') {
    const list = await fetchAniListCatalog('POPULARITY_DESC', 'MOVIE');
    const items =
      list.length > 0
        ? list
        : await fetchJikanEndpoint('/top/anime?type=movie&limit=24');
    return hydrateMissingAnimePosters(items);
  }
  if (tab === 'top_rated') {
    const list = await fetchAniListCatalog('SCORE_DESC');
    const items =
      list.length > 0 ? list : await fetchJikanEndpoint('/top/anime?limit=24');
    return hydrateMissingAnimePosters(items);
  }
  if (tab === 'seasonal') {
    const list = await fetchJikanEndpoint('/seasons/now?limit=24');
    const items =
      list.length > 0 ? list : await fetchAniListCatalog('TRENDING_DESC');
    return hydrateMissingAnimePosters(items);
  }
  const trending = await fetchAniListCatalog('TRENDING_DESC');
  const items = trending.length > 0 ? trending : CURATED_ARABIC_DUB_ANIME;
  return hydrateMissingAnimePosters(items);
}
