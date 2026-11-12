/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { FALLBACK_MOVIES } from "../CuratedFallback";
import { FALLBACK_SERIES } from "../../Series/CuratedFallback";
import { tmdbLang } from "../../../utils/lang";
import { getProgress } from "../../../features/cinema/progress/progressStore";
import { logPlay } from "../../../features/music/data/playTracking";
import { enrichCinemaItemWithYts } from "../../../services/ytsApiClient";
import type { PlaySource } from "../MovieSourcesModal";
import {
  TMDB_BASE_URL,
  fetchWithCache,
  fetchOmdbMeta,
  normalizeItem,
  type CinemaItem,
  type Media,
} from "../moviesDataClient";
import { useCinemaDeepLink } from "./useCinemaDeepLink";

export interface UseCinemaScrollHeaderOptions {
  detailedItem: CinemaItem | null;
  setDetailedItem: React.Dispatch<React.SetStateAction<CinemaItem | null>>;
  selectedItemId: number | null;
  selectedMediaType: Media | null;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  setIsLoadingDetails: (v: boolean) => void;
  setMovieActive: (active: boolean) => void;
  registerMovieBack: (cb: () => void) => void;
  persistCurrentProgress: () => void;
  activeTab: "movies" | "series";
  setActiveTab: React.Dispatch<React.SetStateAction<"movies" | "series">>;
  selectedSeason: number;
  setSelectedSeason: (v: number) => void;
  selectedEpisode: number;
  setSelectedEpisode: (v: number) => void;
  deepLinkSeRef: MutableRefObject<{ itemId: number; s?: number; e?: number } | null>;
  preselectedProgressItemIdRef: MutableRefObject<number | null>;
  autoStartWatchRef: MutableRefObject<boolean>;
  setSelectedGenreId: (id: number | null) => void;
  setSearchQuery: (q: string) => void;
  setHeroIndex: (idx: number) => void;
  tmdbKey: string;
  omdbKey: string;
  currentLang: string;
  findPreloadedCinemaItem: (id: number, mediaType: Media) => CinemaItem | null;
  detailPlaySources: PlaySource[];
  setDetailServersOpen: (v: boolean) => void;
  startGalleryWatchSession: () => void;
}

