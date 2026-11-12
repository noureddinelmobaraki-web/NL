/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

export type ArtInitialTab = 'photos' | 'drawings' | 'avatars';

export function useArtGalleryFilters(initialTab?: ArtInitialTab) {
  const [activeGenre, setActiveGenre] = useState<string>(() =>
    initialTab === 'avatars' ? 'avatars' : 'all'
  );
  const [museumFilter, setMuseumFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedQuery = useDebouncedValue(searchQuery, 340);

  return {
    activeGenre,
    setActiveGenre,
    museumFilter,
    setMuseumFilter,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
}

export type UseArtGalleryFiltersResult = ReturnType<typeof useArtGalleryFilters>;
