/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStandaloneCinemaController } from '../../../components/Movies/hooks/useStandaloneCinemaController';
import type {
  AnimeAudioMode,
  AnimeIdentifiers,
  AnimeItem,
} from '../types/anime.types';
import {
  adaptAnimeItemToCinemaItem,
  buildAnimeCinemaPlaySources,
  getAnimeNumericId,
} from '../adapters/animeToCinemaAdapter';
import { resolveAnimeIdsAndEpisodes } from '../services/animeIdBridgeService';

export function useAnimeCinemaBridge(
  animeList: AnimeItem[],
  audioMode: AnimeAudioMode
) {
  const [resolvedIdsByNumericId, setResolvedIdsByNumericId] = useState<
    Record<number, AnimeIdentifiers>
  >({});

  const animeMap = useMemo(() => {
    const map = new Map<number, AnimeItem>();
    animeList.forEach((a, idx) => map.set(getAnimeNumericId(a, idx), a));
    return map;
  }, [animeList]);

  const cinemaItems = useMemo(
    () => animeList.map((a, idx) => adaptAnimeItemToCinemaItem(a, idx)),
    [animeList]
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, season: number, episode: number) => {
      const rawAnime = animeMap.get(item.id);
      if (!rawAnime) return [];
      const resolvedIds = resolvedIdsByNumericId[item.id];
      const enrichedAnime: AnimeItem = resolvedIds
        ? {
            ...rawAnime,
            malId: resolvedIds.malId || rawAnime.malId,
            anilistId: resolvedIds.anilistId || rawAnime.anilistId,
            tmdbId: resolvedIds.tmdbId || rawAnime.tmdbId,
            imdbId: resolvedIds.imdbId || rawAnime.imdbId,
          }
        : rawAnime;
      const effectiveSeason =
        resolvedIds?.resolvedSeason || season || 1;
      return buildAnimeCinemaPlaySources(
        enrichedAnime,
        episode,
        audioMode,
        effectiveSeason
      );
    },
    [animeMap, audioMode, resolvedIdsByNumericId]
  );

  const customEpisodesBuilder = useCallback(
    async (item: { id: number }) => {
      const rawAnime = animeMap.get(item.id);
      if (!rawAnime) return [{ episode_number: 1, name: 'Episode 1' }];
      const payload = await resolveAnimeIdsAndEpisodes(rawAnime);
      setResolvedIdsByNumericId((prev) =>
        prev[item.id] ? prev : { ...prev, [item.id]: payload.ids }
      );
      return payload.episodes.map((ep) => ({
        episode_number: ep.number,
        name: ep.titleAr || ep.title || `Episode ${ep.number}`,
      }));
    },
    [animeMap]
  );

  const controller = useStandaloneCinemaController({
    items: cinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
  });

  useEffect(() => {
    const selectedId = controller.selectedItemId;
    if (selectedId === null || resolvedIdsByNumericId[selectedId]) return;
    const rawAnime = animeMap.get(selectedId);
    if (!rawAnime) return;

    let cancelled = false;
    void resolveAnimeIdsAndEpisodes(rawAnime).then((payload) => {
      if (!cancelled) {
        setResolvedIdsByNumericId((prev) => ({
          ...prev,
          [selectedId]: payload.ids,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [controller.selectedItemId, animeMap, resolvedIdsByNumericId]);

  const activeHeroItem =
    controller.slideshowSlides[controller.heroTrailer.heroIndex] ||
    cinemaItems[0] ||
    null;

  return {
    controller,
    cinemaItems,
    activeHeroItem,
  };
}

export type UseAnimeCinemaBridgeResult = ReturnType<typeof useAnimeCinemaBridge>;
