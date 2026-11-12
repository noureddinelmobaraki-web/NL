/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback } from 'react';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import { useStandaloneCinemaController } from '../../../components/Movies/hooks/useStandaloneCinemaController';
import type { CartoonSeriesItem } from '../types/cartoon.types';
import {
  buildCartoonEpisodesList,
  buildCartoonPlaySourcesSync,
} from '../adapters/cartoonToCinemaAdapter';

export function useCartoonCinemaBridge(
  seriesByNumericId: Map<number, CartoonSeriesItem>,
  cinemaItems: CinemaItem[]
) {
  const customSourcesBuilder = useCallback(
    (item: { id: number }, _season: number, episode: number) => {
      const series = seriesByNumericId.get(item.id);
      return buildCartoonPlaySourcesSync(series, episode);
    },
    [seriesByNumericId]
  );

  const customEpisodesBuilder = useCallback(
    (item: { id: number }) => {
      const series = seriesByNumericId.get(item.id);
      return buildCartoonEpisodesList(series);
    },
    [seriesByNumericId]
  );

  const controller = useStandaloneCinemaController({
    items: cinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
  });

  const activeHeroItem =
    controller.slideshowSlides[controller.heroTrailer.heroIndex] ||
    cinemaItems[0] ||
    null;

  return {
    controller,
    activeHeroItem,
  };
}

export type UseCartoonCinemaBridgeResult = ReturnType<typeof useCartoonCinemaBridge>;
