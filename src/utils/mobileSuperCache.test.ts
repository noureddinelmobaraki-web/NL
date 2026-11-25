import { describe, expect, it, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  CACHE_MOBILE_API,
  CACHE_MOBILE_POSTERS,
  CACHE_MOBILE_SONGS,
  startMobileHomeSongsPrecache,
} from './mobileSuperCache';

interface InMemoryCache {
  entries: Map<string, Response>;
  add: (url: string) => Promise<void>;
  match: (req: RequestInfo | URL) => Promise<Response | undefined>;
  put: (req: RequestInfo | URL, res: Response) => Promise<void>;
  keys: () => Promise<Request[]>;
  delete: (req: RequestInfo | URL) => Promise<boolean>;
}

function createMockCacheStorage() {
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (req: RequestInfo | URL) =>
    typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;

  const makeCache = (name: string): InMemoryCache => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name)!;
    return {
      entries,
      add: async (url: string) => {
        entries.set(url, new Response('precached', { status: 200 }));
      },
      match: async (req) => entries.get(keyOf(req))?.clone(),
      put: async (req, res) => {
        entries.set(keyOf(req), res.clone());
      },
      keys: async () => Array.from(entries.keys()).map((u) => new Request(u.startsWith('http') ? u : `https://example.com${u}`)),
      delete: async (req) => entries.delete(keyOf(req)),
    };
  };

  return {
    stores,
    has: async (name: string) => stores.has(name),
    keys: async () => Array.from(stores.keys()),
    open: async (name: string) => makeCache(name),
    delete: async (name: string) => stores.delete(name),
  };
}

function loadServiceWorker(mockFetch: typeof fetch, cacheStorage: ReturnType<typeof createMockCacheStorage>) {
  const sw = fs.readFileSync('public/sw.template.js', 'utf8');
  const listeners = new Map<string, (event: unknown) => void>();
  const workerScope = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.set(type, handler);
    },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
    navigator: {},
    location: { origin: 'https://noureddinelmobaraki-web.github.io' },
    registration: { scope: 'https://noureddinelmobaraki-web.github.io/NL/' },
  };

  runInNewContext(sw, {
    self: workerScope,
    caches: cacheStorage,
    fetch: mockFetch,
    URL,
    Headers,
    Request,
    Response,
    console,
    setTimeout,
    clearTimeout,
  });

  return listeners;
}

