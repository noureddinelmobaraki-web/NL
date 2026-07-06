import type { SortOrder } from './hooks/useSongsFilter';

interface SongsToolbarProps {
  searchQuery: string;
  onSearch: (v: string) => void;
  sortOrder: SortOrder;
  onSort: (v: SortOrder) => void;
}

export function SongsToolbar({ searchQuery, onSearch, sortOrder, onSort }: SongsToolbarProps) {
  return (
    <div className="nl-songs-toolbar">
      <div className="nl-songs-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search for a song..."
          className="nl-songs-search-input"
          inputMode="search"
          enterKeyHint="search"
          aria-label="Search songs"
        />
        {searchQuery ? (
          <button type="button" className="nl-songs-clear" onClick={() => onSearch('')}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="nl-songs-sort">
        <span className="nl-songs-sort-label">Sort by</span>
        <select
          value={sortOrder}
          onChange={(e) => onSort(e.target.value as SortOrder)}
          className="nl-songs-sort-select"
          aria-label="Sort songs"
        >
          <option value="default">Date (Default)</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}
