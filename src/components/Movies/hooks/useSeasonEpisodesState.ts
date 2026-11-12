/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState } from "react";

export function useSeasonEpisodesState() {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isFullSeasonEmbed, setIsFullSeasonEmbed] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Array<{ episode_number: number; name: string }>
  >([]);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);

  return {
    selectedSeason,
    setSelectedSeason,
    selectedEpisode,
    setSelectedEpisode,
    isFullSeasonEmbed,
    setIsFullSeasonEmbed,
    seasonEpisodes,
    setSeasonEpisodes,
    loadingSeasonEpisodes,
    setLoadingSeasonEpisodes,
  };
}

export type UseSeasonEpisodesStateResult = ReturnType<typeof useSeasonEpisodesState>;
