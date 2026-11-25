const VERSION = '__BUILD_HASH__';
const CACHE_SHELL = `nl-shell-${VERSION}`;
const CACHE_IMAGES = `nl-images-${VERSION}`;
const CACHE_HLS = `nl-hls-${VERSION}`;
const CACHE_AUDIO = `nl-audio-${VERSION}`;
const CACHE_FONTS = `nl-fonts-${VERSION}`;
// Portrait page media. Its own cache because nl-audio is capped at 15 entries
// and shared with the song library: a handful of songs evicts the ambience and
// the orbit video, and the page then re-downloads them on every single visit.
const CACHE_PORTRAIT = `nl-portrait-${VERSION}`;
const VERSIONED_CACHE_PREFIXES = [
  'nl-shell-',
  'nl-images-',
  'nl-hls-',
  'nl-audio-',
  'nl-fonts-',
  'nl-portrait-',
];
// Persistent library for user-saved songs. NOT version-suffixed, so it
// survives redeploys. Never trimmed (not present in LIMITS).
const CACHE_SAVED = 'nl-saved-audio';
// Persistent mobile-only super caches (NOT version-suffixed — survive redeploys)
const CACHE_MOBILE_SONGS = 'nl-mobile-songs-v1';
const CACHE_MOBILE_API = 'nl-mobile-api-v1';
const CACHE_MOBILE_POSTERS = 'nl-mobile-posters-v1';
const CACHE_MOBILE_META = 'nl-mobile-meta-v1';

const PRECACHE_URLS = [
  '/NL/',
  '/NL/offline.html',
];

const HLS_ORIGIN = 'noureddinelmobaraki-web.github.io';

const PERSONAL_AUDIO_ORIGINS = new Set([
  'noureddinelmobaraki-web.github.io',
  'pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev',
]);

const MOBILE_API_ORIGINS = new Set([
  'api.themoviedb.org',
  'api.jikan.moe',
  'api.tvmaze.com',
  'archive.org',
  'openlibrary.org',
  'gutendex.com',
  'iptv-org.github.io',
  'api.artic.edu',
  'collectionapi.metmuseum.org',
  'openaccess-api.clevelandart.org',
]);

const MOBILE_POSTER_ORIGINS = new Set([
  'image.tmdb.org',
  's4.anilist.co',
  'cdn.myanimelist.net',
  'i.ytimg.com',
  'covers.openlibrary.org',
  'pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev',
]);

let mobileSuperCacheEnabled = null;

async function cacheExists(name) {
  try {
    if (typeof caches.has === 'function') {
      return await caches.has(name);
    }
    const keys = await caches.keys();
    return keys.includes(name);
  } catch {
    return false;
  }
}

async function isMobileSuperCacheOn() {
  if (mobileSuperCacheEnabled !== null) return mobileSuperCacheEnabled;
  try {
    if (!(await cacheExists(CACHE_MOBILE_META))) {
      mobileSuperCacheEnabled = false;
      return false;
    }
    const meta = await caches.open(CACHE_MOBILE_META);
    const flag = await meta.match('/__nl_mobile_super_cache__');
    mobileSuperCacheEnabled = Boolean(flag);
  } catch {
    mobileSuperCacheEnabled = false;
  }
  return mobileSuperCacheEnabled;
}

