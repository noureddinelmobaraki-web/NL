/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Games Catalog Hook
 * - Merges all sources (45 Local NL Flash games, Homebrew Hub ROMs, Archive.org, MS-DOS, Brain/API)
 * - Defaults to 'all' category with NL Flash games prioritized first (confirmed by user)
 * - Manages instant search, sub-genre filtering, favorites, and recent play history
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  FlashSubGenre,
  GameCategory,
  GamesUserPrefs,
  UnifiedGameItem,
} from '../types/games.types';
import { fetchLocalFlashCatalog } from '../services/localFlashCatalog';
import { fetchHomebrewHubGames } from '../services/homebrewHubClient';
import { fetchArchiveOrgRetroCollection } from '../services/archiveOrgGamesClient';
import { fetchDosClassicsCatalog } from '../services/dosZoneCatalogClient';
import { getInstantAndWebCatalog } from '../services/freeBrowserGamesClient';

const PREFS_STORAGE_KEY = 'nl_games_prefs_v1';

function loadUserPrefs(): GamesUserPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      return { favorites: [], recentIds: [], triviaHighScore: 0, blackjackChips: 500 };
    }
    const parsed = JSON.parse(raw);
    return {
      favorites: Array.isArray(parsed?.favorites) ? parsed.favorites : [],
      recentIds: Array.isArray(parsed?.recentIds) ? parsed.recentIds : [],
      triviaHighScore: Number(parsed?.triviaHighScore) || 0,
      blackjackChips: Number(parsed?.blackjackChips) || 500,
    };
  } catch {
    return { favorites: [], recentIds: [], triviaHighScore: 0, blackjackChips: 500 };
  }
}

function saveUserPrefs(prefs: GamesUserPrefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

export function useUnifiedGamesCatalog() {
  const [flashGames, setFlashGames] = useState<UnifiedGameItem[]>([]);
  const [retroGames, setRetroGames] = useState<UnifiedGameItem[]>([]);
  const [dosGames, setDosGames] = useState<UnifiedGameItem[]>([]);
  const [instantAndWebGames] = useState<UnifiedGameItem[]>(() =>
    getInstantAndWebCatalog(),
  );

  // Confirmed Decision 1: Default category is 'all' with NL Flash prioritized at the top
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [activeFlashSubGenre, setActiveFlashSubGenre] =
    useState<FlashSubGenre>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [prefs, setPrefs] = useState<GamesUserPrefs>(() => loadUserPrefs());

  useEffect(() => {
    const controller = new AbortController();

    fetchLocalFlashCatalog(controller.signal).then((items) => {
      if (!controller.signal.aborted) setFlashGames(items);
    });

    fetchDosClassicsCatalog().then((items) => {
      if (!controller.signal.aborted) setDosGames(items);
    });

    Promise.all([
      fetchHomebrewHubGames(controller.signal),
      fetchArchiveOrgRetroCollection(controller.signal),
    ]).then(([hh3, archiveRetro]) => {
      if (controller.signal.aborted) return;
      const seen = new Set<string>();
      const merged: UnifiedGameItem[] = [];
      for (const g of [...hh3, ...archiveRetro]) {
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        merged.push(g);
      }
      setRetroGames(merged);
    });

    return () => controller.abort();
  }, []);

  const toggleFavorite = useCallback((gameId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPrefs((prev) => {
      const exists = prev.favorites.includes(gameId);
      const nextFavs = exists
        ? prev.favorites.filter((id) => id !== gameId)
        : [gameId, ...prev.favorites];
      const next = { ...prev, favorites: nextFavs };
      saveUserPrefs(next);
      return next;
    });
  }, []);

  const markGamePlayed = useCallback((gameId: string) => {
    setPrefs((prev) => {
      const nextRecent = [
        gameId,
        ...prev.recentIds.filter((id) => id !== gameId),
      ].slice(0, 18);
      const next = { ...prev, recentIds: nextRecent };
      saveUserPrefs(next);
      return next;
    });
  }, []);

  const allCatalog = useMemo(() => {
    // NL Flash games always come first in 'all', followed by Instant/Brain, Retro, DOS, and Web
    return [
      ...flashGames,
      ...instantAndWebGames,
      ...retroGames,
      ...dosGames,
    ];
  }, [flashGames, instantAndWebGames, retroGames, dosGames]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = allCatalog;
    if (activeCategory === 'flash') {
      list = flashGames;
      if (activeFlashSubGenre !== 'All') {
        list = list.filter((g) => g.subGenre === activeFlashSubGenre);
      }
    } else if (activeCategory === 'retro') {
      list = retroGames;
    } else if (activeCategory === 'dos') {
      list = dosGames;
    } else if (activeCategory === 'web') {
      list = instantAndWebGames.filter((g) => g.category === 'web');
    } else if (activeCategory === 'brain') {
      list = instantAndWebGames.filter((g) => g.category === 'brain');
    } else if (activeCategory === 'favorites') {
      const favSet = new Set([...prefs.favorites, ...prefs.recentIds]);
      list = allCatalog.filter((g) => favSet.has(g.id));
    }

    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.platformBadge.toLowerCase().includes(q) ||
          (g.subtitle && g.subtitle.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [
    allCatalog,
    flashGames,
    retroGames,
    dosGames,
    instantAndWebGames,
    activeCategory,
    activeFlashSubGenre,
    searchQuery,
    prefs.favorites,
    prefs.recentIds,
  ]);

  return {
    allCatalog,
    filteredGames,
    activeCategory,
    setActiveCategory,
    activeFlashSubGenre,
    setActiveFlashSubGenre,
    searchQuery,
    setSearchQuery,
    favorites: prefs.favorites,
    recentIds: prefs.recentIds,
    toggleFavorite,
    markGamePlayed,
  };
}
