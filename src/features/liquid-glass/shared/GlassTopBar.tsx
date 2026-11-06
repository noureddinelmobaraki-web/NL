/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  FileText,
  Languages,
  Search,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FilterSheet } from './FilterSheet';

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
}) => {
  const [langExpanded, setLangExpanded] = useState(false);
  const [sortExpanded, setSortExpanded] = useState(false);
  const [formatExpanded, setFormatExpanded] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const topbarRef = useRef<HTMLElement | null>(null);

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

  const activeLangObj = languages.find((l) => l.id === language) || languages[0];
  const activeSortObj = sortOptions?.find((s) => s.id === sortOrder) || sortOptions?.[0];
  const activeFormatObj = formatOptions?.find((f) => f.id === extFilter) || formatOptions?.[0];

  return (
    <header className="lg-topbar-shell" ref={topbarRef} onClick={(e) => e.stopPropagation()}>
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
            language !== 'all' ||
            (sortOrder && sortOrder !== 'popular') ||
            (extFilter && extFilter !== 'all') ||
            showSavedOnly
              ? 'lg-filter-pill--active'
              : ''
          }`}
          aria-label="Filters"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
        </button>

        {/* Desktop Language Popover */}
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
          >
            <Languages size={14} />
            <span>{activeLangObj?.label}</span>
            <ChevronDown size={13} />
          </button>
          <FilterSheet open={langExpanded} onClose={() => setLangExpanded(false)}>
            {languages.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  onLanguageChange(l.id);
                  setLangExpanded(false);
                }}
                className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                  language === l.id ? 'lg-filter-pill--active' : ''
                }`}
              >
                <span>{l.label}</span>
              </button>
            ))}
          </FilterSheet>
        </div>

        {/* Desktop Sort Popover */}
        {sortOptions && onSortChange && (
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
            >
              <ArrowUpDown size={13} />
              <span>{activeSortObj?.label}</span>
              <ChevronDown size={13} />
            </button>
            <FilterSheet open={sortExpanded} onClose={() => setSortExpanded(false)}>
              {sortOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSortChange(s.id);
                    setSortExpanded(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                    sortOrder === s.id ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </FilterSheet>
          </div>
        )}

        {/* Desktop Format Popover */}
        {formatOptions && onFormatChange && (
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
            >
              <FileText size={13} />
              <span>{activeFormatObj?.label}</span>
              <ChevronDown size={13} />
            </button>
            <FilterSheet open={formatExpanded} onClose={() => setFormatExpanded(false)}>
              {formatOptions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onFormatChange(f.id);
                    setFormatExpanded(false);
                  }}
                  className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                    extFilter === f.id ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </FilterSheet>
          </div>
        )}

        {/* Desktop Saved Toggle */}
        {onToggleSavedOnly && typeof savedCount === 'number' && (
          <button
            type="button"
            onClick={onToggleSavedOnly}
            className={`lg-glass-pill lg-filter-pill lg-desktop-only-pill ${
              showSavedOnly ? 'lg-filter-pill--active' : ''
            }`}
          >
            <Bookmark size={13} fill={showSavedOnly ? 'currentColor' : 'none'} />
            <span>Saved ({savedCount})</span>
          </button>
        )}

        {/* Mute / Unmute Button */}
        {onToggleMute && typeof externalMuted === 'boolean' && (
          <button
            type="button"
            onClick={onToggleMute}
            className="lg-glass-pill lg-icon-round-btn lg-desktop-only-pill"
            aria-label={externalMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {externalMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        )}
      </div>

      {/* Row 2: Horizontally Scrollable Genres */}
      <div className="lg-topbar-genres-row">
        {genres.map((g) => {
          const Icon = g.icon;
          const active = !showSavedOnly && activeGenre === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onGenreChange(g.id)}
              className={`lg-glass-pill lg-filter-pill ${active ? 'lg-filter-pill--active' : ''}`}
            >
              <Icon size={13} />
              <span>{g.label}</span>
            </button>
          );
        })}
      </div>

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
