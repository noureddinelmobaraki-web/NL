/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogOrchestrator, type ShelfDefinition } from '../services/catalog/CatalogOrchestrator';

export interface HydratedShelf<T> {
  readonly id: string;
  readonly title: string;
  readonly definition: ShelfDefinition<T>;
  readonly items: T[];
  readonly loading: boolean;
}

export interface UseVirtualizedShelvesOptions<T extends { id: string | number; title: string }> {
  definitions?: readonly ShelfDefinition<T>[];
  shelves?: readonly ShelfDefinition<T>[];
  shelfDefinitions?: readonly ShelfDefinition<T>[];
  sourcePrefix?: string;
  hub?: string;
  fetchShelfPage?: (
    def: ShelfDefinition<T>,
    page: number,
    excludeNumericIds: number[],
  ) => Promise<{ items: T[]; hasMore: boolean }>;
  getItemKey?: (item: T) => string;
  getKey?: (item: T) => string;
  initialCount?: number;
  initialShelfCount?: number;
  initialVisibleShelves?: number;
  batchSize?: number;
  batchShelfCount?: number;
  shelfBatchSize?: number;
  enabled?: boolean;
  scrollRootRef?: React.RefObject<HTMLElement | null>;
}

export function useVirtualizedShelves<T extends { id: string | number; title: string }>(
  options: UseVirtualizedShelvesOptions<T>,
) {
  const resolvedDefinitions = useMemo(
    () => options.definitions ?? options.shelves ?? options.shelfDefinitions ?? [],
    [options.definitions, options.shelves, options.shelfDefinitions],
  );
  const resolvedPrefix = options.sourcePrefix ?? options.hub ?? 'hub';
  const resolvedInitialCount =
    options.initialCount ?? options.initialShelfCount ?? options.initialVisibleShelves ?? 4;
  const resolvedBatchSize =
    options.batchSize ?? options.batchShelfCount ?? options.shelfBatchSize ?? 3;
  const enabled = options.enabled ?? true;
  const getKeyFn = options.getItemKey ?? options.getKey;

  const orchestratorRef = useRef(new CatalogOrchestrator());
  const [shelves, setShelves] = useState<HydratedShelf<T>[]>([]);
  const [mountedCursor, setMountedCursor] = useState(0);
  const [extraPageRound, setExtraPageRound] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingLockRef = useRef(false);
  const fetchFnRef = useRef(options.fetchShelfPage);
  fetchFnRef.current = options.fetchShelfPage;
  const getKeyRef = useRef(getKeyFn);
  getKeyRef.current = getKeyFn;

  const runShelfFetcher = useCallback(
    async (
      def: ShelfDefinition<T>,
      page: number,
      excludeIds: number[],
    ): Promise<{ items: T[]; hasMore: boolean }> => {
      if (fetchFnRef.current) {
        return fetchFnRef.current(def, page, excludeIds);
      }
      if (def.fetcher) {
        const res = await def.fetcher(page);
        if (Array.isArray(res)) {
          return { items: res, hasMore: res.length > 0 };
        }
        return { items: res.items, hasMore: res.hasMore ?? res.items.length > 0 };
      }
      return { items: [], hasMore: false };
    },
    [],
  );

  const hydrateBatch = useCallback(
    async (defsToLoad: readonly ShelfDefinition<T>[], roundSuffix = '') => {
      if (defsToLoad.length === 0 || loadingLockRef.current) return;
      loadingLockRef.current = true;
      setIsLoadingMore(true);

      try {
        const results: HydratedShelf<T>[] = [];
        for (const def of defsToLoad) {
          const shelfKey = roundSuffix ? `${def.id}__r${roundSuffix}` : def.id;
          const shelfTitle = roundSuffix ? `${def.title} · Part ${roundSuffix}` : def.title;
          const items = await orchestratorRef.current.fetchDeduplicatedShelf<T>(
            shelfKey,
            resolvedPrefix,
            (page, excludeIds) => runShelfFetcher(def, page, excludeIds),
            12,
            2,
            getKeyRef.current,
          );
          if (items.length > 0) {
            results.push({
              id: shelfKey,
              title: shelfTitle,
              definition: def,
              items,
              loading: false,
            });
          }
        }
        if (results.length > 0) {
          setShelves((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const fresh = results.filter((r) => !existingIds.has(r.id));
            return [...prev, ...fresh];
          });
        }
      } finally {
        loadingLockRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [resolvedPrefix, runShelfFetcher],
  );

  useEffect(() => {
    if (!enabled || resolvedDefinitions.length === 0) return;
    orchestratorRef.current.reset();
    setShelves([]);
    const firstSlice = resolvedDefinitions.slice(0, resolvedInitialCount);
    setMountedCursor(firstSlice.length);
    setExtraPageRound(1);
    void hydrateBatch(firstSlice);
  }, [resolvedDefinitions, enabled, resolvedInitialCount, hydrateBatch]);

  const loadNextShelves = useCallback(() => {
    if (!enabled || loadingLockRef.current || resolvedDefinitions.length === 0) return;
    if (mountedCursor < resolvedDefinitions.length) {
      const nextSlice = resolvedDefinitions.slice(
        mountedCursor,
        mountedCursor + resolvedBatchSize,
      );
      setMountedCursor((c) => c + nextSlice.length);
      void hydrateBatch(nextSlice);
    } else if (extraPageRound <= 5) {
      const nextRound = extraPageRound + 1;
      setExtraPageRound(nextRound);
      const discoverySlice = resolvedDefinitions.slice(0, resolvedBatchSize);
      void hydrateBatch(discoverySlice, String(nextRound));
    }
  }, [
    enabled,
    resolvedDefinitions,
    mountedCursor,
    resolvedBatchSize,
    extraPageRound,
    hydrateBatch,
  ]);

  const appendHorizontalPage = useCallback(
    async (shelfId: string) => {
      const target = shelves.find((s) => s.id === shelfId);
      if (!target) return;
      const nextPage = orchestratorRef.current.getNextPageForShelf(shelfId);
      const { items } = await runShelfFetcher(target.definition, nextPage, []);
      const uniqueMore = orchestratorRef.current.filterUniqueItems(
        resolvedPrefix,
        items,
        getKeyRef.current,
      );
      if (uniqueMore.length === 0) return;
      setShelves((prev) =>
        prev.map((s) => (s.id === shelfId ? { ...s, items: [...s.items, ...uniqueMore] } : s)),
      );
    },
    [shelves, resolvedPrefix, runShelfFetcher],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextShelves();
        }
      },
      {
        root: options.scrollRootRef?.current ?? null,
        rootMargin: '600px 0px',
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, loadNextShelves, options.scrollRootRef]);

  const hasMoreShelves =
    mountedCursor < resolvedDefinitions.length || extraPageRound <= 5;

  return {
    shelves,
    visibleShelves: shelves,
    hasMoreShelves,
    isLoadingMore,
    sentinelRef,
    loadNextShelves,
    appendHorizontalPage,
    fetchNextShelfPage: appendHorizontalPage,
    loadMoreShelfItems: appendHorizontalPage,
  };
}
