/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCatalogShellTier } from './CatalogShell';
import { FilterControls } from './FilterControls';
import { FilterSheet } from './FilterSheet';
import { GenreNav } from './GenreNav';

export interface GenreChipItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export interface OptionItem {
  readonly id: string;
  readonly label: string;
}

export interface GlassTopBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  placeholder: string;
  language: string;
  languages: readonly OptionItem[];
  onLanguageChange: (id: string) => void;
  genres: readonly GenreChipItem[];
  activeGenre: string;
  onGenreChange: (id: string) => void;
  sortOrder?: string;
  sortOptions?: readonly OptionItem[];
  onSortChange?: (id: string) => void;
  extFilter?: string;
  formatOptions?: readonly OptionItem[];
  onFormatChange?: (id: string) => void;
  savedCount?: number;
  showSavedOnly?: boolean;
  onToggleSavedOnly?: () => void;
  externalMuted?: boolean;
  onToggleMute?: () => void;
  resultCount?: number;
}

export const GlassTopBar: React.FC<GlassTopBarProps> = ({
  query,
  onQueryChange,
  placeholder,
  language,
  languages,
  onLanguageChange,
  genres,
  activeGenre,
  onGenreChange,
  sortOrder,
  sortOptions,
  onSortChange,
  extFilter,
  formatOptions,
  onFormatChange,
  savedCount,
  showSavedOnly,
  onToggleSavedOnly,
  externalMuted,
  onToggleMute,
  resultCount,
}) => {
  const tier = useCatalogShellTier();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const defaultGenreId = genres[0]?.id || 'trending';
  const defaultLangId = languages[0]?.id || 'all';
  const defaultSortId = sortOptions?.[0]?.id || 'popular';
  const defaultFormatId = formatOptions?.[0]?.id || 'all';

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onClear: () => void }> = [];

    if (showSavedOnly && onToggleSavedOnly) {
      chips.push({
        id: 'saved',
        label: 'Saved Only',
        onClear: () => onToggleSavedOnly(),
      });
    } else if (activeGenre && activeGenre !== defaultGenreId) {
      const found = genres.find((g) => g.id === activeGenre);
      if (found) {
        chips.push({
          id: `genre:${found.id}`,
          label: found.label,
          onClear: () => onGenreChange(defaultGenreId),
        });
      }
    }

    if (language && language !== defaultLangId) {
      const found = languages.find((l) => l.id === language);
      if (found) {
        chips.push({
          id: `lang:${found.id}`,
          label: found.label,
          onClear: () => onLanguageChange(defaultLangId),
        });
      }
    }

    if (sortOptions && onSortChange && sortOrder && sortOrder !== defaultSortId) {
      const found = sortOptions.find((s) => s.id === sortOrder);
      if (found) {
        chips.push({
          id: `sort:${found.id}`,
          label: found.label,
          onClear: () => onSortChange(defaultSortId),
        });
      }
    }

    if (formatOptions && onFormatChange && extFilter && extFilter !== defaultFormatId) {
      const found = formatOptions.find((f) => f.id === extFilter);
      if (found) {
        chips.push({
          id: `fmt:${found.id}`,
          label: found.label,
          onClear: () => onFormatChange(defaultFormatId),
        });
      }
    }

    return chips;
  }, [
    showSavedOnly,
    onToggleSavedOnly,
    activeGenre,
    defaultGenreId,
    genres,
    onGenreChange,
    language,
    defaultLangId,
    languages,
    onLanguageChange,
    sortOptions,
    onSortChange,
    sortOrder,
    defaultSortId,
    formatOptions,
    onFormatChange,
    extFilter,
    defaultFormatId,
  ]);

  const handleClearAll = () => {
    if (query) onQueryChange('');
    if (showSavedOnly && onToggleSavedOnly) onToggleSavedOnly();
    if (activeGenre !== defaultGenreId) onGenreChange(defaultGenreId);
    if (language !== defaultLangId) onLanguageChange(defaultLangId);
    if (sortOptions && onSortChange && sortOrder && sortOrder !== defaultSortId) {
      onSortChange(defaultSortId);
    }
    if (formatOptions && onFormatChange && extFilter && extFilter !== defaultFormatId) {
      onFormatChange(defaultFormatId);
    }
  };

  return (
    <header
      className={`lg-topbar-shell lg-topbar-shell--${tier}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="lg-topbar-primary-row">
        {/* Search Input Capsule */}
        <div className="lg-track-tube lg-search-capsule">
          <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          <span className="lg-orb-capsule-sheen" aria-hidden="true" />
          <Search size={15} className="lg-search-capsule__icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="lg-search-capsule__input"
            aria-label={placeholder}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="lg-glass-pill lg-search-capsule__clear"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Mobile Unified Filter Button -> Opens Bottom Sheet */}
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className={`lg-glass-pill lg-filter-pill lg-mobile-filter-trigger ${
            language !== defaultLangId ||
            (sortOrder && sortOrder !== defaultSortId) ||
            (extFilter && extFilter !== defaultFormatId) ||
            showSavedOnly
              ? 'lg-filter-pill--active'
              : ''
          }`}
          aria-label="Filters"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
        </button>

        {/* Medium Desktop (641px–1279px): Inline Single-Active Dropdown Controls */}
        {tier === 'medium' && (
          <FilterControls
            variant="inline"
            language={language}
            languages={languages}
            onLanguageChange={onLanguageChange}
            sortOrder={sortOrder}
            sortOptions={sortOptions}
            onSortChange={onSortChange}
            extFilter={extFilter}
            formatOptions={formatOptions}
            onFormatChange={onFormatChange}
            savedCount={savedCount}
            showSavedOnly={showSavedOnly}
            onToggleSavedOnly={onToggleSavedOnly}
            externalMuted={externalMuted}
            onToggleMute={onToggleMute}
          />
        )}

        {/* Wide Desktop (>=1280px): Active Filter Summary Chips + Clear All + Result Count */}
        {tier === 'wide' && (
          <div className="lg-wide-command-meta">
            {activeFilterChips.length > 0 && (
              <div className="lg-active-filter-chips" aria-label="Active filters">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onClear}
                    className="lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-filter-pill--active lg-summary-chip"
                    title={`Remove filter: ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <X size={12} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-clear-all-chip"
                >
                  <RotateCcw size={12} />
                  <span>Clear all</span>
                </button>
              </div>
            )}
            {typeof resultCount === 'number' && (
              <span className="lg-catalog-result-count" aria-live="polite">
                {resultCount} {resultCount === 1 ? 'title' : 'titles'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Horizontally Scrollable Genres (Phone & Medium tiers) */}
      {tier !== 'wide' && (
        <GenreNav
          genres={genres}
          activeGenre={activeGenre}
          onGenreChange={onGenreChange}
          showSavedOnly={showSavedOnly}
          orientation="horizontal"
        />
      )}

      {/* Mobile Combined Filter Bottom Sheet */}
      <FilterSheet open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)}>
        <span className="lg-sheet-section-title">Language</span>
        <div className="lg-sheet-options-grid">
          {languages.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onLanguageChange(l.id);
                setMobileSheetOpen(false);
              }}
              className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                language === l.id ? 'lg-filter-pill--active' : ''
              }`}
            >
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {sortOptions && onSortChange && (
          <>
            <span className="lg-sheet-section-title">Sort Order</span>
            <div className="lg-sheet-options-grid">
              {sortOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSortChange(s.id);
                    setMobileSheetOpen(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                    sortOrder === s.id ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {formatOptions && onFormatChange && (
          <>
            <span className="lg-sheet-section-title">Format</span>
            <div className="lg-sheet-options-grid">
              {formatOptions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onFormatChange(f.id);
                    setMobileSheetOpen(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                    extFilter === f.id ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {onToggleSavedOnly && typeof savedCount === 'number' && (
          <button
            type="button"
            onClick={() => {
              onToggleSavedOnly();
              setMobileSheetOpen(false);
            }}
            className="lg-sheet-item"
          >
            <Bookmark size={18} fill={showSavedOnly ? 'currentColor' : 'none'} />
            <span>{showSavedOnly ? 'Show All Books' : `Saved Books (${savedCount})`}</span>
          </button>
        )}
      </FilterSheet>
    </header>
  );
};
