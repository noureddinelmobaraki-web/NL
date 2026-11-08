/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Custom Hook: Release Filtering, Magnet Clipboard State & Download Triggers
 */

import { useCallback, useMemo, useState } from 'react';
import {
  cinemaDownloadManager,
  useCinemaDownloadState,
} from '../downloadManager';
import type { DiscoveredReleaseOption, DownloadQualityTier } from '../types';

export function useReleaseDiscovery() {
  const {
    activeMedia,
    isDiscovering,
    discoveredReleases,
    discoveryError,
    selectedQualityFilter,
    liveTrackersCount,
    tasks,
  } = useCinemaDownloadState();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredReleases = useMemo(
    () =>
      selectedQualityFilter === 'all'
        ? discoveredReleases
        : discoveredReleases.filter(
            (r) => r.quality === selectedQualityFilter,
          ),
    [discoveredReleases, selectedQualityFilter],
  );

  const setQualityFilter = useCallback(
    (filter: DownloadQualityTier | 'all') => {
      cinemaDownloadManager.setQualityFilter(filter);
    },
    [],
  );

  const retryDiscovery = useCallback(() => {
    if (activeMedia) {
      cinemaDownloadManager.openModalForMedia(activeMedia);
    }
  }, [activeMedia]);

  const copyMagnetLink = useCallback((rel: DiscoveredReleaseOption) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(rel.magnetUri);
      setCopiedId(rel.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  /**
   * Starts pure download-first task (`enableInstantStream = false`).
   */
  const triggerDownloadOnly = useCallback(
    (rel: DiscoveredReleaseOption) => {
      if (!activeMedia) return;
      const existing = tasks[rel.infoHash];
      if (existing) {
        cinemaDownloadManager.setActiveTab('tasks');
        if (existing.status === 'paused') {
          cinemaDownloadManager.resumeTask(rel.infoHash);
        }
      } else {
        void cinemaDownloadManager.startDownload(activeMedia, rel, false);
      }
    },
    [activeMedia, tasks],
  );

  /**
   * Starts download AND explicitly enables the optional progressive stream player.
   */
  const triggerOptionalStream = useCallback(
    (rel: DiscoveredReleaseOption) => {
      if (!activeMedia) return;
      void cinemaDownloadManager.startProgressiveStream(
        activeMedia,
        rel,
        false,
      );
    },
    [activeMedia],
  );

  return {
    activeMedia,
    isDiscovering,
    discoveredReleases,
    filteredReleases,
    discoveryError,
    selectedQualityFilter,
    liveTrackersCount,
    copiedId,
    setQualityFilter,
    retryDiscovery,
    copyMagnetLink,
    triggerDownloadOnly,
    triggerOptionalStream,
  };
}
