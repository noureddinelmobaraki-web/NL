/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Compact Search Bar & Game Counter for the Aero Glass Sidebar
 */

import { Search, X } from 'lucide-react';

export interface SidebarSearchAndSortProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalDisplayed: number;
}

export function SidebarSearchAndSort({
  searchQuery,
  onSearchChange,
  totalDisplayed,
}: SidebarSearchAndSortProps) {
  return (
    <div className="nl-sidebar-search-wrap">
      <div className="nl-sidebar-search-box">
        <Search size={14} className="nl-sidebar-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search games, NES, DOS, Flash..."
          aria-label="Search games"
          className="nl-sidebar-search-input"
        />
        {searchQuery ? (
          <button
            type="button"
            className="nl-sidebar-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <span className="nl-sidebar-count" title="Displayed games count">
            {totalDisplayed}
          </span>
        )}
      </div>
    </div>
  );
}
