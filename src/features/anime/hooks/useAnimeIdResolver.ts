/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Resolves 7 Anime IDs (MAL, AniList, Kitsu, AniDB, IMDb, TMDB, TVDB),
 * Episode Metadata, and AniSkip Intro/Outro Timestamps.
 */

import { useState, useEffect } from 'react';
import {
  fetchAniSkipTimes,
  resolveAnimeIdsAndEpisodes,
} from '../services/animeIdBridgeService';
import type {
  AnimeEpisodeInfo,
  AnimeIdentifiers,
  AnimeItem,
  AnimeSkipWindow,
} from '../types/anime.types';

export function useAnimeIdResolver(
  selectedAnime: AnimeItem | null,
  selectedEpisode: number,
) {
  const [resolvedIds, setResolvedIds] = useState<AnimeIdentifiers>({});
  const [episodes, setEpisodes] = useState<AnimeEpisodeInfo[]>([]);
  const [isResolvingIds, setIsResolvingIds] = useState<boolean>(false);
  const [skipWindows, setSkipWindows] = useState<AnimeSkipWindow[]>([]);

  useEffect(() => {
    if (!selectedAnime) {
      setResolvedIds({});
      setEpisodes([]);
      setIsResolvingIds(false);
      return undefined;
    }

    let cancelled = false;
    setIsResolvingIds(true);

    resolveAnimeIdsAndEpisodes(selectedAnime)
      .then((payload) => {
        if (cancelled) return;
        setResolvedIds(payload.ids);
        setEpisodes(payload.episodes);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingIds(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAnime]);

  useEffect(() => {
    const malId = resolvedIds.malId || selectedAnime?.malId;
    if (!malId || selectedEpisode <= 0) {
      setSkipWindows([]);
      return undefined;
    }

    let cancelled = false;
    fetchAniSkipTimes(malId, selectedEpisode).then((windows) => {
      if (!cancelled) setSkipWindows(windows);
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedIds.malId, selectedAnime?.malId, selectedEpisode]);

  return {
    resolvedIds,
    episodes,
    isResolvingIds,
    skipWindows,
  };
}
