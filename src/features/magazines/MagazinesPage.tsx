/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Atom,
  Camera,
  Cpu,
  Feather,
  Gamepad2,
  Globe,
  Layers,
  Music,
  Orbit,
  Sparkles,
} from 'lucide-react';
import type { BookItem, BookResolveResult } from '../liquid-glass/services/types';
import { useIsTouch } from '../../hooks/useMediaQuery';
import { useBackToClose } from '../../hooks/useBackToClose';
import { GlassTopBar } from '../liquid-glass/shared/GlassTopBar';
import { FilterControls } from '../liquid-glass/shared/FilterControls';
import { GenreNav } from '../liquid-glass/shared/GenreNav';
import { CatalogShell } from '../liquid-glass/shared/CatalogShell';
import { BooksGrid } from '../liquid-glass/stages/books/components/BooksGrid';
import { BookReader } from '../liquid-glass/stages/books/components/BookReader';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';
import { useMagazinesCatalog } from './hooks/useMagazinesCatalog';
import { useMagazineBookmarks } from './hooks/useMagazineBookmarks';
import { resolveMagazineIssueDetails } from './services/magazineService';
import '../liquid-glass/stages/orbs/portal.css';
import '../liquid-glass/shared/glass.css';
import '../liquid-glass/stages/books/books.css';

export interface MagazinesPageProps {
  onClose: () => void;
}

const MAGAZINE_CATEGORIES = [
  { id: 'featured', label: 'Featured Rack', icon: Sparkles },
  { id: 'arabic_retro', label: 'Arabic Press & Majid', icon: Globe },
  { id: 'gaming_retro', label: 'Retro Gaming Press', icon: Gamepad2 },
  { id: 'computing', label: 'Computing & Cyber', icon: Cpu },
  { id: 'science_nature', label: 'Science & Mechanics', icon: Atom },
  { id: 'pulp_scifi', label: 'Sci-Fi & Pulp', icon: Orbit },
  { id: 'photography_art', label: 'Photography & Life', icon: Camera },
  { id: 'comics_manga', label: 'Comics & Zines', icon: Layers },
  { id: 'fashion_culture', label: 'Culture & Editorial', icon: Feather },
  { id: 'music_press', label: 'Music & Sound Press', icon: Music },
] as const;

const LANGUAGES = [
  { id: 'all', label: 'All Languages' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'Arabic' },
  { id: 'fr', label: 'French' },
  { id: 'es', label: 'Spanish' },
  { id: 'de', label: 'German' },
  { id: 'ja', label: 'Japanese' },
] as const;

const FORMAT_FILTERS = [
  { id: 'all', label: 'All Issues' },
  { id: 'inapp', label: '2-Page Spread' },
  { id: 'pdf', label: 'Full PDF' },
  { id: 'epub', label: 'EPUB' },
] as const;

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Read Issues' },
  { id: 'newest', label: 'Newest Issue' },
  { id: 'classic', label: 'Vintage / Classic' },
] as const;

