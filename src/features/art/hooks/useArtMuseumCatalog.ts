/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for World Museums & Fine Photography Catalog
 */

import { useState, useEffect, useMemo } from 'react';
import type { ArtMuseumPiece, MuseumSourceId } from '../types/art.types';
import {
  fetchChicagoArtworks,
  fetchClevelandArtworks,
  fetchConceptIllustrationArtworks,
  fetchMetMuseumArtworks,
  fetchOpenverseArtworks,
  fetchVamMuseumArtworks,
  fetchWikimediaCommonsArtworks,
} from '../services/museumApisClient';
import {
  fetchPicsumPhotography,
  getNlLensPhotography,
} from '../services/photographyClient';

export function useArtMuseumCatalog() {
  const [activeSource, setActiveSource] = useState<MuseumSourceId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pieces, setPieces] = useState<ArtMuseumPiece[]>(() =>
    getNlLensPhotography(),
  );
  const [loading, setLoading] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<ArtMuseumPiece | null>(
    null,
  );
  const [picsumBlur, setPicsumBlur] = useState(0);
  const [picsumGrayscale, setPicsumGrayscale] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const runFetch = async () => {
      try {
        const q = searchQuery.trim();
        const nlLens = getNlLensPhotography();

        if (activeSource === 'nl-lens') {
          setPieces(nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'chicago') {
          const res = await fetchChicagoArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'cleveland') {
          const res = await fetchClevelandArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'met') {
          const res = await fetchMetMuseumArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'vam') {
          const res = await fetchVamMuseumArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'wikimedia') {
          const res = await fetchWikimediaCommonsArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'openverse') {
          const res = await fetchOpenverseArtworks(q, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'concept-art') {
          const res = await fetchConceptIllustrationArtworks(controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }
        if (activeSource === 'picsum') {
          const res = await fetchPicsumPhotography(1, controller.signal);
          if (!controller.signal.aborted) setPieces(res.length > 0 ? res : nlLens);
          setLoading(false);
          return;
        }

        const settled = await Promise.allSettled([
          fetchChicagoArtworks(q, controller.signal),
          fetchClevelandArtworks(q, controller.signal),
          fetchMetMuseumArtworks(q, controller.signal),
          fetchVamMuseumArtworks(q, controller.signal),
          fetchWikimediaCommonsArtworks(q, controller.signal),
          fetchOpenverseArtworks(q, controller.signal),
          fetchPicsumPhotography(1, controller.signal),
        ]);

        if (controller.signal.aborted) return;
        const merged = [
          ...(q ? [] : nlLens.slice(0, 4)),
          ...settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])),
        ];
        setPieces(merged.length > 0 ? merged : nlLens);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timer = window.setTimeout(runFetch, searchQuery ? 260 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSource, searchQuery]);

  const displayedPieces = useMemo(() => pieces, [pieces]);

  return {
    activeSource,
    setActiveSource,
    searchQuery,
    setSearchQuery,
    pieces: displayedPieces,
    loading,
    selectedPiece,
    setSelectedPiece,
    picsumBlur,
    setPicsumBlur,
    picsumGrayscale,
    setPicsumGrayscale,
  };
}
