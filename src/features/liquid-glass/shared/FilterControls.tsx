/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState } from 'react';
import {
  ArrowUpDown,
  Bookmark,
  FileText,
  Languages,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { OptionItem } from './GlassTopBar';
import { FilterDropdown } from './FilterDropdown';

export interface FilterControlsProps {
  language: string;
  languages: readonly OptionItem[];
  onLanguageChange: (id: string) => void;
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
  variant?: 'inline' | 'panel' | 'sheet';
}

export function FilterControls({
  language,
  languages,
  onLanguageChange,
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
  variant = 'inline',
}: FilterControlsProps) {
  const [openDropdown, setOpenDropdown] = useState<'lang' | 'sort' | 'format' | null>(null);

  const activeLang = languages.find((l) => l.id === language) || languages[0];
  const activeSort = sortOptions?.find((s) => s.id === sortOrder) || sortOptions?.[0];
  const activeFormat = formatOptions?.find((f) => f.id === extFilter) || formatOptions?.[0];

  if (variant === 'panel') {
    return (
      <div
        className="lg-filter-panel-rail"
        aria-label="Catalog Filters"
        onClick={(e) => e.stopPropagation()}
      >
        {(onToggleSavedOnly && typeof savedCount === 'number') ||
        (onToggleMute && typeof externalMuted === 'boolean') ? (
          <div className="lg-filter-panel-section">
            <div className="lg-rail-section-header">Quick Actions</div>
            <div className="lg-filter-panel-actions">
              {onToggleSavedOnly && typeof savedCount === 'number' && (
                <button
                  type="button"
                  onClick={onToggleSavedOnly}
                  className={`lg-glass-pill lg-filter-pill lg-filter-panel-btn ${
                    showSavedOnly ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <Bookmark size={14} fill={showSavedOnly ? 'currentColor' : 'none'} />
                  <span>Saved ({savedCount})</span>
                </button>
              )}
              {onToggleMute && typeof externalMuted === 'boolean' && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`lg-glass-pill lg-filter-pill lg-filter-panel-btn ${
                    externalMuted ? 'lg-filter-pill--active' : ''
                  }`}
                  aria-label={externalMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {externalMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{externalMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="lg-filter-panel-section">
          <div className="lg-rail-section-header">
            <Languages size={13} />
            <span>Language</span>
          </div>
          <div className="lg-filter-panel-options" role="radiogroup" aria-label="Language">
            {languages.map((l) => {
              const active = language === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onLanguageChange(l.id)}
                  className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-filter-panel-chip ${
                    active ? 'lg-filter-pill--active' : ''
                  }`}
                >
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {sortOptions && onSortChange && (
          <div className="lg-filter-panel-section">
            <div className="lg-rail-section-header">
              <ArrowUpDown size={13} />
              <span>Sort By</span>
            </div>
            <div className="lg-filter-panel-options" role="radiogroup" aria-label="Sort By">
              {sortOptions.map((s) => {
                const active = (sortOrder || sortOptions[0]?.id) === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSortChange(s.id)}
                    className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-filter-panel-chip ${
                      active ? 'lg-filter-pill--active' : ''
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {formatOptions && onFormatChange && (
          <div className="lg-filter-panel-section">
            <div className="lg-rail-section-header">
              <FileText size={13} />
              <span>Format</span>
            </div>
            <div className="lg-filter-panel-options" role="radiogroup" aria-label="Format">
              {formatOptions.map((f) => {
                const active = (extFilter || formatOptions[0]?.id) === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onFormatChange(f.id)}
                    className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm lg-filter-panel-chip ${
                      active ? 'lg-filter-pill--active' : ''
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lg-filter-controls-cluster">
      <FilterDropdown
        label={activeLang?.label || 'Language'}
        icon={Languages}
        options={languages}
        selectedId={language}
        onSelect={onLanguageChange}
        open={openDropdown === 'lang'}
        onToggle={() => setOpenDropdown((prev) => (prev === 'lang' ? null : 'lang'))}
        onClose={() => setOpenDropdown(null)}
        isActive={language !== languages[0]?.id}
      />

      {sortOptions && onSortChange && (
        <FilterDropdown
          label={activeSort?.label || 'Sort'}
          icon={ArrowUpDown}
          options={sortOptions}
          selectedId={sortOrder || sortOptions[0]?.id || 'popular'}
          onSelect={onSortChange}
          open={openDropdown === 'sort'}
          onToggle={() => setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'))}
          onClose={() => setOpenDropdown(null)}
          isActive={Boolean(sortOrder && sortOrder !== sortOptions[0]?.id)}
        />
      )}

      {formatOptions && onFormatChange && (
        <FilterDropdown
          label={activeFormat?.label || 'Format'}
          icon={FileText}
          options={formatOptions}
          selectedId={extFilter || formatOptions[0]?.id || 'all'}
          onSelect={onFormatChange}
          open={openDropdown === 'format'}
          onToggle={() => setOpenDropdown((prev) => (prev === 'format' ? null : 'format'))}
          onClose={() => setOpenDropdown(null)}
          isActive={Boolean(extFilter && extFilter !== formatOptions[0]?.id)}
        />
      )}

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
  );
}
