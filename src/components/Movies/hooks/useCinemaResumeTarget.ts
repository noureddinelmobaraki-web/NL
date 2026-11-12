/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from "react";
import { getProgress } from "../../../features/cinema/progress/progressStore";
import type { CinemaItem } from "../moviesDataClient";

export interface UseCinemaResumeTargetOptions {
  detailedItem: CinemaItem | null;
  selectedSeason: number;
  selectedEpisode: number;
  isFullSeasonEmbed: boolean;
}

export function useCinemaResumeTarget({
  detailedItem,
  selectedSeason,
  selectedEpisode,
  isFullSeasonEmbed,
}: UseCinemaResumeTargetOptions) {
  const resumeStartAtSec = useMemo(() => {
    if (!detailedItem) return undefined;
    const saved = getProgress(detailedItem.mediaType, detailedItem.id);
    if (!saved) return undefined;
    if (
      detailedItem.mediaType === "tv" &&
      ((saved.season && saved.season !== selectedSeason) ||
        (saved.episode && saved.episode !== selectedEpisode))
    ) {
      return undefined;
    }
    return saved.time > 5 ? saved.time : undefined;
  }, [detailedItem?.id, detailedItem?.mediaType, selectedSeason, selectedEpisode]);

  const detailWatchTarget = useMemo(() => {
    if (!detailedItem) return null;
    return {
      id: detailedItem.id,
      mediaType: detailedItem.mediaType,
      title: detailedItem.title,
      imdbId: detailedItem.imdbId,
      backdropPath: detailedItem.backdropPath,
      posterPath: detailedItem.posterPath,
      season: selectedSeason,
      episode: selectedEpisode,
      fullSeason: isFullSeasonEmbed,
      startAt: resumeStartAtSec,
    };
  }, [detailedItem, selectedSeason, selectedEpisode, isFullSeasonEmbed, resumeStartAtSec]);

  return {
    resumeStartAtSec,
    detailWatchTarget,
  };
}

export type UseCinemaResumeTargetResult = ReturnType<typeof useCinemaResumeTarget>;
