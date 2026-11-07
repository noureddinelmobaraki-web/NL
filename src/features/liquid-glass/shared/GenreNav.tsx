/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { GenreChipItem } from './GlassTopBar';

export interface GenreNavProps {
  genres: readonly GenreChipItem[];
  activeGenre: string;
  onGenreChange: (id: string) => void;
  showSavedOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function GenreNav({
  genres,
  activeGenre,
  onGenreChange,
  showSavedOnly,
  orientation = 'horizontal',
}: GenreNavProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className="lg-genre-rail-nav"
        role="radiogroup"
        aria-label="Categories"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-rail-section-header">Categories</div>
        <div className="lg-genre-rail-list">
          {genres.map((g) => {
            const Icon = g.icon;
            const active = !showSavedOnly && activeGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onGenreChange(g.id)}
                className={`lg-glass-pill lg-filter-pill lg-genre-rail-pill ${
                  active ? 'lg-filter-pill--active' : ''
                }`}
              >
                <Icon size={14} />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="lg-topbar-genres-row" role="navigation" aria-label="Catalog Categories">
      {genres.map((g) => {
        const Icon = g.icon;
        const active = !showSavedOnly && activeGenre === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onGenreChange(g.id)}
            className={`lg-glass-pill lg-filter-pill ${active ? 'lg-filter-pill--active' : ''}`}
            aria-pressed={active}
          >
            <Icon size={13} />
            <span>{g.label}</span>
          </button>
        );
      })}
    </div>
  );
}
