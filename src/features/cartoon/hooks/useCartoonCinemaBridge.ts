/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const resolvedStreamsRef = useRef<Record<string, CartoonEpisodeStream[]>>({});

  const ensureStreamsResolved = useCallback(
    async (item: { id: number }) => {
      const series = seriesByNumericId.get(item.id);
      if (!series || series.archiveIds.length === 0) return;
      if (resolvedStreamsRef.current[series.id]) return;
      const eps = await resolveCartoonEpisodes(series);
      if (eps.length > 0) {
        resolvedStreamsRef.current[series.id] = eps;
        setResolvedStreamsByShowId((prev) =>
          prev[series.id] ? prev : { ...prev, [series.id]: eps }
        );
      }
    },
    [seriesByNumericId]
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, _season: number, episode: number) => {
      const series = seriesByNumericId.get(item.id);
      const resolved = series
        ? resolvedStreamsRef.current[series.id] || resolvedStreamsByShowId[series.id]
        : undefined;
      return buildCartoonPlaySourcesSync(series, episode, resolved);
    },
    [seriesByNumericId, resolvedStreamsByShowId]
  );

  const customEpisodesBuilder = useCallback(
    async (item: { id: number }) => {
      const series = seriesByNumericId.get(item.id);
      if (series) {
        await ensureStreamsResolved(item);
      }
      return buildCartoonEpisodesList(series);
    },
    [seriesByNumericId, ensureStreamsResolved]
  );

  const controller = useStandaloneCinemaController({
    hub: 'cartoon',
    items: cinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
    onBeforeStartWatchSession: ensureStreamsResolved,
  });

  useEffect(() => {
    const selectedId = controller.selectedItemId;
    if (selectedId === null) return;
    const series = seriesByNumericId.get(selectedId);
    if (!series || resolvedStreamsRef.current[series.id]) return;

    let cancelled = false;
    void resolveCartoonEpisodes(series).then((eps) => {
      if (!cancelled && eps.length > 0) {
        resolvedStreamsRef.current[series.id] = eps;
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
