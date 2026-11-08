import { useCallback, useMemo, useState } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import { copyMagnet, saveTorrentFile } from '../services/externalHandoff';
import { proxify } from '../engine/transportProbes';
import type { CinemaDownloadSnapshot, DiscoveredReleaseOption, DownloadQualityTier } from '../types';
import { useCinemaDownloadSelector } from './useCinemaDownloadSelector';

export type ReleaseSortKey = 'seeders' | 'size-desc' | 'size-asc' | 'quality';
const QUALITY_RANK: Record<DownloadQualityTier, number> = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

const select = (s: CinemaDownloadSnapshot) => ({
  activeMedia: s.activeMedia,
  isDiscovering: s.isDiscovering,
  discoveredReleases: s.discoveredReleases,
  discoveryError: s.discoveryError,
  selectedQualityFilter: s.selectedQualityFilter,
  liveTrackersCount: s.liveTrackersCount,
});

export function useReleaseDiscovery() {
  const st = useCinemaDownloadSelector(select);
  const [sortKey, setSortKey] = useState<ReleaseSortKey>('seeders');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [torrentExportState, setTorrentExportState] = useState<Record<string, 'saving' | 'saved' | 'magnet-only'>>({});

  const filteredReleases = useMemo(() => {
    const list = st.selectedQualityFilter === 'all'
      ? [...st.discoveredReleases]
      : st.discoveredReleases.filter((r) => r.quality === st.selectedQualityFilter);
    const cmp: Record<ReleaseSortKey, (a: DiscoveredReleaseOption, b: DiscoveredReleaseOption) => number> = {
      seeders: (a, b) => b.seeders - a.seeders,
      'size-desc': (a, b) => b.sizeBytes - a.sizeBytes,
      'size-asc': (a, b) => a.sizeBytes - b.sizeBytes,
      quality: (a, b) => QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality] || b.seeders - a.seeders,
    };
    return list.sort(cmp[sortKey]);
  }, [st.discoveredReleases, st.selectedQualityFilter, sortKey]);

  const qualityCounts = useMemo(() => {
    const c: Record<string, number> = { all: st.discoveredReleases.length };
    for (const r of st.discoveredReleases) c[r.quality] = (c[r.quality] ?? 0) + 1;
    return c;
  }, [st.discoveredReleases]);

  const setQualityFilter = useCallback((f: DownloadQualityTier | 'all') => cinemaDownloadManager.setQualityFilter(f), []);
  const retryDiscovery = useCallback(() => {
    if (st.activeMedia) cinemaDownloadManager.openModalForMedia(st.activeMedia);
  }, [st.activeMedia]);

  const copyMagnetLink = useCallback(async (rel: DiscoveredReleaseOption) => {
    if (await copyMagnet(rel)) {
      setCopiedId(rel.id);
      setTimeout(() => setCopiedId((c) => (c === rel.id ? null : c)), 2_000);
    }
  }, []);

  const exportTorrentFile = useCallback(async (rel: DiscoveredReleaseOption) => {
    setTorrentExportState((s) => ({ ...s, [rel.id]: 'saving' }));
    const ok = await saveTorrentFile(rel, async (url) => {
      const r = await fetch(proxify(url), { signal: AbortSignal.timeout(5_000) });
      return r.ok ? r.arrayBuffer() : null;
    });
    if (!ok) await copyMagnet(rel);
    setTorrentExportState((s) => ({ ...s, [rel.id]: ok ? 'saved' : 'magnet-only' }));
  }, []);

  /** Download-first: never enables streaming. */
  const triggerDownload = useCallback((rel: DiscoveredReleaseOption) => {
    const media = cinemaDownloadManager.getSnapshot().activeMedia;
    if (!media) return;
    const existing = cinemaDownloadManager.getSnapshot().tasks[rel.infoHash];
    cinemaDownloadManager.setActiveTab('tasks');
    if (!existing) void cinemaDownloadManager.startDownload(media, rel, false);
    else if (existing.status === 'paused' || existing.status === 'error') cinemaDownloadManager.resumeTask(rel.infoHash);
  }, []);

  return {
    ...st, filteredReleases, qualityCounts, sortKey, setSortKey, copiedId, torrentExportState,
    setQualityFilter, retryDiscovery, copyMagnetLink, exportTorrentFile, triggerDownload,
  };
}
