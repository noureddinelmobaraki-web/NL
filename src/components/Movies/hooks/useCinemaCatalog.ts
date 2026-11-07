/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { FALLBACK_MOVIES, FALLBACK_GENRES } from "../CuratedFallback";
import { FALLBACK_SERIES, FALLBACK_SERIES_GENRES } from "../../Series/CuratedFallback";
import { tmdbLang } from "../../../utils/lang";
import { useTopMovies } from "../useTopMovies";
import {
  TMDB_BASE_URL,
  fetchWithCache,
  normalizeItem,
  type Media,
  type CinemaItem,
} from "../moviesDataClient";

export function useCinemaCatalog({
  initialTab,
  tmdbKey,
  currentLang,
}: {
  initialTab: "movies" | "series";
  tmdbKey: string;
  currentLang: string;
}) {
  const topMoviesRows = useTopMovies("movie", 20);
  const topSeriesRows = useTopMovies("series", 20);
  const [topMovies, setTopMovies] = useState<CinemaItem[]>([]);
  const [topSeries, setTopSeries] = useState<CinemaItem[]>([]);

  const [activeTab, setActiveTab] = useState<"movies" | "series">(initialTab);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [globalError, setGlobalError] = useState(false);

  const [trendingMovies, setTrendingMovies] = useState<CinemaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<CinemaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<CinemaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<CinemaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<CinemaItem[]>([]);
  const [dramaMovies, setDramaMovies] = useState<CinemaItem[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<CinemaItem[]>([]);
  const [movieGenres, setMovieGenres] = useState<any[]>([]);

  const [trendingSeries, setTrendingSeries] = useState<CinemaItem[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<CinemaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<CinemaItem[]>([]);
  const [actionSeries, setActionSeries] = useState<CinemaItem[]>([]);
  const [mysterySeries, setMysterySeries] = useState<CinemaItem[]>([]);
  const [dramaSeries, setDramaSeries] = useState<CinemaItem[]>([]);
  const [animationSeries, setAnimationSeries] = useState<CinemaItem[]>([]);
  const [seriesGenres, setSeriesGenres] = useState<any[]>([]);

  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CinemaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [seriesLoadTriggered, setSeriesLoadTriggered] = useState(initialTab === "series");

  // Resolution effects for Top items (batched 6 at a time, preserving order)
  useEffect(() => {
    let cancelled = false;
    if (topMoviesRows.length === 0) {
      setTopMovies([]);
      return;
    }
    const loadTopMoviesDetails = async () => {
      const langParam = `&language=${tmdbLang(currentLang)}`;

      const allLoaded = [
        ...trendingMovies,
        ...topRatedMovies,
        ...popularMovies,
        ...actionMovies,
        ...horrorMovies,
        ...dramaMovies,
        ...sciFiMovies,
        ...FALLBACK_MOVIES.map((r) => normalizeItem(r, "movie", currentLang)),
      ];

      const resolved: (CinemaItem | null)[] = new Array(topMoviesRows.length).fill(null);
      const BATCH_SIZE = 6;
      for (let i = 0; i < topMoviesRows.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const slice = topMoviesRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          slice.map(async (row, idx) => {
            const targetIdx = i + idx;
            const matched = allLoaded.find((m) => m.id === row.tmdb_id && m.mediaType === "movie");
            if (matched) {
              resolved[targetIdx] = matched;
              return;
            }
            if (!tmdbKey) return;
            try {
              const detail = await fetchWithCache(
                `${TMDB_BASE_URL}/movie/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`,
              );
              if (!cancelled && detail) {
                resolved[targetIdx] = normalizeItem(detail, "movie", currentLang);
              }
            } catch (e) {
              console.warn("Failed to fetch top movie details for ID", row.tmdb_id, e);
            }
          }),
        );
      }
      if (!cancelled) {
        setTopMovies(resolved.filter((x): x is CinemaItem => x !== null));
      }
    };
    void loadTopMoviesDetails();
    return () => {
      cancelled = true;
    };
  }, [
    topMoviesRows,
    trendingMovies,
    topRatedMovies,
    popularMovies,
    actionMovies,
    horrorMovies,
    dramaMovies,
    sciFiMovies,
    tmdbKey,
    currentLang,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (topSeriesRows.length === 0) {
      setTopSeries([]);
      return;
    }
    const loadTopSeriesDetails = async () => {
      const langParam = `&language=${tmdbLang(currentLang)}`;

      const allLoaded = [
        ...trendingSeries,
        ...topRatedSeries,
        ...popularSeries,
        ...actionSeries,
        ...mysterySeries,
        ...dramaSeries,
        ...animationSeries,
        ...FALLBACK_SERIES.map((r) => normalizeItem(r, "tv", currentLang)),
      ];

      const resolved: (CinemaItem | null)[] = new Array(topSeriesRows.length).fill(null);
      const BATCH_SIZE = 6;
      for (let i = 0; i < topSeriesRows.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const slice = topSeriesRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          slice.map(async (row, idx) => {
            const targetIdx = i + idx;
            const matched = allLoaded.find((m) => m.id === row.tmdb_id && m.mediaType === "tv");
            if (matched) {
              resolved[targetIdx] = matched;
              return;
            }
            if (!tmdbKey) return;
            try {
              const detail = await fetchWithCache(
                `${TMDB_BASE_URL}/tv/${row.tmdb_id}?api_key=${tmdbKey}${langParam}`,
              );
              if (!cancelled && detail) {
                resolved[targetIdx] = normalizeItem(detail, "tv", currentLang);
              }
            } catch (e) {
              console.warn("Failed to fetch top series details for ID", row.tmdb_id, e);
            }
          }),
        );
      }
      if (!cancelled) {
        setTopSeries(resolved.filter((x): x is CinemaItem => x !== null));
      }
    };
    void loadTopSeriesDetails();
    return () => {
      cancelled = true;
    };
  }, [
    topSeriesRows,
    trendingSeries,
    topRatedSeries,
    popularSeries,
    actionSeries,
    mysterySeries,
    dramaSeries,
    animationSeries,
    tmdbKey,
    currentLang,
  ]);

  const findPreloadedCinemaItem = useCallback(
    (id: number, mediaType?: Media | null): CinemaItem | null => {
      const targetType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      const pools: CinemaItem[][] =
        targetType === "tv"
          ? [
              trendingSeries,
              topRatedSeries,
              popularSeries,
              actionSeries,
              mysterySeries,
              dramaSeries,
              animationSeries,
              topSeries,
              searchResults,
            ]
          : [
              trendingMovies,
              topRatedMovies,
              popularMovies,
              actionMovies,
              horrorMovies,
              dramaMovies,
              sciFiMovies,
              topMovies,
              searchResults,
            ];
      for (const list of pools) {
        const match = list.find((it) => it.id === id && it.mediaType === targetType);
        if (match) return match;
      }
      const fbList = targetType === "tv" ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const fbMatch = fbList.find((it: any) => it.id === id);
      return fbMatch ? normalizeItem(fbMatch, targetType, currentLang) : null;
    },
    [
      activeTab,
      currentLang,
      trendingSeries,
      topRatedSeries,
      popularSeries,
      actionSeries,
      mysterySeries,
      dramaSeries,
      animationSeries,
      topSeries,
      trendingMovies,
      topRatedMovies,
      popularMovies,
      actionMovies,
      horrorMovies,
      dramaMovies,
      sciFiMovies,
      topMovies,
      searchResults,
    ],
  );

  // Load Movies
  useEffect(() => {
    let cancelled = false;
    setMoviesLoading(true);

    if (!tmdbKey) {
      if (!cancelled) {
        setTrendingMovies(FALLBACK_MOVIES.map((r) => normalizeItem(r, "movie", currentLang)));
        setTopRatedMovies([...FALLBACK_MOVIES].reverse().map((r) => normalizeItem(r, "movie", currentLang)));
        setPopularMovies(FALLBACK_MOVIES.map((r) => normalizeItem(r, "movie", currentLang)));
        setActionMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Action")).map((r) => normalizeItem(r, "movie", currentLang)));
        setHorrorMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Horror")).map((r) => normalizeItem(r, "movie", currentLang)));
        setDramaMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Drama")).map((r) => normalizeItem(r, "movie", currentLang)));
        setSciFiMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Sci-Fi")).map((r) => normalizeItem(r, "movie", currentLang)));
        setMovieGenres(FALLBACK_GENRES.map((g) => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        setMoviesLoading(false);
      }
      return;
    }

    const loadMovies = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;

        const results = await Promise.allSettled([
          fetchWithCache(`${TMDB_BASE_URL}/genre/movie/list?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/trending/movie/week?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/movie/top_rated?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/movie/popular?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=28`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=27`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=18`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/movie?api_key=${tmdbKey}${langParam}&with_genres=878`),
        ]);

        if (cancelled) return;

        if (results[0].status === "fulfilled" && results[0].value?.genres) {
          setMovieGenres(results[0].value.genres);
        } else {
          setMovieGenres(FALLBACK_GENRES.map((g) => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        }

        if (results[1].status === "fulfilled" && results[1].value?.results?.length) {
          setTrendingMovies(results[1].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setTrendingMovies(FALLBACK_MOVIES.map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[2].status === "fulfilled" && results[2].value?.results?.length) {
          setTopRatedMovies(results[2].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setTopRatedMovies([...FALLBACK_MOVIES].reverse().map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[3].status === "fulfilled" && results[3].value?.results?.length) {
          setPopularMovies(results[3].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setPopularMovies(FALLBACK_MOVIES.map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[4].status === "fulfilled" && results[4].value?.results?.length) {
          setActionMovies(results[4].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setActionMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Action")).map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[5].status === "fulfilled" && results[5].value?.results?.length) {
          setHorrorMovies(results[5].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setHorrorMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Horror")).map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[6].status === "fulfilled" && results[6].value?.results?.length) {
          setDramaMovies(results[6].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setDramaMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Drama")).map((r) => normalizeItem(r, "movie", currentLang)));
        }

        if (results[7].status === "fulfilled" && results[7].value?.results?.length) {
          setSciFiMovies(results[7].value.results.map((r: any) => normalizeItem(r, "movie", currentLang)));
        } else {
          setSciFiMovies(FALLBACK_MOVIES.filter((m) => m.genres.includes("Sci-Fi")).map((r) => normalizeItem(r, "movie", currentLang)));
        }
      } catch (err) {
        console.error("Failed to fetch TMDB Live movies, using fallbacks:", err);
        setGlobalError(true);
      } finally {
        if (!cancelled) setMoviesLoading(false);
      }
    };
    void loadMovies();
    return () => {
      cancelled = true;
    };
  }, [tmdbKey, currentLang]);

  // Trigger series load when Series tab is active OR on idle after movies finish loading
  useEffect(() => {
    if (activeTab === "series") {
      setSeriesLoadTriggered(true);
      return undefined;
    }
    if (!moviesLoading && !seriesLoadTriggered) {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") {
        const id = w.requestIdleCallback(() => setSeriesLoadTriggered(true), { timeout: 1500 });
        return () => w.cancelIdleCallback?.(id);
      }
      const timer = setTimeout(() => setSeriesLoadTriggered(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, moviesLoading, seriesLoadTriggered]);

  // Load Series (deferred until Series tab is opened or idle after movies finish)
  useEffect(() => {
    if (!seriesLoadTriggered) return;
    let cancelled = false;
    setSeriesLoading(true);

    if (!tmdbKey) {
      if (!cancelled) {
        setTrendingSeries(FALLBACK_SERIES.map((r) => normalizeItem(r, "tv", currentLang)));
        setTopRatedSeries([...FALLBACK_SERIES].reverse().map((r) => normalizeItem(r, "tv", currentLang)));
        setPopularSeries(FALLBACK_SERIES.map((r) => normalizeItem(r, "tv", currentLang)));
        setActionSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Action") || s.genres.includes("Sci-Fi")).map((r) => normalizeItem(r, "tv", currentLang)));
        setMysterySeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Mystery")).map((r) => normalizeItem(r, "tv", currentLang)));
        setDramaSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Drama")).map((r) => normalizeItem(r, "tv", currentLang)));
        setAnimationSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Animation")).map((r) => normalizeItem(r, "tv", currentLang)));
        setSeriesGenres(FALLBACK_SERIES_GENRES.map((g) => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        setSeriesLoading(false);
      }
      return;
    }

    const loadSeries = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;

        const results = await Promise.allSettled([
          fetchWithCache(`${TMDB_BASE_URL}/genre/tv/list?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/trending/tv/week?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/tv/top_rated?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/tv/popular?api_key=${tmdbKey}${langParam}`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=10759`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=9648`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=18`),
          fetchWithCache(`${TMDB_BASE_URL}/discover/tv?api_key=${tmdbKey}${langParam}&with_genres=16`),
        ]);

        if (cancelled) return;

        if (results[0].status === "fulfilled" && results[0].value?.genres) {
          setSeriesGenres(results[0].value.genres);
        } else {
          setSeriesGenres(FALLBACK_SERIES_GENRES.map((g) => ({ id: g.id, name: g.name[currentLang as "en" | "ar" | "fr"] || g.name.en })));
        }

        if (results[1].status === "fulfilled" && results[1].value?.results?.length) {
          setTrendingSeries(results[1].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setTrendingSeries(FALLBACK_SERIES.map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[2].status === "fulfilled" && results[2].value?.results?.length) {
          setTopRatedSeries(results[2].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setTopRatedSeries([...FALLBACK_SERIES].reverse().map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[3].status === "fulfilled" && results[3].value?.results?.length) {
          setPopularSeries(results[3].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setPopularSeries(FALLBACK_SERIES.map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[4].status === "fulfilled" && results[4].value?.results?.length) {
          setActionSeries(results[4].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setActionSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Action") || s.genres.includes("Sci-Fi")).map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[5].status === "fulfilled" && results[5].value?.results?.length) {
          setMysterySeries(results[5].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setMysterySeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Mystery")).map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[6].status === "fulfilled" && results[6].value?.results?.length) {
          setDramaSeries(results[6].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setDramaSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Drama")).map((r) => normalizeItem(r, "tv", currentLang)));
        }

        if (results[7].status === "fulfilled" && results[7].value?.results?.length) {
          setAnimationSeries(results[7].value.results.map((r: any) => normalizeItem(r, "tv", currentLang)));
        } else {
          setAnimationSeries(FALLBACK_SERIES.filter((s) => s.genres.includes("Animation")).map((r) => normalizeItem(r, "tv", currentLang)));
        }
      } catch (err) {
        console.error("Failed to fetch TMDB Live series, using fallbacks:", err);
        setGlobalError(true);
      } finally {
        if (!cancelled) setSeriesLoading(false);
      }
    };
    void loadSeries();
    return () => {
      cancelled = true;
    };
  }, [tmdbKey, currentLang, seriesLoadTriggered]);

  // Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const isTv = activeTab === "series";
        const mediaType: Media = isTv ? "tv" : "movie";

        if (!tmdbKey) {
          const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
          const normalizedList = list.map((item) => normalizeItem(item, mediaType, currentLang));
          const query = searchQuery.toLowerCase();
          const matched = normalizedList.filter((item) => {
            return item.title.toLowerCase().includes(query) || item.overview.toLowerCase().includes(query);
          });
          setSearchResults(matched);
          setIsSearching(false);
          return;
        }

        const endpoint = isTv ? "search/tv" : "search/movie";
        const searchData = await fetchWithCache(
          `${TMDB_BASE_URL}/${endpoint}?api_key=${tmdbKey}&language=${tmdbLang(currentLang)}&query=${encodeURIComponent(searchQuery)}`,
        );
        const results = (searchData?.results || []).map((r: any) => normalizeItem(r, mediaType, currentLang));
        setSearchResults(results);
      } catch (err) {
        console.error("Failed search operation:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeTab, tmdbKey, currentLang]);

  const activeGenres = activeTab === "movies" ? movieGenres : seriesGenres;
  const activeFallbackSelected = activeTab === "movies" ? FALLBACK_MOVIES : FALLBACK_SERIES;
  const activeLiveTrending = activeTab === "movies" ? trendingMovies : trendingSeries;

  const slideshowSlides = useMemo(() => {
    if (activeLiveTrending.length > 0) return activeLiveTrending.slice(0, 5);
    return activeFallbackSelected.map((r) => normalizeItem(r, activeTab === "movies" ? "movie" : "tv", currentLang));
  }, [activeLiveTrending, activeFallbackSelected, activeTab, currentLang]);

  const filteredList = useMemo(() => {
    if (selectedGenreId === null) return [];
    const isTv = activeTab === "series";
    const mediaType: Media = isTv ? "tv" : "movie";

    if (!tmdbKey) {
      const fallbackList = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const genreObj = (isTv ? FALLBACK_SERIES_GENRES : FALLBACK_GENRES).find((g) => g.id === selectedGenreId);
      if (!genreObj) return fallbackList.map((r) => normalizeItem(r, mediaType, currentLang));
      const genreName = genreObj.name.en;
      return fallbackList
        .filter((item: any) => item.genres.includes(genreName))
        .map((r) => normalizeItem(r, mediaType, currentLang));
    }

    const sourceLists = isTv
      ? [trendingSeries, topRatedSeries, popularSeries, actionSeries, mysterySeries, dramaSeries, animationSeries]
      : [trendingMovies, topRatedMovies, popularMovies, actionMovies, horrorMovies, dramaMovies, sciFiMovies];

    const allCollected = sourceLists.flat();
    const unique = Array.from(new Map(allCollected.map((item) => [item.id, item])).values());
    return unique.filter((item: CinemaItem) => item.genreIds?.includes(selectedGenreId));
  }, [
    selectedGenreId,
    activeTab,
    tmdbKey,
    currentLang,
    trendingMovies,
    topRatedMovies,
    popularMovies,
    actionMovies,
    horrorMovies,
    dramaMovies,
    sciFiMovies,
    trendingSeries,
    topRatedSeries,
    popularSeries,
    actionSeries,
    mysterySeries,
    dramaSeries,
    animationSeries,
  ]);

  return {
    topMovies,
    topSeries,
    activeTab,
    setActiveTab,
    moviesLoading,
    seriesLoading,
    globalError,
    trendingMovies,
    topRatedMovies,
    popularMovies,
    actionMovies,
    horrorMovies,
    dramaMovies,
    sciFiMovies,
    movieGenres,
    trendingSeries,
    topRatedSeries,
    popularSeries,
    actionSeries,
    mysterySeries,
    dramaSeries,
    animationSeries,
    seriesGenres,
    selectedGenreId,
    setSelectedGenreId,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchOpen,
    setSearchOpen,
    showWatchlist,
    setShowWatchlist,
    findPreloadedCinemaItem,
    activeGenres,
    slideshowSlides,
    filteredList,
  };
}
