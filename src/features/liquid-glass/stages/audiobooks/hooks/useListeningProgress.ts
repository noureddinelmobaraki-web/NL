/**
 * src/features/liquid-glass/stages/audiobooks/hooks/useListeningProgress.ts
 *
 * Safe, throttled listening progress storage (saves at most once every 5s during timeupdate,
 * plus immediately on pause and when page visibility changes to hidden).
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { readStore, writeStore } from '../../../../../utils/storage';
import type { AudiobookItem } from '../../../services/types';

const PROGRESS_STORAGE_KEY = 'nl_liquid_glass_audiobook_progress_v3';

const ProgressRecordSchema = z.object({
  audiobookId: z.string(),
  title: z.string(),
  author: z.string(),
  coverUrl: z.string().optional(),
  iaId: z.string().optional(),
  chapterIndex: z.number(),
  currentTime: z.number(),
  duration: z.number(),
  updatedAt: z.number(),
});

const ProgressMapSchema = z.record(z.string(), ProgressRecordSchema);

export type AudiobookProgressRecord = z.infer<typeof ProgressRecordSchema>;

export function useListeningProgress() {
  const [progressMap, setProgressMap] = useState<Record<string, AudiobookProgressRecord>>(() =>
    readStore(PROGRESS_STORAGE_KEY, ProgressMapSchema, {}),
  );
  const lastSavedRef = useRef<number>(0);

  const saveProgress = useCallback(
    (
      book: AudiobookItem | null,
      chIdx: number,
      timeSec: number,
      durSec: number,
      forceImmediate = false,
    ) => {
      if (!book || timeSec < 2) return;
      const now = Date.now();
      if (!forceImmediate && now - lastSavedRef.current < 5000) {
        return;
      }
      lastSavedRef.current = now;

      const rec: AudiobookProgressRecord = {
        audiobookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        iaId: book.iaId,
        chapterIndex: chIdx,
        currentTime: Math.floor(timeSec),
        duration: Math.floor(durSec || 0),
        updatedAt: now,
      };

      setProgressMap((prev) => {
        const next = { ...prev, [book.id]: rec };
        writeStore(PROGRESS_STORAGE_KEY, next);
        return next;
      });
    },
    [],
  );

  const recentProgressList = useMemo(() => {
    return Object.values(progressMap)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4);
  }, [progressMap]);

  return {
    progressMap,
    recentProgressList,
    saveProgress,
  };
}
