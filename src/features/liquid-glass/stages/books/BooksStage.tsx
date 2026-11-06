/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Atom,
  BookOpen,
  Compass,
  Eye,
  Feather,
  Flame,
  Globe,
  Landmark,
  Layers,
  Orbit,
  Sparkles,
} from 'lucide-react';
import {
  type AudiobookItem,
  type BookItem,
  type BookResolveResult,
  getInstantAudiobookMatchForBook,
  probeAudiobookForBook,
  resolveBookDetails,
} from '../../booksAudioService';
import { useIsTouch } from '../../../../hooks/useMediaQuery';
import { useBackToClose } from '../../../../hooks/useBackToClose';
import { GlassTopBar } from '../../shared/GlassTopBar';
import { BooksGrid } from './components/BooksGrid';
import { BookReader } from './components/BookReader';
import { useBooksCatalog } from './hooks/useBooksCatalog';
import { useBookmarks } from './hooks/useBookmarks';
import '../../shared/glass.css';
import './books.css';

export interface BooksStageProps {
  onBackToOrbs: () => void;
  initialSearchQuery?: string;
  initialSelectedBook?: BookItem | null;
  onSwitchToAudiobook?: (query: string, matchedAudiobook?: AudiobookItem) => void;
}

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: Sparkles },
  { id: 'arabic', label: 'Arabic Classics', icon: Globe },
  { id: 'literature', label: 'Literature', icon: Feather },
  { id: 'manga', label: 'Manga', icon: Layers },
  { id: 'history', label: 'History', icon: Landmark },
  { id: 'scifi', label: 'Sci-Fi', icon: Orbit },
  { id: 'philosophy', label: 'Philosophy', icon: Compass },
  { id: 'mystery', label: 'Mystery', icon: Eye },
  { id: 'science', label: 'Science', icon: Atom },
  { id: 'fantasy', label: 'Fantasy', icon: Flame },
  { id: 'biography', label: 'Biography', icon: BookOpen },
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
  { id: 'all', label: 'All Formats' },
  { id: 'inapp', label: 'Direct Read' },
  { id: 'pdf', label: 'PDF' },
  { id: 'epub', label: 'EPUB' },
] as const;

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'Newest Release' },
  { id: 'classic', label: 'Classic Era' },
] as const;

