/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * ArtHubPage — Unified Liquid Glass Museum Gallery (BooksStage Glass Shell)
 * Displays 2 large HD artworks per row on Desktop (1 on Mobile) with ONLY the image and title on the card.
 * Personal drawings (DRAW.webp / DRAW2.webp / MeBit / NL Lens) are reserved exclusively for Profile.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { CatalogShell } from '../liquid-glass/shared/CatalogShell';
import { GlassTopBar, type GenreChipItem, type OptionItem } from '../liquid-glass/shared/GlassTopBar';
import { GenreNav } from '../liquid-glass/shared/GenreNav';
import { FilterControls } from '../liquid-glass/shared/FilterControls';
import './styles/art-glass-gallery.css';

import type { ArtMuseumPiece } from './types/art.types';
import {
  fetchUnifiedArtGallery,
  type ArtGalleryCategory,
} from './services/artMuseumService';
import { ArtGlassDualGrid } from './components/ArtGlassDualGrid';
import { ArtLightboxViewerModal } from './components/ArtLightboxViewerModal';
import { AvatarStudioGlassPanel } from './components/AvatarStudioGlassPanel';

const ART_GENRES: readonly GenreChipItem[] = [
  { id: 'all', label: 'روائع المتاحف العالمية', icon: Palette },
  { id: 'chicago', label: 'معهد شيكاغو للفنون', icon: Landmark },
  { id: 'met', label: 'متحف المتروبوليتان NY', icon: Crown },
  { id: 'cleveland', label: 'متحف كليفلاند CMA', icon: Compass },
  { id: 'islamic', label: 'الفن والزخرفة الإسلامية', icon: Sparkles },
  { id: 'impressionism', label: 'المدرسة الانطباعية', icon: Sun },
  { id: 'renaissance', label: 'عصر النهضة الأوروبية', icon: Feather },
  { id: 'avatars', label: 'مختبر الأفاتار SVG', icon: Wand2 },
];

const MUSEUM_FILTER_OPTIONS: readonly OptionItem[] = [
  { id: 'all', label: 'كل المتاحف (CC0)' },
  { id: 'chicago', label: 'Art Institute of Chicago' },
  { id: 'met', label: 'The Met Museum' },
  { id: 'cleveland', label: 'Cleveland Museum' },
];

const SORT_OPTIONS: readonly OptionItem[] = [
  { id: 'featured', label: 'الأعلى دقة وتميزاً' },
  { id: 'title', label: 'الترتيب الأبجدي' },
];

export const ArtHubPage: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>('all');
  const [museumFilter, setMuseumFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  const [artworks, setArtworks] = useState<ArtMuseumPiece[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtMuseumPiece | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeGenre === 'avatars') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const category = (activeGenre as ArtGalleryCategory) || 'all';

    fetchUnifiedArtGallery(category, debouncedQuery)
      .then((list) => {
        if (!cancelled) setArtworks(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGenre, debouncedQuery]);

  const displayedArtworks = useMemo(() => {
    let list = artworks;
    if (museumFilter !== 'all') {
      list = list.filter((item) => item.source === museumFilter);
    }
    if (sortOrder === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [artworks, museumFilter, sortOrder]);

  return (
    <div className="w-full min-h-screen text-white">
      <CatalogShell
        topBar={
          <GlassTopBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            placeholder="ابحث في اللوحات العالمية (Monet, Van Gogh, Rembrandt, Calligraphy)..."
            language={museumFilter}
            languages={MUSEUM_FILTER_OPTIONS}
            onLanguageChange={setMuseumFilter}
            genres={ART_GENRES}
            activeGenre={activeGenre}
            onGenreChange={setActiveGenre}
            sortOrder={sortOrder}
            sortOptions={SORT_OPTIONS}
            onSortChange={setSortOrder}
            resultCount={displayedArtworks.length}
          />
        }
        leftRail={
          <GenreNav
            genres={ART_GENRES}
            activeGenre={activeGenre}
            onGenreChange={setActiveGenre}
            orientation="vertical"
          />
        }
        rightRail={
          <FilterControls
            variant="panel"
            language={museumFilter}
            languages={MUSEUM_FILTER_OPTIONS}
            onLanguageChange={setMuseumFilter}
            sortOrder={sortOrder}
            sortOptions={SORT_OPTIONS}
            onSortChange={setSortOrder}
          />
        }
      >
        {activeGenre === 'avatars' ? (
          <AvatarStudioGlassPanel />
        ) : (
          <ArtGlassDualGrid
            items={displayedArtworks}
            loading={loading}
            onSelectArtwork={setSelectedArtwork}
          />
        )}
      </CatalogShell>

      <ArtLightboxViewerModal
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />
    </div>
  );
};

export default ArtHubPage;
