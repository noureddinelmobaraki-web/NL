/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { AnimeCategoryFilter, AnimeItem } from '../types/anime.types';
import {
  CURATED_ARABIC_DUB_ANIME,
  fetchAniListCatalog,
  fetchJikanEndpoint,
  searchAnimeMultiSource,
} from './animeCatalogClient';

export async function loadAnimeByCategory(
  tab: AnimeCategoryFilter,
  query: string
): Promise<AnimeItem[]> {
  if (query.trim()) {
    return searchAnimeMultiSource(query.trim());
  }
  if (tab === 'arabic_dub') {
    return CURATED_ARABIC_DUB_ANIME;
  }
  if (tab === 'movies') {
    const list = await fetchAniListCatalog('POPULARITY_DESC', 'MOVIE');
    return list.length > 0 ? list : fetchJikanEndpoint('/top/anime?type=movie&limit=24');
  }
  if (tab === 'top_rated') {
    const list = await fetchAniListCatalog('SCORE_DESC');
    return list.length > 0 ? list : fetchJikanEndpoint('/top/anime?limit=24');
  }
  if (tab === 'seasonal') {
    const list = await fetchJikanEndpoint('/seasons/now?limit=24');
    return list.length > 0 ? list : fetchAniListCatalog('TRENDING_DESC');
  }
  const trending = await fetchAniListCatalog('TRENDING_DESC');
  return trending.length > 0 ? trending : CURATED_ARABIC_DUB_ANIME;
}