// Pathnames are compared percent-encoded, exactly as URL.pathname reports them
// and exactly as PORTRAIT_ASSETS in src/features/portrait/constants.ts spells
// them. Do not tidy the %20 sequences.
const PORTRAIT_MEDIA = new Set([
  '/nl-audio-cdn/just%20Bg.jpeg',
  '/nl-audio-cdn/me%20no%20bg.png',
  '/nl-audio-cdn/MESROUR%20SALAH%20EDDINE%20BG.webm',
  '/nl-audio-cdn/MO_web.mp4',
  '/nl-audio-cdn/metxtbg.m4a',
]);

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (type === 'SET_MOBILE_SUPER_CACHE') {
    const enabled = Boolean(event.data?.enabled);
    mobileSuperCacheEnabled = enabled;
    const op = (async () => {
      if (enabled) {
        const meta = await caches.open(CACHE_MOBILE_META);
        await meta.put('/__nl_mobile_super_cache__', new Response('1', { status: 200 }));
      } else if (await cacheExists(CACHE_MOBILE_META)) {
        await caches.delete(CACHE_MOBILE_META);
      }
    })().catch(() => {});
    if (typeof event.waitUntil === 'function') event.waitUntil(op);
    return;
  }
  if (type === 'CLEAR_MOBILE_SUPER_CACHE') {
    const op = Promise.all([
      caches.delete(CACHE_MOBILE_SONGS),
      caches.delete(CACHE_MOBILE_API),
      caches.delete(CACHE_MOBILE_POSTERS),
    ]).catch(() => {});
    if (typeof event.waitUntil === 'function') event.waitUntil(op);
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
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete only stale, versioned caches owned by this service worker.
    // Cache Storage is origin-wide, so unrelated project caches and the
    // persistent NL caches (nl-saved-audio / nl-img-v1) must be preserved.
    const currentCaches = new Set([
      CACHE_SHELL,
      CACHE_IMAGES,
      CACHE_HLS,
      CACHE_AUDIO,
      CACHE_FONTS,
      CACHE_PORTRAIT,
    ]);
    const keys = await caches.keys();
    const staleOwnedCaches = keys.filter((key) =>
      VERSIONED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
      !currentCaches.has(key)
    );
    await Promise.all(staleOwnedCaches.map((key) => caches.delete(key)));

    await self.clients.claim();

    // Pre-warm critical CDN images non-blockingly in background
    const CDN_PREWARM = [
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/nordine_portrait.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bg.webp',
      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp',
    ];
    void (async () => {
      try {
        const imgCache = await caches.open(CACHE_IMAGES);
        for (const url of CDN_PREWARM) {
          try {
            const existing = await imgCache.match(url);
            if (!existing) {
              const resp = await fetch(url, { mode: 'cors' });
              if (resp.ok) {
                const headers = new Headers(resp.headers);
                headers.append('x-cached-at', Date.now().toString());
                const blob = await resp.blob();
                await imgCache.put(url, new Response(blob, { headers }));
              }
            }
          } catch {} // non-blocking
        }
      } catch {}
    })();

    // Check storage estimates on activate
    if (self.navigator && self.navigator.storage && self.navigator.storage.estimate) {
      try {
        const { usage, quota } = await self.navigator.storage.estimate();
        if (usage && quota && usage / quota > 0.8) {
          console.warn(`[SW] Storage at ${Math.round((usage / quota) * 100)}%`);
        }
      } catch (e) {
        // Ignored
      }
    }
  })());
});

async function handleRangeRequest(request, responseOverride = null) {
  const cache = await caches.open(CACHE_AUDIO);
  const response = responseOverride || await cache.match(request);
  if (!response) return fetch(request);

  const range = request.headers.get('range');
  if (!range) return response;

  const blob = await response.blob();
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : blob.size - 1;

  const slicedBlob = blob.slice(start, end + 1);
  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      ...Object.fromEntries(response.headers),
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Content-Length': String(slicedBlob.size),
    },
  });
}

const LIMITS = {
  'nl-images': { max: 80 },
  'nl-hls': { max: 30 },
  'nl-audio': { max: 15 },
  // Five portrait assets today; the headroom absorbs a variant without letting
  // this cache grow into a storage problem.
  'nl-portrait': { max: 8 },
};

async function trimCache(cacheName) {
  const baseName = cacheName.replace(/-[^-]+$/, ''); // Remove hash
  const limit = LIMITS[baseName]?.max;
  if (!limit) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > limit) {
    for (let i = 0; i < keys.length - limit; i++) {
      await cache.delete(keys[i]);
    }
  }
}

async function trimNamedCache(cacheName, maxEntries) {
  if (!maxEntries || maxEntries <= 0) return;
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      for (let i = 0; i < keys.length - maxEntries; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {}
}

const TP_MIME_BY_EXT = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

function tpGetMimeFromFilename(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return TP_MIME_BY_EXT[ext] || 'video/mp4';
}

// ── TPPIECES OPFS HTTP 206 Virtual Video Streamer ──
const TP_STREAM_RE = /\/(__tp_stream__|virtual-torrent-stream)\/([0-9a-fA-F]{40})/;
const TP_OPEN_TIMEOUT_MS = 15000;

function tpParseRange(header, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!m || (!m[1] && !m[2])) return { status: 200, start: 0, end: total > 0 ? total - 1 : -1 };
  let start, end;
  if (!m[1]) {
    const suffix = parseInt(m[2], 10);
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = parseInt(m[1], 10);
    end = m[2] ? parseInt(m[2], 10) : total - 1;
  }
  if (total > 0) end = Math.min(end, total - 1);
  if (total > 0 && start >= total) return { status: 416, start, end };
  return { status: 206, start, end: Math.max(start, end) };
}

