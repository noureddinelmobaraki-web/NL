/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Fetches & auto-selects Arabic Subtitles (.ass / .vtt) for Anime episodes
 */

import { useState, useEffect } from 'react';
import { fetchArabicAnimeSubtitles } from '../services/animeTorrentAndSubsService';
import type {
  AnimeIdentifiers,
  AnimeItem,
  AnimeSubtitleTrack,
} from '../types/anime.types';

export function useAnimeAssSubtitles({
  selectedAnime,
  resolvedIds,
  selectedEpisode,
  toshoSubtitles,
}: {
  selectedAnime: AnimeItem | null;
  resolvedIds: AnimeIdentifiers;
  selectedEpisode: number;
  toshoSubtitles: AnimeSubtitleTrack[];
}) {
  const [subtitles, setSubtitles] = useState<AnimeSubtitleTrack[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedAnime) {
      setSubtitles([]);
      setSelectedSubtitleId(null);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingSubtitles(true);

    fetchArabicAnimeSubtitles(
      {
        ...resolvedIds,
        imdbId: resolvedIds.imdbId ?? selectedAnime.imdbId,
        tmdbId: resolvedIds.tmdbId ?? selectedAnime.tmdbId,
      },
      selectedEpisode,
      toshoSubtitles,
    )
      .then((tracks) => {
        if (cancelled) return;
        setSubtitles(tracks);
        // Auto-select the first Arabic subtitle track by default
        const firstArabic = tracks.find((t) => t.isArabic) || tracks[0] || null;
        setSelectedSubtitleId(firstArabic ? firstArabic.id : null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubtitles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAnime, resolvedIds, selectedEpisode, toshoSubtitles]);

  const activeSubtitle =
    subtitles.find((s) => s.id === selectedSubtitleId) || null;

  return {
    subtitles,
    activeSubtitle,
    selectedSubtitleId,
    setSelectedSubtitleId,
    isLoadingSubtitles,
  };
}
