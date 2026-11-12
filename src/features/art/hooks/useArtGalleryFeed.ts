import { useState, useEffect, useCallback } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';
import { fetchUnifiedArtGallery } from '../services/artMuseumService';
import { fetchPicsumGalleryPieces } from '../services/museumApisClient';

export function useArtGalleryFeed(activeCategory: string, searchQuery: string) {
  const [items, setItems] = useState<ArtMuseumPiece[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const loadGallery = useCallback(async (category: string, query: string) => {
    setLoading(true);
    setPage(1);
    try {
      const data = await fetchUnifiedArtGallery(category, query, 1);
      setItems(data);
    } catch {
      const fallback = await fetchPicsumGalleryPieces(1, 30);
      setItems(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const moreData = await fetchUnifiedArtGallery(
        activeCategory,
        searchQuery,
        nextPage,
      );
      if (moreData.length > 0) {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const uniqueNew = moreData.filter((i) => !seen.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeCategory, loadingMore, page, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadGallery(activeCategory, searchQuery);
      },
      searchQuery ? 260 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [activeCategory, searchQuery, loadGallery]);

  return {
    items,
    loading,
    loadingMore,
    loadMore,
    refresh: () => void loadGallery(activeCategory, searchQuery),
  };
}
