/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useState } from 'react';
import type { BookItem } from '../../liquid-glass/services/types';
import {
  fetchMagazinesCatalog,
  getCachedMagazinesSync,
} from '../services/magazineService';

export function useMagazinesCatalog(initialSearchQuery = '') {
  const [query, setQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [category, setCategory] = useState<string>('featured');
  const [language, setLanguage] = useState<string>('all');
  const [extFilter, setExtFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('popular');
  const [page, setPage] = useState<number>(1);

  const [magazines, setMagazines] = useState<BookItem[]>(() => {
    return (
      getCachedMagazinesSync({
        q: initialSearchQuery,
        category: 'featured',
        lang: 'all',
        ext: 'all',
        sortOrder: 'popular',
        page: 1,
      }) || []
    );
  });
  const [loading, setLoading] = useState<boolean>(() => magazines.length === 0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

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

  const loadMagazines = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) {
        setLoadingMore(true);
      } else {
        const instant = getCachedMagazinesSync({
          q: debouncedQuery,
          category,
          lang: language,
          ext: extFilter,
          sortOrder,
          page: targetPage,
        });
        if (instant && instant.length > 0) {
          setMagazines(instant);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const results = await fetchMagazinesCatalog({
          q: debouncedQuery,
          category,
          lang: language,
          ext: extFilter,
          sortOrder,
          page: targetPage,
          signal,
        });

        if (signal?.aborted) return;
        setMagazines((prev) => {
          if (!append) return results;
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...results.filter((m) => !seen.has(m.id))];
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
    [debouncedQuery, category, language, extFilter, sortOrder],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void loadMagazines(1, false, ctrl.signal);
    return () => ctrl.abort();
  }, [loadMagazines]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setPage(next);
    void loadMagazines(next, true);
  }, [loading, loadingMore, page, loadMagazines]);

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
    page,
    setPage,
    magazines,
    loading,
    loadingMore,
    handleLoadMore,
  };
}
