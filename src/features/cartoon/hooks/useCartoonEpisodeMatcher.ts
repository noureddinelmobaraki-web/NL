/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Matches Episode Number to Direct Archive.org .ia.mp4 Stream,
 * YouTube Playlist, or Fallback Embed
 */

import { useState, useEffect, useMemo } from 'react';
import { resolveArchiveIdentifierStreams } from '../services/archiveOrgStreamResolver';
import type {
  CartoonEpisodeStream,
  CartoonSeriesItem,
} from '../types/cartoon.types';

export function useCartoonEpisodeMatcher(
  selectedCartoon: CartoonSeriesItem | null,
  selectedEpisode: number,
) {
  const [archiveStreams, setArchiveStreams] = useState<CartoonEpisodeStream[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCartoon || selectedCartoon.archiveIds.length === 0) {
      setArchiveStreams([]);
      setIsLoadingArchive(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingArchive(true);

    const fetchAllArchiveIds = async () => {
      try {
        const results = await Promise.all(
          selectedCartoon.archiveIds.map((id) =>
            resolveArchiveIdentifierStreams(id, selectedCartoon.titleAr),
          ),
        );
        if (cancelled) return;

        const merged: CartoonEpisodeStream[] = [];
        let counter = 1;
        for (const group of results) {
          for (const st of group) {
            merged.push({
              ...st,
              episodeNumber:
                results.length > 1 ? counter : st.episodeNumber || counter,
            });
            counter += 1;
          }
        }
        setArchiveStreams(merged);
      } finally {
        if (!cancelled) setIsLoadingArchive(false);
      }
    };

    void fetchAllArchiveIds();
    return () => {
      cancelled = true;
    };
  }, [selectedCartoon]);

  const episodesList = useMemo((): CartoonEpisodeStream[] => {
    if (archiveStreams.length > 0) return archiveStreams;
    if (!selectedCartoon) return [];
    const total = Math.max(1, selectedCartoon.episodesCount || 26);
    return Array.from({ length: total }, (_, idx) => {
      const epNum = idx + 1;
      return {
        episodeNumber: epNum,
        titleAr:
          selectedCartoon.mediaType === 'movie'
            ? `الفيلم الكامل — ${selectedCartoon.titleAr}`
            : `${selectedCartoon.titleAr} — الحلقة ${epNum}`,
        rawFileName: `EP${String(epNum).padStart(2, '0')}.mp4`,
        archiveIdentifier: selectedCartoon.archiveIds[0] || '',
        streamUrl: '',
        downloadUrl: '',
        thumbnailUrl: selectedCartoon.backdropUrl || selectedCartoon.posterUrl,
      };
    });
  }, [archiveStreams, selectedCartoon]);

  const activeArchiveStream = useMemo(() => {
    if (archiveStreams.length === 0) return null;
    return (
      archiveStreams.find((s) => s.episodeNumber === selectedEpisode) ||
      archiveStreams[selectedEpisode - 1] ||
      archiveStreams[0] ||
      null
    );
  }, [archiveStreams, selectedEpisode]);

  return {
    episodesList,
    activeArchiveStream,
    isLoadingArchive,
  };
}
