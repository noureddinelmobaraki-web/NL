/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Synchronizes Anime selection & episode number with URL parameters (?view=anime&animeId=...&ep=...)
 */

import { useEffect } from 'react';
import type { AnimeItem } from '../types/anime.types';

export function useAnimeDeepLink({
  selectedAnime,
  selectedEpisode,
  onSelectFromUrl,
}: {
  selectedAnime: AnimeItem | null;
  selectedEpisode: number;
  onSelectFromUrl: (animeIdParam: string, epParam: number) => void;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const animeIdParam = params.get('animeId');
      const epParam = Number(params.get('ep')) || 1;
      if (animeIdParam) {
        onSelectFromUrl(animeIdParam, Math.max(1, epParam));
      }
    } catch {
      // ignore URL parsing errors
    }
  }, [onSelectFromUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (selectedAnime) {
        const key = String(selectedAnime.malId || selectedAnime.anilistId || selectedAnime.id);
        url.searchParams.set('animeId', key);
        url.searchParams.set('ep', String(selectedEpisode));
      } else {
        url.searchParams.delete('animeId');
        url.searchParams.delete('ep');
      }
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch {
      // ignore
    }
  }, [selectedAnime, selectedEpisode]);
}
