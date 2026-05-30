const CACHE_SHELL = 'nl-shell-v5';
const CACHE_IMAGES = 'nl-images-v5';
const CACHE_HLS = 'nl-hls-v5';
const CACHE_AUDIO = 'nl-audio-v5';
const CACHE_FONTS = 'nl-fonts-v5';

const PRECACHE_URLS = [
  '/NL/',
];

const HLS_ORIGIN = 'noureddinelmobaraki-web.github.io';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(async (cache) => {
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Precache failed for:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Cleanup old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (![CACHE_SHELL, CACHE_IMAGES, CACHE_HLS, CACHE_AUDIO, CACHE_FONTS].includes(key)) {
          return caches.delete(key);
        }
      })
    );

    // Pre-warm critical CDN images in background
    const CDN_PREWARM = [
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bg.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp',
    ];
    const imgCache = await caches.open(CACHE_IMAGES);
    for (const url of CDN_PREWARM) {
      try {
        const existing = await imgCache.match(url);
        if (!existing) {
          const resp = await fetch(url, { mode: 'cors' });
          if (resp.ok) {
            const withTs = await (async (r) => {
              const headers = new Headers(r.headers);
              headers.append('x-cached-at', Date.now().toString());
              const blob = await r.blob();
              return new Response(blob, { headers });
            })(resp);
            await imgCache.put(url, withTs);
          }
        }
      } catch {} // non-blocking
    }
    
    await self.clients.claim();
  })());
});

async function handleRangeRequest(request, responseOverride = null) {
  const cache = await caches.open(CACHE_AUDIO);
  const response = responseOverride || await cache.match(request);
  if (!response) return fetch(request);

  const range = request.headers.get('range');
  if (!range) return response;

  const arrayBuffer = await response.arrayBuffer();
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : arrayBuffer.byteLength - 1;

  const slicedBuffer = arrayBuffer.slice(start, end + 1);
  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      ...Object.fromEntries(response.headers),
      'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
      'Content-Length': slicedBuffer.byteLength,
    },
  });
}

let hlsWriteCount = 0;

async function cleanupLruHls() {
  const cache = await caches.open(CACHE_HLS);
  const keys = await cache.keys();
  const tsEntries = [];

  for (const key of keys) {
    if (key.url.endsWith('.ts')) {
      const response = await cache.match(key);
      const cachedAt = response?.headers.get('x-cached-at');
      tsEntries.push({ key, cachedAt: cachedAt ? parseInt(cachedAt, 10) : 0 });
    }
  }

  if (tsEntries.length > 200) {
    tsEntries.sort((a, b) => a.cachedAt - b.cachedAt);
    const toDelete = tsEntries.slice(0, tsEntries.length - 200);
    for (const entry of toDelete) {
      await cache.delete(entry.key);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Navigation requests: serve cached shell as fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match('/NL/');
        return cached || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 0. CDN images and media (non-HLS)
  if (url.hostname === HLS_ORIGIN && /\.(webp|gif|jpg|png)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_IMAGES);
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (cachedAt && Date.now() - parseInt(cachedAt, 10) < 30 * 24 * 60 * 60 * 1000) {
            return cached;
          }
        }
        const response = await fetch(event.request);
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.append('x-cached-at', Date.now().toString());
        const body = await cloned.blob();
        await cache.put(event.request, new Response(body, { headers }));
        return response;
      })()
    );
    return;
  }

  // CDN video and direct audio (webm, mp4)
  if (url.hostname === HLS_ORIGIN && /\.(webm|mp4)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_AUDIO); // use CACHE_AUDIO/CACHE_MEDIA for larger assets
        const cached = await cache.match(event.request);
        if (cached) return handleRangeRequest(event.request, cached);
        
        const response = await fetch(event.request);
        if (response.status === 200) {
           await cache.put(event.request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // 1. HLS Segments (.ts)
  if (url.hostname === HLS_ORIGIN && url.pathname.endsWith('.ts')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_HLS);
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (cachedAt && Date.now() - parseInt(cachedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
            return cached;
          }
        }
        const response = await fetch(event.request);
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.append('x-cached-at', Date.now().toString());
        const body = await cloned.blob();
        await cache.put(event.request, new Response(body, { headers }));
        
        hlsWriteCount++;
        if (hlsWriteCount % 20 === 0) cleanupLruHls();
        
        return response;
      })()
    );
    return;
  }

  // 2. HLS Manifests (.m3u8) — network-first, cache fallback
  if (url.hostname === HLS_ORIGIN && url.pathname.endsWith('.m3u8')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_HLS);
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.append('x-cached-at', Date.now().toString());
            const body = await cloned.blob();
            await cache.put(event.request, new Response(body, { headers }));
          }
          return response;
        } catch {
          // Offline fallback
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw new Error('m3u8 unavailable offline');
        }
      })()
    );
    return;
  }

  // 3. Same-origin Audio/Video with Range support
  if (sameOrigin && (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4'))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_AUDIO);
        const cached = await cache.match(event.request);
        if (cached) return handleRangeRequest(event.request);

        const response = await fetch(event.request);
        if (response.status === 200) {
           await cache.put(event.request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // 4. Same-origin Images
  if (sameOrigin && /\.(webp|jpg|jpeg|png|gif|svg)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_IMAGES);
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (cachedAt && Date.now() - parseInt(cachedAt, 10) < 30 * 24 * 60 * 60 * 1000) {
            return cached;
          }
        }
        const response = await fetch(event.request);
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.append('x-cached-at', Date.now().toString());
        const body = await cloned.blob();
        await cache.put(event.request, new Response(body, { headers }));
        return response;
      })()
    );
    return;
  }

  // 5. Fonts
  if (sameOrigin && /\.(woff2|woff|ttf)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_FONTS);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        await cache.put(event.request, response.clone());
        return response;
      })()
    );
    return;
  }

  // 2b. JSON data files (songs.json, videos.json)
  if (sameOrigin && url.pathname.startsWith('/NL/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached || new Response('{}', { status: 503 }));
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // 2c. LRC lyric files
  if (sameOrigin && url.pathname.startsWith('/NL/lrc/') && url.pathname.endsWith('.lrc')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })()
    );
    return;
  }

  // 6. App Shell (JS/CSS/HTML)
  if (sameOrigin && /\.(js|css|html)$/.test(url.pathname) || url.pathname === '/NL/') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })()
    );
    return;
  }
});
