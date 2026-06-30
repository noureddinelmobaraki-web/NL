const CACHE = 'nl-img-v1';

export async function prefetchImages(urls: string[]): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open(CACHE);
    await Promise.all(
      urls.map(async (u) => {
        if (!u) return;
        try {
          if (await c.match(u)) return;
          const r = await fetch(u, { mode: 'no-cors' });
          await c.put(u, r);
        } catch {}
      })
    );
  } catch {}
}