async function tpPickClient(event) {
  const ids = [event.clientId, event.resultingClientId].filter(Boolean);
  for (const id of ids) {
    const c = await self.clients.get(id);
    if (c) return c;
  }
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return all.find((c) => c.focused) || all[0] || null;
}

function tpHandleStream(event, match) {
  const url = new URL(event.request.url);
  const infoHash = match[2].toLowerCase();
  const total = Number(url.searchParams.get('size') || 0);
  const pieceLen = Number(url.searchParams.get('pieceLen') || 0);
  const range = tpParseRange(event.request.headers.get('Range'), total);

  event.respondWith((async () => {
    if (range.status === 416) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    }
    const client = await tpPickClient(event);
    if (!client || !(total > 0)) {
      const directUrl = url.searchParams.get('directUrl');
      if (directUrl) {
        return Response.redirect(directUrl, 302);
      }
      if (self.location.hostname.endsWith('github.io')) {
        return new Response('Torrent stream session not active', { status: 503 });
      }
      const qs = new URLSearchParams({
        infoHash,
        magnet: url.searchParams.get('magnet') || '',
        directUrl: '',
      });
      const h = new Headers();
      const r = event.request.headers.get('Range');
      if (r) h.set('Range', r);
      const base = self.registration.scope.replace(/\/$/, '');
      try {
        return await fetch(`${base}/api/cinema-download/range-stream?${qs}`, { headers: h });
      } catch {
        return new Response('Torrent stream session not active', { status: 503 });
      }
    }

    client.postMessage({
      type: 'TORRENT_SW_SEEK_RANGE',
      infoHash,
      byteStart: range.start,
      byteEnd: range.end,
      targetPiece: pieceLen > 0 ? Math.floor(range.start / pieceLen) : 0,
    });

    const channel = new MessageChannel();
    let opened = false;
    const stream = new ReadableStream({
      start(controller) {
        const timer = setTimeout(() => {
          if (!opened) {
            try { controller.error(new Error('Stream open timeout')); } catch {}
            try { channel.port1.postMessage({ type: 'ABORT_RANGE' }); channel.port1.close(); } catch {}
          }
        }, TP_OPEN_TIMEOUT_MS);
        channel.port1.onmessage = (e) => {
          const msg = e.data;
          if (!msg) return;
          opened = true;
          clearTimeout(timer);
          if (msg.type === 'CHUNK' && msg.buffer) {
            controller.enqueue(new Uint8Array(msg.buffer));
          } else if (msg.type === 'EOF') {
            try { controller.close(); } catch {}
            channel.port1.close();
          } else if (msg.type === 'ERROR') {
            try { controller.error(new Error(msg.message || 'Stream error')); } catch {}
            channel.port1.close();
          }
        };
        client.postMessage(
          { type: 'SW_OPEN_RANGE', infoHash, start: range.start, end: range.end },
          [channel.port2],
        );
      },
      pull() {
        try { channel.port1.postMessage({ type: 'PULL', n: 1 }); } catch {}
      },
      cancel() {
        try { channel.port1.postMessage({ type: 'ABORT_RANGE' }); channel.port1.close(); } catch {}
      },
    }, { highWaterMark: 4 });

    const name = (url.searchParams.get('name') || '').toLowerCase();
    const type = name.endsWith('.mkv') ? 'video/x-matroska'
      : name.endsWith('.webm') ? 'video/webm'
      : name.endsWith('.ts') ? 'video/mp2t' : 'video/mp4';
    const headers = new Headers({
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Length': String(range.end - range.start + 1),
    });
    if (range.status === 206) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${total}`);
    return new Response(stream, { status: range.status, statusText: range.status === 206 ? 'Partial Content' : 'OK', headers });
  })());
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = request.url;

  try {
    const parsedUrl = new URL(requestUrl);
    if (parsedUrl.origin === self.location.origin) {
      const m = TP_STREAM_RE.exec(parsedUrl.pathname);
      if (m) {
        tpHandleStream(event, m);
        return;
      }
    }
  } catch {}

  // ── Supabase & API pass-through ──────────────────────────
  if (
    requestUrl.includes('/api/cinema-download/') ||
    requestUrl.includes('.supabase.co') ||
    requestUrl.includes('.supabase.com') ||
    requestUrl.includes('supabase.io') ||
    requestUrl.includes('2embed.cc') ||
    requestUrl.includes('2embed.skin') ||
    requestUrl.includes('multiembed.') ||
    requestUrl.includes('streamingnow.') ||
    requestUrl.includes('streamimdb.') ||
    requestUrl.includes('imdb.su') ||
    requestUrl.includes('.workers.dev')
  ) {
    return;
  }

  // Never cache POST or other mutating HTTP requests
  if (request.method !== 'GET') {
    return;
  }

  // ⛔️ Bypass صارم: ماشي مسموح للـ SW يخدم ملفات XML/TXT/manifest عبر fallback القشرة.
  // هاد الملفات خاص تُخدَم native (GitHub Pages / السيرفر) بالـ Content-Type الصحيح
  // (application/xml للـ sitemap، text/plain للـ robots) باش الزواحف والمتصفّح يقراوها مزيان.
  {
    const bypassUrl = new URL(request.url);
    if (
      bypassUrl.origin === self.location.origin &&
      /(\.xml|\.txt)$|\/(sitemap\.xml|robots\.txt|manifest\.webmanifest)$/i.test(bypassUrl.pathname)
    ) {
      return; // بلا respondWith → المتصفّح/Pages كيخدمها بنفسو بالنوع الصحيح
    }
  }

  // Portrait page media: cache-first in a dedicated cache, so nothing here
  // competes with the song library for the 15 slots in nl-audio.
  {
    const portraitUrl = new URL(request.url);
    if (portraitUrl.hostname === HLS_ORIGIN && PORTRAIT_MEDIA.has(portraitUrl.pathname)) {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_PORTRAIT);
        // Cache.match keys on URL, not on headers, so this also hits for a
        // Range request and lets us slice locally.
        const cached = await cache.match(request, { ignoreVary: true });
        const range = request.headers.get('range');

        if (cached) {
          return range ? handleRangeRequest(request, cached) : cached;
        }

        if (range) {
          // Cache.put rejects a 206, so a ranged miss cannot populate the cache
          // from this response. Fetch the whole file alongside it instead: the
          // next play is then served locally and sliced by handleRangeRequest.
          event.waitUntil((async () => {
            try {
              const full = await fetch(portraitUrl.href, { mode: 'cors', credentials: 'omit' });
              if (full.status === 200) {
                await cache.put(portraitUrl.href, full.clone());
                await trimCache(CACHE_PORTRAIT);
              }
            } catch {
              // Offline, or a CDN hiccup. The media element still has its own
              // network response; warming is best-effort by design.
            }
          })());
          return fetch(request);
        }

        const response = await fetch(request);
        // An opaque cross-origin response reports status 0 and ok === false but
        // is still storable, which matters on a localhost preview where this CDN
        // is not same-origin.
        if (response.status === 200 || response.type === 'opaque') {
          await cache.put(request, response.clone());
          event.waitUntil(trimCache(CACHE_PORTRAIT));
        }
        return response;
      })());
      return;
    }
  }

  // ⭐ Saved/offline songs (.m4a, any origin): cache-first from the persistent
  //    user library, then the rolling audio cache, then network (no auto-cache).
  //    We return the cached response AS-IS (no Range slicing) so cross-origin
  //    opaque responses also play correctly offline.
  {
    const m4aUrl = new URL(request.url);
    if (/\.m4a$/i.test(m4aUrl.pathname)) {
      event.respondWith((async () => {
        const saved = await caches.open(CACHE_SAVED);
        const fromSaved = await saved.match(request, { ignoreVary: true });
        if (fromSaved) return fromSaved;
        const roll = await caches.open(CACHE_AUDIO);
        const fromRoll = await roll.match(request, { ignoreVary: true });
        if (fromRoll) return fromRoll;
        const response = await fetch(request);
        // Range requests come back 206 and cannot be stored; skip them rather
        // than let cache.put reject and reintroduce the old behaviour anyway.
        if (!request.headers.get('range') &&
            (response.status === 200 || response.type === 'opaque')) {
          await roll.put(request, response.clone());
          event.waitUntil(trimCache(CACHE_AUDIO));
        }
        return response;
      })());
      return;
    }
  }

  // Navigation requests: network-first, updating CACHE_SHELL on success, with cached shell fallback
  if (request.mode === 'navigate') {
    const navUrl = new URL(request.url);
    if (navUrl.origin !== self.location.origin) {
      return;
    }
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            try {
              const cache = await caches.open(CACHE_SHELL);
              await cache.put('/NL/', response.clone());
            } catch {}
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_SHELL);
          // Try cached app shell first (better UX if user navigates while online cache exists)
          const cachedShell = await cache.match('/NL/');
          if (cachedShell) return cachedShell;
          // Fall back to branded offline page
          const offline = await cache.match('/NL/offline.html');
          if (offline) return offline;
          return new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 0. CDN images and media (non-HLS)
  if (url.hostname === HLS_ORIGIN && /\.(webp|gif|jpg|jpeg|png|avif)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        // Saved covers live in the persistent library and must survive redeploys.
        const savedImg = await caches.open(CACHE_SAVED);
        const savedHit = await savedImg.match(event.request, { ignoreVary: true });
        if (savedHit) return savedHit;
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
        event.waitUntil(trimCache(CACHE_IMAGES));
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
           event.waitUntil(trimCache(CACHE_AUDIO));
        }
        return response;
      })()
    );
    return;
  }

  // 1. HLS Segments (.ts, .m4s, .aac) across BOTH personal audio origins (GitHub CDN + R2)
  if (PERSONAL_AUDIO_ORIGINS.has(url.hostname) && /\.(ts|m4s|aac)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const mobileOn = await isMobileSuperCacheOn();
        const hasMobileSongs = mobileOn || (await cacheExists(CACHE_MOBILE_SONGS));
        const mobileSongs = hasMobileSongs ? await caches.open(CACHE_MOBILE_SONGS) : null;
        // Mobile Super Cache first: 0ms offline playback, never trimmed
        if (mobileSongs) {
          const mobileHit = await mobileSongs.match(event.request, { ignoreVary: true });
          if (mobileHit) return mobileHit;
        }

        const cache = await caches.open(CACHE_HLS);
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (cachedAt && Date.now() - parseInt(cachedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
            return cached;
          }
        }
        const response = await fetch(event.request);
        if (response && response.ok) {
          if (mobileOn && mobileSongs) {
            await mobileSongs.put(event.request, response.clone());
          } else {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.append('x-cached-at', Date.now().toString());
            const body = await cloned.blob();
            await cache.put(event.request, new Response(body, { headers }));
            event.waitUntil(trimCache(CACHE_HLS));
          }
        }
        return response;
      })()
    );
    return;
  }

  // 2. HLS Manifests (.m3u8) across BOTH personal audio origins (GitHub CDN + R2)
  if (PERSONAL_AUDIO_ORIGINS.has(url.hostname) && /\.m3u8$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const mobileOn = await isMobileSuperCacheOn();
        const hasMobileSongs = mobileOn || (await cacheExists(CACHE_MOBILE_SONGS));
        const mobileSongs = hasMobileSongs ? await caches.open(CACHE_MOBILE_SONGS) : null;
        // Mobile Super Cache first: instant 0ms start & 100% offline support
        if (mobileSongs) {
          const mobileHit = await mobileSongs.match(event.request, { ignoreVary: true });
          if (mobileHit) return mobileHit;
        }

        const cache = await caches.open(CACHE_HLS);
        try {
          const response = await fetch(event.request);
          if (response && response.ok) {
            if (mobileOn && mobileSongs) {
              await mobileSongs.put(event.request, response.clone());
            } else {
              const cloned = response.clone();
              const headers = new Headers(cloned.headers);
              headers.append('x-cached-at', Date.now().toString());
              const body = await cloned.blob();
              await cache.put(event.request, new Response(body, { headers }));
              event.waitUntil(trimCache(CACHE_HLS));
            }
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
           event.waitUntil(trimCache(CACHE_AUDIO));
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
        event.waitUntil(trimCache(CACHE_IMAGES));
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

  // 2b. Local JSON data files (/NL/data/*.json) — SWR + persistent mobile mirror
  if (
    sameOrigin &&
    (url.pathname.startsWith('/NL/data/') || url.pathname.startsWith('/data/')) &&
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      (async () => {
        const mobileOn = await isMobileSuperCacheOn();
        const shellCache = await caches.open(CACHE_SHELL);
        const mobileApi = mobileOn ? await caches.open(CACHE_MOBILE_API) : null;
        const cached =
          (await shellCache.match(event.request)) ||
          (mobileApi ? await mobileApi.match(event.request, { ignoreVary: true }) : null);

        const fetchPromise = fetch(event.request)
          .then(async (response) => {
            if (response && response.ok) {
              await shellCache.put(event.request, response.clone());
              if (mobileApi) {
                await mobileApi.put(event.request, response.clone());
              }
            }
            return response;
          })
          .catch(
            () =>
              cached ||
              new Response('[]', {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
          );

        if (cached) {
          event.waitUntil(fetchPromise);
          return cached;
        }
        return fetchPromise;
      })()
    );
    return;
  }

  // 2c. Lyric/subtitle files (.lrc / .sbv / .srt) — local + BOTH personal audio origins
  if (
    (sameOrigin &&
      (url.pathname.startsWith('/NL/lrc/') || url.pathname.startsWith('/lrc/')) &&
      /\.(lrc|sbv|srt)$/i.test(url.pathname)) ||
    (PERSONAL_AUDIO_ORIGINS.has(url.hostname) && /\.(lrc|sbv|srt)$/i.test(url.pathname))
  ) {
    event.respondWith(
      (async () => {
        const mobileOn = await isMobileSuperCacheOn();
        const hasMobileSongs = mobileOn || (await cacheExists(CACHE_MOBILE_SONGS));
        const mobileSongs = hasMobileSongs ? await caches.open(CACHE_MOBILE_SONGS) : null;
        if (mobileSongs) {
          const mobileHit = await mobileSongs.match(event.request, { ignoreVary: true });
          if (mobileHit) return mobileHit;
        }

        const shellCache = sameOrigin ? await caches.open(CACHE_SHELL) : null;
        if (shellCache) {
          const cached = await shellCache.match(event.request);
          if (cached) return cached;
        }

        const response = await fetch(event.request);
        if (response && response.ok) {
          if (mobileOn && mobileSongs) {
            await mobileSongs.put(event.request, response.clone());
          }
          if (shellCache) {
            await shellCache.put(event.request, response.clone());
          }
        }
        return response;
      })()
    );
    return;
  }

  // 2d. Mobile-Only Persistent Catalog API Cache (Stale-While-Revalidate, max 350 entries)
  // Strictly read-only JSON/API metadata — never caches video/audio/binary streams or desktop traffic.
  if (
    MOBILE_API_ORIGINS.has(url.hostname) &&
    !/\.(mp4|m4v|mkv|webm|avi|mov|m3u8|ts|m4s|aac|mp3|m4a|ogg|wav|flac|zip|iso|swf|jsdos|pdf|epub|webp|jpg|jpeg|png|gif|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        if (!(await isMobileSuperCacheOn())) {
          return fetch(event.request);
        }
        const apiCache = await caches.open(CACHE_MOBILE_API);
        const cached = await apiCache.match(event.request, { ignoreVary: true });

        const refreshPromise = fetch(event.request)
          .then(async (response) => {
            if (response && response.ok) {
              await apiCache.put(event.request, response.clone());
              event.waitUntil(trimNamedCache(CACHE_MOBILE_API, 350));
            }
            return response;
          })
          .catch((err) => {
            if (cached) return cached;
            throw err;
          });

        if (cached) {
          event.waitUntil(refreshPromise);
          return cached;
        }
        return refreshPromise;
      })()
    );
    return;
  }

  // 2e. Mobile-Only Persistent Poster & Cover Cache (Cache-First, 30-day TTL, max 450 entries)
  if (
    MOBILE_POSTER_ORIGINS.has(url.hostname) &&
    (url.hostname !== 'pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev' ||
      /\.(webp|gif|jpg|jpeg|png|avif)$/i.test(url.pathname))
  ) {
    event.respondWith(
      (async () => {
        if (!(await isMobileSuperCacheOn())) {
          return fetch(event.request);
        }
        const posterCache = await caches.open(CACHE_MOBILE_POSTERS);
        const cached = await posterCache.match(event.request, { ignoreVary: true });
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (!cachedAt || Date.now() - parseInt(cachedAt, 10) < 30 * 24 * 60 * 60 * 1000) {
            return cached;
          }
        }
        try {
          const response = await fetch(event.request);
          if (response && response.ok) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('x-cached-at', Date.now().toString());
            const body = await cloned.blob();
            await posterCache.put(event.request, new Response(body, { headers }));
            event.waitUntil(trimNamedCache(CACHE_MOBILE_POSTERS, 450));
          } else if (response && response.type === 'opaque') {
            await posterCache.put(event.request, response.clone());
            event.waitUntil(trimNamedCache(CACHE_MOBILE_POSTERS, 450));
          }
          return response;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // 6. App Shell (JS/CSS/HTML) — network-first so redeploys self-heal,
  //    and NEVER cache a non-OK (e.g. 404) response.
  if (sameOrigin && (/\.(js|css|html)$/.test(url.pathname) || url.pathname === '/NL/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        try {
          const response = await fetch(event.request);
          if (response && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }
});
