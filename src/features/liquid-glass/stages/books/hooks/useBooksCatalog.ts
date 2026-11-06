/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type AudiobookItem,
  type BookItem,
  fetchAudiobooksCatalog,
  fetchTrendingBooks,
  getCachedBooksCatalogSync,
  getInstantAudiobookMatchForBook,
  probeAudiobookForBook,
  searchAllBooks,
} from '../../../booksAudioService';

export function useBooksCatalog(initialSearchQuery: string) {
  const [query, setQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [category, setCategory] = useState<string>('trending');
  const [language, setLanguage] = useState<string>('all');
  const [extFilter, setExtFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('popular');
  const [page, setPage] = useState<number>(1);

  const [books, setBooks] = useState<BookItem[]>(() => {
    return (
      getCachedBooksCatalogSync({
        q: initialSearchQuery,
        period: 'weekly',
        category: 'trending',
        lang: 'all',
        ext: 'all',
        page: 1,
      }) || []
    );
  });
  const [loading, setLoading] = useState<boolean>(() => books.length === 0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [probedAudioMap, setProbedAudioMap] = useState<Record<string, AudiobookItem>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchAudiobooksCatalog({ genre: 'popular', page: 1, signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== query) {
      setQuery(initialSearchQuery);
      setDebouncedQuery(initialSearchQuery);
      setPage(1);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const loadBooks = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else {
        const instant = getCachedBooksCatalogSync({
          q: debouncedQuery,
          period: 'weekly',
          category,
          lang: language,
          ext: extFilter,
          page: targetPage,
        });
        if (instant && instant.length > 0) {
          setBooks(instant);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const results = debouncedQuery
          ? await searchAllBooks({
              q: debouncedQuery,
              category: category === 'trending' ? 'all' : category,
              lang: language,
              ext: extFilter,
              page: targetPage,
              signal,
            })
          : await fetchTrendingBooks({
              period: 'weekly',
              category,
              lang: language,
              ext: extFilter,
              page: targetPage,
              signal,
            });

        if (signal?.aborted) return;
        setBooks((prev) => {
          if (!append) return results;
          const seen = new Set(prev.map((b) => b.id));
          return [...prev, ...results.filter((b) => !seen.has(b.id))];
        });
      } catch {
        /* ignore */
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, category, language, extFilter],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void loadBooks(1, false, ctrl.signal);
    return () => ctrl.abort();
  }, [loadBooks]);

  useEffect(() => {
    if (books.length === 0) return undefined;
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      for (const b of books.slice(0, 8)) {
        if (cancelled) break;
        const instant = getInstantAudiobookMatchForBook(b);
        if (instant.matchedAudiobook) {
          setProbedAudioMap((prev) => ({ ...prev, [b.id]: instant.matchedAudiobook! }));
          continue;
        }
        if (debouncedQuery || instant.hasAudio) {
          const found = await probeAudiobookForBook(b, ctrl.signal);
          if (!cancelled && found) {
            setProbedAudioMap((prev) => ({ ...prev, [b.id]: found }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [books, debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setPage(next);
    void loadBooks(next, true);
  }, [loading, loadingMore, page, loadBooks]);

  return {
    query,
    setQuery,
    debouncedQuery,
    category,
    setCategory,
    language,
    setLanguage,
    extFilter,
    setExtFilter,
    sortOrder,
    setSortOrder,
    setPage,
    books,
    loading,
    loadingMore,
    probedAudioMap,
    setProbedAudioMap,
    handleLoadMore,
  };
}