export const BooksStage: React.FC<BooksStageProps> = ({
  onBackToOrbs,
  initialSearchQuery = '',
  initialSelectedBook = null,
  onSwitchToAudiobook,
}) => {
  const isTouch = useIsTouch();
  const catalog = useBooksCatalog(initialSearchQuery);
  const bookmarks = useBookmarks();

  const [selectedBook, setSelectedBook] = useState<BookItem | null>(initialSelectedBook);
  const [resolveResult, setResolveResult] = useState<BookResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [isMorphingOut, setIsMorphingOut] = useState(false);

  const openBookReader = useCallback(
    async (book: BookItem) => {
      setSelectedBook(book);
      setResolving(true);
      setResolveResult(null);

      probeAudiobookForBook(book)
        .then((found) => {
          if (found) {
            catalog.setProbedAudioMap((prev) => ({ ...prev, [book.id]: found }));
          }
        })
        .catch(() => {});

      try {
        const res = await resolveBookDetails(book);
        setResolveResult(res);
      } catch {
        /* ignore */
      } finally {
        setResolving(false);
      }
    },
    [catalog],
  );

  const closeBookReader = useCallback(() => {
    setSelectedBook(null);
  }, []);

  // Bind Android/Mobile hardware Back button to close the book reader first
  useBackToClose(Boolean(selectedBook), closeBookReader);

  const openedInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialSelectedBook && openedInitialRef.current !== initialSelectedBook.id) {
      openedInitialRef.current = initialSelectedBook.id;
      void openBookReader(initialSelectedBook);
    }
  }, [initialSelectedBook, openBookReader]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedBook) {
        e.stopPropagation();
        e.preventDefault();
        closeBookReader();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedBook, closeBookReader]);

  const triggerSwitchToAudiobook = useCallback(
    async (book: BookItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!onSwitchToAudiobook) return;
      setIsMorphingOut(true);
      const instant = getInstantAudiobookMatchForBook(book);
      let matched: AudiobookItem | undefined =
        catalog.probedAudioMap[book.id] ?? instant.matchedAudiobook ?? undefined;
      if (!matched) {
        try {
          matched = (await probeAudiobookForBook(book)) ?? undefined;
        } catch {
          /* ignore */
        }
      }
      setTimeout(() => {
        onSwitchToAudiobook(matched?.title || instant.searchQuery || book.title, matched);
      }, 240);
    },
    [onSwitchToAudiobook, catalog.probedAudioMap],
  );

  const displayedBooks = useMemo(() => {
    const base = bookmarks.showSavedOnly ? bookmarks.savedBooksCache : catalog.books;
    if (catalog.sortOrder === 'newest') {
      return [...base].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    }
    if (catalog.sortOrder === 'classic') {
      return [...base].sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
    }
    return base;
  }, [
    bookmarks.showSavedOnly,
    bookmarks.savedBooksCache,
    catalog.books,
    catalog.sortOrder,
  ]);

  // Disable empty-space exit on touch screens to prevent accidental closes when scrolling
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
        target.closest('.lg-reader-stage-card')
      ) {
        return;
      }
      if (selectedBook) {
        closeBookReader();
      } else {
        onBackToOrbs();
      }
    },
    [isTouch, selectedBook, closeBookReader, onBackToOrbs],
  );

  const selectedHasAudio = useMemo(() => {
    if (!selectedBook) return false;
    return Boolean(
      catalog.probedAudioMap[selectedBook.id] ||
        getInstantAudiobookMatchForBook(selectedBook).hasAudio,
    );
  }, [selectedBook, catalog.probedAudioMap]);

  return (
    <div
      className={`lg-stage-root lg-books-stage-root${
        isMorphingOut ? ' lg-books-stage-root--morph-out' : ''
      }`}
      dir="ltr"
      onClick={handleStageEmptySpaceClick}
    >
      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (selectedBook) closeBookReader();
          else onBackToOrbs();
        }}
        aria-label={selectedBook ? 'Back to Books' : 'Back to Portal Orbs'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {!selectedBook ? (
        <div
          className="lg-stage-scroll lg-books-catalog-scroll"
          onClick={handleStageEmptySpaceClick}
        >
          <GlassTopBar
            query={catalog.query}
            onQueryChange={catalog.setQuery}
            placeholder="Search books, authors, ISBN..."
            language={catalog.language}
            languages={LANGUAGES}
            onLanguageChange={(id) => {
              catalog.setLanguage(id);
              catalog.setPage(1);
            }}
            genres={CATEGORIES}
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
          />

          <BooksGrid
            books={displayedBooks}
            loading={catalog.loading}
            loadingMore={catalog.loadingMore}
            showSavedOnly={bookmarks.showSavedOnly}
            savedIds={bookmarks.savedIds}
            probedAudioMap={catalog.probedAudioMap}
            canSwitchToAudiobook={Boolean(onSwitchToAudiobook)}
            onOpenReader={(b) => void openBookReader(b)}
            onToggleBookmark={bookmarks.toggleBookmark}
            onSwitchToAudiobook={(b, e) => void triggerSwitchToAudiobook(b, e)}
            onLoadMore={catalog.handleLoadMore}
            onResetFilters={() => {
              bookmarks.setShowSavedOnly(false);
              catalog.setQuery('');
              catalog.setCategory('trending');
              catalog.setLanguage('all');
              catalog.setExtFilter('all');
            }}
          />
        </div>
      ) : (
        <BookReader
          book={selectedBook}
          resolveResult={resolveResult}
          resolving={resolving}
          hasAudio={selectedHasAudio && Boolean(onSwitchToAudiobook)}
          onSwitchToAudiobook={
            onSwitchToAudiobook
              ? () => void triggerSwitchToAudiobook(selectedBook)
              : undefined
          }
          onClose={closeBookReader}
          onEmptySpaceClick={handleStageEmptySpaceClick}
        />
      )}
    </div>
  );
};
