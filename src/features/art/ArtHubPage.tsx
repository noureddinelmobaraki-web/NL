import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import type { ArtTabId } from './types/art.types';
import { CatalogShell } from '../liquid-glass/shared/CatalogShell';
import { GlassTopBar } from '../liquid-glass/shared/GlassTopBar';
import { GenreNav } from '../liquid-glass/shared/GenreNav';
import { FilterControls } from '../liquid-glass/shared/FilterControls';
import { LIQUID_GLASS_BACKGROUNDS } from '../liquid-glass/stages/orbs/useQuadLensWebGL';
import {
  ART_GENRES,
  MUSEUM_FILTER_OPTIONS,
  ERA_FILTER_OPTIONS,
  ART_SORT_OPTIONS,
} from './constants/artGalleryOptions';
import { useArtMuseumCatalog } from './hooks/useArtMuseumCatalog';
import { ArtGlassDualGrid } from './components/ArtGlassDualGrid';
import { ArtLightboxViewerModal } from './components/ArtLightboxViewerModal';
import '../liquid-glass/stages/orbs/portal.css';
import '../liquid-glass/shared/glass.css';
import '../liquid-glass/stages/books/books.css';
import './styles/art-glass-gallery.css';

export interface ArtHubPageProps {
  initialTab?: ArtTabId;
  onClose?: () => void;
}

export const ArtHubPage: React.FC<ArtHubPageProps> = ({
  initialTab = 'photos',
  onClose,
}) => {
  const initialGenre = initialTab === 'photos' ? 'all' : 'paintings';
  const catalog = useArtMuseumCatalog(initialGenre);

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] w-full h-[100dvh] overflow-hidden select-none pointer-events-auto"
      dir="ltr"
    >
      {/* Exact Liquid Glass Books Background Image */}
      <picture className="lg-bg-picture" aria-hidden="true">
        <source
          media={LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery}
          srcSet={LIQUID_GLASS_BACKGROUNDS.phone}
        />
        <img
          src={LIQUID_GLASS_BACKGROUNDS.pc}
          alt=""
          className="lg-bg-img"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </picture>

      {/* Books Stage Translucent Dimmer (No Dark Solid Wall) */}
      <div
        className="lg-portal-stage-dimmer lg-portal-stage-dimmer--active"
        aria-hidden="true"
      />

      <div className="lg-stage-root lg-books-stage-root">
        {onClose && (
          <button
            type="button"
            className="lg-glass-pill lg-back-orbs-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="العودة"
          >
            <ArrowLeft size={18} strokeWidth={2.3} />
          </button>
        )}

        <div className="lg-stage-scroll lg-books-catalog-scroll">
          <CatalogShell
            leftRail={
              <GenreNav
                genres={ART_GENRES}
                activeGenre={catalog.genre}
                onGenreChange={(id) => {
                  catalog.setShowSavedOnly(false);
                  catalog.setGenre(id);
                }}
                showSavedOnly={catalog.showSavedOnly}
                orientation="vertical"
              />
            }
            rightRail={
              <FilterControls
                variant="panel"
                language={catalog.museumFilter}
                languages={MUSEUM_FILTER_OPTIONS}
                onLanguageChange={catalog.setMuseumFilter}
                sortOrder={catalog.sortOrder}
                sortOptions={ART_SORT_OPTIONS}
                onSortChange={catalog.setSortOrder}
                extFilter={catalog.eraFilter}
                formatOptions={ERA_FILTER_OPTIONS}
                onFormatChange={catalog.setEraFilter}
                savedCount={catalog.savedIds.size}
                showSavedOnly={catalog.showSavedOnly}
                onToggleSavedOnly={() => catalog.setShowSavedOnly((v) => !v)}
              />
            }
            topBar={
              <GlassTopBar
                query={catalog.query}
                onQueryChange={catalog.setQuery}
                placeholder="ابحث عن لوحة، فنان (Van Gogh, Monet, Hokusai)، متحف، أو فوتوغرافيا..."
                language={catalog.museumFilter}
                languages={MUSEUM_FILTER_OPTIONS}
                onLanguageChange={catalog.setMuseumFilter}
                genres={ART_GENRES}
                activeGenre={catalog.genre}
                onGenreChange={(id) => {
                  catalog.setShowSavedOnly(false);
                  catalog.setGenre(id);
                }}
                sortOrder={catalog.sortOrder}
                sortOptions={ART_SORT_OPTIONS}
                onSortChange={catalog.setSortOrder}
                extFilter={catalog.eraFilter}
                formatOptions={ERA_FILTER_OPTIONS}
                onFormatChange={catalog.setEraFilter}
                savedCount={catalog.savedIds.size}
                showSavedOnly={catalog.showSavedOnly}
                onToggleSavedOnly={() => catalog.setShowSavedOnly((v) => !v)}
                resultCount={catalog.artworks.length}
                onClose={onClose}
              />
            }
          >
            <ArtGlassDualGrid
              items={catalog.artworks}
              loading={catalog.loading}
              loadingMore={catalog.loadingMore}
              onSelect={catalog.setSelectedArtwork}
              onLoadMore={catalog.loadMore}
              onResetFilters={() => {
                catalog.setShowSavedOnly(false);
                catalog.setQuery('');
                catalog.setGenre('all');
                catalog.setMuseumFilter('all');
                catalog.setEraFilter('all');
              }}
            />
          </CatalogShell>
        </div>

        <ArtLightboxViewerModal
          artwork={catalog.selectedArtwork}
          onClose={() => catalog.setSelectedArtwork(null)}
        />
      </div>
    </div>,
    document.body,
  );
};

export default ArtHubPage;
