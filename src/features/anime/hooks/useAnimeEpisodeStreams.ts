/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook: Anime Episode Embed Servers, Speed Probing, Sub/Dub Toggle & Auto-Failover
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  probeAllServersSpeed,
  sortSourcesBySpeed,
} from '../../../services/serverSpeedMonitor';
import { buildAnimeSources } from '../services/animeEmbedBuilder';
import {
  fetchAnimeToshoReleases,
  fetchSeaDexBestHashes,
  fetchStremioAnimeStreams,
} from '../services/animeTorrentAndSubsService';
import type {
  AnimeAudioMode,
  AnimeIdentifiers,
  AnimeItem,
  AnimePlayServer,
  AnimeSubtitleTrack,
  AnimeTorrentRelease,
} from '../types/anime.types';

export function useAnimeEpisodeStreams({
  selectedAnime,
  resolvedIds,
  selectedEpisode,
}: {
  selectedAnime: AnimeItem | null;
  resolvedIds: AnimeIdentifiers;
  selectedEpisode: number;
}) {
  // User Confirmed Choice 1: Default to 'sub' with instant toggle to 'dub'
  const [audioMode, setAudioMode] = useState<AnimeAudioMode>('sub');
  const [activeServerIdx, setActiveServerIdx] = useState<number>(0);
  const [speedRevision, setSpeedRevision] = useState<number>(0);
  const [isPlayerLoading, setIsPlayerLoading] = useState<boolean>(false);

  const [torrentReleases, setTorrentReleases] = useState<AnimeTorrentRelease[]>([]);
  const [toshoSubtitles, setToshoSubtitles] = useState<AnimeSubtitleTrack[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState<boolean>(false);

  const rawServers = useMemo(() => {
    if (!selectedAnime) return [];
    const mergedIds: AnimeIdentifiers = {
      malId: resolvedIds.malId ?? selectedAnime.malId,
      anilistId: resolvedIds.anilistId ?? selectedAnime.anilistId,
      kitsuId: resolvedIds.kitsuId ?? selectedAnime.kitsuId,
      anidbId: resolvedIds.anidbId,
      imdbId: resolvedIds.imdbId ?? selectedAnime.imdbId,
      tmdbId: resolvedIds.tmdbId ?? selectedAnime.tmdbId,
      resolvedSeason: resolvedIds.resolvedSeason ?? 1,
      episodeOffset: resolvedIds.episodeOffset ?? 0,
    };
    return buildAnimeSources({
      ids: mergedIds,
      courEpisode: selectedEpisode,
      mode: audioMode,
      isMovie: selectedAnime.format === 'MOVIE',
    });
  }, [selectedAnime, resolvedIds, selectedEpisode, audioMode]);

  useEffect(() => {
    if (!selectedAnime || rawServers.length === 0) return undefined;
    let cancelled = false;
    const titleKey = `anime_${selectedAnime.id}_ep_${selectedEpisode}_${audioMode}`;
    const probePayload = rawServers.map((s) => ({
      id: s.id,
      url: s.url,
      host: s.host,
    }));
    void probeAllServersSpeed(probePayload, titleKey).then(() => {
      if (!cancelled) setSpeedRevision((r) => r + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedAnime, rawServers, selectedEpisode, audioMode]);

  const servers: AnimePlayServer[] = useMemo(() => {
    void speedRevision;
    if (!selectedAnime || rawServers.length === 0) return [];
    const titleKey = `anime_${selectedAnime.id}_ep_${selectedEpisode}_${audioMode}`;
    return sortSourcesBySpeed(rawServers, titleKey);
  }, [selectedAnime, rawServers, selectedEpisode, audioMode, speedRevision]);

  useEffect(() => {
    setActiveServerIdx(0);
    setIsPlayerLoading(true);
  }, [selectedAnime?.id, selectedEpisode, audioMode]);

  const activeServer = servers[activeServerIdx] || servers[0] || null;

  const triggerFailoverNext = useCallback(() => {
    if (servers.length <= 1) return;
    setActiveServerIdx((prev) => (prev + 1) % servers.length);
    setIsPlayerLoading(true);
  }, [servers.length]);

  // Fetch Torrents, SeaDex Best Releases & AnimeTosho Subtitles
  useEffect(() => {
    if (!selectedAnime) {
      setTorrentReleases([]);
      setToshoSubtitles([]);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingReleases(true);

    const loadTorrents = async () => {
      try {
        const anilistId = resolvedIds.anilistId ?? selectedAnime.anilistId;
        const bestHashes = await fetchSeaDexBestHashes(anilistId);
        if (cancelled) return;

        const [toshoData, stremioStreams] = await Promise.all([
          fetchAnimeToshoReleases(
            resolvedIds.anidbId,
            selectedEpisode,
            bestHashes,
          ),
          fetchStremioAnimeStreams(
            {
              ...resolvedIds,
              kitsuId: resolvedIds.kitsuId ?? selectedAnime.kitsuId,
              imdbId: resolvedIds.imdbId ?? selectedAnime.imdbId,
            },
            selectedEpisode,
            bestHashes,
          ),
        ]);

        if (cancelled) return;
        const combined = [...toshoData.releases, ...stremioStreams].sort(
          (a, b) =>
            Number(Boolean(b.isSeaDexBest)) - Number(Boolean(a.isSeaDexBest)) ||
            b.seeders - a.seeders,
        );
        setTorrentReleases(combined);
        setToshoSubtitles(toshoData.subtitles);
      } finally {
        if (!cancelled) setIsLoadingReleases(false);
      }
    };

    void loadTorrents();
    return () => {
      cancelled = true;
    };
  }, [selectedAnime, resolvedIds, selectedEpisode]);

  return {
    audioMode,
    setAudioMode,
    servers,
    activeServer,
    activeServerIdx,
    setActiveServerIdx,
    isPlayerLoading,
    setIsPlayerLoading,
    triggerFailoverNext,
    torrentReleases,
    toshoSubtitles,
    isLoadingReleases,
  };
}
