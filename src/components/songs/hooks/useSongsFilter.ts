import { useMemo, useState } from 'react';
import type { Song } from '../../../types';

export type SortOrder = 'default' | 'name';

export function useSongsFilter(songs: Song[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');

  const filteredSongs = useMemo(() => {
    let result = songs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(q));
    }
    if (sortOrder === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [songs, searchQuery, sortOrder]);

  return { searchQuery, setSearchQuery, sortOrder, setSortOrder, filteredSongs };
}
