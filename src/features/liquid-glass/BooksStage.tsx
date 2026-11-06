/**
 * src/features/liquid-glass/BooksStage.tsx
 *
 * Pure Liquid Glass Books Stage & Full-Screen Eye-Comfort Reader:
 *  - Mounts directly over the portal's responsive background image (no opaque dark/slate window).
 *  - 100% English UI with monochrome vector icons (zero emojis, zero source/provider clutter).
 *  - Streamlined Top Bar: 1 row on Desktop, 2 rows on Mobile — Search capsule, expandable Language
 *    branch pill (default: All Languages), Genre chips with monochrome icons (Manga, History, Sci-Fi, etc.),
 *    and expandable Sort/Era & Format selectors.
 *  - Every book poster is framed by an ultra-thin luminous Liquid Glass rim (.lg-main-glass__caustic + .lg-main-glass__rim)
 *    with a separate floating Liquid Glass capsule (.lg-track-tube) underneath.
 *  - Split 50/50 Action Pill:
 *      • When both Readable & Audio editions exist: splits 50/50 into Vibrant Emerald Green [Eye · Read]
 *        and Royal Violet [Headphones · Listen].
 *      • When only Readable edition exists: full-width Vibrant Emerald Green [Eye · Read].
 *  - Full-Stage Reader (96vw × 90dvh) with 1-Tap Eye-Comfort Mode (turns surround #000000 pure black
 *    and applies a warm blue-light filter to the book pages, resetting automatically on exit).
 *  - Smart Empty-Space Click: Reader surround -> Catalog Grid -> 4 Orbs Stage.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Atom,
  BookOpen,
  Bookmark,
  ChevronDown,
  Compass,
  Download,
  ExternalLink,
  Eye,
  Feather,
  FileText,
  Flame,
  Headphones,
  Landmark,
  Languages,
  Layers,
  Maximize2,
  Minimize2,
  Orbit,
  RefreshCw,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type AudiobookItem,
  type BookItem,
  type BookResolveResult,
  fetchAudiobooksCatalog,
  fetchTrendingBooks,
  getBookArtisticPalette,
  getCachedBooksCatalogSync,
  getInstantAudiobookMatchForBook,
  probeAudiobookForBook,
  resolveBookDetails,
  searchAllBooks,
} from './booksAudioService';

export interface BooksStageProps {
  onBackToOrbs: () => void;
  initialSearchQuery?: string;
  initialSelectedBook?: BookItem | null;
  onSwitchToAudiobook?: (query: string, matchedAudiobook?: AudiobookItem) => void;
}

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: Sparkles },
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
  { id: 'all', label: 'All Languages', short: 'All' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ar', label: 'Arabic', short: 'AR' },
  { id: 'fr', label: 'French', short: 'FR' },
  { id: 'es', label: 'Spanish', short: 'ES' },
  { id: 'de', label: 'German', short: 'DE' },
  { id: 'ja', label: 'Japanese', short: 'JA' },
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

const BOOKMARKS_KEY = 'nl_liquid_glass_saved_books_v3';

export const BooksStage: React.FC<BooksStageProps> = ({
  onBackToOrbs,
  initialSearchQuery = '',
  initialSelectedBook = null,
  onSwitchToAudiobook,
}) => {
  const [query, setQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [category, setCategory] = useState<string>('trending');
  const [language, setLanguage] = useState<string>('all');
  const [extFilter, setExtFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('popular');
  const [page, setPage] = useState<number>(1);

  // Expandable top-bar branch states
  const [langExpanded, setLangExpanded] = useState(false);
  const [sortExpanded, setSortExpanded] = useState(false);
  const [formatExpanded, setFormatExpanded] = useState(false);
  const topbarRef = useRef<HTMLElement | null>(null);

  // Click-outside listener for topbar popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setLangExpanded(false);
        setSortExpanded(false);
        setFormatExpanded(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Instant 0ms initialization from Super Cache
  const [books, setBooks] = useState<BookItem[]>(() => {
    return (
      getCachedBooksCatalogSync({
        q: initialSearchQuery,
        period: 'weekly',
        category: 'trending',
        lang: 'all',
        ext: 'all',
        page: 1,
      }) || []
    );
  });
  const [loading, setLoading] = useState<boolean>(() => books.length === 0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Saved bookmarks in localStorage
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [savedBooksCache, setSavedBooksCache] = useState<BookItem[]>(() => {
    try {
      const raw = localStorage.getItem(`${BOOKMARKS_KEY}_items`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Selected Book & Full-Stage Reader state
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(initialSelectedBook);
  const [resolveResult, setResolveResult] = useState<BookResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [readerZoom, setReaderZoom] = useState<number>(100);
  const [readerFullscreen, setReaderFullscreen] = useState<boolean>(false);
  const [showFsControls, setShowFsControls] = useState<boolean>(false);
  // One-Tap Eye-Comfort Mode (turns surround #000000 black & filters blue light on pages)
  const [eyeComfortMode, setEyeComfortMode] = useState<boolean>(false);

  // Cross-stage morph transition state
  const [isMorphingOut, setIsMorphingOut] = useState(false);

  // Live probed audiobook matches per book ID
  const [probedAudioMap, setProbedAudioMap] = useState<Record<string, AudiobookItem>>({});

  // Pre-warm audiobook cross-link index silently on mount
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchAudiobooksCatalog({ genre: 'popular', page: 1, signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Sync external initialSearchQuery or initialSelectedBook when jumping from AudiobooksStage
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== query) {
      setQuery(initialSearchQuery);
      setDebouncedQuery(initialSearchQuery);
      setPage(1);
    }
  }, [initialSearchQuery, query]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch Books Catalog (Super Cache first, then network)
  const loadBooks = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else {
        const instant = getCachedBooksCatalogSync({
          q: debouncedQuery,
          period: 'weekly',
          category,
          lang: language,
          ext: extFilter,
          page: targetPage,
        });
        if (instant && instant.length > 0) {
          setBooks(instant);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const results = debouncedQuery
          ? await searchAllBooks({
              q: debouncedQuery,
              category: category === 'trending' ? 'all' : category,
              lang: language,
              ext: extFilter,
              page: targetPage,
              signal,
            })
          : await fetchTrendingBooks({
              period: 'weekly',
              category,
              lang: language,
              ext: extFilter,
              page: targetPage,
              signal,
            });

        if (signal?.aborted) return;
        setBooks((prev) => {
          if (!append) return results;
          const seen = new Set(prev.map((b) => b.id));
          return [...prev, ...results.filter((b) => !seen.has(b.id))];
        });
      } catch {
        /* ignore */
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, category, language, extFilter],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void loadBooks(1, false, ctrl.signal);
    return () => ctrl.abort();
  }, [loadBooks]);

  // Background probe audiobook counterparts for top visible books
  useEffect(() => {
    if (books.length === 0) return undefined;
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      const candidates = books.slice(0, 8);
      for (const b of candidates) {
        if (cancelled) break;
        const instant = getInstantAudiobookMatchForBook(b);
        if (instant.matchedAudiobook) {
          setProbedAudioMap((prev) => ({ ...prev, [b.id]: instant.matchedAudiobook! }));
          continue;
        }
        if (debouncedQuery || instant.hasAudio) {
          const found = await probeAudiobookForBook(b, ctrl.signal);
          if (!cancelled && found) {
            setProbedAudioMap((prev) => ({ ...prev, [b.id]: found }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [books, debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setPage(next);
    void loadBooks(next, true);
  }, [loading, loadingMore, page, loadBooks]);

  const toggleBookmark = useCallback((book: BookItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(book.id)) {
        next.delete(book.id);
      } else {
        next.add(book.id);
      }
      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });

    setSavedBooksCache((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      const next = exists ? prev.filter((b) => b.id !== book.id) : [book, ...prev];
      try {
        localStorage.setItem(`${BOOKMARKS_KEY}_items`, JSON.stringify(next.slice(0, 100)));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Open Book in Full-Stage Liquid Glass Reader
  const openBookReader = useCallback(async (book: BookItem) => {
    setSelectedBook(book);
    setResolving(true);
    setResolveResult(null);
    setReaderZoom(100);
    setReaderFullscreen(false);
    setEyeComfortMode(false);

    probeAudiobookForBook(book)
      .then((found) => {
        if (found) {
          setProbedAudioMap((prev) => ({ ...prev, [book.id]: found }));
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
  }, []);

  // Automatically open initialSelectedBook if passed from AudiobooksStage cross-navigation
  const openedInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialSelectedBook && openedInitialRef.current !== initialSelectedBook.id) {
      openedInitialRef.current = initialSelectedBook.id;
      void openBookReader(initialSelectedBook);
    }
  }, [initialSelectedBook, openBookReader]);

  // Close Reader and automatically restore Eye-Comfort Mode to normal
  const closeBookReader = useCallback(() => {
    setEyeComfortMode(false);
    setReaderFullscreen(false);
    setSelectedBook(null);
  }, []);

  // Escape key closes open reader first, then returns to Orbs
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

  // Animated cross-stage transition to Audiobook version
  const triggerSwitchToAudiobook = useCallback(
    async (book: BookItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!onSwitchToAudiobook) return;
      setIsMorphingOut(true);
      const instant = getInstantAudiobookMatchForBook(book);
      let matched: AudiobookItem | undefined = probedAudioMap[book.id] ?? instant.matchedAudiobook ?? undefined;
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
    [onSwitchToAudiobook, probedAudioMap],
  );

  const displayedBooks = useMemo(() => {
    const base = showSavedOnly ? savedBooksCache : books;
    if (sortOrder === 'newest') {
      return [...base].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    }
    if (sortOrder === 'classic') {
      return [...base].sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
    }
    return base;
  }, [showSavedOnly, savedBooksCache, books, sortOrder]);

  // Compute best embedded reader URL
  const activeEmbedUrl = useMemo(() => {
    if (!selectedBook) return '';
    const fmts = {
      ...(selectedBook.directReadFormats || {}),
      ...(resolveResult?.directReadFormats || {}),
    };
    if (fmts.embed) return fmts.embed;
    if (selectedBook.iaId || resolveResult?.iaId) {
      const id = resolveResult?.iaId || selectedBook.iaId;
      return `https://archive.org/embed/${encodeURIComponent(id!)}?ui=embed`;
    }
    if (fmts.pdf) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fmts.pdf)}`;
    }
    if (fmts.html) return fmts.html;
    if (fmts.preview) return fmts.preview;
    if (selectedBook.isbn || resolveResult?.isbn) {
      const isbn = resolveResult?.isbn || selectedBook.isbn;
      return `https://openlibrary.org/isbn/${encodeURIComponent(isbn!)}`;
    }
    return `https://archive.org/details/texts?and%5B%5D=${encodeURIComponent(selectedBook.title)}`;
  }, [selectedBook, resolveResult]);

  // Best direct download link
  const bestDownloadUrl = useMemo(() => {
    if (!selectedBook) return '';
    const fmts = {
      ...(selectedBook.directReadFormats || {}),
      ...(resolveResult?.directReadFormats || {}),
    };
    if (fmts.pdf) return fmts.pdf;
    if (fmts.epub) return fmts.epub;
    if (resolveResult?.mirrors && resolveResult.mirrors.length > 0) {
      return resolveResult.mirrors[0].url;
    }
    if (selectedBook.iaId) {
      return `https://archive.org/details/${encodeURIComponent(selectedBook.iaId)}`;
    }
    return `https://annas-archive.gl/search?q=${encodeURIComponent(selectedBook.title)}`;
  }, [selectedBook, resolveResult]);

  const activeLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const activeSortObj = SORT_OPTIONS.find((s) => s.id === sortOrder) || SORT_OPTIONS[0];
  const activeFormatObj = FORMAT_FILTERS.find((f) => f.id === extFilter) || FORMAT_FILTERS[0];

  // Smart Empty-Space Click Handler:
  // If clicking directly on empty background space, step back from Reader -> Grid, or Grid -> 4 Orbs
  const handleStageEmptySpaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    [selectedBook, closeBookReader, onBackToOrbs],
  );

  return (
    <div
      className={`lg-books-stage-root${isMorphingOut ? ' lg-books-stage-root--morph-out' : ''}`}
      dir="ltr"
      onClick={handleStageEmptySpaceClick}
    >
      <style>{BOOKS_LIQUID_GLASS_STYLES}</style>

      {/* Top-Left Contextual Back Button (Reader -> Grid, or Grid -> 4 Orbs) */}
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

      {/* ====================================================================
       * VIEW 1: STREAMLINED LIQUID GLASS TOP BAR + FLOATING POSTERS & CAPSULES
       * ==================================================================== */}
      {!selectedBook && (
        <div className="lg-books-catalog-scroll" onClick={handleStageEmptySpaceClick}>
          {/* Streamlined Top Bar: 1 Row on Desktop, 2 Rows on Mobile */}
          <header className="lg-topbar-shell" ref={topbarRef} onClick={(e) => e.stopPropagation()}>
            {/* Row 1 (Desktop left-to-center / Mobile Row 1): Search + Expandable Language + Saved + Sort/Format */}
            <div className="lg-topbar-primary-row">
              {/* Search Input Capsule */}
              <div className="lg-track-tube lg-search-capsule">
                <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                <Search size={15} className="lg-search-capsule__icon" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search books, authors, ISBN..."
                  className="lg-search-capsule__input"
                  aria-label="Search books"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="lg-glass-pill lg-search-capsule__clear"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Expandable Language Branch Pill (Default: All Languages) */}
              <div className="lg-branch-filter-group">
                <button
                  type="button"
                  onClick={() => {
                    setLangExpanded((v) => !v);
                    setSortExpanded(false);
                    setFormatExpanded(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill ${
                    language !== 'all' || langExpanded ? 'lg-filter-pill--active' : ''
                  }`}
                  title="Select Language"
                >
                  <Languages size={14} />
                  <span>{activeLangObj.label}</span>
                  <ChevronDown
                    size={13}
                    className={`lg-chevron-icon${langExpanded ? ' lg-chevron-icon--open' : ''}`}
                  />
                </button>

                {langExpanded && (
                  <div className="lg-branch-popover">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setLanguage(l.id);
                          setPage(1);
                          setLangExpanded(false);
                        }}
                        className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                          language === l.id ? 'lg-filter-pill--active' : ''
                        }`}
                      >
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Expandable Sort / Release Era Selector */}
              <div className="lg-branch-filter-group">
                <button
                  type="button"
                  onClick={() => {
                    setSortExpanded((v) => !v);
                    setLangExpanded(false);
                    setFormatExpanded(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill ${
                    sortOrder !== 'popular' || sortExpanded ? 'lg-filter-pill--active' : ''
                  }`}
                  title="Sort & Release Date"
                >
                  <ArrowUpDown size={13} />
                  <span>{activeSortObj.label}</span>
                  <ChevronDown
                    size={13}
                    className={`lg-chevron-icon${sortExpanded ? ' lg-chevron-icon--open' : ''}`}
                  />
                </button>

                {sortExpanded && (
                  <div className="lg-branch-popover">
                    {SORT_OPTIONS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSortOrder(s.id);
                          setSortExpanded(false);
                        }}
                        className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                          sortOrder === s.id ? 'lg-filter-pill--active' : ''
                        }`}
                      >
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Expandable Format Selector */}
              <div className="lg-branch-filter-group">
                <button
                  type="button"
                  onClick={() => {
                    setFormatExpanded((v) => !v);
                    setLangExpanded(false);
                    setSortExpanded(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill ${
                    extFilter !== 'all' || formatExpanded ? 'lg-filter-pill--active' : ''
                  }`}
                  title="File Format"
                >
                  <FileText size={13} />
                  <span>{activeFormatObj.label}</span>
                  <ChevronDown
                    size={13}
                    className={`lg-chevron-icon${formatExpanded ? ' lg-chevron-icon--open' : ''}`}
                  />
                </button>

                {formatExpanded && (
                  <div className="lg-branch-popover">
                    {FORMAT_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setExtFilter(f.id);
                          setPage(1);
                          setFormatExpanded(false);
                        }}
                        className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                          extFilter === f.id ? 'lg-filter-pill--active' : ''
                        }`}
                      >
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Bookmarks Toggle */}
              <button
                type="button"
                onClick={() => setShowSavedOnly((v) => !v)}
                className={`lg-glass-pill lg-filter-pill ${
                  showSavedOnly ? 'lg-filter-pill--active' : ''
                }`}
                title="Saved Books"
              >
                <Bookmark size={13} fill={showSavedOnly ? 'currentColor' : 'none'} />
                <span>Saved ({savedIds.size})</span>
              </button>
            </div>

            {/* Row 2 (Inline on wide Desktop, Row 2 on Mobile): Monochrome-Icon Genre Pills */}
            <div className="lg-topbar-genres-row">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = !showSavedOnly && category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setShowSavedOnly(false);
                      setCategory(cat.id);
                      setPage(1);
                    }}
                    className={`lg-glass-pill lg-filter-pill ${
                      active ? 'lg-filter-pill--active' : ''
                    }`}
                  >
                    <Icon size={13} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* Books Grid Mounted Directly Over Portal Background Image */}
          {loading ? (
            <div className="lg-books-grid">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="lg-book-unit lg-book-unit--skeleton">
                  <div className="lg-book-poster-frame lg-book-poster-frame--skeleton">
                    <span className="lg-main-glass__caustic" aria-hidden="true" />
                    <span className="lg-main-glass__rim" aria-hidden="true" />
                  </div>
                  <div className="lg-track-tube lg-book-info-capsule lg-book-info-capsule--skeleton">
                    <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedBooks.length === 0 ? (
            <div className="lg-empty-glass-state">
              <div className="lg-track-tube lg-empty-glass-capsule">
                <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                <BookOpen size={30} className="lg-empty-glass-icon" />
                <p className="lg-empty-glass-title">
                  {showSavedOnly ? 'No saved books yet' : 'No matching books found'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedOnly(false);
                    setQuery('');
                    setCategory('trending');
                    setLanguage('all');
                    setExtFilter('all');
                  }}
                  className="lg-glass-pill lg-filter-pill lg-filter-pill--active"
                >
                  <RefreshCw size={14} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="lg-books-grid" role="list">
                {displayedBooks.map((book, idx) => {
                  const [c1, c2, c3] = getBookArtisticPalette(book.title + book.author);
                  const isSaved = savedIds.has(book.id);
                  const instantAudio = getInstantAudiobookMatchForBook(book);
                  const matchedAudio = probedAudioMap[book.id] || instantAudio.matchedAudiobook;
                  const hasAudioVersion = Boolean(matchedAudio || instantAudio.hasAudio);

                  return (
                    <article
                      key={book.id}
                      role="listitem"
                      className="lg-book-unit"
                      style={{ '--card-idx': idx % 24 } as React.CSSProperties}
                    >
                      {/* 1. Poster with Thin Luminous Liquid Glass Rim */}
                      <div
                        className="lg-book-poster-frame"
                        onClick={() => void openBookReader(book)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Read ${book.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void openBookReader(book);
                          }
                        }}
                      >
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="lg-book-poster-img"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}

                        {/* Artistic Fallback Cover */}
                        <div
                          className="lg-book-poster-fallback"
                          style={{
                            background: `linear-gradient(145deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
                          }}
                        >
                          <BookOpen size={26} className="lg-book-poster-fallback__icon" />
                          <span className="lg-book-poster-fallback__title">{book.title}</span>
                          <span className="lg-book-poster-fallback__author">{book.author}</span>
                        </div>

                        {/* Ultra-thin Liquid Glass Rim & Caustic Specular Border */}
                        <span className="lg-main-glass__caustic" aria-hidden="true" />
                        <span className="lg-main-glass__rim" aria-hidden="true" />
                        <span className="lg-main-glass__sheen" aria-hidden="true" />

                        {/* Floating Top-Right Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(book, e)}
                          className={`lg-glass-pill lg-poster-float-badge ${
                            isSaved ? 'lg-poster-float-badge--saved' : ''
                          }`}
                          aria-label={isSaved ? 'Remove bookmark' : 'Save book'}
                        >
                          <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* 2. Separate Floating Liquid Glass Capsule Underneath the Poster */}
                      <div
                        className="lg-track-tube lg-book-info-capsule"
                        onClick={() => void openBookReader(book)}
                      >
                        <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                        <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                        <h3 className="lg-book-capsule-title" title={book.title}>
                          {book.title}
                        </h3>
                        <p className="lg-book-capsule-author" title={book.author}>
                          {book.author}
                          {book.year ? ` · ${book.year}` : ''}
                        </p>

                        {/* Action Bar:
                            - If BOTH Read & Audio exist: Split 50/50 Capsule [ Emerald Eye (Read) | Violet Headphones (Listen) ]
                            - If ONLY Read exists: Full-width Emerald Eye (Read) */}
                        <div className="lg-book-capsule-actions">
                          {hasAudioVersion && onSwitchToAudiobook ? (
                            <div className="lg-dual-split-pill" role="group" aria-label="Read or Listen">
                              <button
                                type="button"
                                className="lg-dual-split-pill__half lg-dual-split-pill__half--read"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void openBookReader(book);
                                }}
                                title="Read Book"
                              >
                                <Eye size={14} strokeWidth={2.2} />
                                <span>Read</span>
                              </button>
                              <span className="lg-dual-split-pill__divider" aria-hidden="true" />
                              <button
                                type="button"
                                className="lg-dual-split-pill__half lg-dual-split-pill__half--audio"
                                onClick={(e) => void triggerSwitchToAudiobook(book, e)}
                                title="Listen to Audiobook"
                              >
                                <Headphones size={14} strokeWidth={2.2} />
                                <span>Audio</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="lg-single-read-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openBookReader(book);
                              }}
                              title="Read Book"
                            >
                              <Eye size={14} strokeWidth={2.2} />
                              <span>Read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Load More Floating Glass Button */}
              {!showSavedOnly && displayedBooks.length >= 12 && (
                <div className="lg-load-more-row">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="lg-glass-pill lg-load-more-pill"
                  >
                    <RefreshCw size={15} className={loadingMore ? 'lg-spin' : ''} />
                    <span>{loadingMore ? 'Loading...' : 'Load More Books'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====================================================================
       * VIEW 2: LARGE FULL-STAGE BOOK READER + 1-TAP EYE-COMFORT MODE
       * ==================================================================== */}
      {selectedBook && (
        <div
          className={`lg-reader-workspace${
            readerFullscreen ? ' lg-reader-workspace--fullscreen' : ''
          }${eyeComfortMode ? ' lg-reader-workspace--eye-comfort' : ''}`}
          onClick={handleStageEmptySpaceClick}
        >
          {/* Edge-to-Edge Fullscreen Floating Sensor Bar (Reveals on Hover at Top / Tap on Mobile) */}
          {readerFullscreen ? (
            <div
              className="lg-fs-top-sensor"
              onMouseEnter={() => setShowFsControls(true)}
              onMouseLeave={() => setShowFsControls(false)}
              onClick={(e) => {
                e.stopPropagation();
                setShowFsControls((v) => !v);
              }}
            >
              <div
                className={`lg-fs-floating-bar lg-track-tube ${
                  showFsControls ? 'lg-fs-floating-bar--visible' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                <span className="lg-fs-title" title={selectedBook.title}>
                  {selectedBook.title}
                </span>

                <div className="lg-reader-toolbar__controls">
                  <button
                    type="button"
                    onClick={() => setEyeComfortMode((v) => !v)}
                    className={`lg-glass-pill lg-filter-pill ${
                      eyeComfortMode ? 'lg-filter-pill--eye-active' : ''
                    }`}
                    aria-pressed={eyeComfortMode}
                    title="Eye-Comfort Mode"
                  >
                    <Eye size={14} />
                    <span>{eyeComfortMode ? 'Eye Comfort On' : 'Eye Comfort'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReaderZoom((z) => Math.max(80, z - 10))}
                    className="lg-glass-pill lg-icon-round-btn"
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="lg-reader-zoom-label">{readerZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setReaderZoom((z) => Math.min(150, z + 10))}
                    className="lg-glass-pill lg-icon-round-btn"
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setReaderFullscreen(false)}
                    className="lg-glass-pill lg-icon-round-btn"
                    aria-label="Exit fullscreen"
                    title="Exit Fullscreen"
                  >
                    <Minimize2 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={closeBookReader}
                    className="lg-glass-pill lg-icon-round-btn"
                    aria-label="Close reader"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Floating Liquid Glass Reader Control Bar */
            <div className="lg-track-tube lg-reader-toolbar" onClick={(e) => e.stopPropagation()}>
              <span className="lg-orb-capsule-caustic" aria-hidden="true" />
              <span className="lg-orb-capsule-sheen" aria-hidden="true" />

              <div className="lg-reader-toolbar__meta">
                <h2 className="lg-reader-toolbar__title">{selectedBook.title}</h2>
                <p className="lg-reader-toolbar__author">
                  {selectedBook.author}
                  {selectedBook.year ? ` · ${selectedBook.year}` : ''}
                </p>
              </div>

              <div className="lg-reader-toolbar__controls">
                {/* 1-Tap Eye-Comfort Mode Toggle (Pure Black Surround + Warm Blue-Light Filter on Pages) */}
                <button
                  type="button"
                  onClick={() => setEyeComfortMode((v) => !v)}
                  className={`lg-glass-pill lg-filter-pill ${
                    eyeComfortMode ? 'lg-filter-pill--eye-active' : ''
                  }`}
                  aria-pressed={eyeComfortMode}
                  title="Eye-Comfort Mode (Blue-Light Filter & Black Surround)"
                >
                  <Eye size={14} />
                  <span>{eyeComfortMode ? 'Eye Comfort On' : 'Eye Comfort'}</span>
                </button>

                {/* Cross-Link to Audiobook inside Reader if available */}
                {(probedAudioMap[selectedBook.id] ||
                  getInstantAudiobookMatchForBook(selectedBook).hasAudio) &&
                  onSwitchToAudiobook && (
                    <button
                      type="button"
                      onClick={(e) => void triggerSwitchToAudiobook(selectedBook, e)}
                      className="lg-glass-pill lg-filter-pill lg-filter-pill--audio-cta"
                      title="Switch to Audiobook Edition"
                    >
                      <Headphones size={13} />
                      <span>Audio Edition</span>
                    </button>
                  )}

                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setReaderZoom((z) => Math.max(80, z - 10))}
                  className="lg-glass-pill lg-icon-round-btn"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="lg-reader-zoom-label">{readerZoom}%</span>
                <button
                  type="button"
                  onClick={() => setReaderZoom((z) => Math.min(150, z + 10))}
                  className="lg-glass-pill lg-icon-round-btn"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setReaderFullscreen(true)}
                  className="lg-glass-pill lg-icon-round-btn"
                  aria-label="Fullscreen reader"
                  title="Fullscreen Reader"
                >
                  <Maximize2 size={14} />
                </button>

                {/* Direct Download */}
                {bestDownloadUrl && (
                  <a
                    href={bestDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg-glass-pill lg-filter-pill"
                    title="Download Full Book"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                )}

                {/* Close Reader */}
                <button
                  type="button"
                  onClick={closeBookReader}
                  className="lg-glass-pill lg-icon-round-btn"
                  aria-label="Close reader"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Full-Stage Embedded Book Page Reader */}
          <div
            className={`lg-reader-stage-card${
              eyeComfortMode ? ' lg-reader-stage-card--eye-comfort' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="lg-main-glass__caustic" aria-hidden="true" />
            <span className="lg-main-glass__rim" aria-hidden="true" />

            <div className="lg-embed-reader-wrap">
              {resolving && (
                <div className="lg-embed-loading-pill lg-glass-pill">
                  <RefreshCw size={14} className="lg-spin" />
                  <span>Loading Book Pages...</span>
                </div>
              )}

              <div
                className={`lg-embed-page-filter-layer${
                  eyeComfortMode ? ' lg-embed-page-filter-layer--warm' : ''
                }`}
              >
                <iframe
                  key={activeEmbedUrl}
                  src={activeEmbedUrl}
                  title={selectedBook.title}
                  className="lg-embed-reader-iframe"
                  style={{
                    transform: `scale(${readerZoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                  allow="fullscreen"
                />
              </div>

              <div className="lg-embed-bottom-bar">
                {resolveResult?.mirrors.slice(0, 3).map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg-glass-pill lg-filter-pill"
                  >
                    <ExternalLink size={12} />
                    <span>{m.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Scoped Liquid Glass Styles for BooksStage & Full-Stage Eye-Comfort Reader
// ============================================================================
const BOOKS_LIQUID_GLASS_STYLES = `
  .lg-books-stage-root {
    position: relative;
    z-index: 12;
    width: 100dvw;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    color: #ffffff;
    user-select: none;
    transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, filter 0.24s ease;
    animation: lgStageMorphIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .lg-books-stage-root--morph-out {
    opacity: 0;
    transform: perspective(1200px) rotateY(-14deg) scale(0.94);
    filter: blur(6px);
  }

  @keyframes lgStageMorphIn {
    0% {
      opacity: 0;
      transform: perspective(1200px) rotateY(12deg) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: perspective(1200px) rotateY(0deg) scale(1);
    }
  }

  .lg-books-catalog-scroll {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: max(18px, calc(env(safe-area-inset-top) + 12px)) clamp(14px, 3vw, 40px) 96px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
  }

  /* ── Streamlined Top Bar: 1 Row on Desktop (>= 1120px), 2 Compact Rows on Mobile/Tablet ── */
  .lg-topbar-shell {
    width: 100%;
    max-width: 1380px;
    padding-left: 52px;
    padding-right: 52px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 30;
  }

  @media (min-width: 1180px) {
    .lg-topbar-shell {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
  }

  .lg-topbar-primary-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .lg-topbar-genres-row {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding: 2px 2px 4px;
    scrollbar-width: none;
    min-width: 0;
  }

  .lg-topbar-genres-row::-webkit-scrollbar {
    display: none;
  }

  /* Search Capsule */
  .lg-search-capsule {
    position: relative;
    flex: 1 1 220px;
    min-width: 160px;
    max-width: 320px;
    height: 38px;
    padding: 0 12px !important;
    border-radius: 999px !important;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lg-search-capsule__icon {
    color: rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
    z-index: 3;
  }

  .lg-search-capsule__input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 0.82rem;
    font-weight: 700;
    z-index: 3;
  }

  .lg-search-capsule__input::placeholder {
    color: rgba(255, 255, 255, 0.65);
    font-weight: 600;
  }

  .lg-search-capsule__clear {
    width: 22px;
    height: 22px;
    padding: 0;
    cursor: pointer;
    z-index: 3;
    flex-shrink: 0;
  }

  /* Expandable Branch Filter Group (Language / Sort / Format) */
  .lg-branch-filter-group {
    position: relative;
    flex-shrink: 0;
    z-index: 40;
  }

  .lg-branch-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 120;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 210px;
    max-width: min(310px, 92vw);
    padding: 10px;
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.06) 100%),
      rgba(10, 15, 28, 0.88);
    -webkit-backdrop-filter: blur(24px) saturate(190%);
    backdrop-filter: blur(24px) saturate(190%);
    box-shadow:
      0 20px 48px rgba(0, 0, 0, 0.65),
      inset 0 1.4px 2px rgba(255, 255, 255, 0.85);
    animation: lgPopoverIn 0.16s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes lgPopoverIn {
    0% {
      opacity: 0;
      transform: translateY(-6px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .lg-chevron-icon {
    transition: transform 0.18s ease;
    opacity: 0.85;
  }

  .lg-chevron-icon--open {
    transform: rotate(180deg);
  }

  /* Liquid Glass Filter Pills */
  .lg-filter-pill {
    height: 34px;
    padding: 0 12px;
    font-size: 0.76rem;
    font-weight: 800;
    gap: 6px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.92);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  }

  .lg-filter-pill--sm {
    height: 30px;
    padding: 0 10px;
    font-size: 0.73rem;
  }

  .lg-filter-pill:hover {
    transform: translateY(-1px) scale(1.03);
  }

  .lg-filter-pill--active {
    color: #fff6c2 !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 215, 90, 0.16) 100%),
      rgba(20, 28, 44, 0.38) !important;
    box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.34),
      0 0 16px rgba(255, 220, 96, 0.35),
      inset 0 1.5px 2px #ffffff !important;
  }

  .lg-filter-pill--eye-active {
    color: #fde68a !important;
    background:
      linear-gradient(180deg, rgba(251, 191, 36, 0.34) 0%, rgba(217, 119, 6, 0.22) 100%),
      rgba(20, 16, 8, 0.72) !important;
    box-shadow:
      0 0 18px rgba(251, 191, 36, 0.45),
      inset 0 1.4px 2px rgba(255, 255, 255, 0.9) !important;
  }

  .lg-filter-pill--audio-cta {
    color: #f3e8ff !important;
    background:
      linear-gradient(180deg, rgba(168, 85, 247, 0.38) 0%, rgba(126, 34, 206, 0.24) 100%),
      rgba(28, 14, 48, 0.45) !important;
    box-shadow:
      0 10px 24px rgba(88, 28, 135, 0.38),
      inset 0 1.4px 1.8px rgba(255, 255, 255, 0.88) !important;
  }

  /* ── Books Grid: Poster Framed Only by Thin Glass Rim + Separate Capsule Below ── */
  .lg-books-grid {
    width: 100%;
    max-width: 1380px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
    gap: 22px 18px;
    padding-top: 4px;
  }

  /* Lightweight, stable cards with progressive entrance stagger and zero hover jitter */
  .lg-book-unit {
    display: flex;
    flex-direction: column;
    gap: 9px;
    animation: lgCardStaggerIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--card-idx, 0) * 80ms);
    will-change: opacity, transform;
  }

  @keyframes lgCardStaggerIn {
    0% {
      opacity: 0;
      transform: translateY(14px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lg-book-poster-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 22px;
    overflow: hidden;
    cursor: pointer;
    isolation: isolate;
    background: rgba(255, 255, 255, 0.04);
    box-shadow:
      0 18px 40px -12px rgba(0, 0, 0, 0.52),
      inset 0 1.6px 2.2px rgba(255, 255, 255, 0.88),
      inset 0 -1.5px 2.5px rgba(145, 210, 255, 0.28);
    transition: box-shadow 0.22s ease, border-color 0.22s ease;
  }

  /* Stable hover without layout-shifting transforms */
  .lg-book-unit:hover .lg-book-poster-frame {
    box-shadow:
      0 22px 48px -10px rgba(0, 0, 0, 0.65),
      0 0 18px rgba(180, 225, 255, 0.35),
      inset 0 1.8px 2.4px #ffffff,
      inset 0 -1.5px 2.5px rgba(145, 210, 255, 0.45);
  }

  .lg-book-poster-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 2;
  }

  .lg-book-poster-fallback {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
  }

  .lg-book-poster-fallback__icon {
    color: rgba(255, 255, 255, 0.85);
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
  }

  .lg-book-poster-fallback__title {
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.28;
    color: #ffffff;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .lg-book-poster-fallback__author {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lg-poster-float-badge {
    position: absolute;
    top: 9px;
    right: 9px;
    z-index: 8;
    width: 30px;
    height: 30px;
    padding: 0;
    cursor: pointer;
  }

  .lg-poster-float-badge--saved {
    color: #ffe880 !important;
  }

  /* Separate Floating Info Capsule Underneath Each Poster */
  .lg-book-info-capsule {
    padding: 10px 12px !important;
    border-radius: 18px !important;
    display: flex;
    flex-direction: column;
    gap: 3px;
    cursor: pointer;
  }

  .lg-book-capsule-title {
    position: relative;
    z-index: 2;
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.26;
    color: #fff3a8;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.65);
  }

  .lg-book-capsule-author {
    position: relative;
    z-index: 2;
    margin: 0;
    font-size: 0.71rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-book-capsule-actions {
    position: relative;
    z-index: 3;
    margin-top: 6px;
    width: 100%;
  }

  /* ── Split 50/50 Dual-Availability Liquid Glass Button (Emerald Eye + Violet Headphones) ── */
  .lg-dual-split-pill {
    position: relative;
    width: 100%;
    height: 31px;
    border-radius: 999px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: stretch;
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.32),
      inset 0 1.2px 1.6px rgba(255, 255, 255, 0.9);
  }

  .lg-dual-split-pill__half {
    border: none;
    height: 100%;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 0.71rem;
    font-weight: 800;
    color: #ffffff;
    cursor: pointer;
    transition: filter 0.18s ease, transform 0.18s ease;
    white-space: nowrap;
  }

  .lg-dual-split-pill__half:hover {
    filter: brightness(1.14);
  }

  .lg-dual-split-pill__half--read {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.78) 0%,
      rgba(5, 150, 105, 0.62) 100%
    );
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  }

  .lg-dual-split-pill__half--audio {
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.78) 0%,
      rgba(126, 34, 206, 0.64) 100%
    );
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  }

  .lg-dual-split-pill__divider {
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.65);
  }

  /* ── Single Read-Only Vibrant Emerald Green Liquid Glass Pill ── */
  .lg-single-read-pill {
    width: 100%;
    height: 31px;
    border-radius: 999px;
    border: none;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.73rem;
    font-weight: 800;
    color: #ffffff;
    cursor: pointer;
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.76) 0%,
      rgba(5, 150, 105, 0.58) 100%
    );
    box-shadow:
      0 6px 16px rgba(5, 150, 105, 0.28),
      inset 0 1.2px 1.6px rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
    transition: transform 0.18s ease, filter 0.18s ease;
  }

  .lg-single-read-pill:hover {
    transform: scale(1.02);
    filter: brightness(1.12);
  }

  /* Skeleton Loading */
  .lg-book-poster-frame--skeleton,
  .lg-book-info-capsule--skeleton {
    animation: lgGlassPulse 1.6s ease-in-out infinite;
  }

  .lg-book-info-capsule--skeleton {
    height: 68px;
  }

  @keyframes lgGlassPulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.85; }
  }

  .lg-load-more-row {
    display: flex;
    justify-content: center;
    padding: 14px 0 28px;
  }

  .lg-load-more-pill {
    height: 42px;
    padding: 0 24px;
    gap: 8px;
    font-size: 0.84rem;
    font-weight: 800;
    cursor: pointer;
  }

  /* Empty State */
  .lg-empty-glass-state {
    width: 100%;
    max-width: 420px;
    margin: 48px auto;
  }

  .lg-empty-glass-capsule {
    padding: 28px 24px !important;
    border-radius: 28px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .lg-empty-glass-icon {
    color: #ffe880;
  }

  .lg-empty-glass-title {
    margin: 0;
    font-size: 0.96rem;
    font-weight: 800;
    color: #ffffff;
  }

  /* ==========================================================================
   * FULL-STAGE LIQUID GLASS READER + ONE-TAP EYE-COMFORT MODE
   * ========================================================================== */
  .lg-reader-workspace {
    position: relative;
    width: 100%;
    height: 100%;
    padding: max(12px, env(safe-area-inset-top)) clamp(10px, 2vw, 24px) max(14px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    overflow: hidden;
    transition: background-color 0.28s ease;
  }

  .lg-reader-workspace--fullscreen {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
    z-index: 1000 !important;
    background: #000000;
  }

  .lg-reader-workspace--fullscreen .lg-reader-stage-card {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }

  /* Fullscreen Floating Top Sensor (Reveals on Hover / Tap) */
  .lg-fs-top-sensor {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    z-index: 2100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 10px;
    pointer-events: auto;
  }

  .lg-fs-floating-bar {
    opacity: 0;
    transform: translateY(-24px);
    transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    padding: 8px 18px !important;
    border-radius: 999px !important;
    display: flex;
    align-items: center;
    gap: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 100%),
      rgba(10, 14, 26, 0.90) !important;
    -webkit-backdrop-filter: blur(22px) saturate(190%);
    backdrop-filter: blur(22px) saturate(190%);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.72), inset 0 1.2px 1.8px rgba(255, 255, 255, 0.85);
  }

  .lg-fs-top-sensor:hover .lg-fs-floating-bar,
  .lg-fs-floating-bar--visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
    pointer-events: auto !important;
  }

  .lg-fs-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: #fff3a8;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* One-Tap Eye-Comfort Mode: turns everything outside the book pages pure #000000 black */
  .lg-reader-workspace--eye-comfort {
    background-color: #000000 !important;
  }

  .lg-reader-toolbar {
    width: 100%;
    max-width: 1380px;
    padding: 8px 16px 8px 54px !important;
    border-radius: 999px !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
    z-index: 25;
    transition: background 0.25s ease, box-shadow 0.25s ease;
  }

  .lg-reader-workspace--eye-comfort .lg-reader-toolbar {
    background: rgba(12, 12, 12, 0.92) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9), inset 0 1px 1px rgba(255, 255, 255, 0.22) !important;
  }

  .lg-reader-toolbar__meta {
    min-width: 0;
    flex: 1 1 200px;
  }

  .lg-reader-toolbar__title {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 800;
    color: #fff3a8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-reader-toolbar__author {
    margin: 1px 0 0;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-reader-toolbar__controls {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    z-index: 3;
  }

  .lg-icon-round-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    cursor: pointer;
  }

  .lg-reader-zoom-label {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    font-weight: 800;
    color: #ffe880;
    min-width: 36px;
    text-align: center;
  }

  /* Expanded Full-Viewport Reader Stage Card */
  .lg-reader-stage-card {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    max-width: 1380px;
    min-height: 0;
    border-radius: 26px;
    overflow: hidden;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(
        130% 100% at 20% 0%,
        rgba(255, 255, 255, 0.14) 0%,
        rgba(255, 255, 255, 0.02) 55%,
        transparent 100%
      ),
      rgba(8, 12, 22, 0.28);
    -webkit-backdrop-filter: blur(18px) saturate(165%);
    backdrop-filter: blur(18px) saturate(165%);
    box-shadow:
      0 28px 68px rgba(0, 0, 0, 0.52),
      inset 0 2px 3px rgba(255, 255, 255, 0.85),
      inset 0 -2px 3px rgba(135, 210, 255, 0.25);
  }

  .lg-reader-stage-card--eye-comfort {
    background: #000000 !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14) !important;
  }

  /* Embedded Full Reader Container */
  .lg-embed-reader-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .lg-embed-loading-pill {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    padding: 6px 14px;
    gap: 8px;
    font-size: 0.76rem;
    font-weight: 800;
  }

  .lg-embed-page-filter-layer {
    flex: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: filter 0.28s ease;
  }

  /* Warm low-blue-light filter applied exclusively to the book pages */
  .lg-embed-page-filter-layer--warm {
    filter: sepia(0.28) saturate(0.82) brightness(0.93) contrast(0.96);
  }

  .lg-embed-reader-iframe {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    background: rgba(250, 246, 238, 0.96);
  }

  .lg-embed-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 14px;
    background: rgba(10, 14, 24, 0.42);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  .lg-reader-workspace--eye-comfort .lg-embed-bottom-bar {
    background: #000000;
  }

  .lg-spin {
    animation: lgSpinAnim 1s linear infinite;
  }

  @keyframes lgSpinAnim {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 760px) {
    .lg-topbar-shell {
      padding-left: 44px;
      padding-right: 44px;
    }

    .lg-topbar-primary-row {
      flex-wrap: wrap;
    }

    .lg-search-capsule {
      flex: 1 1 100%;
      max-width: 100%;
    }

    .lg-books-grid {
      grid-template-columns: repeat(auto-fill, minmax(144px, 1fr));
      gap: 16px 12px;
    }

    .lg-reader-toolbar {
      border-radius: 22px !important;
      padding: 10px 12px 10px 48px !important;
    }
  }
`;
