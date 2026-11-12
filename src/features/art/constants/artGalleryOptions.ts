/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import {
  Palette,
  Landmark,
  Sparkles,
  Compass,
  Crown,
  Sun,
  Feather,
  Wand2,
} from 'lucide-react';
import type { GenreChipItem, OptionItem } from '../../liquid-glass/shared/GlassTopBar';

export const ART_GENRES: readonly GenreChipItem[] = [
  { id: 'all', label: 'روائع المتاحف العالمية', icon: Palette },
  { id: 'chicago', label: 'معهد شيكاغو للفنون', icon: Landmark },
  { id: 'met', label: 'متحف المتروبوليتان NY', icon: Crown },
  { id: 'cleveland', label: 'متحف كليفلاند CMA', icon: Compass },
  { id: 'islamic', label: 'الفن والزخرفة الإسلامية', icon: Sparkles },
  { id: 'impressionism', label: 'المدرسة الانطباعية', icon: Sun },
  { id: 'renaissance', label: 'عصر النهضة الأوروبية', icon: Feather },
  { id: 'avatars', label: 'مختبر الأفاتار SVG', icon: Wand2 },
];

export const MUSEUM_FILTER_OPTIONS: readonly OptionItem[] = [
  { id: 'all', label: 'كل المتاحف (CC0)' },
  { id: 'chicago', label: 'Art Institute of Chicago' },
  { id: 'met', label: 'The Met Museum' },
  { id: 'cleveland', label: 'Cleveland Museum' },
];

export const SORT_OPTIONS: readonly OptionItem[] = [
  { id: 'featured', label: 'الأعلى دقة وتميزاً' },
  { id: 'title', label: 'الترتيب الأبجدي' },
];
