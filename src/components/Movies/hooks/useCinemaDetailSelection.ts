/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useState } from "react";
import { probeAllServersSpeed } from "../../../services/serverSpeedMonitor";
import type { CinemaItem, Media } from "../moviesDataClient";

export interface UseCinemaDetailSelectionOptions {
  activeTab: "movies" | "series";
  findPreloadedCinemaItem: (id: number, mediaType: Media) => CinemaItem | null;
}

export function useCinemaDetailSelection({
  activeTab,
  findPreloadedCinemaItem,
}: UseCinemaDetailSelectionOptions) {
  const [detailServersOpen, setDetailServersOpen] = useState(false);
  const [selectedItemId, setSelectedItemIdState] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<Media | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const setSelectedItemId = useCallback(
    (id: number | null, mediaType?: Media) => {
      if (id === null) {
        setSelectedMediaType(null);
        setSelectedItemIdState(null);
        return;
      }
      const effType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      void probeAllServersSpeed(undefined, `${effType}_${id}`);
      setSelectedMediaType(effType);
      setSelectedItemIdState(id);
      const preloaded = findPreloadedCinemaItem(id, effType);
      if (preloaded) {
        setDetailedItem((prev) =>
          prev && prev.id === id && prev.mediaType === effType ? prev : preloaded,
        );
        setIsLoadingDetails(false);
      } else {
        setDetailedItem((prev) =>
          prev && prev.id === id && prev.mediaType === effType ? prev : null,
        );
        setIsLoadingDetails(true);
      }
    },
    [activeTab, findPreloadedCinemaItem],
  );

  return {
    detailServersOpen,
    setDetailServersOpen,
    selectedItemId,
    setSelectedItemIdState,
    selectedMediaType,
    setSelectedMediaType,
    detailedItem,
    setDetailedItem,
    isLoadingDetails,
    setIsLoadingDetails,
    setSelectedItemId,
  };
}

export type UseCinemaDetailSelectionResult = ReturnType<typeof useCinemaDetailSelection>;
