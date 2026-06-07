const cache = new Map<string, Promise<unknown>>();

export function fetchData<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to load ${url}`);
      return r.json();
    }));
  }
  return cache.get(url) as Promise<T>;
}
