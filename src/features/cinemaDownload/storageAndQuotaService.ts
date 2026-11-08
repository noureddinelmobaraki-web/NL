/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Browser Storage Quota Inspector, OPFS Persistence Request & Final File Exporter
 */

import type {
  BrowserStorageQuotaInfo,
  DownloadStorageTargetMode,
} from './types';

export async function inspectAndPersistBrowserQuota(): Promise<BrowserStorageQuotaInfo> {
  let usageBytes = 0;
  let quotaBytes = 4 * 1024 * 1024 * 1024;
  let persisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        usageBytes = Number(est.usage) || 0;
        quotaBytes = Number(est.quota) || quotaBytes;
      }
      if (typeof navigator.storage.persisted === 'function') {
        persisted = await navigator.storage.persisted();
      }
      if (!persisted && typeof navigator.storage.persist === 'function') {
        persisted = await navigator.storage.persist().catch(() => false);
      }
    } catch {}
  }

  const freeBytes = Math.max(0, quotaBytes - usageBytes);
  const opfsSupported = Boolean(
    typeof navigator !== 'undefined' && navigator.storage?.getDirectory,
  );
  const directDiskSupported = Boolean(
    typeof window !== 'undefined' && 'showSaveFilePicker' in window,
  );

  return {
    usageBytes,
    quotaBytes,
    freeBytes,
    usageMB: Math.round(usageBytes / (1024 * 1024)),
    quotaMB: Math.round(quotaBytes / (1024 * 1024)),
    freeGB: Number((freeBytes / (1024 * 1024 * 1024)).toFixed(2)),
    persisted,
    opfsSupported,
    directDiskSupported,
  };
}

export function recommendStorageModeForDownload(
  sizeBytes: number,
  quota: BrowserStorageQuotaInfo,
): {
  recommendedMode: DownloadStorageTargetMode;
  reason: string;
} {
  if (quota.opfsSupported && quota.freeBytes > sizeBytes * 1.15) {
    return {
      recommendedMode: 'opfs-cache',
      reason: 'مساحة OPFS كافية لتخزين القطع محلياً بسرعة عالية',
    };
  }
  return {
    recommendedMode: 'hybrid-extended',
    reason: 'تفعيل التخزين الهجين (OPFS + IndexedDB) لضمان استيعاب الحجم الكامل',
  };
}

export async function exportCompletedMovieToDevice(
  bytes: ArrayBuffer,
  fileName: string,
): Promise<{ saved: boolean; method: 'file-picker' | 'anchor-blob' }> {
  const safeName = (fileName || 'movie.mp4').replace(/[/\\?%*:|"<>]/g, '_');

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: safeName,
        types: [
          {
            description: 'Video File',
            accept: {
              'video/mp4': ['.mp4'],
              'video/x-matroska': ['.mkv'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return { saved: true, method: 'file-picker' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { saved: false, method: 'file-picker' };
      }
    }
  }

  const blob = new Blob([bytes], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 15000);

  return { saved: true, method: 'anchor-blob' };
}
