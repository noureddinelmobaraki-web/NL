/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for MangaDex@Home Chapter & Page Reading
 * - Supports Vertical Webtoon Scroll & RTL Single-Page Flip
 * - Supports High-Res vs. Data-Saver page streams
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchMangaDexChapters,
  fetchMangaDexChapterPages,
  type MangaChapterItem,
  type MangaChapterPagesBundle,
} from '../../../services/mangadexClient';

export function useMangaChapterReader(mangaId?: string, enabled = false) {
  const [chapters, setChapters] = useState<MangaChapterItem[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [pagesBundle, setPagesBundle] =
    useState<MangaChapterPagesBundle | null>(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [readMode, setReadMode] = useState<'webtoon' | 'rtl-page'>('webtoon');
  const [useDataSaver, setUseDataSaver] = useState(false);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  useEffect(() => {
    if (!enabled || !mangaId) {
      setChapters([]);
      setActiveChapterId('');
      setPagesBundle(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingChapters(true);

    fetchMangaDexChapters(mangaId, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) {
          setChapters(list);
          setActiveChapterId(list[0]?.id || '');
          setLoadingChapters(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadingChapters(false);
      });

    return () => controller.abort();
  }, [mangaId, enabled]);

  useEffect(() => {
    if (!enabled || !activeChapterId) {
      setPagesBundle(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingPages(true);
    setCurrentPageIdx(0);

    fetchMangaDexChapterPages(activeChapterId, controller.signal)
      .then((bundle) => {
        if (!controller.signal.aborted) {
          setPagesBundle(bundle);
          setLoadingPages(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadingPages(false);
      });

    return () => controller.abort();
  }, [activeChapterId, enabled]);

  const activePages = pagesBundle
    ? useDataSaver
      ? pagesBundle.dataSaverUrls
      : pagesBundle.pageUrls
    : [];

  const nextPage = useCallback(() => {
    setCurrentPageIdx((prev) =>
      Math.min(Math.max(0, activePages.length - 1), prev + 1),
    );
  }, [activePages.length]);

  const prevPage = useCallback(() => {
    setCurrentPageIdx((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    chapters,
    activeChapterId,
    setActiveChapterId,
    activePages,
    loadingChapters,
    loadingPages,
    readMode,
    setReadMode,
    useDataSaver,
    setUseDataSaver,
    currentPageIdx,
    setCurrentPageIdx,
    nextPage,
    prevPage,
  };
}