export function useCinemaScrollHeader({
  detailedItem,
  setDetailedItem,
  selectedItemId,
  selectedMediaType,
  setSelectedItemId,
  setIsLoadingDetails,
  setMovieActive,
  registerMovieBack,
  persistCurrentProgress,
  activeTab,
  setActiveTab,
  selectedSeason,
  setSelectedSeason,
  selectedEpisode,
  setSelectedEpisode,
  deepLinkSeRef,
  preselectedProgressItemIdRef,
  autoStartWatchRef,
  setSelectedGenreId,
  setSearchQuery,
  setHeroIndex,
  tmdbKey,
  omdbKey,
  currentLang,
  findPreloadedCinemaItem,
  detailPlaySources,
  setDetailServersOpen,
  startGalleryWatchSession,
}: UseCinemaScrollHeaderOptions) {
  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 40);
  }, []);

  useEffect(() => {
    setMovieActive(Boolean(detailedItem));
    registerMovieBack(() => {
      persistCurrentProgress();
      setDetailedItem(null);
      setSelectedItemId(null);
    });
  }, [
    detailedItem,
    setMovieActive,
    registerMovieBack,
    persistCurrentProgress,
    setSelectedItemId,
    setDetailedItem,
  ]);

  useEffect(() => {
    return () => {
      setMovieActive(false);
    };
  }, [setMovieActive]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("nl-cinema-active");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("nl-cinema-active");
    };
  }, []);

  useCinemaDeepLink({
    selectedItemId,
    selectedMediaType,
    detailedItem,
    activeTab,
    setActiveTab,
    selectedSeason,
    selectedEpisode,
    setSelectedItemId,
    deepLinkSeRef,
  });

  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) return;
    prevActiveTabRef.current = activeTab;
    setSelectedGenreId(null);
    setSearchQuery("");
    setDetailedItem(null);
    setSelectedItemId(null);
    setHeroIndex(0);
  }, [
    activeTab,
    setSelectedGenreId,
    setSearchQuery,
    setSelectedItemId,
    setHeroIndex,
    setDetailedItem,
  ]);

  const lastHeaderHeightRef = useRef<number>(0);
  useEffect(() => {
    const header = document.querySelector(".nl-cinema-header") as HTMLElement | null;
    if (!header) return;
    const ro = new ResizeObserver(() => {
      const h = header.offsetHeight;
      if (h !== lastHeaderHeightRef.current) {
        lastHeaderHeightRef.current = h;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--cinema-header-h", `${h}px`);
        });
      }
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Details Modal Loader
  useEffect(() => {
    if (selectedItemId === null) return;
    let cancelled = false;

    const mediaType: Media =
      selectedMediaType ?? (activeTab === "series" ? "tv" : "movie");
    const isTv = mediaType === "tv";

    if (!detailedItem || detailedItem.id !== selectedItemId) {
      const seeded = findPreloadedCinemaItem(selectedItemId, mediaType);
      if (seeded) {
        setDetailedItem(seeded);
        setIsLoadingDetails(false);
      } else {
        setIsLoadingDetails(true);
      }
    }

    if (!tmdbKey) {
      const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const match = list.find((m) => m.id === selectedItemId);
      if (!cancelled && match) {
        const normalized = normalizeItem(match, mediaType, currentLang);
        setDetailedItem(normalized);
        if (!isTv) {
          enrichCinemaItemWithYts(normalized)
            .then((enriched) => {
              if (!cancelled && enriched) {
                setDetailedItem((prev) =>
                  prev && prev.id === normalized.id ? enriched : prev,
                );
              }
            })
            .catch(() => {});
        }
        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress("tv", normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === "tv" ? "series" : "movie",
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);
      }
      return;
    }

    const loadDetails = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const detailType = isTv ? "tv" : "movie";
        const detailsAppend = isTv
          ? "videos,credits,similar,external_ids"
          : "videos,credits,similar,release_dates";

        const detail = await fetchWithCache(
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&include_video_language=${currentLang},en,null&append_to_response=${detailsAppend}`,
        );

        if (cancelled) return;

        const normalized = normalizeItem(detail, mediaType, currentLang);
        setDetailedItem((prev) => {
          if (prev && prev.id === normalized.id) {
            return {
              ...normalized,
              rating: prev.rating || normalized.rating,
              certification: normalized.certification || prev.certification,
              rottenTomatoes: prev.rottenTomatoes || normalized.rottenTomatoes,
              metascore: prev.metascore || normalized.metascore,
              awards: prev.awards || normalized.awards,
              boxOffice: prev.boxOffice || normalized.boxOffice,
            };
          }
          return normalized;
        });

        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress("tv", normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === "tv" ? "series" : "movie",
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);

        if (!isTv) {
          enrichCinemaItemWithYts(normalized)
            .then((enriched) => {
              if (cancelled || !enriched) return;
              setDetailedItem((prev) => {
                if (!prev || prev.id !== normalized.id) return prev;
                return {
                  ...prev,
                  imdbId: prev.imdbId || enriched.imdbId,
                  posterPath: prev.posterPath || enriched.posterPath,
                  backdropPath: prev.backdropPath || enriched.backdropPath,
                  trailerKey: prev.trailerKey || enriched.trailerKey,
                  rating:
                    prev.rating && prev.rating > 0 ? prev.rating : enriched.rating,
                  runtime: prev.runtime || enriched.runtime,
                  certification: prev.certification || enriched.certification,
                  overview:
                    !prev.overview ||
                    prev.overview.includes("unavailable") ||
                    prev.overview.includes("not available")
                      ? enriched.overview
                      : prev.overview,
                  cast: prev.cast?.length ? prev.cast : enriched.cast,
                };
              });
            })
            .catch(() => {});
        }

        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;
        if (imdbId && omdbKey) {
          fetchOmdbMeta(imdbId, omdbKey)
            .then((omdb) => {
              if (cancelled || !omdb) return;
              const parsedImdbRating = omdb.imdbRating
                ? parseFloat(omdb.imdbRating)
                : NaN;
              setDetailedItem((prev) => {
                if (!prev || prev.id !== normalized.id) return prev;
                return {
                  ...prev,
                  rating:
                    Number.isFinite(parsedImdbRating) && parsedImdbRating > 0
                      ? parsedImdbRating
                      : prev.rating,
                  certification: prev.certification || omdb.rated,
                  rottenTomatoes: omdb.rottenTomatoes || prev.rottenTomatoes,
                  metascore: omdb.metascore || prev.metascore,
                  awards: omdb.awards || prev.awards,
                  boxOffice: omdb.boxOffice || prev.boxOffice,
                };
              });
            })
            .catch((err) => {
              console.debug("Non-blocking OMDb enrichment failed:", err);
            });
        }
      } catch (err) {
        console.error("Failed loading exact item details:", err);
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedItemId,
    selectedMediaType,
    activeTab,
    tmdbKey,
    currentLang,
    omdbKey,
    findPreloadedCinemaItem,
  ]);

  useEffect(() => {
    if (
      detailedItem &&
      selectedItemId !== null &&
      detailedItem.id === selectedItemId &&
      autoStartWatchRef.current &&
      detailPlaySources.length > 0
    ) {
      autoStartWatchRef.current = false;
      setDetailServersOpen(true);
      startGalleryWatchSession();
    }
  }, [
    detailedItem,
    selectedItemId,
    detailPlaySources,
    startGalleryWatchSession,
    autoStartWatchRef,
    setDetailServersOpen,
  ]);

  return {
    scrolled,
    mainScrollRef,
    handleScrollEvent,
  };
}

export type UseCinemaScrollHeaderResult = ReturnType<typeof useCinemaScrollHeader>;
