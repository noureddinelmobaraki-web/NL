/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useState } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';
import {
  fetchUnifiedArtGallery,
  type ArtGalleryCategory,
} from '../services/artMuseumService';

export function useArtGalleryFeed(activeGenre: string, debouncedQuery: string) {
  const [artworks, setArtworks] = useState<ArtMuseumPiece[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (activeGenre === 'avatars') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const category = (activeGenre as ArtGalleryCategory) || 'all';

    fetchUnifiedArtGallery(category, debouncedQuery)
      .then((list) => {
        if (!cancelled) setArtworks(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGenre, debouncedQuery]);

  return {
    artworks,
    loading,
  };
}

export type UseArtGalleryFeedResult = ReturnType<typeof useArtGalleryFeed>;
