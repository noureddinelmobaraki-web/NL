/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Custom Hook: Task List Derivation, Telemetry Formatting & Lifecycle Controls
 */

import { useCallback, useMemo } from 'react';
import {
  cinemaDownloadManager,
  useCinemaDownloadState,
} from '../downloadManager';
import { formatBytes } from '../releaseParserAndFilter';
import type { DownloadTaskState } from '../types';

export function formatTaskEta(seconds: number | null, isAr: boolean): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  if (seconds < 60) {
    return isAr ? `${seconds} ث` : `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return isAr ? `${mins} د ${secs} ث` : `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return isAr ? `${hrs} س ${remMins} د` : `${hrs}h ${remMins}m`;
}

export function useCinemaDownloadTasks(isAr = true) {
  const { tasks, quota, activeTab, isModalOpen } = useCinemaDownloadState();

  const allTasks = useMemo(
    () =>
      (Object.values(tasks) as DownloadTaskState[]).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    [tasks],
  );

  const activeBackgroundTask = useMemo(
    () =>
      allTasks.find(
        (t) =>
          t.status === 'downloading' ||
          t.status === 'initializing' ||
          t.status === 'exporting',
      ) ||
      allTasks.find((t) => t.status === 'paused') ||
      allTasks.find((t) => t.status === 'completed' && !t.cacheCleared) ||
      null,
    [allTasks],
  );

  const formatTaskMetrics = useCallback(
    (task: DownloadTaskState) => {
      const isRunning =
        task.status === 'downloading' ||
        task.status === 'initializing' ||
        task.status === 'exporting';
      const isPaused = task.status === 'paused';
      const isCompleted = task.status === 'completed';

      return {
        isRunning,
        isPaused,
        isCompleted,
        downloadedFormatted: formatBytes(task.downloadedBytes),
        totalFormatted: formatBytes(task.totalBytes),
        speedFormatted:
          isRunning && task.speedBytesPerSec > 0
            ? `${formatBytes(task.speedBytesPerSec)}/s`
            : null,
        etaFormatted: isRunning ? formatTaskEta(task.etaSeconds, isAr) : '',
        storageBadgeLabel:
          task.storageMode === 'hybrid-extended'
            ? isAr
              ? 'كاش ممتد OPFS + IDB'
              : 'Hybrid OPFS + IDB'
            : 'TPPIECES OPFS',
      };
    },
    [isAr],
  );

  const pauseTask = useCallback((infoHash: string) => {
    cinemaDownloadManager.pauseTask(infoHash);
  }, []);

  const resumeTask = useCallback((infoHash: string) => {
    cinemaDownloadManager.resumeTask(infoHash);
  }, []);

  const saveTaskToDevice = useCallback((infoHash: string) => {
    void cinemaDownloadManager.reExportTask(infoHash);
  }, []);

  const cleanTaskCache = useCallback((infoHash: string) => {
    cinemaDownloadManager.confirmClearCache(infoHash);
  }, []);

  const removeTask = useCallback((infoHash: string) => {
    cinemaDownloadManager.removeTaskFromList(infoHash);
  }, []);

  return {
    tasksMap: tasks,
    allTasks,
    activeBackgroundTask,
    quota,
    activeTab,
    isModalOpen,
    formatTaskMetrics,
    pauseTask,
    resumeTask,
    saveTaskToDevice,
    cleanTaskCache,
    removeTask,
  };
}
