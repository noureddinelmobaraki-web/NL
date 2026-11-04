import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ALL_SERVER_FRAME_ORIGINS, CINEMA_SERVERS } from '../config/servers';
import { fetchExtractedVideos, WORKER_ENDPOINT } from '../services/videoExtractor';

import {
  recordServerFailure,
  recordServerSuccess,
  sortSourcesBySpeed,
} from '../services/serverSpeedMonitor';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('security and deployment regressions', () => {
  it('allows same-origin Retro iframe and all 4 active cinema embed server origins in frame-src without wildcards or removed servers', () => {
    const html = read('index.html');
    expect(html).toContain("frame-src 'self'");
    expect(html).toContain('https://broad-block-7bd7.nordinegb2018.workers.dev');
    expect(html).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(html).toContain("'inline-speculation-rules'");
    expect(html).not.toContain("Object.defineProperty(window, 'fetch'");

    const frameSrcMatch = html.match(/frame-src\s+([^;]+);/);
    expect(frameSrcMatch).not.toBeNull();
    const frameSrcTokens = frameSrcMatch![1].trim().split(/\s+/);
    expect(frameSrcTokens).not.toContain('*');
    expect(frameSrcTokens).not.toContain('https:');
    expect(frameSrcTokens).not.toContain('https://vidsrc.xyz');
    expect(frameSrcTokens).not.toContain('https://vidsrc.icu');
    expect(frameSrcTokens).not.toContain('https://autoembed.co');
    for (const origin of ALL_SERVER_FRAME_ORIGINS) {
      expect(frameSrcTokens).toContain(origin);
    }
  });

  it('sets Server VL (VidLink) as default primary server (index 0), followed by 7, 1, 2, 6, and builds valid movie and TV URLs', () => {
    expect(CINEMA_SERVERS).toHaveLength(5);
    expect(CINEMA_SERVERS.map((s) => s.id)).toEqual([
      'server-vl',
      'server-7',
      'server-1',
      'server-2',
      'server-6',
    ]);
    const defaultServer = CINEMA_SERVERS[0];
    expect(defaultServer.id).toBe('server-vl');
    expect(defaultServer.movie({ tmdb: 278, imdb: 'tt0111161' })).toContain(
      'https://vidlink.pro/movie/278',
    );
    expect(defaultServer.movie({ tmdb: 278, imdb: 'tt0111161' })).toContain(
      'primaryColor=dc2626',
    );
    expect(defaultServer.tv({ tmdb: 60735, imdb: 'tt3107288' }, 1, 1, false)).toContain(
      'https://vidlink.pro/tv/60735/1/1',
    );
    expect(defaultServer.tv({ tmdb: 60735, imdb: 'tt3107288' }, 1, 1, false, { startAt: 45 })).toContain(
      'startAt=45',
    );

    const server7 = CINEMA_SERVERS[1];
    expect(server7.id).toBe('server-7');
    expect(server7.movie({ imdb: 'tt0111161', tmdb: 278 })).toBe(
      'https://streamimdb.ru/embed/movie/tt0111161',
    );
    expect(server7.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, false)).toBe(
      'https://streamimdb.ru/embed/tv/tt3107288/1/1',
    );

    const server1 = CINEMA_SERVERS[2];
    expect(server1.movie({ imdb: 'tt0111161', tmdb: 278 })).toBe(
      'https://www.2embed.cc/embed/tt0111161',
    );
    expect(server1.movie({ tmdb: 278 })).toBe(
      'https://www.2embed.cc/embed/278',
    );
    expect(server1.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, false)).toBe(
      'https://www.2embed.cc/embedtv/tt3107288&s=1&e=1',
    );
    expect(server1.tv({ tmdb: 60735 }, 1, 1, false)).toBe(
      'https://www.2embed.cc/embedtv/60735&s=1&e=1',
    );
    expect(server1.tv({ imdb: 'tt3107288', tmdb: 60735 }, 1, 1, true)).toBe(
      'https://www.2embed.cc/embedtvfull/tt3107288',
    );
  });

  it('posts generated target URLs to the Cloudflare Worker endpoint and normalizes extracted video streams and subtitles', async () => {
    expect(WORKER_ENDPOINT).toBe('https://broad-block-7bd7.nordinegb2018.workers.dev/');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        total_pages: 1,
        results: {
          source: 'https://streamimdb.ru/embed/movie/tt0111161',
          count: 1,
          iframes_scanned: [],
          subtitles: [
            {
              url: 'https://cdn.target-site.com/subs/ar.vtt',
              lang: 'ar',
              label: 'العربية',
            },
          ],
          videos: [
            {
              type: 'hls',
              directUrl: 'https://cdn.target-site.com/master.m3u8',
              proxiedUrl:
                'https://broad-block-7bd7.nordinegb2018.workers.dev/proxy?videoUrl=https%3A%2F%2Fcdn.target-site.com%2Fmaster.m3u8&referer=https%3A%2F%2Fstreamimdb.ru',
            },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    try {
      const videos = await fetchExtractedVideos('https://streamimdb.ru/embed/movie/tt0111161');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://broad-block-7bd7.nordinegb2018.workers.dev/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: ['https://streamimdb.ru/embed/movie/tt0111161'] }),
        }),
      );
      expect(videos).toEqual([
        {
          sourcePage: 'https://streamimdb.ru/embed/movie/tt0111161',
          type: 'hls',
          directUrl: 'https://cdn.target-site.com/master.m3u8',
          proxiedUrl:
            'https://broad-block-7bd7.nordinegb2018.workers.dev/proxy?videoUrl=https%3A%2F%2Fcdn.target-site.com%2Fmaster.m3u8&referer=https%3A%2F%2Fstreamimdb.ru',
          subtitles: [
            {
              url: 'https://cdn.target-site.com/subs/ar.vtt',
              proxiedUrl:
                'https://broad-block-7bd7.nordinegb2018.workers.dev/proxy?videoUrl=https%3A%2F%2Fcdn.target-site.com%2Fsubs%2Far.vtt&referer=https%3A%2F%2Fstreamimdb.ru%2Fembed%2Fmovie%2Ftt0111161',
              lang: 'ar',
              label: 'العربية',
              default: true,
            },
          ],
        },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('prioritizes Tier 2 (timeEvents) servers over Tier 3 silent servers, and sorts silent servers by speed', () => {
    const mockSources = [
      { id: 'server-7' },
      { id: 'server-1' },
      { id: 'server-2' },
      { id: 'server-6' },
      { id: 'server-vl' },
    ];
    recordServerFailure('server-7');
    recordServerSuccess('server-2', 420, 'movie_278');
    const sorted = sortSourcesBySpeed(mockSources, 'movie_278');
    // Tier 2 (server-vl) remains in Bucket 0 ahead of Bucket 1 silent servers
    expect(sorted[0].id).toBe('server-vl');
    // In Bucket 1, server-2 was promoted ahead of server-7
    const silentSortedIds = sorted.slice(1).map((s) => s.id);
    expect(silentSortedIds[0]).toBe('server-2');
    expect(silentSortedIds[silentSortedIds.length - 1]).toBe('server-7');
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
