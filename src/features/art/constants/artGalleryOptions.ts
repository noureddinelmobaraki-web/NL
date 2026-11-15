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
  { id: 'all', label: 'Featured Exhibition', icon: Sparkles },
  { id: 'paintings', label: 'Masterpiece Paintings', icon: Palette },
  { id: 'photography', label: 'World Photography', icon: Camera },
  { id: 'picsum', label: 'HD Lens & Contemporary', icon: Sun },
  { id: 'japanese', label: 'Japanese Ukiyo-e', icon: Feather },
  { id: 'illustrations', label: 'Concept & Digital Art', icon: Compass },
  { id: 'sculpture', label: 'Classical Sculpture', icon: Landmark },
  { id: 'manuscripts', label: 'Illuminated Manuscripts', icon: BookOpen },
];

export const MUSEUM_FILTER_OPTIONS: OptionItem[] = [
  { id: 'all', label: 'All World Museums & Archives' },
  { id: 'chicago', label: 'Art Institute of Chicago (AIC)' },
  { id: 'met', label: 'The Metropolitan Museum of Art (The Met)' },
  { id: 'ia-met', label: 'Internet Archive Met Gallery' },
  { id: 'cleveland', label: 'Cleveland Museum of Art (CMA)' },
  { id: 'vam', label: 'Victoria and Albert Museum (V&A)' },
  { id: 'loc', label: 'Library of Congress Prints & Photos' },
  { id: 'smithsonian', label: 'Smithsonian & National Gallery (CC0)' },
  { id: 'wikimedia', label: 'Wikimedia Commons Featured' },
  { id: 'openverse', label: 'Openverse Global Commons' },
  { id: 'picsum', label: 'High-Resolution Lens Archive' },
  { id: 'concept-art', label: 'Digital Concept & Anime Studio' },
];

export const ERA_FILTER_OPTIONS: OptionItem[] = [
  { id: 'all', label: 'All Historical Eras' },
  { id: 'classic', label: 'Renaissance & Baroque' },
  { id: 'modern', label: 'Impressionism & Modern' },
  { id: 'contemporary', label: 'Contemporary & Digital' },
];

export const ART_SORT_OPTIONS: OptionItem[] = [
  { id: 'featured', label: 'Curated Highlights' },
  { id: 'title', label: 'Title (A–Z)' },
  { id: 'artist', label: 'By Artist / Creator' },
];
