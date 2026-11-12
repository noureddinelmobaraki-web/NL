/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import { useStandaloneCinemaController } from '../../../components/Movies/hooks/useStandaloneCinemaController';
import type { CartoonEpisodeStream, CartoonSeriesItem } from '../types/cartoon.types';
import {
  buildCartoonEpisodesList,
  buildCartoonPlaySourcesSync,
  resolveCartoonEpisodes,
} from '../adapters/cartoonToCinemaAdapter';

export function useCartoonCinemaBridge(
  seriesByNumericId: Map<number, CartoonSeriesItem>,
  cinemaItems: CinemaItem[]
) {
  const [resolvedStreamsByShowId, setResolvedStreamsByShowId] = useState<
    Record<string, CartoonEpisodeStream[]>
  >({});

  const customSourcesBuilder = useCallback(
    (item: { id: number }, _season: number, episode: number) => {
      const series = seriesByNumericId.get(item.id);
      const resolved = series ? resolvedStreamsByShowId[series.id] : undefined;
      return buildCartoonPlaySourcesSync(series, episode, resolved);
    },
    [seriesByNumericId, resolvedStreamsByShowId]
  );

  const customEpisodesBuilder = useCallback(
    async (item: { id: number }) => {
      const series = seriesByNumericId.get(item.id);
      if (series) {
        const eps = await resolveCartoonEpisodes(series);
        if (eps.length > 0) {
          setResolvedStreamsByShowId((prev) =>
            prev[series.id] ? prev : { ...prev, [series.id]: eps }
          );
        }
      }
      return buildCartoonEpisodesList(series);
    },
    [seriesByNumericId]
  );

  const controller = useStandaloneCinemaController({
    items: cinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
  });

  useEffect(() => {
    const selectedId = controller.selectedItemId;
    if (selectedId === null) return;
    const series = seriesByNumericId.get(selectedId);
    if (!series || resolvedStreamsByShowId[series.id]) return;

    let cancelled = false;
    void resolveCartoonEpisodes(series).then((eps) => {
      if (!cancelled && eps.length > 0) {
        setResolvedStreamsByShowId((prev) => ({ ...prev, [series.id]: eps }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [controller.selectedItemId, seriesByNumericId, resolvedStreamsByShowId]);

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
