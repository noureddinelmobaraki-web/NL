import { useCallback, useEffect, useState } from 'react';
import {
  type AudiobookItem,
  type BookItem,
  fetchAudiobooksCatalog,
  fetchTrendingBooks,
  getCachedAudiobooksCatalogSync,
  getInstantBookMatchForAudiobook,
  probeWrittenBookForAudiobook,
} from '../../../booksAudioService';

export function useAudiobooksCatalog(initialSearchQuery: string) {
  const [query, setQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [genre, setGenre] = useState('popular');
  const [language, setLanguage] = useState('all');
  const [page, setPage] = useState(1);

  const [audiobooks, setAudiobooks] = useState<AudiobookItem[]>(
    () =>
      getCachedAudiobooksCatalogSync({
        q: initialSearchQuery,
        genre: 'popular',
        lang: 'all',
        page: 1,
      }) || [],
  );
  const [loading, setLoading] = useState<boolean>(() => audiobooks.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [probedBookMap, setProbedBookMap] = useState<Record<string, BookItem>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchTrendingBooks({
      period: 'weekly',
      category: 'trending',
      page: 1,
      signal: ctrl.signal,
    }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const loadCatalog = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else {
        const instant = getCachedAudiobooksCatalogSync({
          q: debouncedQuery,
          genre,
          lang: language,
          page: targetPage,
        });
        if (instant && instant.length > 0) {
          setAudiobooks(instant);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const results = await fetchAudiobooksCatalog({
          q: debouncedQuery,
          genre,
          lang: language,
          page: targetPage,
          signal,
        });
        if (signal?.aborted) return;
        setAudiobooks((prev) => {
          if (!append) return results;
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...results.filter((a) => !seen.has(a.id))];
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
    [debouncedQuery, genre, language],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void loadCatalog(1, false, ctrl.signal);
    return () => ctrl.abort();
  }, [loadCatalog]);

  useEffect(() => {
    if (audiobooks.length === 0) return undefined;
    const ctrl = new AbortController();
    let cancelled = false;
    (async () => {
      for (const a of audiobooks.slice(0, 8)) {
        if (cancelled) break;
        const instant = getInstantBookMatchForAudiobook(a);
        if (instant.matchedBook) {
          setProbedBookMap((prev) => ({ ...prev, [a.id]: instant.matchedBook! }));
          continue;
        }
        if (debouncedQuery) {
          const found = await probeWrittenBookForAudiobook(a, ctrl.signal);
          if (!cancelled && found) {
            setProbedBookMap((prev) => ({ ...prev, [a.id]: found }));
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [audiobooks, debouncedQuery]);

  return {
    query,
    setQuery,
    debouncedQuery,
    genre,
    setGenre,
    language,
    setLanguage,
    page,
    setPage,
    audiobooks,
    loading,
    loadingMore,
    probedBookMap,
    setProbedBookMap,
    loadCatalog,
  };
}
