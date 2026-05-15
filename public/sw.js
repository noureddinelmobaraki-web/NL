const CACHE_SHELL = 'nl-shell-v1';
const CACHE_MEDIA = 'nl-media-v1';
const CACHE_HLS   = 'nl-hls-v1';

const HLS_ORIGIN = 'noureddinelmobaraki-web.github.io';

// Precaching critical assets
const PRECACHE_URLS = [
  '/NL/media/music.mp3',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_final.mp4',
  'https://github.com/user-attachments/assets/e12ed81c-ed5c-4cd9-952c-001a9bfc652f' // me-bit audio
];

let hlsWriteCount = 0;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_MEDIA).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_SHELL, CACHE_MEDIA, CACHE_HLS];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('nl-') && !currentCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Managed TTL + Cache-First
async function fetchWithTTL(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const cachedAt = cachedResponse.headers.get('x-cached-at');
    if (cachedAt && (Date.now() - parseInt(cachedAt, 10) < ttlMs)) {
      return cachedResponse;
    }
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const responseToCache = await createResponseWithTimestamp(networkResponse);
    cache.put(request, responseToCache.clone());
    
    if (cacheName === CACHE_HLS) {
      hlsWriteCount++;
      if (hlsWriteCount >= 50) {
        hlsWriteCount = 0;
        cleanupHlsCache();
      }
    }
    
    return responseToCache;
  }
  
  return networkResponse;
}

// Helper: Add custom timestamp header to response
async function createResponseWithTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('x-cached-at', Date.now().toString());
  
  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// Helper: Cleanup stale HLS entries
async function cleanupHlsCache() {
  const cache = await caches.open(CACHE_HLS);
  const requests = await cache.keys();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  for (const request of requests) {
    const response = await cache.match(request);
    const cachedAt = response.headers.get('x-cached-at');
    if (cachedAt && (now - parseInt(cachedAt, 10) > sevenDays)) {
      await cache.delete(request);
    }
  }
}

// Helper: Handle Range requests from cache
async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) return cachedResponse;

  try {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    const bytes = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(bytes[0], 10);
    const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;

    const slicedBuffer = arrayBuffer.slice(start, end + 1);
    const headers = new Headers(cachedResponse.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`);
    headers.set('Content-Length', slicedBuffer.byteLength.toString());

    return new Response(slicedBuffer, {
      status: 206,
      statusText: 'Partial Content',
      headers
    });
  } catch (e) {
    return fetch(request);
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  event.respondWith((async () => {
    try {
      // Allow specific critical cross-origin assets to be cached
      if (PRECACHE_URLS.includes(event.request.url) || PRECACHE_URLS.includes(url.origin + url.pathname)) {
        const cache = await caches.open(CACHE_MEDIA);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          if (/\.(mp3|mp4)$/i.test(url.pathname)) {
            return handleRangeRequest(event.request, cachedResponse);
          }
          return cachedResponse;
        }
        // If not in cache, fetch and cache (TTL 30 days)
        return fetchWithTTL(event.request, CACHE_MEDIA, 30 * 24 * 60 * 60 * 1000);
      }

      // 1. HLS Segments (.ts) from GitHub Pages
      if (url.hostname === HLS_ORIGIN && url.pathname.endsWith('.ts')) {
        return fetchWithTTL(event.request, CACHE_HLS, 7 * 24 * 60 * 60 * 1000);
      }

      // 2. HLS Manifests (.m3u8) from GitHub Pages
      if (url.hostname === HLS_ORIGIN && url.pathname.endsWith('.m3u8')) {
        return fetchWithTTL(event.request, CACHE_HLS, 24 * 60 * 60 * 1000);
      }

      // 3. Same-origin Images
      if (isSameOrigin && /\.(webp|jpg|png|svg)$/i.test(url.pathname)) {
        return fetchWithTTL(event.request, CACHE_MEDIA, 30 * 24 * 60 * 60 * 1000);
      }

      // 4. Same-origin Audio/Video
      if (isSameOrigin && /\.(mp3|mp4)$/i.test(url.pathname)) {
        const cache = await caches.open(CACHE_MEDIA);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return handleRangeRequest(event.request, cachedResponse);
        }
        return fetch(event.request);
      }

      // 5. App Shell (JS, CSS, HTML)
      if (isSameOrigin && (/\.(js|css)$/i.test(url.pathname) || url.pathname.endsWith('/') || url.pathname.endsWith('.html'))) {
        const cache = await caches.open(CACHE_SHELL);
        const cachedResponse = await cache.match(event.request);
        
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        return cachedResponse || fetchPromise;
      }

      // 6. Everything else
      return fetch(event.request);

    } catch (error) {
      return fetch(event.request);
    }
  })());
});
