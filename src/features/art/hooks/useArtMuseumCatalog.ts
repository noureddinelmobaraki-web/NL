import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';
import { fetchUnifiedArtGallery } from '../services/artMuseumService';
import { fetchPicsumGalleryPieces } from '../services/museumApisClient';

export function useArtMuseumCatalog(initialGenre = 'all') {
  const [genre, setGenre] = useState<string>(initialGenre);
  const [query, setQuery] = useState<string>('');
  const [museumFilter, setMuseumFilter] = useState<string>('all');
  const [eraFilter, setEraFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('featured');
  const [rawItems, setRawItems] = useState<ArtMuseumPiece[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtMuseumPiece | null>(
    null,
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  const loadCatalog = useCallback(async (g: string, q: string) => {
    setLoading(true);
    setPage(1);
    let initialItems: ArtMuseumPiece[] = [];
    try {
      initialItems = await fetchUnifiedArtGallery(g, q, 1);
      setRawItems(initialItems);
    } catch {
      initialItems = await fetchPicsumGalleryPieces(1, 14);
      setRawItems(initialItems);
    } finally {
      setLoading(false);
    }

    // Immediately prefetch page 2 in the background so 24+ museum artworks are ready without manual loadMore
    try {
      const page2Items = await fetchUnifiedArtGallery(g, q, 2);
      if (page2Items.length > 0) {
        setRawItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const uniqueMore = page2Items.filter((p) => !seen.has(p.id));
          return [...prev, ...uniqueMore];
        });
        setPage(2);
      }
    } catch {
      // ignore background prefetch errors
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    let targetPage = page + 1;
    setLoadingMore(true);
    try {
      const more = await fetchUnifiedArtGallery(genre, query, targetPage);
      const seenSnapshot = new Set(rawItems.map((p) => p.id));
      const uniqueBatch = more.filter((p) => !seenSnapshot.has(p.id));

      // Chain next page automatically if deduplication yielded fewer than 8 new items
      if (uniqueBatch.length < 8) {
        targetPage += 1;
        const extra = await fetchUnifiedArtGallery(genre, query, targetPage);
        for (const item of extra) {
          if (!seenSnapshot.has(item.id) && !uniqueBatch.some((u) => u.id === item.id)) {
            uniqueBatch.push(item);
          }
        }
      }

      if (uniqueBatch.length > 0) {
        setRawItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = uniqueBatch.filter((p) => !seen.has(p.id));
          return [...prev, ...fresh];
        });
      }
      setPage(targetPage);
    } finally {
      setLoadingMore(false);
    }
  }, [genre, loadingMore, page, query, rawItems]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadCatalog(genre, query);
      },
      query ? 260 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [genre, query, loadCatalog]);

  const toggleBookmark = useCallback((item: ArtMuseumPiece) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const displayedArtworks = useMemo(() => {
    let list = [...rawItems];

    if (showSavedOnly) {
      list = list.filter((item) => savedIds.has(item.id));
    }

    if (museumFilter !== 'all') {
      list = list.filter((item) => item.source === museumFilter);
    }

    if (eraFilter !== 'all') {
      list = list.filter((item) => {
        const d = (item.dateDisplay || '').toLowerCase();
        if (eraFilter === 'contemporary') {
          return (
            d.includes('202') ||
            d.includes('201') ||
            d.includes('معاصر') ||
            item.source === 'picsum' ||
            item.source === 'concept-art'
          );
        }
        if (eraFilter === 'modern') {
          return d.includes('18') || d.includes('19') || d.includes('20');
        }
        if (eraFilter === 'classic') {
          return (
            d.includes('14') ||
            d.includes('15') ||
            d.includes('16') ||
            d.includes('17')
          );
        }
        return true;
      });
    }

    if (sortOrder === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'artist') {
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    }

    return list;
  }, [rawItems, showSavedOnly, savedIds, museumFilter, eraFilter, sortOrder]);

  return {
    genre,
    setGenre,
    query,
    setQuery,
    museumFilter,
    setMuseumFilter,
    eraFilter,
    setEraFilter,
    sortOrder,
    setSortOrder,
    artworks: displayedArtworks,
    loading,
    loadingMore,
    loadMore,
    selectedArtwork,
    setSelectedArtwork,
    savedIds,
    showSavedOnly,
    setShowSavedOnly,
    toggleBookmark,
    refresh: () => void loadCatalog(genre, query),
  };
}
