/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * ArtHubPage — Unified Liquid Glass Museum Gallery (BooksStage Glass Shell)
 * Displays 2 large HD artworks per row on Desktop (1 on Mobile) with ONLY the image and title on the card.
 * Personal drawings (DRAW.webp / DRAW2.webp / MeBit / NL Lens) are reserved exclusively for Profile.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { CatalogShell } from '../liquid-glass/shared/CatalogShell';
import { GlassTopBar } from '../liquid-glass/shared/GlassTopBar';
import { GenreNav } from '../liquid-glass/shared/GenreNav';
import { FilterControls } from '../liquid-glass/shared/FilterControls';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';
import '../liquid-glass/stages/orbs/portal.base.css';
import '../liquid-glass/shared/glass.css';
import './styles/art-glass-gallery.css';

import {
  ART_GENRES,
  MUSEUM_FILTER_OPTIONS,
  SORT_OPTIONS,
} from './constants/artGalleryOptions';
import {
  useArtGalleryFilters,
  useArtGalleryFeed,
  useDisplayedArtworks,
  useArtLightbox,
  type ArtInitialTab,
} from './hooks';
import { ArtGlassDualGrid } from './components/ArtGlassDualGrid';
import { ArtLightboxViewerModal } from './components/ArtLightboxViewerModal';
import { AvatarStudioGlassPanel } from './components/AvatarStudioGlassPanel';

export interface ArtHubPageProps {
  onClose?: () => void;
  initialTab?: ArtInitialTab;
}

export const ArtHubPage: React.FC<ArtHubPageProps> = ({ onClose, initialTab }) => {
  const {
    activeGenre,
    setActiveGenre,
    museumFilter,
    setMuseumFilter,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  } = useArtGalleryFilters(initialTab);

  const { artworks, loading } = useArtGalleryFeed(activeGenre, debouncedQuery);
  const { displayedArtworks } = useDisplayedArtworks(artworks, museumFilter, sortOrder);
  const { selectedArtwork, open: openLightbox, close: closeLightbox } = useArtLightbox();

  useOverlayPageFrame({
    onClose,
    isInnerLayerOpen: () => selectedArtwork !== null,
  });

  const content = (
    <div className="fixed inset-0 z-[10050] w-full h-[100dvh] text-white overflow-hidden pointer-events-auto bg-[#060911]">
      <div
        className="lg-stage-scroll lg-books-catalog-scroll relative z-20 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
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
              onClose={onClose}
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
              onSelectArtwork={openLightbox}
            />
          )}
        </CatalogShell>
      </div>

      <ArtLightboxViewerModal
        artwork={selectedArtwork}
        onClose={closeLightbox}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default ArtHubPage;