describe('Mobile-Only PWA Super Cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('preserves all persistent nl-mobile-* caches during SW activation while pruning stale versioned caches', async () => {
    const cacheStorage = createMockCacheStorage();
    await cacheStorage.open('nl-shell-old-build');
    await cacheStorage.open('nl-saved-audio');
    await cacheStorage.open(CACHE_MOBILE_SONGS);
    await cacheStorage.open(CACHE_MOBILE_API);
    await cacheStorage.open(CACHE_MOBILE_POSTERS);
    await cacheStorage.open('nl-mobile-meta-v1');

    const listeners = loadServiceWorker(
      vi.fn(async () => new Response('ok', { status: 200 })) as unknown as typeof fetch,
      cacheStorage,
    );

    const activate = listeners.get('activate');
    let done: Promise<unknown> | undefined;
    activate?.({ waitUntil: (p: Promise<unknown>) => { done = p; } });
    await done;

    expect(cacheStorage.stores.has('nl-shell-old-build')).toBe(false);
    expect(cacheStorage.stores.has('nl-saved-audio')).toBe(true);
    expect(cacheStorage.stores.has(CACHE_MOBILE_SONGS)).toBe(true);
    expect(cacheStorage.stores.has(CACHE_MOBILE_API)).toBe(true);
    expect(cacheStorage.stores.has(CACHE_MOBILE_POSTERS)).toBe(true);
    expect(cacheStorage.stores.has('nl-mobile-meta-v1')).toBe(true);
  });

  it('never creates nl-mobile-* caches on desktop and bypasses API/poster/POST caching', async () => {
    const cacheStorage = createMockCacheStorage();
    const mockFetch = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    const listeners = loadServiceWorker(mockFetch as unknown as typeof fetch, cacheStorage);

    // Desktop explicitly signals enabled: false
    const onMessage = listeners.get('message');
    const waitList: Promise<unknown>[] = [];
    onMessage?.({
      data: { type: 'SET_MOBILE_SUPER_CACHE', enabled: false },
      waitUntil: (p: Promise<unknown>) => waitList.push(p),
    });
    await Promise.all(waitList);

    const onFetch = listeners.get('fetch');
    const apiResponsePromise: Promise<Response>[] = [];
    onFetch?.({
      request: new Request('https://api.themoviedb.org/3/trending/movie/week'),
      respondWith: (p: Promise<Response>) => apiResponsePromise.push(p),
      waitUntil: () => undefined,
    });
    await Promise.all(apiResponsePromise);

    const posterResponsePromise: Promise<Response>[] = [];
    onFetch?.({
      request: new Request('https://image.tmdb.org/t/p/w500/poster.jpg'),
      respondWith: (p: Promise<Response>) => posterResponsePromise.push(p),
      waitUntil: () => undefined,
    });
    await Promise.all(posterResponsePromise);

    expect(cacheStorage.stores.has(CACHE_MOBILE_SONGS)).toBe(false);
    expect(cacheStorage.stores.has(CACHE_MOBILE_API)).toBe(false);
    expect(cacheStorage.stores.has(CACHE_MOBILE_POSTERS)).toBe(false);
    expect(cacheStorage.stores.has('nl-mobile-meta-v1')).toBe(false);
  });

  it('caches personal R2 + GitHub HLS audio, lyrics, read-only APIs, and posters when mobile super cache is active', async () => {
    const cacheStorage = createMockCacheStorage();
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return new Response(`body:${url}`, { status: 200 });
    });
    const listeners = loadServiceWorker(mockFetch as unknown as typeof fetch, cacheStorage);

    const waitList: Promise<unknown>[] = [];
    listeners.get('message')?.({
      data: { type: 'SET_MOBILE_SUPER_CACHE', enabled: true },
      waitUntil: (p: Promise<unknown>) => waitList.push(p),
    });
    await Promise.all(waitList);

    const dispatchFetch = async (url: string, method = 'GET') => {
      let responded: Promise<Response> | null = null;
      const bg: Promise<unknown>[] = [];
      listeners.get('fetch')?.({
        request: new Request(url, { method }),
        respondWith: (p: Promise<Response>) => { responded = p; },
        waitUntil: (p: Promise<unknown>) => bg.push(p),
      });
      const res = responded ? await responded : null;
      await Promise.all(bg);
      return res;
    };

    // R2 HLS manifest + segment + sbv lyrics -> nl-mobile-songs-v1
    await dispatchFetch('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/index.m3u8');
    await dispatchFetch('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/seg0.ts');
    await dispatchFetch('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/sub.sbv');
    // Read-only catalog API -> nl-mobile-api-v1
    await dispatchFetch('https://api.jikan.moe/v4/top/anime');
    // Poster -> nl-mobile-posters-v1
    await dispatchFetch('https://image.tmdb.org/t/p/w500/abc.jpg');
    // Archive.org video stream must NOT be cached in nl-mobile-api-v1
    const videoRes = await dispatchFetch('https://archive.org/download/classic_film/movie.mp4');
    expect(videoRes).toBeNull();
    // POST request must NOT be intercepted
    const postRes = await dispatchFetch('https://api.themoviedb.org/3/rating', 'POST');
    expect(postRes).toBeNull();

    expect(cacheStorage.stores.get(CACHE_MOBILE_SONGS)?.size).toBe(3);
    expect(cacheStorage.stores.get(CACHE_MOBILE_API)?.size).toBe(1);
    expect(cacheStorage.stores.get(CACHE_MOBILE_POSTERS)?.size).toBe(1);
  });

  it('skips pre-caching completely on desktop and atomically caches both R2 and GitHub CDN songs on mobile', async () => {
    const cacheStorage = createMockCacheStorage();
    vi.stubGlobal('caches', cacheStorage);

    // Desktop matchMedia -> false
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const desktopResult = await startMobileHomeSongsPrecache();
    expect(desktopResult).toBeNull();
    expect(cacheStorage.stores.size).toBe(0);

    // Mobile matchMedia -> true for max-width: 767px
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: q.includes('767px') })));
    const songsFixture = [
      {
        id: 1,
        title: '100 ans',
        url: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/index.m3u8',
        hasLrc: true,
        lrcFile: '100 ans.sbv',
        lrcUrl: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/sub.sbv',
      },
      {
        id: 17,
        title: 'TOTAL',
        url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TOTAL/index.m3u8',
        hasLrc: true,
        lrcFile: 'TOTAL.lrc',
      },
    ];

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/data/songs.json')) {
        return new Response(JSON.stringify(songsFixture), { status: 200 });
      }
      if (url.endsWith('index.m3u8')) {
        return new Response('#EXTM3U\nseg0.ts\nseg1.ts\n', { status: 200 });
      }
      return new Response('ok', { status: 200 });
    }));

    const mobileResult = await startMobileHomeSongsPrecache();
    expect(mobileResult?.totalCount).toBe(2);
    expect(mobileResult?.cachedCount).toBe(2);
    expect(mobileResult?.inProgress).toBe(false);

    const songEntries = cacheStorage.stores.get(CACHE_MOBILE_SONGS);
    expect(songEntries?.has('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/index.m3u8')).toBe(true);
    expect(songEntries?.has('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/seg1.ts')).toBe(true);
    expect(songEntries?.has('https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01/sub.sbv')).toBe(true);
    expect(songEntries?.has('https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TOTAL/index.m3u8')).toBe(true);
    expect(songEntries?.has('https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TOTAL/seg1.ts')).toBe(true);
  });
});
