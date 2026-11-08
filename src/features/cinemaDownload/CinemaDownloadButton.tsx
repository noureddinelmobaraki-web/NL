/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download Trigger Buttons
 * - CinemaDownloadTriggerButton: Placed next to "Watch Now" in Hero Banner & Detail Modal.
 * - CinemaHeaderDownloadButton: Placed in the Cinema top header to open the Download Studio.
 */

import React from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import {
  getBackdropSrc_static,
  getPosterSrc_static,
  type CinemaItem,
} from '../../components/Movies/moviesDataClient';
import {
  cinemaDownloadManager,
  useCinemaDownloadState,
} from './downloadManager';
import type { DownloadMediaContext, DownloadTaskState } from './types';

interface CinemaDownloadTriggerButtonProps {
  item: CinemaItem;
  imdbId?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  currentLang?: string;
  compact?: boolean;
}

export const CinemaDownloadTriggerButton: React.FC<
  CinemaDownloadTriggerButtonProps
> = ({
  item,
  imdbId,
  season = 1,
  episode = 1,
  episodeTitle,
  currentLang = 'ar',
  compact = false,
}) => {
  const { tasks } = useCinemaDownloadState();
  const isAr = currentLang === 'ar';

  // Find if this specific item (and season/episode for TV) has an active or completed task
  const matchingTask = (Object.values(tasks) as DownloadTaskState[]).find((t) => {
    if (t.media.tmdbId !== item.id || t.media.mediaType !== item.mediaType) {
      return false;
    }
    if (item.mediaType === 'tv') {
      return (t.media.season || 1) === season && (t.media.episode || 1) === episode;
    }
    return true;
  });

  const handleOpenDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const posterUrl = getPosterSrc_static(
      item.posterPath,
      item.trailerKey,
      item.backdropPath,
    );
    const backdropUrl = getBackdropSrc_static(
      item.backdropPath,
      item.trailerKey,
      item.posterPath,
    );

    const mediaContext: DownloadMediaContext = {
      id: item.id,
      tmdbId: item.id,
      imdbId: imdbId || item.imdbId,
      mediaType: item.mediaType,
      title: item.title,
      originalTitle: item.title,
      year: item.year,
      posterUrl,
      backdropUrl,
      season: item.mediaType === 'tv' ? season : undefined,
      episode: item.mediaType === 'tv' ? episode : undefined,
      episodeTitle,
      runtimeMinutes: item.runtime,
      rating: item.rating,
    };

    cinemaDownloadManager.openModalForMedia(mediaContext);
  };

  const isDownloading =
    matchingTask?.status === 'downloading' ||
    matchingTask?.status === 'initializing' ||
    matchingTask?.status === 'exporting';
  const isCompleted = matchingTask?.status === 'completed';

  return (
    <button
      type="button"
      onClick={handleOpenDownload}
      className={`lg-cinema-action-pill ${
        compact ? 'py-2 px-4 text-xs' : 'py-2.5 px-5 text-xs sm:text-sm'
      } font-extrabold text-white flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-transform active:scale-95 border ${
        isCompleted
          ? '!bg-emerald-500/25 !border-emerald-300/50 text-emerald-100'
          : isDownloading
            ? '!bg-sky-500/25 !border-sky-300/55 text-sky-100'
            : 'hover:!bg-white/20 hover:!border-white/45'
      }`}
      aria-label={isAr ? `تحميل ${item.title}` : `Download ${item.title}`}
    >
      {isDownloading ? (
        <Loader2 size={15} className="animate-spin text-sky-300" />
      ) : isCompleted ? (
        <CheckCircle2 size={15} className="text-emerald-300" />
      ) : (
        <Download size={15} className="text-sky-300" />
      )}
      <span>
        {isDownloading
          ? isAr
            ? `جاري التحميل ${matchingTask.progressPct.toFixed(0)}%`
            : `Downloading ${matchingTask.progressPct.toFixed(0)}%`
          : isCompleted
            ? isAr
              ? 'مكتمل (إدارة الكاش)'
              : 'Downloaded'
            : isAr
              ? 'تحميل'
              : 'Download'}
      </span>
      {item.mediaType === 'tv' && !isDownloading && !isCompleted && (
        <span className="text-[10.5px] font-bold text-sky-200/90 tabular-nums">
          S{String(season).padStart(2, '0')}E{String(episode).padStart(2, '0')}
        </span>
      )}
    </button>
  );
};

export const CinemaHeaderDownloadButton: React.FC<{
  currentLang?: string;
}> = ({ currentLang = 'ar' }) => {
  const { tasks, isModalOpen } = useCinemaDownloadState();
  const isAr = currentLang === 'ar';
  const allTasks = Object.values(tasks) as DownloadTaskState[];
  const activeCount = allTasks.filter(
    (t) =>
      t.status === 'downloading' ||
      t.status === 'initializing' ||
      t.status === 'exporting' ||
      t.status === 'paused',
  ).length;
  const totalCount = allTasks.length;

  return (
    <button
      type="button"
      onClick={() => cinemaDownloadManager.openTasksModal()}
      aria-label={isAr ? 'مدير التحميلات (OPFS)' : 'Download Manager (OPFS)'}
      title={isAr ? 'مدير التحميلات والكاش القرصي' : 'Download Manager & OPFS Cache'}
      className={`lg-cinema-icon-pill relative ${
        isModalOpen || activeCount > 0
          ? '!bg-sky-500/30 !border-sky-300/60 text-sky-200'
          : ''
      }`}
    >
      <Download size={15} />
      {totalCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full border border-white/40 text-white text-[9px] font-black flex items-center justify-center shadow tabular-nums ${
            activeCount > 0 ? 'bg-sky-500' : 'bg-emerald-600'
          }`}
        >
          {activeCount > 0 ? activeCount : totalCount}
        </span>
      )}
    </button>
  );
};
