const cache = new Map<string, Promise<unknown>>();

export function fetchData<T>(url: string, timeoutMs = 10000): Promise<T> {
  const existing = cache.get(url);
  if (existing) return existing as Promise<T>;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const promise = fetch(url, { signal: controller.signal })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${url}`);
      return r.json() as Promise<T>;
    })
    .catch((err) => {
      // Critical: evict the failed entry so a later call can retry.
      cache.delete(url);
      throw err;
    })
    .finally(() => clearTimeout(timer));

  cache.set(url, promise);
  return promise as Promise<T>;
}

