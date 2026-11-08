import { useCallback, useMemo } from 'react';
import { cinemaDownloadManager } from '../downloadManager';
import { formatBytes } from '../releaseParserAndFilter';
import type { CandidateTransportStage, CinemaDownloadSnapshot, DownloadTaskState } from '../types';
import { useCinemaDownloadSelector } from './useCinemaDownloadSelector';

export function formatTaskEta(seconds: number | null, isAr: boolean): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  if (s < 60) return isAr ? `${s} ث` : `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return isAr ? `${m} د ${s % 60} ث` : `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return isAr ? `${h} س ${m % 60} د` : `${h}h ${m % 60}m`;
}

export function formatSpeedMBps(bps: number): string {
  return `${(bps / (1024 * 1024)).toFixed(bps >= 10 * 1024 * 1024 ? 1 : 2)} MB/s`;
}

export const formatSpeedHuman = formatSpeedMBps;
export const formatEtaHuman = (s: number | null) => formatTaskEta(s, true);
export const formatBytesHuman = formatBytes;

const RUNNING = new Set(['downloading', 'initializing', 'exporting']);

export function computeTaskMetrics(task: DownloadTaskState, isAr: boolean) {
  const isRunning = RUNNING.has(task.status);
  return {
    isRunning,
    isPaused: task.status === 'paused' || task.status === 'error',
    isCompleted: task.status === 'completed',
    needsFallback: task.diagnostics?.stage === 'fallback-needed',
    downloadedFormatted: formatBytes(task.downloadedBytes),
    totalFormatted: formatBytes(task.totalBytes),
    speedFormatted: isRunning && task.speedBytesPerSec > 0 ? formatSpeedMBps(task.speedBytesPerSec) : null,
    etaFormatted: isRunning ? formatTaskEta(task.etaSeconds, isAr) : '',
    storageBadgeLabel: task.storageMode === 'hybrid-extended' ? (isAr ? 'كاش ممتد OPFS + IDB' : 'Hybrid OPFS + IDB') : 'OPFS',
  };
}
export type TaskMetrics = ReturnType<typeof computeTaskMetrics>;

const selectTasks = (s: CinemaDownloadSnapshot) => ({ tasks: s.tasks, quota: s.quota });

export function useCinemaDownloadTasks() {
  const { tasks, quota } = useCinemaDownloadSelector(selectTasks);

  const allTasks = useMemo(
    () => (Object.values(tasks) as DownloadTaskState[]).sort((a, b) => b.startedAt - a.startedAt),
    [tasks],
  );

  const activeBackgroundTask = useMemo(
    () => allTasks.find((t) => RUNNING.has(t.status))
      ?? allTasks.find((t) => t.status === 'paused')
      ?? allTasks.find((t) => t.status === 'completed' && !t.cacheCleared)
      ?? null,
    [allTasks],
  );

  const quotaMetrics = useMemo(() => {
    const pendingBytes = allTasks
      .filter((t) => t.status !== 'completed' && !t.cacheCleared)
      .reduce((a, t) => a + Math.max(0, t.totalBytes - t.downloadedBytes), 0);
    return {
      ...quota,
      pendingBytes,
      usagePct: quota.quotaBytes > 0 ? Math.min(100, (quota.usageBytes / quota.quotaBytes) * 100) : 0,
      insufficient: quota.quotaBytes > 0 && pendingBytes > quota.freeBytes,
    };
  }, [quota, allTasks]);

  return {
    tasksMap: tasks,
    allTasks,
    activeBackgroundTask,
    quota: quotaMetrics,
    pauseTask: useCallback((h: string) => cinemaDownloadManager.pauseTask(h), []),
    resumeTask: useCallback((h: string) => cinemaDownloadManager.resumeTask(h), []),
    retryFromStage: useCallback((h: string, stage?: CandidateTransportStage | null) => cinemaDownloadManager.retryFromStage(h, stage ?? null), []),
    saveTaskToDevice: useCallback((h: string) => void cinemaDownloadManager.reExportTask(h), []),
    cleanTaskCache: useCallback((h: string) => cinemaDownloadManager.confirmClearCache(h), []),
    removeTask: useCallback((h: string) => cinemaDownloadManager.removeTaskFromList(h), []),
    requestPersistence: useCallback(() => void cinemaDownloadManager.ensurePersistentStorage(), []),
    openTaskInExternalClient: useCallback((h: string) => cinemaDownloadManager.openTaskInExternalClient(h), []),
    saveTaskTorrentFile: useCallback((h: string) => void cinemaDownloadManager.saveTaskTorrentFile(h), []),
    acceptGeometryChange: useCallback((h: string) => cinemaDownloadManager.acceptGeometryChange(h), []),
  };
}
