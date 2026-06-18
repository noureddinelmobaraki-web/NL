// src/components/Movies/tmdbCache.ts

interface CacheEntry {
  d: any;
  t: number;
}

const MEM: Record<string, CacheEntry> = {};
const STALE = 3600_000; // 1 hour

export async function fetchWithCache(url: string, signal?: AbortSignal): Promise<any> {
  const key = `cache_${url}`;
  const now = Date.now();

  // 1. Memory cache check
  if (MEM[url] && (now - MEM[url].t < STALE)) {
    return MEM[url].d;
  }

  // 2. LocalStorage check
  try {
    const l = localStorage.getItem(key);
    if (l) {
      const p = JSON.parse(l) as CacheEntry;
      if (now - p.t < STALE) {
        MEM[url] = p;
        return p.d;
      }
    }
  } catch {}

  // 3. Network fetch with abort signal
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('TMDB ' + res.status);
  }
  const d = await res.json();
  const entry: CacheEntry = { d, t: now };
  MEM[url] = entry;

  // 4. Update localStorage safely
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    // If quota exceeded, clean up the top 20 oldest cache_ entries
    try {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith('cache_'))
        .map((k) => {
          try {
            const item = JSON.parse(localStorage.getItem(k) || '');
            return { key: k, time: item.t || 0 };
          } catch {
            return { key: k, time: 0 };
          }
        })
        .sort((a, b) => a.time - b.time);

      keys.slice(0, 20).forEach((entry) => localStorage.removeItem(entry.key));
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {}
  }

  return d;
}
