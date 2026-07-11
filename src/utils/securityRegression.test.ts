import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('security and deployment regressions', () => {
  it('allows same-origin Retro iframe without unsafe inline scripts', () => {
    const html = read('index.html');
    expect(html).toContain("frame-src 'self'");
    expect(html).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(html).toContain("'inline-speculation-rules'");
    expect(html).not.toContain("Object.defineProperty(window, 'fetch'");
  });

  it('does not cache failed app-shell responses in the service worker', () => {
    const sw = read('public/sw.template.js');
    expect(sw).toContain('response && response.ok');
    expect(sw).toContain('cache.put(event.request, response.clone())');
  });

  it('deletes only stale versioned NL caches during service-worker activation', async () => {
    const sw = read('public/sw.template.js');
    const currentSuffix = '__BUILD_HASH__';
    const currentCaches = [
      `nl-shell-${currentSuffix}`,
      `nl-images-${currentSuffix}`,
      `nl-hls-${currentSuffix}`,
      `nl-audio-${currentSuffix}`,
      `nl-fonts-${currentSuffix}`,
    ];
    const staleOwnedCaches = [
      'nl-shell-old-build',
      'nl-images-old-build',
      'nl-hls-old-build',
      'nl-audio-old-build',
      'nl-fonts-old-build',
    ];
    const cachesThatMustSurvive = [
      'nl-saved-audio',
      'nl-img-v1',
      'another-project-cache-v4',
      'nl-unrelated-feature-cache',
    ];
    const allCacheNames = [
      ...currentCaches,
      ...staleOwnedCaches,
      ...cachesThatMustSurvive,
    ];
    const deleted: string[] = [];
    const listeners = new Map<string, (event: unknown) => void>();
    const cachedResponse = new Response('already cached', { status: 200 });
    const cache = {
      add: async () => undefined,
      match: async () => cachedResponse.clone(),
      put: async () => undefined,
      keys: async () => [],
      delete: async () => true,
    };
    const cacheStorage = {
      keys: async () => allCacheNames,
      open: async () => cache,
      delete: async (key: string) => {
        deleted.push(key);
        return true;
      },
    };
    const workerScope = {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners.set(type, handler);
      },
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
      navigator: {},
      location: { origin: 'https://noureddinelmobaraki-web.github.io' },
    };

    runInNewContext(sw, {
      self: workerScope,
      caches: cacheStorage,
      fetch: async () => new Response('network', { status: 200 }),
      URL,
      Headers,
      Request,
      Response,
      console,
      setTimeout,
      clearTimeout,
    });

    const activate = listeners.get('activate');
    expect(activate).toBeDefined();
    let activation: Promise<unknown> | undefined;
    activate?.({
      waitUntil: (promise: Promise<unknown>) => {
        activation = promise;
      },
    });
    await activation;

    expect(deleted.sort()).toEqual(staleOwnedCaches.sort());
    for (const cacheName of [...currentCaches, ...cachesThatMustSurvive]) {
      expect(deleted).not.toContain(cacheName);
    }
  });

  it('uses an Express 5 compatible SPA fallback route', () => {
    const server = read('server.ts');
    expect(server).not.toContain("app.get('*'");
    expect(server).toContain('app.get(/.*/');
  });
});