export const MagazinesPage: React.FC<MagazinesPageProps> = ({ onClose }) => {
  const isTouch = useIsTouch();
  const catalog = useMagazinesCatalog('');
  const bookmarks = useMagazineBookmarks();

  const [selectedMagazine, setSelectedMagazine] = useState<BookItem | null>(null);
  const [resolveResult, setResolveResult] = useState<BookResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);

  const openMagazineReader = useCallback(async (magazine: BookItem) => {
    setSelectedMagazine(magazine);
    setResolving(true);
    setResolveResult(null);
    try {
      const res = await resolveMagazineIssueDetails(magazine);
      setResolveResult(res);
    } catch {
      /* ignore */
    } finally {
      setResolving(false);
    }
  }, []);

  const closeMagazineReader = useCallback(() => {
    setSelectedMagazine(null);
  }, []);

  useBackToClose(Boolean(selectedMagazine), closeMagazineReader);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMagazine) {
        e.stopPropagation();
        e.preventDefault();
        closeMagazineReader();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedMagazine, closeMagazineReader]);

  const displayedMagazines = useMemo(() => {
    const base = bookmarks.showSavedOnly
      ? bookmarks.savedMagazinesCache
      : catalog.magazines;
    if (catalog.sortOrder === 'newest') {
      return [...base].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    }
    if (catalog.sortOrder === 'classic') {
      return [...base].sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
    }
    return base;
  }, [
    bookmarks.showSavedOnly,
    bookmarks.savedMagazinesCache,
    catalog.magazines,
    catalog.sortOrder,
  ]);

  const handleStageEmptySpaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouch) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('.lg-book-unit') ||
        target.closest('.lg-topbar-shell') ||
        target.closest('.lg-catalog-shell__header') ||
        target.closest('.lg-catalog-shell__left') ||
        target.closest('.lg-catalog-shell__right') ||
        target.closest('.lg-catalog-shell__top') ||
        target.closest('.lg-branch-popover') ||
        target.closest('.lg-reader-stage-card')
      ) {
        return;
      }
      if (selectedMagazine) {
        closeMagazineReader();
      } else {
        onClose();
      }
    },
    [isTouch, selectedMagazine, closeMagazineReader, onClose],
  );

  return createPortal(
    <div className="lg-portal-root" dir="ltr">
      <LiquidGlassBooksBackdrop dimmerOpacity={0.52} />

      <div className="lg-portal-stage-layer">
        <div
          className="lg-stage-root lg-books-stage-root"
          dir="ltr"
          onClick={handleStageEmptySpaceClick}
        >
          <button
            type="button"
            className="lg-glass-pill lg-back-orbs-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedMagazine) closeMagazineReader();
              else onClose();
            }}
            aria-label={selectedMagazine ? 'Back to Magazines' : 'Close Magazines'}
          >
            <ArrowLeft size={18} strokeWidth={2.3} />
          </button>

          {!selectedMagazine ? (
            <div
              className="lg-stage-scroll lg-books-catalog-scroll"
              onClick={handleStageEmptySpaceClick}
            >
              <CatalogShell
                leftRail={
                  <GenreNav
                    genres={MAGAZINE_CATEGORIES}
                    activeGenre={catalog.category}
                    onGenreChange={(id) => {
                      bookmarks.setShowSavedOnly(false);
                      catalog.setCategory(id);
                      catalog.setPage(1);
                    }}
                    showSavedOnly={bookmarks.showSavedOnly}
                    orientation="vertical"
                  />
                }
                rightRail={
                  <FilterControls
                    variant="panel"
                    language={catalog.language}
                    languages={LANGUAGES}
                    onLanguageChange={(id) => {
                      catalog.setLanguage(id);
                      catalog.setPage(1);
                    }}
                    sortOrder={catalog.sortOrder}
                    sortOptions={SORT_OPTIONS}
                    onSortChange={catalog.setSortOrder}
                    extFilter={catalog.extFilter}
                    formatOptions={FORMAT_FILTERS}
                    onFormatChange={(id) => {
                      catalog.setExtFilter(id);
                      catalog.setPage(1);
                    }}
                    savedCount={bookmarks.savedIds.size}
                    showSavedOnly={bookmarks.showSavedOnly}
                    onToggleSavedOnly={() => bookmarks.setShowSavedOnly((v) => !v)}
                  />
                }
                topBar={
                  <GlassTopBar
                    query={catalog.query}
                    onQueryChange={catalog.setQuery}
                    placeholder="Search magazines, Majid, Al-Arabi, Nintendo Power, BYTE, Wired..."
                    language={catalog.language}
                    languages={LANGUAGES}
                    onLanguageChange={(id) => {
                      catalog.setLanguage(id);
                      catalog.setPage(1);
                    }}
                    genres={MAGAZINE_CATEGORIES}
                    activeGenre={catalog.category}
                    onGenreChange={(id) => {
                      bookmarks.setShowSavedOnly(false);
                      catalog.setCategory(id);
                      catalog.setPage(1);
                    }}
                    sortOrder={catalog.sortOrder}
                    sortOptions={SORT_OPTIONS}
                    onSortChange={catalog.setSortOrder}
                    extFilter={catalog.extFilter}
                    formatOptions={FORMAT_FILTERS}
                    onFormatChange={(id) => {
                      catalog.setExtFilter(id);
                      catalog.setPage(1);
                    }}
                    savedCount={bookmarks.savedIds.size}
                    showSavedOnly={bookmarks.showSavedOnly}
                    onToggleSavedOnly={() => bookmarks.setShowSavedOnly((v) => !v)}
                    resultCount={displayedMagazines.length}
                    onClose={onClose}
                  />
                }
              >
                <BooksGrid
                  books={displayedMagazines}
                  loading={catalog.loading}
                  loadingMore={catalog.loadingMore}
                  showSavedOnly={bookmarks.showSavedOnly}
                  savedIds={bookmarks.savedIds}
                  probedAudioMap={{}}
                  canSwitchToAudiobook={false}
                  onOpenReader={(m) => void openMagazineReader(m)}
                  onToggleBookmark={bookmarks.toggleBookmark}
                  onSwitchToAudiobook={() => {}}
                  onLoadMore={catalog.handleLoadMore}
                  onResetFilters={() => {
                    bookmarks.setShowSavedOnly(false);
                    catalog.setQuery('');
                    catalog.setCategory('featured');
                    catalog.setLanguage('all');
                    catalog.setExtFilter('all');
                  }}
                />
              </CatalogShell>
            </div>
          ) : (
            <BookReader
              book={selectedMagazine}
              resolveResult={resolveResult}
              resolving={resolving}
              hasAudio={false}
              onClose={closeMagazineReader}
              onEmptySpaceClick={handleStageEmptySpaceClick}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MagazinesPage;
