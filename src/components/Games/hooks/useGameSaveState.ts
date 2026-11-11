/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * IndexedDB Save-State Manager Hook
 * Allows saving and restoring instant emulator snapshots for Retro Console games.
 */

import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'nl_games_savestates_v1';
const STORE_NAME = 'states';

function openSaveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useGameSaveState(gameId: string | null) {
  const [hasSavedState, setHasSavedState] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2200);
  }, []);

  useEffect(() => {
    if (!gameId || typeof indexedDB === 'undefined') {
      setHasSavedState(false);
      return;
    }
    let cancelled = false;
    openSaveDb()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getKey(gameId);
        req.onsuccess = () => {
          if (!cancelled) setHasSavedState(Boolean(req.result));
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const saveSnapshot = useCallback(
    async (getBlob: (() => Promise<Blob | null>) | undefined) => {
      if (!gameId || !getBlob) return;
      try {
        const blob = await getBlob();
        if (!blob) {
          showToast('الحفظ غير مدعوم لهذه اللعبة حالياً');
          return;
        }
        const db = await openSaveDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(blob, gameId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        setHasSavedState(true);
        showToast('تم حفظ المرحلة بنجاح');
      } catch {
        showToast('تعذر حفظ المرحلة');
      }
    },
    [gameId, showToast],
  );

  const loadSnapshot = useCallback(
    async (applyBlob: ((blob: Blob) => Promise<void>) | undefined) => {
      if (!gameId || !applyBlob) return;
      try {
        const db = await openSaveDb();
        const blob = await new Promise<Blob | undefined>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(gameId);
          req.onsuccess = () => resolve(req.result as Blob | undefined);
          req.onerror = () => reject(req.error);
        });
        if (!blob) {
          showToast('لا توجد مرحلة محفوظة بعد');
          return;
        }
        await applyBlob(blob);
        showToast('تم استرجاع المرحلة المحفوظة');
      } catch {
        showToast('تعذر استرجاع المرحلة');
      }
    },
    [gameId, showToast],
  );

  return {
    hasSavedState,
    saveToast,
    saveSnapshot,
    loadSnapshot,
  };
}
