/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { AnimeCategoryFilter } from '../types/anime.types';

export const ANIME_TABS: {
  id: AnimeCategoryFilter;
  label: string;
  labelAr: string;
}[] = [
  { id: 'trending', label: 'Trending Now', labelAr: 'الرائج الآن' },
  { id: 'seasonal', label: 'Seasonal Airing', labelAr: 'أنميات الموسم' },
  { id: 'top_rated', label: 'Top Rated', labelAr: 'الأعلى تقييماً' },
  { id: 'arabic_dub', label: 'Iconic Dubs', labelAr: 'مدبلج ومشهور عربياً' },
  { id: 'movies', label: 'Anime Movies', labelAr: 'أفلام الأنمي' },
];
