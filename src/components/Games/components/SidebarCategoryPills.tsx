/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Horizontal Scrollable Category Filter Tabs + Flash Sub-Genre Filter
 */

import type { FlashSubGenre, GameCategory } from '../types/games.types';

export interface SidebarCategoryPillsProps {
  activeCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
  activeFlashSubGenre: FlashSubGenre;
  onSelectFlashSubGenre: (genre: FlashSubGenre) => void;
  favoritesCount: number;
}

const CATEGORIES: Array<{ id: GameCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'flash', label: 'NL Flash' },
  { id: 'retro', label: 'Consoles' },
  { id: 'dos', label: 'MS-DOS' },
  { id: 'brain', label: 'Brain & 21' },
  { id: 'web', label: 'Web Arcade' },
  { id: 'favorites', label: 'Saved' },
];

const FLASH_SUBGENRES: FlashSubGenre[] = [
  'All',
  'Action',
  'Platformer',
  'Fighting',
  'Shooter',
  'Arcade',
  'RPG',
  'Racing',
];

export function SidebarCategoryPills({
  activeCategory,
  onSelectCategory,
  activeFlashSubGenre,
  onSelectFlashSubGenre,
  favoritesCount,
}: SidebarCategoryPillsProps) {
  return (
    <div className="nl-sidebar-filters">
      <div className="nl-cat-strip" role="tablist" aria-label="Game categories">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCategory(cat.id)}
              className={`nl-cat-tab${isActive ? ' is-active' : ''}`}
            >
              <span>{cat.label}</span>
              {cat.id === 'favorites' && favoritesCount > 0 && (
                <span className="nl-cat-count">{favoritesCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory === 'flash' && (
        <div
          className="nl-subgenre-strip"
          role="group"
          aria-label="Flash sub-genres"
        >
          {FLASH_SUBGENRES.map((genre) => {
            const active = activeFlashSubGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onSelectFlashSubGenre(genre)}
                className={`nl-subgenre-btn${active ? ' is-active' : ''}`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
