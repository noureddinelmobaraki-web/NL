/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { Flame, Calendar, Trophy, Sparkles, Film } from 'lucide-react';
import type { AnimeCategoryFilter } from '../types/anime.types';

export const ANIME_TABS: {
  id: AnimeCategoryFilter;
  labelAr: string;
  icon: typeof Flame;
  theme: 'action' | 'comedy' | 'science' | 'adventure' | 'movies';
}[] = [
  { id: 'trending', labelAr: 'الرائج الآن', icon: Flame, theme: 'action' },
  { id: 'seasonal', labelAr: 'أنميات الموسم', icon: Calendar, theme: 'science' },
  { id: 'top_rated', labelAr: 'الأعلى تقييماً', icon: Trophy, theme: 'comedy' },
  { id: 'arabic_dub', labelAr: 'مدبلج ومشهور عربياً', icon: Sparkles, theme: 'adventure' },
  { id: 'movies', labelAr: 'أفلام الأنمي', icon: Film, theme: 'movies' },
];
