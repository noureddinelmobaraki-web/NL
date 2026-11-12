import {
  Sparkles,
  Landmark,
  Camera,
  Palette,
  Compass,
  BookOpen,
  Feather,
  Sun,
} from 'lucide-react';
import type {
  GenreChipItem,
  OptionItem,
} from '../../liquid-glass/shared/GlassTopBar';

export const ART_GENRES: GenreChipItem[] = [
  { id: 'all', label: 'الرئيسية للمعارض', icon: Sparkles },
  { id: 'paintings', label: 'روائع اللوحات العالمية', icon: Palette },
  { id: 'photography', label: 'التصوير الفوتوغرافي العالمي', icon: Camera },
  { id: 'picsum', label: 'عدسات فوتوغرافية فائقة الدقة', icon: Sun },
  { id: 'japanese', label: 'الفن الياباني (أوكييو-إي)', icon: Feather },
  { id: 'illustrations', label: 'رسوم الكونسبت والأنمي', icon: Compass },
  { id: 'sculpture', label: 'النحت والعمارة الكلاسيكية', icon: Landmark },
  { id: 'manuscripts', label: 'المخطوطات والزخارف التاريخية', icon: BookOpen },
];

export const MUSEUM_FILTER_OPTIONS: OptionItem[] = [
  { id: 'all', label: 'جميع المتاحف والعدسات العالمية' },
  { id: 'chicago', label: 'معهد شيكاغو للفنون (AIC)' },
  { id: 'met', label: 'متحف المتروبوليتان نيويورك (The Met)' },
  { id: 'cleveland', label: 'متحف كليفلاند للفنون (CMA)' },
  { id: 'vam', label: 'متحف فيكتوريا وألبرت لندن (V&A)' },
  { id: 'wikimedia', label: 'ويكيميديا كومنز التراثية' },
  { id: 'openverse', label: 'مؤسسة سميثسونيان و Openverse' },
  { id: 'picsum', label: 'أرشيف التصوير الفوتوغرافي العالمي' },
  { id: 'concept-art', label: 'معرض رسوم الكونسبت والأنمي' },
];

export const ERA_FILTER_OPTIONS: OptionItem[] = [
  { id: 'all', label: 'جميع العصور الفنية' },
  { id: 'classic', label: 'عصر النهضة والباروك' },
  { id: 'modern', label: 'الانطباعية والفن الحديث' },
  { id: 'contemporary', label: 'الفن المعاصر والرقمي' },
];

export const ART_SORT_OPTIONS: OptionItem[] = [
  { id: 'featured', label: 'الأكثر شهرة وتميزاً' },
  { id: 'title', label: 'الاسم (أ - ي)' },
  { id: 'artist', label: 'حسب الفنان أو المصور' },
];
