/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useMemo } from "react";
import type { Media } from "../moviesDataClient";

export interface WatchlistMovieRecord {
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: string;
  title?: string;
  poster_path?: string;
}

export interface UseCinemaWatchlistPanelOptions<T extends WatchlistMovieRecord> {
  movieItems: T[];
  setActiveTab: (tab: "movies" | "series") => void;
  setShowWatchlist: (show: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
}

export function useCinemaWatchlistPanel<T extends WatchlistMovieRecord>({
  movieItems,
  setActiveTab,
  setShowWatchlist,
  setSelectedItemId,
}: UseCinemaWatchlistPanelOptions<T>) {
  const watchlistItems = useMemo(
    () => movieItems.filter((i) => i.status === "watchlist"),
    [movieItems],
  );

  const openWatchlistItem = useCallback(
    (rec: { tmdb_id: number; media_type: "movie" | "tv" }) => {
      setActiveTab(rec.media_type === "tv" ? "series" : "movies");
      setShowWatchlist(false);
      setSelectedItemId(rec.tmdb_id, rec.media_type);
    },
    [setActiveTab, setShowWatchlist, setSelectedItemId],
  );

  return {
    watchlistItems,
    openWatchlistItem,
  };
}

export type UseCinemaWatchlistPanelResult = ReturnType<typeof useCinemaWatchlistPanel>;
