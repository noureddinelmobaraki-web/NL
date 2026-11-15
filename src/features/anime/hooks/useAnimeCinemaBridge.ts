/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStandaloneCinemaController } from '../../../components/Movies/hooks/useStandaloneCinemaController';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
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
  audioMode: AnimeAudioMode,
  onChangeAudioMode?: (mode: AnimeAudioMode) => void,
  extraAnimeMapRef?: React.MutableRefObject<Map<number, AnimeItem>>,
  extraCinemaItems?: CinemaItem[],
) {
  const [resolvedIdsByNumericId, setResolvedIdsByNumericId] = useState<
    Record<number, AnimeIdentifiers>
  >({});
  const resolvedIdsRef = useRef<Record<number, AnimeIdentifiers>>({});

  const animeMap = useMemo(() => {
    const map = new Map<number, AnimeItem>(extraAnimeMapRef?.current);
    animeList.forEach((a, idx) => map.set(getAnimeNumericId(a, idx), a));
    return map;
  }, [animeList, extraAnimeMapRef]);

  const cinemaItems = useMemo(
    () => animeList.map((a, idx) => adaptAnimeItemToCinemaItem(a, idx)),
    [animeList],
  );

  const allCinemaItems = useMemo(() => {
    if (!extraCinemaItems || extraCinemaItems.length === 0) return cinemaItems;
    const byId = new Map<number, CinemaItem>();
    for (const it of cinemaItems) byId.set(it.id, it);
    for (const it of extraCinemaItems) {
      if (!byId.has(it.id)) byId.set(it.id, it);
    }
    return Array.from(byId.values());
  }, [cinemaItems, extraCinemaItems]);

  const getRawAnime = useCallback(
    (id: number): AnimeItem | undefined =>
      animeMap.get(id) || extraAnimeMapRef?.current.get(id),
    [animeMap, extraAnimeMapRef],
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, season: number, episode: number) => {
      const rawAnime = getRawAnime(item.id);
      if (rawAnime?.id.startsWith('ia-jp-')) {
        const archiveId = rawAnime.id.replace(/^ia-jp-/, '');
        return [
          {
            id: `ia-jp-embed-${archiveId}`,
            label: 'Internet Archive Player',
            url: `https://archive.org/embed/${encodeURIComponent(archiveId)}?autoplay=1`,
            host: 'archive.org',
            origins: ['https://archive.org'],
            timeoutMs: 12000,
          },
        ];
      }
      if (!rawAnime) return [];
      const resolvedIds =
        resolvedIdsRef.current[item.id] || resolvedIdsByNumericId[item.id];
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
        effectiveSeason,
      );
    },
    [getRawAnime, audioMode, resolvedIdsByNumericId],
  );

  const customEpisodesBuilder = useCallback(
    async (item: { id: number }) => {
      const rawAnime = getRawAnime(item.id);
      if (!rawAnime || rawAnime.id.startsWith('ia-jp-')) {
        return [{ episode_number: 1, name: rawAnime?.title || 'Episode 1' }];
      }
      const payload = await resolveAnimeIdsAndEpisodes(rawAnime);
      resolvedIdsRef.current[item.id] = payload.ids;
      setResolvedIdsByNumericId((prev) =>
        prev[item.id] ? prev : { ...prev, [item.id]: payload.ids },
      );
      return payload.episodes.map((ep) => ({
        episode_number: ep.number,
        name: ep.title || ep.titleAr || `Episode ${ep.number}`,
      }));
    },
    [animeMap],
  );

  const onBeforeStartWatchSession = useCallback(
    async (item: { id: number }) => {
      const rawAnime = getRawAnime(item.id);
      if (!rawAnime || rawAnime.id.startsWith('ia-jp-')) return;
      const existing =
        resolvedIdsRef.current[item.id] || resolvedIdsByNumericId[item.id];
      const hasMal = Boolean(existing?.malId || rawAnime.malId);
      const hasAnilist = Boolean(existing?.anilistId || rawAnime.anilistId);
      if (hasMal && hasAnilist) return;
      try {
        const payload = await resolveAnimeIdsAndEpisodes(rawAnime);
        resolvedIdsRef.current[item.id] = payload.ids;
        setResolvedIdsByNumericId((prev) => ({
          ...prev,
          [item.id]: payload.ids,
        }));
      } catch {
        // proceed with available IDs
      }
    },
    [getRawAnime, resolvedIdsByNumericId],
  );

  const controller = useStandaloneCinemaController({
    items: allCinemaItems,
    hub: 'anime',
    onBeforeStartWatchSession,
    customSourcesBuilder,
    customEpisodesBuilder,
  });

  // Immediately reload active server when user switches SUB <-> DUB
  const prevAudioModeRef = useRef<AnimeAudioMode>(audioMode);
  useEffect(() => {
    if (prevAudioModeRef.current !== audioMode) {
      prevAudioModeRef.current = audioMode;
      if (controller.isWatchingInGallery) {
        controller.startGalleryWatchSession(0);
      }
    }
  }, [audioMode, controller]);

  useEffect(() => {
    const selectedId = controller.selectedItemId;
    if (
      selectedId === null ||
      resolvedIdsRef.current[selectedId] ||
      resolvedIdsByNumericId[selectedId]
    ) {
      return;
    }
    const rawAnime = getRawAnime(selectedId);
    if (!rawAnime || rawAnime.id.startsWith('ia-jp-')) return;

    let cancelled = false;
    void resolveAnimeIdsAndEpisodes(rawAnime).then((payload) => {
      if (!cancelled) {
        resolvedIdsRef.current[selectedId] = payload.ids;
        setResolvedIdsByNumericId((prev) => ({
          ...prev,
          [selectedId]: payload.ids,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [controller.selectedItemId, getRawAnime, resolvedIdsByNumericId]);

  const activeHeroItem =
    controller.slideshowSlides[controller.heroTrailer.heroIndex] ||
    cinemaItems[0] ||
    null;

  const enhancedController = useMemo(
    () => ({
      ...controller,
      playerStageProps: {
        ...controller.playerStageProps,
        animeAudioMode: audioMode,
        onChangeAnimeAudioMode: onChangeAudioMode,
      },
    }),
    [controller, audioMode, onChangeAudioMode],
  );

  return {
    controller: enhancedController,
    cinemaItems,
    activeHeroItem,
  };
}

export type UseAnimeCinemaBridgeResult = ReturnType<typeof useAnimeCinemaBridge>;
