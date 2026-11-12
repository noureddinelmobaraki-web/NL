/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';

export function useDisplayedArtworks(
  artworks: ArtMuseumPiece[],
  museumFilter: string,
  sortOrder: string
) {
  const displayedArtworks = useMemo(() => {
    let list = artworks;
    if (museumFilter !== 'all') {
      list = list.filter((item) => item.source === museumFilter);
    }
    if (sortOrder === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [artworks, museumFilter, sortOrder]);

  return {
    displayedArtworks,
  };
}

export type UseDisplayedArtworksResult = ReturnType<typeof useDisplayedArtworks>;
