/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';
import { readStore, writeStore } from '../../../utils/storage';

const IDB_NAME = 'nl_liquid_supercache_v2';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_entries';
const BOOT_STORAGE_KEY = 'nl_supercache_boot_v2';
const COVER_CACHE_NAME = 'nl-books-covers-v1';

export interface SuperCacheEntry<T> {
  key: string;
  value: T;
  updatedAt: number;
  immutable?: boolean;
}

const BootEntrySchema = z.record(
  z.string(),
  z.object({
    key: z.string(),
    value: z.unknown(),
    updatedAt: z.number(),
    immutable: z.boolean().optional(),
  }),
);

const memorySuperCache = new Map<string, SuperCacheEntry<unknown>>();
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openSuperCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

function hydrateBootSuperCache(): void {
  const parsed = readStore(BOOT_STORAGE_KEY, BootEntrySchema, {});
  for (const [k, entry] of Object.entries(parsed)) {
    memorySuperCache.set(k, entry as SuperCacheEntry<unknown>);
  }
}

hydrateBootSuperCache();

function persistBootEntry<T>(key: string, entry: SuperCacheEntry<T>): void {
  if (
    !key.startsWith('books:trending:') &&
    !key.startsWith('audiobooks:catalog::') &&
    !key.startsWith('resolve:') &&
    !key.startsWith('chapters:')
  ) {
    return;
  }
  const map = readStore<Record<string, SuperCacheEntry<unknown>>>(
    BOOT_STORAGE_KEY,
    BootEntrySchema as z.ZodType<Record<string, SuperCacheEntry<unknown>>>,
    {},
  );
  map[key] = entry;
  const keys = Object.keys(map);
  if (keys.length > 28) {
    keys
      .sort((a, b) => (map[a]?.updatedAt || 0) - (map[b]?.updatedAt || 0))
      .slice(0, keys.length - 28)
      .forEach((oldKey) => delete map[oldKey]);
  }
  writeStore(BOOT_STORAGE_KEY, map);
}

export function getSuperCacheSync<T>(key: string): T | null {
  const hit = memorySuperCache.get(key) as SuperCacheEntry<T> | undefined;
  return hit ? hit.value : null;
}

export async function getSuperCacheAsync<T>(key: string): Promise<SuperCacheEntry<T> | null> {
  const mem = memorySuperCache.get(key) as SuperCacheEntry<T> | undefined;
  if (mem) return mem;

  const db = await openSuperCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result as SuperCacheEntry<T> | undefined;
        if (res) {
          memorySuperCache.set(key, res);
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setSuperCache<T>(key: string, value: T, immutable = false): Promise<void> {
  const entry: SuperCacheEntry<T> = {
    key,
    value,
    updatedAt: Date.now(),
    immutable,
  };
  memorySuperCache.set(key, entry);
  persistBootEntry(key, entry);

  const db = await openSuperCacheDB();
  if (!db) return;

  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry);
  } catch {
    /* ignore */
  }
}

const warmedCoverUrls = new Set<string>();
export function warmCoverImagesCache(urls: Array<string | undefined>): void {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const valid = urls
    .filter((u): u is string => Boolean(u && u.startsWith('https://')))
    .filter((u) => !warmedCoverUrls.has(u))
    .slice(0, 18);

  if (valid.length === 0) return;
  valid.forEach((u) => warmedCoverUrls.add(u));

  void window.caches
    .open(COVER_CACHE_NAME)
    .then(async (cache) => {
      for (const url of valid) {
        try {
          const match = await cache.match(url);
          if (!match) {
            const req = new Request(url, { mode: 'no-cors' });
            const res = await fetch(req);
            await cache.put(req, res);
          }
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
}
