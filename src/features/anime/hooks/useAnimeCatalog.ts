/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Anime Catalog, Categories, Text Search & trace.moe Scene Search
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CURATED_ARABIC_DUB_ANIME,
  fetchAniListCatalog,
  fetchJikanEndpoint,
  searchAnimeMultiSource,
  searchAnimeSceneByImage,
} from '../services/animeCatalogClient';
import type {
  AnimeCategoryFilter,
  AnimeItem,
  TraceMoeMatch,
} from '../types/anime.types';

export function useAnimeCatalog() {
  const [activeCategory, setActiveCategory] = useState<AnimeCategoryFilter>('all');
  const [trendingList, setTrendingList] = useState<AnimeItem[]>(CURATED_ARABIC_DUB_ANIME);
  const [seasonalList, setSeasonalList] = useState<AnimeItem[]>([]);
  const [topRatedList, setTopRatedList] = useState<AnimeItem[]>([]);
  const [moviesList, setMoviesList] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<AnimeItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [sceneMatches, setSceneMatches] = useState<TraceMoeMatch[]>([]);
  const [isSearchingScene, setIsSearchingScene] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const loadAllCategories = async () => {
      setLoading(true);
      try {
        const [anilistTrending, jikanSeasonal, jikanTop, jikanMovies] =
          await Promise.all([
            fetchAniListCatalog('TRENDING_DESC'),
            fetchJikanEndpoint('/seasons/now?sfw=true&limit=24'),
            fetchJikanEndpoint('/top/anime?sfw=true&limit=24'),
            fetchJikanEndpoint('/top/anime?type=movie&sfw=true&limit=24'),
          ]);

        if (cancelled) return;

        if (anilistTrending.length > 0) {
          setTrendingList(anilistTrending);
        } else {
          const fallbackAiring = await fetchJikanEndpoint(
            '/top/anime?filter=airing&sfw=true&limit=24',
          );
          if (!cancelled && fallbackAiring.length > 0) {
            setTrendingList(fallbackAiring);
          }
        }

        if (jikanSeasonal.length > 0) setSeasonalList(jikanSeasonal);
        if (jikanTop.length > 0) setTopRatedList(jikanTop);
        if (jikanMovies.length > 0) setMoviesList(jikanMovies);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAllCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchAnimeMultiSource(trimmed);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSceneSearch = useCallback(async (fileOrUrl: File | string) => {
    setIsSearchingScene(true);
    try {
      const matches = await searchAnimeSceneByImage(fileOrUrl);
      setSceneMatches(matches);
      return matches;
    } finally {
      setIsSearchingScene(false);
    }
  }, []);

  const clearSceneMatches = useCallback(() => {
    setSceneMatches([]);
  }, []);

  const heroItems = useMemo(() => {
    const pool = [...CURATED_ARABIC_DUB_ANIME, ...trendingList];
    const seen = new Set<string>();
    return pool
      .filter((item) => {
        const key = String(item.malId || item.anilistId || item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(item.bannerUrl || item.posterUrl);
      })
      .slice(0, 8);
  }, [trendingList]);

  const filteredItems = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    switch (activeCategory) {
      case 'trending':
        return trendingList;
      case 'seasonal':
        return seasonalList.length > 0 ? seasonalList : trendingList;
      case 'top_rated':
        return topRatedList.length > 0 ? topRatedList : trendingList;
      case 'movies':
        return moviesList;
      case 'arabic_dub':
        return CURATED_ARABIC_DUB_ANIME;
      case 'all':
      default:
        return trendingList;
    }
  }, [
    searchQuery,
    searchResults,
    activeCategory,
    trendingList,
    seasonalList,
    topRatedList,
    moviesList,
  ]);

  const findAnimeById = useCallback(
    (idOrMalId: string | number): AnimeItem | null => {
      const all = [
        ...CURATED_ARABIC_DUB_ANIME,
        ...trendingList,
        ...seasonalList,
        ...topRatedList,
        ...moviesList,
        ...searchResults,
      ];
      return (
        all.find(
          (a) =>
            a.id === String(idOrMalId) ||
            a.malId === Number(idOrMalId) ||
            a.anilistId === Number(idOrMalId),
        ) || null
      );
    },
    [trendingList, seasonalList, topRatedList, moviesList, searchResults],
  );

  return {
    activeCategory,
    setActiveCategory,
    trendingList,
    seasonalList,
    topRatedList,
    moviesList,
    arabicDubList: CURATED_ARABIC_DUB_ANIME,
    heroItems,
    filteredItems,
    loading,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    sceneMatches,
    isSearchingScene,
    handleSceneSearch,
    clearSceneMatches,
    findAnimeById,
  };
}
