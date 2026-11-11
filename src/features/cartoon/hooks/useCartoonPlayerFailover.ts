/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Automatic 4-Tier Player Failover
 * (Archive Primary CDN -> Archive Mirror CDN -> YouTube Playlist -> Embed Server)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { buildCartoonPlayOptions } from '../services/cartoonEmbedFallback';
import type {
  CartoonEpisodeStream,
  CartoonPlayOption,
  CartoonSeriesItem,
} from '../types/cartoon.types';

export function useCartoonPlayerFailover({
  selectedCartoon,
  selectedEpisode,
  activeArchiveStream,
}: {
  selectedCartoon: CartoonSeriesItem | null;
  selectedEpisode: number;
  activeArchiveStream: CartoonEpisodeStream | null;
}) {
  const [activeOptionIdx, setActiveOptionIdx] = useState<number>(0);

  const playOptions: CartoonPlayOption[] = useMemo(() => {
    if (!selectedCartoon) return [];
    return buildCartoonPlayOptions(
      selectedCartoon,
      selectedEpisode,
      activeArchiveStream,
    );
  }, [selectedCartoon, selectedEpisode, activeArchiveStream]);

  useEffect(() => {
    setActiveOptionIdx(0);
  }, [selectedCartoon?.id, selectedEpisode, activeArchiveStream?.streamUrl]);

  const activePlayOption =
    playOptions[activeOptionIdx] || playOptions[0] || null;

  const handleFailoverToNextSource = useCallback(() => {
    if (playOptions.length <= 1) return;
    setActiveOptionIdx((prev) => (prev + 1) % playOptions.length);
  }, [playOptions.length]);

  return {
    playOptions,
    activePlayOption,
    activeOptionIdx,
    setActiveOptionIdx,
    handleFailoverToNextSource,
  };
}
