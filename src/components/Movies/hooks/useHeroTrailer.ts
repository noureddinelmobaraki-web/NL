/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState, useEffect } from "react";
import { resolveTrailer, type TrailerSource } from "../../../services/trailerService";
import type { CinemaItem } from "../moviesDataClient";

export function useHeroTrailer({
  activeTab,
  slideshowSlidesLength,
  selectedItemId,
  isWatchingInGallery,
  detailedItem,
  activeImdbId,
}: {
  activeTab: "movies" | "series";
  slideshowSlidesLength: number;
  selectedItemId: number | null;
  isWatchingInGallery: boolean;
  detailedItem: CinemaItem | null;
  activeImdbId: string;
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroServersOpen, setHeroServersOpen] = useState(false);
  const [showHeroTrailer, setShowHeroTrailer] = useState(false);
  const [trailerFallbackToYoutube, setTrailerFallbackToYoutube] = useState(false);
  const [resolvedTrailer, setResolvedTrailer] = useState<TrailerSource | null>(null);
  const [imdbTrailerLoaded, setImdbTrailerLoaded] = useState(false);

  useEffect(() => {
    setHeroServersOpen(false);
  }, [heroIndex, activeTab]);

  useEffect(() => {
    if (
      slideshowSlidesLength <= 1 ||
      heroServersOpen ||
      selectedItemId !== null ||
      isWatchingInGallery
    ) {
      return;
    }
    const interval = setInterval(() => {
      if (document.hidden) return;
      setHeroIndex((prev) => (prev + 1) % slideshowSlidesLength);
    }, 8000);
    return () => clearInterval(interval);
  }, [slideshowSlidesLength, heroServersOpen, selectedItemId, isWatchingInGallery]);

  // Resolve IMDb / YouTube trailer when showHeroTrailer opens
  useEffect(() => {
    if (!showHeroTrailer || !detailedItem) {
      setResolvedTrailer(null);
      setImdbTrailerLoaded(false);
      return undefined;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setImdbTrailerLoaded(false);
    void resolveTrailer({
      imdbId: activeImdbId || detailedItem.imdbId,
      youtubeKey: detailedItem.trailerKey,
      signal: ctrl.signal,
    }).then((res) => {
      if (!cancelled) {
        setResolvedTrailer(res);
      }
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [showHeroTrailer, detailedItem, activeImdbId]);

  // 7-second watchdog for IMDb trailer iframe -> fallback to YouTube if available
  useEffect(() => {
    if (
      !showHeroTrailer ||
      resolvedTrailer?.kind !== "imdb" ||
      trailerFallbackToYoutube ||
      imdbTrailerLoaded
    ) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (!imdbTrailerLoaded && detailedItem?.trailerKey) {
        setTrailerFallbackToYoutube(true);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [
    showHeroTrailer,
    resolvedTrailer,
    trailerFallbackToYoutube,
    imdbTrailerLoaded,
    detailedItem?.trailerKey,
  ]);

  return {
    heroIndex,
    setHeroIndex,
    heroServersOpen,
    setHeroServersOpen,
    showHeroTrailer,
    setShowHeroTrailer,
    trailerFallbackToYoutube,
    setTrailerFallbackToYoutube,
    resolvedTrailer,
    setResolvedTrailer,
    imdbTrailerLoaded,
    setImdbTrailerLoaded,
  };
}
