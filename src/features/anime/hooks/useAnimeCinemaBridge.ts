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
    (id: number): AnimeItem | undefined => {
      const fromMap = animeMap.get(id) || extraAnimeMapRef?.current.get(id);
      if (fromMap) return fromMap;
      const cItem = allCinemaItems.find((it) => it.id === id);
      if (!cItem) return undefined;
      const archiveId = cItem.archiveIds?.[0];
      return {
        id: archiveId ? `ia-jp-${archiveId}` : `cinema-anime-${cItem.id}`,
        malId: cItem.malId,
        anilistId: cItem.anilistId,
        kitsuId: cItem.kitsuId,
        tmdbId: cItem.tmdbId,
        imdbId: cItem.imdbId,
        title: cItem.title,
        titleRomaji: cItem.title,
        synopsis: cItem.overview,
        posterUrl: cItem.posterPath,
        bannerUrl: cItem.backdropPath || cItem.posterPath,
        score: cItem.rating || 8.2,
        year: Number(cItem.year) || 2024,
        format: cItem.mediaType === 'movie' ? 'MOVIE' : 'TV',
        status: 'FINISHED',
        episodesCount: cItem.episodes || (cItem.mediaType === 'movie' ? 1 : 12),
        genres: cItem.genreNames || ['Anime'],
        studios: cItem.productionCompanies?.map((c) => c.name) || ['Japan Animation'],
        hasSub: true,
        hasDub: true,
      };
    },
    [animeMap, extraAnimeMapRef, allCinemaItems],
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, season: number, episode: number) => {
      const rawAnime = getRawAnime(item.id);
      if (rawAnime?.id.startsWith('ia-jp-')) {
        const archiveId = rawAnime.id.replace(/^ia-jp-/, '');
        return [
          {
            id: `archive-ia-jp-${archiveId}`,
            label: 'Internet Archive Player',
            url: `https://archive.org/embed/${encodeURIComponent(archiveId)}?autoplay=1`,
            host: 'archive.org',
            origins: ['https://archive.org'],
            timeoutMs: 10000,
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
      const effectiveSeason = resolvedIds?.resolvedSeason || season || 1;
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
      setResolvedIdsByNumericId((prev) => ({ ...prev, [item.id]: payload.ids }));
      return payload.episodes.map((ep) => ({
        episode_number: ep.number,
        name: ep.title || ep.titleAr || `Episode ${ep.number}`,
      }));
    },
    [getRawAnime],
  );

  const onBeforeStartWatchSession = useCallback(
    async (item: { id: number }) => {
      const rawAnime = getRawAnime(item.id);
      if (!rawAnime || rawAnime.id.startsWith('ia-jp-')) return;
      const existing =
        resolvedIdsRef.current[item.id] || resolvedIdsByNumericId[item.id];
      const hasAllIds = Boolean(
        (existing?.tmdbId || rawAnime.tmdbId) &&
          (existing?.imdbId || rawAnime.imdbId) &&
          (existing?.malId || rawAnime.malId),
      );
      if (hasAllIds) return;
      try {
        const payload = await Promise.race([
          resolveAnimeIdsAndEpisodes(rawAnime),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500)),
        ]);
        if (payload?.ids) {
          resolvedIdsRef.current[item.id] = payload.ids;
          setResolvedIdsByNumericId((prev) => ({
            ...prev,
            [item.id]: payload.ids,
          }));
        }
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
    if (selectedId === null) return;
    const existing = resolvedIdsRef.current[selectedId];
    if (existing?.tmdbId && existing?.imdbId) return;
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
  }, [controller.selectedItemId, getRawAnime]);

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
