/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useMemo } from 'react';
import { useStandaloneCinemaController } from '../../../components/Movies/hooks/useStandaloneCinemaController';
import type { AnimeAudioMode, AnimeItem } from '../types/anime.types';
import {
  adaptAnimeItemToCinemaItem,
  buildAnimeCinemaPlaySources,
  getAnimeNumericId,
} from '../adapters/animeToCinemaAdapter';

export function useAnimeCinemaBridge(
  animeList: AnimeItem[],
  audioMode: AnimeAudioMode
) {
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
    (item: { id: number }, _season: number, episode: number) => {
      const rawAnime = animeMap.get(item.id);
      return buildAnimeCinemaPlaySources(rawAnime, episode, audioMode);
    },
    [animeMap, audioMode]
  );

  const controller = useStandaloneCinemaController({
    items: cinemaItems,
    customSourcesBuilder,
  });

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
