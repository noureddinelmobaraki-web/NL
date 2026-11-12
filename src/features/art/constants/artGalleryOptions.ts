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
  { id: 'vam', label: 'متحف فيكتوريا وألبرت V&A', icon: Landmark },
  { id: 'wikimedia', label: 'ويكيميديا كومنز للفنون', icon: Sparkles },
  { id: 'openverse', label: 'التصوير الفوتوغرافي Openverse', icon: Sun },
  { id: 'concept-art', label: 'الفن الرقمي والأنمي Concept Art', icon: Wand2 },
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
  { id: 'vam', label: 'V&A Museum London' },
  { id: 'wikimedia', label: 'Wikimedia Commons' },
  { id: 'openverse', label: 'Openverse Photography' },
  { id: 'concept-art', label: 'Digital Concept Art' },
];

export const SORT_OPTIONS: readonly OptionItem[] = [
  { id: 'featured', label: 'الأعلى دقة وتميزاً' },
  { id: 'title', label: 'الترتيب الأبجدي' },
];
