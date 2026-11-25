import { CACHE_MOBILE_API, isMobileSuperCacheDevice } from './mobileCacheGuard';

const cache = new Map<string, Promise<unknown>>();

async function fetchNetworkJson<T>(
  url: string,
  timeoutMs: number,
  mirrorToMobileCache: boolean,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    if (mirrorToMobileCache && typeof window !== 'undefined' && 'caches' in window) {
      const clone = r.clone();
      void caches
        .open(CACHE_MOBILE_API)
        .then((c) => c.put(url, clone))
        .catch(() => {});
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchData<T>(url: string, timeoutMs = 10000): Promise<T> {
  const existing = cache.get(url);
  if (existing) return existing as Promise<T>;

  const useMobileCache =
    isMobileSuperCacheDevice() && typeof window !== 'undefined' && 'caches' in window;

  const promise: Promise<T> = useMobileCache
    ? (async () => {
        try {
          const mobileApi = await caches.open(CACHE_MOBILE_API);
          const cached = await mobileApi.match(url, { ignoreVary: true });
          if (cached) {
            const data = (await cached.json()) as T;
            if (navigator.onLine) {
              void fetchNetworkJson<T>(url, timeoutMs, true).catch(() => {});
            }
            return data;
          }
        } catch {
          // Fall through to live network fetch
        }
        return fetchNetworkJson<T>(url, timeoutMs, true);
      })().catch((err) => {
        cache.delete(url);
        throw err;
      })
    : fetchNetworkJson<T>(url, timeoutMs, false).catch((err) => {
        // Critical: evict the failed entry so a later call can retry.
        cache.delete(url);
        throw err;
      });

  cache.set(url, promise);
  return promise;
}

