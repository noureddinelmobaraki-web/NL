// NL Worker — broad-block-7bd7 (ملف واحد يُلصق في لوحة Cloudflare)
// Routes: / (Multi-Server Parallel Stream + Subtitle Harvester) · /embed · /proxy · /subs/search · /subs/file · /trailer/imdb · /meta/omdb · /tmdb/3/* · /health
// Secrets (اختيارية حسب المسار): WYZIE_KEY, OMDB_KEY, TMDB_KEY  | KV binding (اختياري ومستحسن): NL_CACHE
// Variable اختياري: ALLOWED_ORIGINS = "https://a.com,https://b.com"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://noureddinelmobaraki-web.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];
const MAX_PAGES = 6;
const EXTRACT_TIMEOUT_TOP_MS = 4200;
const EXTRACT_TIMEOUT_NESTED_MS = 3200;
const MAX_SUBTITLES = 24;
const SUB_URL_RE = /https?:\/\/[^\s"'<>\\]+\.(?:vtt|srt)(?:\?[^\s"'<>\\]*)?/gi;
const TRACK_TAG_RE = /<track\b[^>]*>/gi;
const JSON_TRACK_RE = /\{[^{}]{0,400}?["']?(?:file|src|url)["']?\s*:\s*["']([^"']+\.(?:vtt|srt)(?:\?[^"']*)?)["'][^{}]{0,400}?\}/gi;
const PLAYERJS_SUB_RE = /\[([^\]]{1,40})\](https?:\/\/[^\s"',\]]+\.(?:vtt|srt)(?:\?[^\s"',\]]*)?)/gi;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-NL-Stream-Type, X-NL-Upstream-Status, X-NL-Cache",
};

export default {
  async fetch(request, env, ctx) {
    const reqUrl = new URL(request.url);
    const workerOrigin = reqUrl.origin;
    const path = reqUrl.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
    }
    if (path === "/health") {
      return jsonResponse({
        ok: true,
        kvCache: Boolean(env.NL_CACHE),
        secrets: { wyzie: Boolean(env.WYZIE_KEY), omdb: Boolean(env.OMDB_KEY), tmdb: Boolean(env.TMDB_KEY) },
        time: new Date().toISOString(),
      });
    }
    if (!isAllowedCaller(request, env)) return jsonResponse({ error: "origin_not_allowed" }, 403);

    try {
      if (path === "/proxy" || path === "/webseed-proxy") return await handleProxy(request, reqUrl, workerOrigin);
      if (path === "/probe") return await handleStreamProbe(reqUrl, workerOrigin);
      if (path === "/torrent-cache") return await withCache(request, env, ctx, 86400, () => handleTorrentCache(reqUrl));
      if (path === "/streams/direct") return await withCache(request, env, ctx, 1800, () => handleDirectStreams(reqUrl, workerOrigin));
      if (path === "/subs/search") return await withCache(request, env, ctx, 3600, () => wyzieSearch(reqUrl, env, workerOrigin));
      if (path === "/subs/file") return await withCache(request, env, ctx, 86400, () => wyzieFile(reqUrl, env));
      if (path === "/trailer/imdb") return await withCache(request, env, ctx, 604800, () => imdbTrailer(reqUrl));
      if (path === "/meta/omdb") return await withCache(request, env, ctx, 86400, () => omdbMeta(reqUrl, env));
      if (path.startsWith("/tmdb/3/")) return await withCache(request, env, ctx, tmdbTtl(path), () => tmdbProxy(reqUrl, env));
      if (path === "/embed") return await handleEmbed(request, reqUrl, workerOrigin, env);
      if (path === "/books/trending") return await withCache(request, env, ctx, 10800, () => handleBooksTrending(reqUrl, workerOrigin));
      if (path === "/books/search") return await withCache(request, env, ctx, 1800, () => handleBooksSearch(reqUrl, workerOrigin));
      if (path === "/books/resolve") return await withCache(request, env, ctx, 21600, () => handleBooksResolve(reqUrl, workerOrigin));
      if (path === "/audiobooks/catalog") return await withCache(request, env, ctx, 7200, () => handleAudiobooksCatalog(reqUrl, workerOrigin));
      if (path === "/audiobooks/tracks") return await withCache(request, env, ctx, 43200, () => handleAudiobookTracks(reqUrl, workerOrigin));
      return await handleExtract(request, reqUrl, workerOrigin);
    } catch (err) {
      return jsonResponse({ error: "worker_failed", detail: String((err && err.message) || err) }, 502);
    }
  },
};

/* ---------------- أمان ---------------- */

function isAllowedOriginUrl(originStr, workerOrigin, list) {
  if (!originStr) return true;
  if (originStr === workerOrigin || list.includes(originStr)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originStr)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*(cloudflare\.com|workers\.dev)$/i.test(originStr)) return true;
  return false;
}

function isAllowedCaller(request, env) {
  const list = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ALLOWED_ORIGINS;
  const workerOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return isAllowedOriginUrl(origin, workerOrigin, list);
  const ref = request.headers.get("Referer");
  if (ref) {
    try {
      const refOrigin = new URL(ref).origin;
      return isAllowedOriginUrl(refOrigin, workerOrigin, list);
    } catch {
      return false;
    }
  }
  return true;
}

function safeTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h === "[::1]" || h.endsWith(".local") || h.endsWith(".internal") ||
      /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null;
  return u;
}

/* ---------------- كاش (KV إن وُجد، وإلا Cache API) ---------------- */

async function withCache(request, env, ctx, ttl, producer) {
  if (request.method !== "GET") return producer();
  const keyUrl = new URL(request.url);
  keyUrl.searchParams.sort();
  const k = keyUrl.pathname + "?" + keyUrl.searchParams.toString();

  if (env.NL_CACHE) {
    const { value, metadata } = await env.NL_CACHE.getWithMetadata(k, "arrayBuffer");
    if (value) {
      return new Response(value, {
        headers: { "Content-Type": (metadata && metadata.c) || "application/json; charset=utf-8",
                   "Cache-Control": `public, max-age=${ttl}`, "X-NL-Cache": "HIT", ...CORS },
      });
    }
  } else {
    const hit = await caches.default.match(new Request(keyUrl.toString()));
    if (hit) return hit;
  }

  const res = await producer();
  if (res.status === 200) {
    if (env.NL_CACHE) {
      const buf = await res.clone().arrayBuffer();
      const c = res.headers.get("Content-Type") || "text/plain; charset=utf-8";
      ctx.waitUntil(env.NL_CACHE.put(k, buf, { expirationTtl: Math.max(60, ttl), metadata: { c } }));
    } else {
      ctx.waitUntil(caches.default.put(new Request(keyUrl.toString()), res.clone()));
    }
  }
  return res;
}

/* ---------------- /proxy, /probe, /torrent-cache, /streams/direct ---------------- */

function buildUpstreamHeaders(targetUrl, referer, rangeHeader) {
  const h = new Headers({
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  });
  if (referer) {
    h.set("Referer", referer);
    try {
      h.set("Origin", new URL(referer).origin);
    } catch {}
  } else if (targetUrl) {
    h.set("Referer", targetUrl.origin + "/");
  }
  if (rangeHeader) {
    h.set("Range", rangeHeader);
  }
  return h;
}

async function fetchWithHeaderTimeout(url, init, timeoutMs = 14000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function handleProxy(request, reqUrl, workerOrigin) {
  const videoUrl = reqUrl.searchParams.get("videoUrl");
  const referer = reqUrl.searchParams.get("referer") || "";
  if (!videoUrl) return jsonResponse({ error: "missing_videoUrl" }, 400);

  const target = safeTarget(videoUrl);
  if (!target) return jsonResponse({ error: "invalid_target" }, 400);

  const rangeHeader = request.headers.get("Range") || "";
  const method = request.method === "HEAD" ? "HEAD" : "GET";

  let upstream;
  try {
    upstream = await fetchWithHeaderTimeout(
      target.href,
      {
        method,
        headers: buildUpstreamHeaders(target, referer, rangeHeader),
      },
      14000,
    );
  } catch (err) {
    return jsonResponse(
      { error: "upstream_unreachable", detail: String((err && err.message) || err) },
      502,
    );
  }

  if ((upstream.status === 403 || upstream.status === 503) && referer) {
    try {
      const minimalHeaders = new Headers({ "User-Agent": UA, Accept: "*/*" });
      if (rangeHeader) minimalHeaders.set("Range", rangeHeader);
      const retry = await fetchWithHeaderTimeout(
        target.href,
        { method, headers: minimalHeaders },
        10000,
      );
      if (retry.ok || retry.status === 206) {
        try { await upstream.body?.cancel(); } catch {}
        upstream = retry;
      } else {
        try { await retry.body?.cancel(); } catch {}
      }
    } catch {}
  }

  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  const isSubtitleFile =
    /\.(vtt|srt)(\?|$)/i.test(target.pathname) ||
    ct.includes("text/vtt") ||
    ct.includes("subrip");

  if (
    !isSubtitleFile &&
    (upstream.status >= 400 ||
      (ct.includes("text/html") && !/\.(m3u8|txt)(\?|$)/i.test(target.pathname)))
  ) {
    try { await upstream.body?.cancel(); } catch {}
    return jsonResponse(
      {
        error: "upstream_rejected_or_html",
        upstreamStatus: upstream.status,
        contentType: ct,
        target: target.hostname,
      },
      upstream.status >= 400 ? upstream.status : 502,
    );
  }

  if (
    rangeHeader &&
    !/^bytes=0-/i.test(rangeHeader) &&
    upstream.status === 200
  ) {
    try { await upstream.body?.cancel(); } catch {}
    return jsonResponse(
      { error: "range_ignored_by_upstream", upstreamStatus: 200 },
      502,
    );
  }

  const isKnownBinarySegment = /\.(mp4|mkv|webm|ts|m4s|aac|mp3|torrent)(\?|$)/i.test(target.pathname);
  const looksPlaylist =
    !isSubtitleFile &&
    (videoUrl.includes(".m3u8") ||
      ct.includes("mpegurl") ||
      ct.includes("m3u8") ||
      /\.(txt|m3u8)(\?|$)/i.test(target.pathname));

  const lenHeader = upstream.headers.get("Content-Length");
  const len = lenHeader ? parseInt(lenHeader, 10) : -1;
  const shouldSniffHead =
    method === "GET" &&
    (upstream.status === 200 || upstream.status === 206) &&
    !isSubtitleFile &&
    !rangeHeader &&
    (looksPlaylist || (!isKnownBinarySegment && (len === -1 || (len > 0 && len < 1_000_000))));

  if (shouldSniffHead) {
    const buf = await upstream.arrayBuffer();
    const head = new TextDecoder()
      .decode(buf.slice(0, 64))
      .replace(/^\uFEFF/, "")
      .trimStart();

    if (head.startsWith("#EXTM3U")) {
      const text = new TextDecoder().decode(buf);
      const base = new URL(upstream.url || target.href);
      return new Response(
        rewritePlaylist(text, base, workerOrigin, referer || target.origin + "/"),
        {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type": "application/vnd.apple.mpegurl",
            "X-NL-Stream-Type": "hls",
            "Cache-Control": "no-cache",
          },
        },
      );
    }

    const outHeaders = cleanHeaders(upstream.headers, true);
    outHeaders.set("X-NL-Stream-Type", "binary");
    outHeaders.set("X-NL-Upstream-Status", String(upstream.status));
    return new Response(buf, { status: upstream.status, headers: outHeaders });
  }

  const outHeaders = cleanHeaders(upstream.headers, false);
  outHeaders.set("X-NL-Stream-Type", looksPlaylist ? "hls" : "binary");
  outHeaders.set("X-NL-Upstream-Status", String(upstream.status));
  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

async function handleStreamProbe(reqUrl, workerOrigin) {
  const rawVideoUrl = reqUrl.searchParams.get("videoUrl") || "";
  const referer = reqUrl.searchParams.get("referer") || "";
  const target = safeTarget(rawVideoUrl);
  if (!target) return jsonResponse({ ok: false, kind: "invalid" }, 400);

  try {
    let res = await fetchWithHeaderTimeout(
      target.href,
      {
        method: "GET",
        headers: buildUpstreamHeaders(target, referer, "bytes=0-127"),
      },
      7500,
    );

    if ((res.status === 403 || res.status === 503) && referer) {
      try {
        const retry = await fetchWithHeaderTimeout(
          target.href,
          {
            method: "GET",
            headers: new Headers({ "User-Agent": UA, Accept: "*/*", Range: "bytes=0-127" }),
          },
          6000,
        );
        if (retry.ok || retry.status === 206) {
          try { await res.body?.cancel(); } catch {}
          res = retry;
        } else {
          try { await retry.body?.cancel(); } catch {}
        }
      } catch {}
    }

    const ct = (res.headers.get("Content-Type") || "").toLowerCase();
    const contentRange = res.headers.get("Content-Range") || "";
    const contentLength = parseInt(res.headers.get("Content-Length") || "0", 10);

    if (res.status >= 400) {
      try { await res.body?.cancel(); } catch {}
      return jsonResponse({
        ok: false,
        kind: "blocked",
        upstreamStatus: res.status,
        contentType: ct,
      });
    }

    const reader = res.body ? res.body.getReader() : null;
    const headChunk = reader ? await reader.read() : { value: new Uint8Array(0) };
    try { await reader?.cancel(); } catch {}
    const bytes = headChunk.value ? headChunk.value.subarray(0, 128) : new Uint8Array(0);
    const headText = new TextDecoder().decode(bytes).replace(/^\uFEFF/, "").trimStart();

    const proxiedUrl = `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(target.href)}&referer=${encodeURIComponent(referer || target.origin + "/")}`;

    if (headText.startsWith("#EXTM3U") || ct.includes("mpegurl") || ct.includes("m3u8")) {
      return jsonResponse({
        ok: true,
        kind: "hls",
        supportsRange: false,
        upstreamStatus: res.status,
        contentType: "application/vnd.apple.mpegurl",
        proxiedUrl,
      });
    }

    if (headText.startsWith("<!DOCTYPE") || headText.startsWith("<html") || ct.includes("text/html")) {
      return jsonResponse({
        ok: false,
        kind: "html_error",
        upstreamStatus: res.status,
        contentType: ct,
      });
    }

    let totalBytes = 0;
    const crMatch = contentRange.match(/\/(\d+)$/);
    if (crMatch) {
      totalBytes = parseInt(crMatch[1], 10);
    } else if (res.status === 200 && contentLength > 0) {
      totalBytes = contentLength;
    }

    const isMp4Magic =
      bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70;
    const isMkvMagic =
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3;

    const supportsRange = res.status === 206 || Boolean(crMatch);

    return jsonResponse({
      ok: true,
      kind: isMkvMagic ? "mkv" : "mp4",
      isVerifiedContainer: isMp4Magic || isMkvMagic || ct.startsWith("video/"),
      supportsRange,
      totalBytes,
      upstreamStatus: res.status,
      contentType: ct,
      proxiedUrl,
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      kind: "unreachable",
      detail: String((err && err.message) || err),
    });
  }
}

async function handleTorrentCache(reqUrl) {
  const hash = (
    reqUrl.searchParams.get("hash") ||
    reqUrl.searchParams.get("infoHash") ||
    ""
  ).trim().toUpperCase();
  const directTorrentUrl = (reqUrl.searchParams.get("torrentUrl") || "").trim();

  if (!/^[A-F0-9]{40}$/.test(hash) && !safeTarget(directTorrentUrl)) {
    return jsonResponse({ error: "invalid_infohash" }, 400);
  }

  const mirrors = [
    ...(safeTarget(directTorrentUrl) ? [directTorrentUrl] : []),
    ...(/^[A-F0-9]{40}$/.test(hash)
      ? [
          `https://itorrents.org/torrent/${hash}.torrent`,
          `https://btcache.me/torrent/${hash}`,
          `https://torrage.info/torrent.php?h=${hash}`,
        ]
      : []),
  ];

  for (const url of mirrors) {
    try {
      const r = await fetchWithHeaderTimeout(
        url,
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/x-bittorrent,application/octet-stream;q=0.9,*/*;q=0.1",
            Referer: new URL(url).origin + "/",
          },
        },
        6000,
      );
      if (!r.ok) {
        try { await r.body?.cancel(); } catch {}
        continue;
      }
      const ct = (r.headers.get("Content-Type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        try { await r.body?.cancel(); } catch {}
        continue;
      }
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 64 || buf.byteLength > 12 * 1024 * 1024) continue;
      const u8 = new Uint8Array(buf);
      const ascii = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 4096)));
      if (u8[0] !== 0x64 || !ascii.includes("4:info")) continue;

      return new Response(buf, {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "application/x-bittorrent",
          "Content-Disposition": `attachment; filename="${hash || "movie"}.torrent"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {}
  }

  return jsonResponse({ error: "torrent_not_found_in_caches", hash }, 404);
}

async function handleDirectStreams(reqUrl, workerOrigin) {
  const imdbId = (reqUrl.searchParams.get("imdbId") || "").trim();
  const tmdbId = (reqUrl.searchParams.get("tmdbId") || "").trim();
  const type = reqUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = parseInt(reqUrl.searchParams.get("season") || "1", 10) || 1;
  const episode = parseInt(reqUrl.searchParams.get("episode") || "1", 10) || 1;
  const title = (reqUrl.searchParams.get("title") || "").trim();
  const year = (reqUrl.searchParams.get("year") || "").trim();

  const tasks = [
    resolveInternetArchiveDirect(imdbId, title, year, workerOrigin),
    resolveVixsrcHls(tmdbId, type, season, episode, workerOrigin),
    resolveTorrentioStreams(imdbId, type, season, episode, workerOrigin),
  ];

  if (type === "movie" && (imdbId || title)) {
    tasks.push(resolveYtsTorrents(imdbId, title, year, workerOrigin));
  }

  const settled = await Promise.allSettled(tasks);
  const directStreams = [];
  const torrents = [];
  const subtitles = [];

  for (const item of settled) {
    if (item.status !== "fulfilled" || !item.value) continue;
    if (Array.isArray(item.value.streams)) directStreams.push(...item.value.streams);
    if (Array.isArray(item.value.torrents)) torrents.push(...item.value.torrents);
    if (Array.isArray(item.value.subtitles)) subtitles.push(...item.value.subtitles);
  }

  return jsonResponse({
    imdbId,
    tmdbId,
    type,
    directStreams,
    torrents,
    subtitles,
  });
}

async function resolveYtsTorrents(imdbId, title, year, workerOrigin) {
  const mirrors = [
    "https://movies-api.accel.li/api/v2",
    "https://yts.gg/api/v2",
    "https://yts.mx/api/v2",
  ];
  const queryTerm = /^tt\d{5,10}$/.test(imdbId) ? imdbId : title;
  if (!queryTerm) return { torrents: [] };

  const collectedMovies = [];
  for (const base of mirrors) {
    try {
      const listRes = await fetchWithHeaderTimeout(
        `${base}/list_movies.json?query_term=${encodeURIComponent(queryTerm)}&with_rt_ratings=true&limit=10`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        4500,
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const movies = listData?.data?.movies;
        if (Array.isArray(movies) && movies.length > 0) {
          collectedMovies.push(...movies);
          const firstId = movies[0]?.id;
          if (firstId) {
            try {
              const detRes = await fetchWithHeaderTimeout(
                `${base}/movie_details.json?movie_id=${encodeURIComponent(String(firstId))}&with_images=true&with_cast=true`,
                { headers: { "User-Agent": UA, Accept: "application/json" } },
                4000,
              );
              if (detRes.ok) {
                const detData = await detRes.json();
                if (detData?.data?.movie) collectedMovies.push(detData.data.movie);
              }
            } catch {}
          }
          break;
        }
      }
    } catch {}
  }

  const seenHashes = new Set();
  const torrents = [];
  for (const movie of collectedMovies) {
    for (const t of movie?.torrents || []) {
      if (!t || !t.hash || !/^[a-fA-F0-9]{40}$/.test(t.hash)) continue;
      const hash = String(t.hash).toUpperCase();
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      const codecTag = t.video_codec === "x265" ? "x265.10bit" : t.video_codec || "x264";
      const directTorrentParam = t.url ? `&torrentUrl=${encodeURIComponent(t.url)}` : "";

      torrents.push({
        infoHash: hash,
        title: `${movie.title_long || movie.title}.${t.quality}.${(t.type || "WEB").toUpperCase()}.${codecTag}-YTS.GG`,
        quality: t.quality || "1080p",
        videoCodec: t.video_codec === "x265" ? "H.265 / HEVC" : "H.264",
        audioChannels: t.audio_channels || "2.0",
        bitDepth: t.bit_depth === "10" ? "10-bit" : undefined,
        seeds: Number(t.seeds) || 0,
        peers: Number(t.peers) || 0,
        sizeLabel: t.size || "",
        sizeBytes: Number(t.size_bytes) || 0,
        directTorrentUrl: t.url || undefined,
        torrentFileUrl: `${workerOrigin}/torrent-cache?hash=${hash}${directTorrentParam}`,
      });
    }
  }

  return { torrents };
}

async function resolveInternetArchiveDirect(imdbId, title, year, workerOrigin) {
  if (!title && !imdbId) return { streams: [] };
  try {
    const qParts = [];
    if (imdbId && /^tt\d+$/i.test(imdbId)) {
      qParts.push(`(external-identifier:"urn:imdb:${imdbId}" OR "${imdbId}")`);
    } else if (title) {
      qParts.push(`title:("${title.replace(/"/g, "")}")`);
      if (year) qParts.push(`year:(${year})`);
    }
    qParts.push(`mediatype:(movies)`);
    const q = qParts.join(" AND ");
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier,title&rows=3&page=1&output=json`;
    const r = await fetchWithHeaderTimeout(searchUrl, { headers: { "User-Agent": UA, Accept: "application/json" } }, 4500);
    if (!r.ok) return { streams: [] };
    const data = await r.json();
    const docs = data?.response?.docs || [];
    const streams = [];
    for (const doc of docs.slice(0, 2)) {
      if (!doc?.identifier) continue;
      const metaRes = await fetchWithHeaderTimeout(
        `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        4500,
      );
      if (!metaRes.ok) continue;
      const meta = await metaRes.json();
      const files = Array.isArray(meta?.files) ? meta.files : [];
      const videoFile = files.find(
        (f) => f?.name && /\.(mp4|mkv)$/i.test(f.name) && !/sample|thumb|trailer/i.test(f.name) && Number(f.size) > 25 * 1024 * 1024,
      );
      if (!videoFile) continue;
      const directUrl = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(videoFile.name)}`;
      streams.push({
        id: `ia-${doc.identifier}`,
        server: "Internet Archive Direct",
        quality: /1080/i.test(videoFile.name) ? "1080p" : "720p",
        type: /\.mkv$/i.test(videoFile.name) ? "mkv" : "mp4",
        supportsByteRange: true,
        sizeBytes: Number(videoFile.size) || 0,
        referer: "https://archive.org/",
        directUrl,
        proxiedUrl: `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(directUrl)}&referer=${encodeURIComponent("https://archive.org/")}`,
      });
    }
    return { streams };
  } catch {
    return { streams: [] };
  }
}

async function resolveVixsrcHls(tmdbId, type, season, episode, workerOrigin) {
  if (!tmdbId) return { streams: [] };
  try {
    const pageUrl =
      type === "tv"
        ? `https://vixsrc.to/tv/${encodeURIComponent(tmdbId)}/${season}/${episode}`
        : `https://vixsrc.to/movie/${encodeURIComponent(tmdbId)}`;
    const r = await fetchWithHeaderTimeout(pageUrl, { headers: { "User-Agent": UA, Referer: "https://vixsrc.to/" } }, 4500);
    if (!r.ok) return { streams: [] };
    const html = await r.text();
    const m3u8Match = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?/i);
    if (!m3u8Match) return { streams: [] };
    const directUrl = m3u8Match[0];
    return {
      streams: [
        {
          id: `vixsrc-${tmdbId}`,
          server: "VixSrc Direct HLS",
          quality: "1080p",
          type: "hls",
          supportsByteRange: false,
          referer: pageUrl,
          directUrl,
          proxiedUrl: `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(directUrl)}&referer=${encodeURIComponent(pageUrl)}`,
        },
      ],
    };
  } catch {
    return { streams: [] };
  }
}

async function resolveTorrentioStreams(imdbId, type, season, episode, workerOrigin) {
  if (!/^tt\d{5,10}$/i.test(imdbId)) return { torrents: [] };
  try {
    const path =
      type === "tv"
        ? `series/${imdbId}:${season}:${episode}.json`
        : `movie/${imdbId}.json`;
    const r = await fetchWithHeaderTimeout(
      `https://torrentio.strem.fun/sort=seeders/${path}`,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      5000,
    );
    if (!r.ok) return { torrents: [] };
    const data = await r.json();
    const list = Array.isArray(data?.streams) ? data.streams : [];
    const torrents = [];
    for (const s of list.slice(0, 15)) {
      if (!s?.infoHash || !/^[0-9a-fA-F]{40}$/.test(s.infoHash)) continue;
      const hash = String(s.infoHash).toUpperCase();
      const rawTitle = `${s.name || ""} ${s.title || ""}`.replace(/\r?\n/g, " ").trim();
      const seedMatch = rawTitle.match(/👤\s*(\d+)/);
      const sizeMatch = rawTitle.match(/💾\s*([\d.]+\s*(?:GB|MB))/i);
      const qMatch = rawTitle.match(/\b(2160p|4k|1080p|720p|480p)\b/i);
      torrents.push({
        infoHash: hash,
        title: rawTitle,
        quality: qMatch ? (qMatch[1].toLowerCase() === "4k" ? "2160p" : qMatch[1].toLowerCase()) : "1080p",
        seeds: seedMatch ? parseInt(seedMatch[1], 10) : 10,
        sizeLabel: sizeMatch ? sizeMatch[1] : "",
        fileIdx: typeof s.fileIdx === "number" ? s.fileIdx : undefined,
        torrentFileUrl: `${workerOrigin}/torrent-cache?hash=${hash}`,
      });
    }
    return { torrents };
  } catch {
    return { torrents: [] };
  }
}

function rewritePlaylist(text, base, workerOrigin, referer) {
  const wrap = (abs) => `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(abs)}&referer=${encodeURIComponent(referer)}`;
  return text.split("\n").map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith("#")) {
      return t.replace(/URI="([^"]+)"/g, (m, uri) => {
        try { return `URI="${wrap(new URL(uri, base).href)}"`; } catch { return m; }
      });
    }
    try { return wrap(new URL(t, base).href); } catch { return line; }
  }).join("\n");
}

function cleanHeaders(src, dropLength) {
  const h = new Headers(src);
  ["set-cookie", "content-security-policy", "content-security-policy-report-only", "x-frame-options",
   "strict-transport-security", "report-to", "nel"].forEach((k) => h.delete(k));
  for (const k of [...h.keys()]) if (k.startsWith("access-control-")) h.delete(k);
  if (dropLength) { h.delete("content-length"); h.delete("content-encoding"); }
  Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
  return h;
}

/* ---------------- /embed (Optional HTMLRewriter Bridge) ---------------- */

const EMBED_HOST_ALLOW = /^(.*\.)?(vidlink\.pro|streamimdb\.ru|imdb\.su|2embed\.cc|2embed\.skin|2vcdn\.skin|multiembed\.mov|streamingnow\.mov|vidsrc\.[a-z]+|vidplay\.[a-z]+|filemoon\.[a-z]+|streamtape\.[a-z]+|dood\.[a-z]+|mixdrop\.[a-z]+|rabbitstream\.net|megacloud\.tv|dokicloud\.one|embed\.su)$/i;
const EMBED_AD_HOST_RE = /google|facebook|doubleclick|googlesyndication|recaptcha|popads|onclickads|acscdn|adsco|histats|exoclick|juicyads|propellerads|adsterra|clickadu|hilltopads/i;

const NL_BRIDGE_JS = `(function(){try{if(window.__nlBridge)return;window.__nlBridge=1;var WORKER=__WORKER_ORIGIN__,PARENT=__PARENT_ORIGIN__,DEPTH=__DEPTH__;function wrap(u){try{if(!u||typeof u!=="string")return u;var a=new URL(u,document.baseURI);if(!/^https?:$/.test(a.protocol))return u;if(a.origin===WORKER)return u;if(/google|facebook|doubleclick|googlesyndication|recaptcha/i.test(a.hostname))return u;if(DEPTH>=3)return u;return WORKER+"/embed?url="+encodeURIComponent(a.href)+"&parent="+encodeURIComponent(PARENT)+"&depth="+(DEPTH+1)+"&ref="+encodeURIComponent(document.baseURI)}catch(e){return u}}try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,enumerable:desc.enumerable,get:desc.get,set:function(v){try{return desc.set.call(this,wrap(v))}catch(e){}}})}}catch(e){}var origSetAttr=null;try{origSetAttr=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){try{if(this&&this.tagName==="IFRAME"&&String(name).toLowerCase()==="src")value=wrap(value)}catch(e){}return origSetAttr.call(this,name,value)}}catch(e){}function wrapFrameEl(f){try{if(!f||f.tagName!=="IFRAME")return;var raw=f.getAttribute("src");if(raw){var w=wrap(raw);if(w!==raw){if(origSetAttr)origSetAttr.call(f,"src",w);else f.setAttribute("src",w)}}}catch(e){}}function wrapAllFrames(){try{var fs=document.getElementsByTagName("iframe");for(var j=0;j<fs.length;j++)wrapFrameEl(fs[j])}catch(e){}}try{var mo=new MutationObserver(function(muts){try{for(var i=0;i<muts.length;i++){var added=muts[i].addedNodes;if(!added)continue;for(var k=0;k<added.length;k++){var n=added[k];if(!n||n.nodeType!==1)continue;if(n.tagName==="IFRAME")wrapFrameEl(n);else if(n.getElementsByTagName){var ifs=n.getElementsByTagName("iframe");for(var m=0;m<ifs.length;m++)wrapFrameEl(ifs[m])}}}}catch(e){}});mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}wrapAllFrames();if(DEPTH!==0)return;var cur=null,seq=0,last=0,sentTracks="";var EVS=["loadedmetadata","durationchange","play","playing","pause","waiting","seeked","timeupdate","ratechange","ended"];function allVideos(win,out,lvl){if(lvl>4)return out;try{var vs=win.document.getElementsByTagName("video");for(var i=0;i<vs.length;i++)out.push(vs[i]);for(var j=0;j<win.frames.length;j++)allVideos(win.frames[j],out,lvl+1);}catch(e){}return out;}function score(v){var d=v.duration,s=0;if(isFinite(d)&&d>600)s+=100;else if(isFinite(d)&&d>120)s+=40;else if(d===Infinity)s+=15;if(v.readyState>0)s+=10;if(!v.paused)s+=5;try{var r=v.getBoundingClientRect();s+=Math.min(30,r.width*r.height/30000);}catch(e){}return s;}function post(m){m.__nl=1;try{window.parent.postMessage(m,PARENT);}catch(e){}}function send(ev){if(!cur)return;var now=Date.now();if(ev==="timeupdate"&&now-last<500)return;last=now;var d=cur.duration;post({type:"NL_STATE",ev:ev,t:cur.currentTime||0,d:isFinite(d)&&d>0?d:0,paused:cur.paused,rate:cur.playbackRate||1,seq:++seq});}function onEv(e){if(e.target===cur)send(e.type);}function sendTracks(){try{var list=[],ts=cur.querySelectorAll("track[src]");for(var i=0;i<ts.length;i++)list.push({url:new URL(ts[i].getAttribute("src"),cur.ownerDocument.baseURI).href,lang:ts[i].srclang||"",label:ts[i].label||""});var k=JSON.stringify(list);if(list.length&&k!==sentTracks){sentTracks=k;post({type:"NL_TRACKS",tracks:list,referer:cur.ownerDocument.baseURI});}}catch(e){}}function tryPlay(v){try{if(!v)return;var p=v.play();if(p&&p.catch)p.catch(function(){try{v.muted=true;var p2=v.play();if(p2&&p2.catch)p2.catch(function(){});}catch(x){}});}catch(e){}}function pick(){var vs=allVideos(window,[],0),best=null,bs=-1;for(var i=0;i<vs.length;i++){var s=score(vs[i]);if(s>bs){bs=s;best=vs[i];}}if(best&&best!==cur&&(!cur||bs>score(cur)+5)){cur=best;if(!best.__nlBound){best.__nlBound=1;EVS.forEach(function(ev){best.addEventListener(ev,onEv,true);});if(best.paused)tryPlay(best);}post({type:"NL_READY"});send("bind");}if(cur)sendTracks();}function seekTo(t){var w=cur.ownerDocument.defaultView;try{if(typeof w.jwplayer==="function"){var jp=w.jwplayer();if(jp&&jp.seek){jp.seek(t);return;}}}catch(e){}try{if(w.videojs&&w.videojs.getPlayers){var ps=w.videojs.getPlayers();for(var k in ps){var p=ps[k];if(p&&p.el&&p.el().contains(cur)){p.currentTime(t);return;}}}}catch(e){}try{if(cur.plyr){cur.plyr.currentTime=t;return;}}catch(e){}cur.currentTime=t;}window.addEventListener("message",function(e){if(e.source!==window.parent||e.origin!==PARENT)return;var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d);}catch(x){return;}}if(!d||d.__nl!==1||d.type!=="NL_CMD"||!cur)return;try{if(d.cmd==="seek"&&typeof d.t==="number")seekTo(Math.max(0,d.t));else if(d.cmd==="play"){var p=cur.play();p&&p.catch&&p.catch(function(){});}else if(d.cmd==="pause")cur.pause();else if(d.cmd==="rate"&&d.v>0)cur.playbackRate=d.v;else if(d.cmd==="hideNativeSubs"){for(var i=0;i<cur.textTracks.length;i++)cur.textTracks[i].mode="disabled";}}catch(x){}if(d.id)setTimeout(function(){var dur=cur?cur.duration:0;post({type:"NL_ACK",id:d.id,t:cur?cur.currentTime||0:0,d:isFinite(dur)&&dur>0?dur:0,paused:cur?!!cur.paused:false});send("ack");},60);});setInterval(pick,1000);pick();}catch(e){}})();`;

function cleanEmbedHeaders(src, parentOrigin, workerOrigin) {
  const h = cleanHeaders(src, true);
  h.set("Content-Security-Policy", `frame-ancestors 'self' ${parentOrigin} ${workerOrigin};`);
  return h;
}

async function handleEmbed(request, reqUrl, workerOrigin, env) {
  const rawUrl = reqUrl.searchParams.get("url") || "";
  const parentOrigin = reqUrl.searchParams.get("parent") || "";
  const refParam = reqUrl.searchParams.get("ref") || "";
  const depth = parseInt(reqUrl.searchParams.get("depth") || "0", 10);
  if (!Number.isFinite(depth) || depth < 0 || depth > 3) {
    return jsonResponse({ error: "bad_depth" }, 400);
  }
  const allowedList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : DEFAULT_ALLOWED_ORIGINS;
  if (!parentOrigin || !isAllowedOriginUrl(parentOrigin, workerOrigin, allowedList)) {
    return jsonResponse({ error: "bad_parent" }, 403);
  }
  const target = safeTarget(rawUrl);
  if (!target) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (depth === 0) {
    if (!EMBED_HOST_ALLOW.test(target.hostname)) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  } else {
    if (target.protocol !== "https:") {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
    const reqRef = request.headers.get("Referer") || "";
    let refOrigin = "";
    try { refOrigin = new URL(reqRef).origin; } catch {}
    if (refOrigin !== workerOrigin) {
      return jsonResponse({ error: "host_not_allowed" }, 403);
    }
  }

  let upstreamReferer = target.origin + "/";
  if (depth >= 1 && refParam) {
    const validRef = safeTarget(refParam);
    if (validRef) upstreamReferer = validRef.href;
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: upstreamReferer,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return Response.redirect(target.href, 302);
  }

  if (!upstream.ok || upstream.status === 403 || upstream.status === 503) {
    return Response.redirect(target.href, 302);
  }

  const ct = (upstream.headers.get("Content-Type") || "").toLowerCase();
  if (!ct.includes("text/html")) {
    return Response.redirect(target.href, 302);
  }

  const finalBaseHref = new URL(upstream.url || target.href).href;
  const bridgeScript = NL_BRIDGE_JS
    .replace(/__WORKER_ORIGIN__/g, JSON.stringify(workerOrigin))
    .replace(/__PARENT_ORIGIN__/g, JSON.stringify(parentOrigin))
    .replace(/__DEPTH__/g, String(depth));

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(el) {
        el.prepend(
          `<base href="${finalBaseHref.replace(/"/g, "&quot;")}"><script>${bridgeScript}</script>`,
          { html: true },
        );
      },
    })
    .on("iframe[src]", {
      element(el) {
        if (depth >= 3) return;
        const srcAttr = el.getAttribute("src");
        if (!srcAttr) return;
        try {
          const abs = new URL(srcAttr, finalBaseHref);
          if (
            abs.protocol === "https:" &&
            abs.origin !== workerOrigin &&
            safeTarget(abs.href) &&
            !EMBED_AD_HOST_RE.test(abs.hostname)
          ) {
            const wrapped = `${workerOrigin}/embed?url=${encodeURIComponent(abs.href)}&parent=${encodeURIComponent(parentOrigin)}&depth=${depth + 1}&ref=${encodeURIComponent(finalBaseHref)}`;
            el.setAttribute("src", wrapped);
          }
        } catch {}
      },
    });

  return rewriter.transform(
    new Response(upstream.body, {
      status: upstream.status,
      headers: cleanEmbedHeaders(upstream.headers, parentOrigin, workerOrigin),
    }),
  );
}

/* ---------------- / (Multi-Server Parallel Harvester: Video + Cross-Server Subtitles) ---------------- */

function unpackDeanEdwards(html) {
  const unpackedChunks = [];
  const packerRe = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\}\(\s*'((?:\\.|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'])*)'\.split\('\|'\)/g;
  let m;
  while ((m = packerRe.exec(html)) !== null) {
    try {
      let p = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      const a = parseInt(m[2], 10);
      let c = parseInt(m[3], 10);
      const k = m[4].split("|");
      if (!a || !c || k.length === 0) continue;
      const encodeBase = (num) => {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (num < a) return num < 36 ? num.toString(36) : chars[num];
        return encodeBase(Math.floor(num / a)) + (num % a < 36 ? (num % a).toString(36) : chars[num % a]);
      };
      while (c--) {
        if (k[c]) {
          const token = encodeBase(c);
          p = p.replace(new RegExp("\\b" + token + "\\b", "g"), k[c]);
        }
      }
      unpackedChunks.push(p);
    } catch {}
  }
  return unpackedChunks.join("\n");
}

function tagAttr(tag, name) {
  const m = tag.match(new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"));
  return m ? m[1] : "";
}

function labelFromBlock(block) {
  const m = block.match(/["']?(?:label|name|language|lang)["']?\s*:\s*["']([^"']{1,40})["']/i);
  return m ? m[1] : "";
}

function collectSubtitles(html, decodedHtml, baseUrl, out) {
  let m;
  TRACK_TAG_RE.lastIndex = 0;
  while ((m = TRACK_TAG_RE.exec(html)) !== null) {
    const tag = m[0];
    const kind = tagAttr(tag, "kind").toLowerCase();
    if (kind && kind !== "subtitles" && kind !== "captions") continue;
    const src = tagAttr(tag, "src");
    if (!src) continue;
    try {
      const abs = new URL(src, baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, {
          url: abs,
          lang: tagAttr(tag, "srclang"),
          label: tagAttr(tag, "label"),
          default: /\bdefault\b/i.test(tag),
          referer: baseUrl,
        });
      }
    } catch (e) {}
  }

  PLAYERJS_SUB_RE.lastIndex = 0;
  while ((m = PLAYERJS_SUB_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[2].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: m[1].trim(), referer: baseUrl });
      }
    } catch (e) {}
  }

  JSON_TRACK_RE.lastIndex = 0;
  while ((m = JSON_TRACK_RE.exec(decodedHtml)) !== null) {
    try {
      const abs = new URL(m[1].replace(/\\\//g, "/"), baseUrl).href;
      if (!out.has(abs)) {
        out.set(abs, { url: abs, lang: "", label: labelFromBlock(m[0]), referer: baseUrl });
      }
    } catch (e) {}
  }

  for (const raw of decodedHtml.match(SUB_URL_RE) || []) {
    const u = raw.replace(/\\\//g, "/");
    if (!out.has(u)) out.set(u, { url: u, lang: "", label: "", referer: baseUrl });
  }
}

function expandMultiServerCandidates(urls) {
  const expanded = [];
  const seen = new Set();
  for (const raw of urls) {
    if (typeof raw !== "string" || !safeTarget(raw)) continue;
    if (!seen.has(raw)) {
      seen.add(raw);
      expanded.push(raw);
    }
    // Automatically add SuperEmbed VIP directstream.php endpoint when multiembed.mov is in the list
    try {
      const u = new URL(raw);
      if (u.hostname.includes("multiembed.mov") && u.pathname === "/") {
        const vipUrl = `https://multiembed.mov/directstream.php${u.search}`;
        if (!seen.has(vipUrl)) {
          seen.add(vipUrl);
          expanded.push(vipUrl);
        }
      }
    } catch {}
  }
  return expanded.slice(0, MAX_PAGES);
}

async function handleExtract(request, reqUrl, workerOrigin) {
  let targetUrls = [];
  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (Array.isArray(body.urls)) targetUrls = body.urls;
      else if (body.url) targetUrls = [body.url];
    } catch (e) {
      return jsonResponse({ error: "صيغة JSON غير صالحة في طلب POST" }, 400);
    }
  } else {
    const single = reqUrl.searchParams.get("url");
    const multi = reqUrl.searchParams.get("urls");
    if (single) targetUrls.push(single);
    if (multi) targetUrls.push(...multi.split(",").map((u) => u.trim()).filter(Boolean));
  }
  targetUrls = expandMultiServerCandidates(targetUrls);

  if (targetUrls.length === 0) {
    return jsonResponse({
      usage: {
        single_url: `${workerOrigin}/?url=https://example.com/page`,
        multiple_urls_get: `${workerOrigin}/?urls=https://site1.com,https://site2.com`,
        multiple_urls_post: `POST ${workerOrigin}/ with JSON body: { "urls": ["https://site1.com"] }`,
        direct_proxy: `${workerOrigin}/proxy?videoUrl=https://cdn.site.com/video.m3u8&referer=https://site.com`,
      },
    }, 400);
  }

  const allResults = await Promise.all(targetUrls.map((u) => extractFromPage(u, workerOrigin)));

  // Cross-Server Subtitle Fusion: pool subtitles discovered from ANY server and attach them to all extracted streams
  const globalSubsMap = new Map();
  for (const res of allResults) {
    for (const s of res.subtitles || []) {
      if (s && s.url && !globalSubsMap.has(s.url)) {
        globalSubsMap.set(s.url, s);
      }
    }
  }
  const pooledSubs = Array.from(globalSubsMap.values()).slice(0, MAX_SUBTITLES);
  for (const res of allResults) {
    if (Array.isArray(res.videos) && res.videos.length > 0 && pooledSubs.length > 0) {
      const localUrls = new Set((res.subtitles || []).map((s) => s.url));
      res.subtitles = [
        ...(res.subtitles || []),
        ...pooledSubs.filter((s) => !localUrls.has(s.url)),
      ];
    }
  }

  return jsonResponse({ total_pages: allResults.length, results: allResults.length === 1 ? allResults[0] : allResults });
}

async function extractFromPage(targetUrl, workerOrigin, depth = 0) {
  const extractedLinks = new Set();
  const linkReferer = new Map();
  const discoveredIframes = new Set();
  const subtitles = new Map();
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: new URL(targetUrl).origin + "/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(depth === 0 ? EXTRACT_TIMEOUT_TOP_MS : EXTRACT_TIMEOUT_NESTED_MS),
    });
    if (!response.ok) return { source: targetUrl, error: `HTTP ${response.status}`, videos: [], subtitles: [] };
    const finalPageUrl = response.url || targetUrl;
    const html = await response.text();

    let decodedHtml = html;
    try { decodedHtml += "\n" + decodeURIComponent(html); } catch (e) {}
    const unpacked = unpackDeanEdwards(html);
    if (unpacked) decodedHtml += "\n" + unpacked;
    for (const b64 of html.match(/aHR0c[A-Za-z0-9+/=]{15,}/g) || []) {
      try { decodedHtml += "\n" + atob(b64); } catch (e) {}
    }
    for (const raw of decodedHtml.match(/https?:\/\/[^\s"'<>\\`]+\.(?:m3u8|mp4|mpd)(?:\?[^\s"'<>\\`]*)?/gi) || []) {
      const clean = raw.replace(/\\\//g, "/");
      extractedLinks.add(clean);
      if (!linkReferer.has(clean)) linkReferer.set(clean, finalPageUrl);
    }
    const relativeRegex = /(?:src|file|url|source|stream)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mpd)(?:\?[^"']*)?)["']/gi;
    let m;
    while ((m = relativeRegex.exec(decodedHtml)) !== null) {
      try {
        const abs = new URL(m[1].replace(/\\\//g, "/"), finalPageUrl).href;
        extractedLinks.add(abs);
        if (!linkReferer.has(abs)) linkReferer.set(abs, finalPageUrl);
      } catch (e) {}
    }
    collectSubtitles(html, decodedHtml, finalPageUrl, subtitles);

    if (depth === 0) {
      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let im;
      while ((im = iframeRegex.exec(html)) !== null) {
        try {
          const src = new URL(im[1], finalPageUrl).href;
          if (safeTarget(src) && !EMBED_AD_HOST_RE.test(new URL(src).hostname)) discoveredIframes.add(src);
        } catch (e) {}
      }
      const list = Array.from(discoveredIframes).slice(0, 3);
      const sub = await Promise.all(list.map((u) => extractFromPage(u, workerOrigin, depth + 1)));
      sub.forEach((r) => {
        (r.videos || []).forEach((v) => {
          extractedLinks.add(v.directUrl);
          if (!linkReferer.has(v.directUrl)) linkReferer.set(v.directUrl, r.source);
        });
        (r.subtitles || []).forEach((s) => {
          if (!subtitles.has(s.url)) subtitles.set(s.url, s);
        });
      });
    }

    const videos = Array.from(extractedLinks).map((videoUrl) => {
      const ref = linkReferer.get(videoUrl) || finalPageUrl;
      return {
        type: videoUrl.includes(".m3u8") ? "hls" : videoUrl.includes(".mpd") ? "dash" : "mp4",
        directUrl: videoUrl,
        proxiedUrl: `${workerOrigin}/proxy?videoUrl=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent(ref)}`,
      };
    });
    const subs = Array.from(subtitles.values()).slice(0, MAX_SUBTITLES).map((s) => ({
      url: s.url,
      lang: s.lang || "",
      label: s.label || "",
      default: Boolean(s.default),
      referer: s.referer || finalPageUrl,
    }));
    return {
      source: targetUrl,
      count: videos.length,
      iframes_scanned: Array.from(discoveredIframes).slice(0, 3),
      videos,
      subtitles: subs,
    };
  } catch (error) {
    return { source: targetUrl, error: error.message, videos: [], subtitles: [] };
  }
}

/* ---------------- الترجمة (Wyzie) ---------------- */

async function wyzieSearch(url, env, workerOrigin) {
  if (!env.WYZIE_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const up = new URL("https://sub.wyzie.io/search");
  for (const k of ["id", "language", "season", "episode", "format", "source"]) {
    const v = url.searchParams.get(k);
    if (v) up.searchParams.set(k, v.slice(0, 200));
  }
  if (!/^(tt\d{5,10}|\d{1,9})$/.test(up.searchParams.get("id") || "")) return jsonResponse({ error: "bad_id" }, 400);
  up.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  if (r.status === 404) return jsonResponse([], 200, 1800);
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  const data = await r.json();
  const list = Array.isArray(data) ? data : data.subtitles || data.results || [];
  return jsonResponse(list.map((item) => {
    if (!item || typeof item.url !== "string") return item;
    try {
      const u = new URL(item.url);
      u.searchParams.delete("key");
      const prox = new URL("/subs/file", workerOrigin);
      prox.searchParams.set("url", u.toString());
      return { ...item, url: prox.toString() };
    } catch { return item; }
  }), 200, 3600);
}

async function wyzieFile(url, env) {
  let u;
  try { u = new URL(url.searchParams.get("url") || ""); } catch { return jsonResponse({ error: "bad_url" }, 400); }
  if (u.protocol !== "https:" || !(u.hostname === "sub.wyzie.io" || u.hostname.endsWith(".wyzie.io"))) {
    return jsonResponse({ error: "host_not_allowed" }, 403);
  }
  if (env.WYZIE_KEY) u.searchParams.set("key", env.WYZIE_KEY);
  const r = await fetch(u.toString());
  if (!r.ok) return jsonResponse({ error: `wyzie_${r.status}` }, 502);
  return new Response(await r.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": r.headers.get("Content-Type") || "text/plain; charset=utf-8",
               "Cache-Control": "public, max-age=86400", ...CORS },
  });
}

/* ---------------- تريلر IMDb (غير رسمي) ---------------- */

async function imdbTrailer(url) {
  const id = url.searchParams.get("id") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.imdb.com/title/${id}/`, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 202 || !r.ok) return jsonResponse({ error: `imdb_${r.status}` }, 502);
  const html = await r.text();
  const match = html.match(/\/video\/(vi\d{6,12})/);
  if (!match) return jsonResponse({ error: "no_video" }, 404);
  return jsonResponse({ source: "imdb", videoId: match[1], embedUrl: `https://www.imdb.com/video/embed/${match[1]}/` }, 200, 604800);
}

/* ---------------- معلومات إضافية (OMDb) ---------------- */

async function omdbMeta(url, env) {
  if (!env.OMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  const id = url.searchParams.get("i") || "";
  if (!/^tt\d{5,10}$/.test(id)) return jsonResponse({ error: "bad_id" }, 400);
  const r = await fetch(`https://www.omdbapi.com/?i=${id}&plot=short&apikey=${env.OMDB_KEY}`);
  if (!r.ok) return jsonResponse({ error: `omdb_${r.status}` }, 502);
  const d = await r.json();
  if (d.Response === "False") return jsonResponse({ error: "not_found" }, 404);
  const val = (v) => (v && v !== "N/A" ? v : undefined);
  const rt = (d.Ratings || []).find((x) => x.Source === "Rotten Tomatoes");
  return jsonResponse({
    imdbId: id, imdbRating: val(d.imdbRating), imdbVotes: val(d.imdbVotes), metascore: val(d.Metascore),
    rottenTomatoes: val(rt && rt.Value), rated: val(d.Rated), runtime: val(d.Runtime), awards: val(d.Awards),
    boxOffice: val(d.BoxOffice), director: val(d.Director), writer: val(d.Writer), actors: val(d.Actors),
    language: val(d.Language), country: val(d.Country),
  }, 200, 86400);
}

/* ---------------- TMDB proxy (اختياري) ---------------- */

function tmdbTtl(path) {
  if (/\/search\//.test(path)) return 600;
  if (/trending|now_playing|popular|upcoming|airing|on_the_air/.test(path)) return 1800;
  return 21600;
}

async function tmdbProxy(url, env) {
  if (!env.TMDB_KEY) return jsonResponse({ error: "missing_key" }, 500);
  if (!/^\/tmdb\/3\/[A-Za-z0-9_\-\/]+$/.test(url.pathname)) return jsonResponse({ error: "bad_path" }, 400);
  const up = new URL("https://api.themoviedb.org" + url.pathname.slice(5));
  url.searchParams.forEach((v, k) => { if (k !== "api_key") up.searchParams.set(k, v.slice(0, 300)); });
  up.searchParams.set("api_key", env.TMDB_KEY);
  const r = await fetch(up.toString(), { headers: { Accept: "application/json" } });
  return new Response(await r.text(), {
    status: r.ok ? 200 : r.status,
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": r.ok ? `public, max-age=${tmdbTtl(url.pathname)}` : "no-store", ...CORS },
  });
}

/* ---------------- مساعد ---------------- */

function jsonResponse(data, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8",
               "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store", ...CORS },
  });
}

/* ---------------- الكتب والأبحاث والمانجا (Books & Papers Harvester) ---------------- */

const ANNAS_MIRRORS = [
  "https://annas-archive.gl",
  "https://annas-archive.gd",
  "https://annas-archive.pk",
  "https://annas-archive.vg",
];

function stripHtmlTags(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBookKey(title, author) {
  const t = String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 48);
  const a = String(author || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 24);
  return `${t}__${a}`;
}

function mergeBookLists(lists) {
  const byKey = new Map();
  const byIsbn = new Map();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.title) continue;
      const cleanIsbn = String(item.isbn || "").replace(/[^0-9Xx]/g, "");
      const normKey = normalizeBookKey(item.title, item.author);
      const existing =
        (cleanIsbn && byIsbn.get(cleanIsbn)) ||
        byKey.get(normKey);

      if (!existing) {
        const entry = {
          ...item,
          isbn: cleanIsbn || item.isbn || "",
          sources: item.source ? [item.source] : [],
          directReadFormats: { ...(item.directReadFormats || {}) },
        };
        byKey.set(normKey, entry);
        if (cleanIsbn) byIsbn.set(cleanIsbn, entry);
      } else {
        if (!existing.coverUrl && item.coverUrl) existing.coverUrl = item.coverUrl;
        if ((!existing.description || existing.description.length < 40) && item.description) {
          existing.description = item.description;
        }
        if (!existing.isbn && cleanIsbn) {
          existing.isbn = cleanIsbn;
          byIsbn.set(cleanIsbn, existing);
        }
        if (!existing.md5 && item.md5) existing.md5 = item.md5;
        if (!existing.iaId && item.iaId) existing.iaId = item.iaId;
        if (!existing.gutenbergId && item.gutenbergId) existing.gutenbergId = item.gutenbergId;
        if (!existing.doi && item.doi) existing.doi = item.doi;
        if (!existing.year && item.year) existing.year = item.year;
        if (!existing.language && item.language) existing.language = item.language;
        if (!existing.rating && item.rating) existing.rating = item.rating;
        if (!existing.pages && item.pages) existing.pages = item.pages;
        if (!existing.filesize && item.filesize) existing.filesize = item.filesize;
        if ((!existing.ext || existing.ext === "book") && item.ext) existing.ext = item.ext;
        if (item.downloads && (!existing.downloads || item.downloads > existing.downloads)) {
          existing.downloads = item.downloads;
        }
        if (item.directReadFormats) {
          existing.directReadFormats = {
            ...item.directReadFormats,
            ...existing.directReadFormats,
          };
        }
        if (item.source && !existing.sources.includes(item.source)) {
          existing.sources.push(item.source);
        }
      }
    }
  }

  return Array.from(byKey.values());
}

async function fetchOpenLibraryTrending(period, subject, lang, page) {
  const offset = (Math.max(1, page) - 1) * 24;
  let url;
  if (subject && subject !== "all" && subject !== "trending") {
    url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=28&offset=${offset}`;
  } else {
    const validPeriod = ["daily", "weekly", "monthly"].includes(period) ? period : "weekly";
    url = `https://openlibrary.org/trending/${validPeriod}.json?limit=28& page=${page}`;
  }
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const works = Array.isArray(data.works) ? data.works : [];
  return works
    .map((w) => {
      const coverId = w.cover_i || w.cover_id;
      const iaList = Array.isArray(w.ia) ? w.ia : w.ia ? [w.ia] : [];
      const iaId = iaList[0] || "";
      const authors = Array.isArray(w.author_name)
        ? w.author_name.join(", ")
        : Array.isArray(w.authors)
          ? w.authors.map((a) => a.name).filter(Boolean).join(", ")
          : "";
      const langCode = Array.isArray(w.language) ? w.language[0] : "";
      if (lang && lang !== "all" && langCode && !langCode.toLowerCase().startsWith(lang.slice(0, 2))) {
        return null;
      }
      return {
        id: `ol_${String(w.key || "").replace("/works/", "") || Math.random().toString(36).slice(2)}`,
        title: w.title || "Untitled",
        author: authors || "Unknown Author",
        year: w.first_publish_year || "",
        language: langCode || "en",
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
        isbn: Array.isArray(w.isbn) ? w.isbn[0] : "",
        md5: "",
        iaId,
        gutenbergId: "",
        doi: "",
        ext: iaId ? "epub" : "pdf",
        source: "Open Library",
        downloads: w.edition_count ? w.edition_count * 120 : 0,
        directReadFormats: iaId
          ? { embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed` }
          : {},
      };
    })
    .filter(Boolean);
}

async function fetchGutendexBooks(query, lang, topic, page) {
  const u = new URL("https://gutendex.com/books");
  u.searchParams.set("sort", "popular");
  if (page > 1) u.searchParams.set("page", String(page));
  if (query) u.searchParams.set("search", query);
  if (topic && topic !== "all" && topic !== "trending") u.searchParams.set("topic", topic);
  if (lang && lang !== "all") u.searchParams.set("languages", lang.slice(0, 2).toLowerCase());

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((b) => {
    const formats = b.formats || {};
    const coverUrl = formats["image/jpeg"] || "";
    const epubUrl = formats["application/epub+zip"] || "";
    const htmlUrl = formats["text/html"] || formats["text/html; charset=utf-8"] || "";
    const txtUrl = formats["text/plain; charset=utf-8"] || formats["text/plain"] || "";
    const authors = Array.isArray(b.authors)
      ? b.authors.map((a) => a.name).filter(Boolean).join(", ")
      : "Unknown Author";
    const summary = Array.isArray(b.summaries) && b.summaries.length > 0 ? b.summaries[0] : "";
    return {
      id: `gut_${b.id}`,
      title: b.title || "Untitled",
      author: authors,
      year: b.authors?.[0]?.birth_year ? `${b.authors[0].birth_year}` : "",
      language: Array.isArray(b.languages) && b.languages[0] ? b.languages[0] : "en",
      coverUrl,
      isbn: "",
      md5: "",
      iaId: "",
      gutenbergId: String(b.id),
      doi: "",
      description: summary,
      ext: epubUrl ? "epub" : "html",
      source: "Gutenberg",
      downloads: b.download_count || 0,
      directReadFormats: {
        ...(epubUrl ? { epub: epubUrl } : {}),
        ...(htmlUrl ? { html: htmlUrl } : {}),
        ...(txtUrl ? { txt: txtUrl } : {}),
      },
    };
  });
}

async function fetchInternetArchiveTexts(query, subject, lang, page) {
  const qParts = ["mediatype:texts", "NOT collection:inlibrary"];
  if (query) qParts.push(`(${query})`);
  if (subject && subject !== "all" && subject !== "trending") qParts.push(`subject:(${subject})`);
  if (lang && lang !== "all") {
    const langMap = { ar: "Arabic OR ara", en: "English OR eng", fr: "French OR fre", es: "Spanish OR spa" };
    qParts.push(`language:(${langMap[lang] || lang})`);
  }
  const u = new URL("https://archive.org/advancedsearch.php");
  u.searchParams.set("q", qParts.join(" AND "));
  ["identifier", "title", "creator", "downloads", "year", "language", "description"].forEach((f) =>
    u.searchParams.append("fl[]", f),
  );
  u.searchParams.append("sort[]", "downloads desc");
  u.searchParams.set("rows", "24");
  u.searchParams.set("page", String(Math.max(1, page)));
  u.searchParams.set("output", "json");

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = data?.response?.docs || [];
  return docs.map((d) => {
    const iaId = d.identifier;
    const creator = Array.isArray(d.creator) ? d.creator.join(", ") : d.creator || "Unknown Author";
    const desc = Array.isArray(d.description) ? d.description.join(" ") : d.description || "";
    const langVal = Array.isArray(d.language) ? d.language[0] : d.language || "en";
    return {
      id: `ia_${iaId}`,
      title: d.title || iaId,
      author: creator,
      year: d.year || "",
      language: String(langVal).slice(0, 3).toLowerCase(),
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      isbn: "",
      md5: "",
      iaId,
      gutenbergId: "",
      doi: "",
      description: stripHtmlTags(desc).slice(0, 600),
      ext: "pdf",
      source: "Internet Archive",
      downloads: Number(d.downloads) || 0,
      directReadFormats: {
        embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`,
      },
    };
  });
}

async function fetchOpenLibrarySearch(q, lang, page) {
  const u = new URL("https://openlibrary.org/search.json");
  u.searchParams.set("q", q);
  u.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,isbn,cover_i,ia,ratings_average,edition_count,language,publisher,number_of_pages_median",
  );
  u.searchParams.set("limit", "24");
  if (page > 1) u.searchParams.set("page", String(page));

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];
  return docs
    .map((d) => {
      const iaId = Array.isArray(d.ia) && d.ia.length > 0 ? d.ia[0] : "";
      const isbn = Array.isArray(d.isbn) && d.isbn.length > 0 ? d.isbn[0] : "";
      const langCode = Array.isArray(d.language) && d.language[0] ? d.language[0] : "en";
      if (lang && lang !== "all" && !String(langCode).toLowerCase().startsWith(lang.slice(0, 2))) {
        return null;
      }
      return {
        id: `ol_${String(d.key || "").replace("/works/", "")}`,
        title: d.title || "Untitled",
        author: Array.isArray(d.author_name) ? d.author_name.join(", ") : "Unknown Author",
        year: d.first_publish_year || "",
        language: langCode,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
        isbn,
        md5: "",
        iaId,
        gutenbergId: "",
        doi: "",
        rating: d.ratings_average ? Number(d.ratings_average).toFixed(1) : "",
        pages: d.number_of_pages_median || 0,
        ext: iaId ? "epub" : "pdf",
        source: "Open Library",
        downloads: (d.edition_count || 1) * 95,
        directReadFormats: iaId
          ? { embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed` }
          : {},
      };
    })
    .filter(Boolean);
}

async function fetchGoogleBooksSearch(q, lang) {
  const u = new URL("https://www.googleapis.com/books/v1/volumes");
  u.searchParams.set("q", q);
  u.searchParams.set("maxResults", "20");
  u.searchParams.set("printType", "books");
  if (lang && lang !== "all") u.searchParams.set("langRestrict", lang.slice(0, 2));

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => {
    const info = item.volumeInfo || {};
    const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
    const isbn13 = identifiers.find((x) => x.type === "ISBN_13")?.identifier;
    const isbn10 = identifiers.find((x) => x.type === "ISBN_10")?.identifier;
    let cover =
      info.imageLinks?.extraLarge ||
      info.imageLinks?.large ||
      info.imageLinks?.medium ||
      info.imageLinks?.thumbnail ||
      "";
    if (cover) {
      cover = cover.replace(/^http:\/\//i, "https://").replace(/&edge=curl/gi, "");
    }
    const pdfLink = item.accessInfo?.pdf?.acsTokenLink || item.accessInfo?.pdf?.downloadLink || "";
    const epubLink = item.accessInfo?.epub?.acsTokenLink || item.accessInfo?.epub?.downloadLink || "";
    const webReader = item.accessInfo?.webReaderLink || info.previewLink || "";
    return {
      id: `gb_${item.id}`,
      title: info.title || "Untitled",
      author: Array.isArray(info.authors) ? info.authors.join(", ") : info.publisher || "Unknown Author",
      year: info.publishedDate ? String(info.publishedDate).slice(0, 4) : "",
      language: info.language || "en",
      coverUrl: cover,
      isbn: isbn13 || isbn10 || "",
      md5: "",
      iaId: "",
      gutenbergId: "",
      doi: "",
      description: stripHtmlTags(info.description || "").slice(0, 800),
      rating: info.averageRating ? String(info.averageRating) : "",
      pages: info.pageCount || 0,
      ext: epubLink ? "epub" : "pdf",
      source: "Google Books",
      downloads: (info.ratingsCount || 1) * 50,
      directReadFormats: {
        ...(webReader ? { preview: webReader } : {}),
        ...(pdfLink ? { pdf: pdfLink } : {}),
      },
    };
  });
}

async function fetchOpenAlexSearch(q, page) {
  const u = new URL("https://api.openalex.org/works");
  u.searchParams.set("search", q);
  u.searchParams.set("per-page", "16");
  if (page > 1) u.searchParams.set("page", String(page));

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((w) => {
    const rawDoi = String(w.doi || "").replace(/^https?:\/\/doi\.org\//i, "");
    const pdfUrl =
      w.best_oa_location?.pdf_url ||
      w.primary_location?.pdf_url ||
      w.open_access?.oa_url ||
      "";
    const authors = Array.isArray(w.authorships)
      ? w.authorships
          .slice(0, 4)
          .map((a) => a.author?.display_name)
          .filter(Boolean)
          .join(", ")
      : "Academic Research";
    return {
      id: `oa_${String(w.id || "").replace("https://openalex.org/", "")}`,
      title: w.display_name || w.title || "Research Paper",
      author: authors || "Academic Author",
      year: w.publication_year ? String(w.publication_year) : "",
      language: w.language || "en",
      coverUrl: "",
      isbn: "",
      md5: "",
      iaId: "",
      gutenbergId: "",
      doi: rawDoi,
      description: rawDoi
        ? `Academic work (${w.type || "paper"}) · Cited by ${w.cited_by_count || 0} studies · DOI: ${rawDoi}`
        : `Academic work (${w.type || "paper"}) · Cited by ${w.cited_by_count || 0} studies`,
      ext: "pdf",
      source: "OpenAlex",
      downloads: (w.cited_by_count || 0) * 10,
      directReadFormats: {
        ...(pdfUrl ? { pdf: pdfUrl } : {}),
      },
    };
  });
}

async function scrapeAnnasArchiveAndLibgen(q, category, ext, sort) {
  const contentMap = {
    books: "book_nonfiction,book_fiction,book_unknown",
    papers: "journal_article",
    comics: "comic",
    magazines: "magazine",
  };
  const contentParam = contentMap[category] || "";
  const extParam = ext && ext !== "all" && ext !== "inapp" ? ext : "";
  const sortParam = sort && sort !== "popular" ? sort : "";

  for (const mirror of ANNAS_MIRRORS) {
    try {
      const u = new URL("/search", mirror);
      u.searchParams.set("q", q);
      if (contentParam) u.searchParams.set("content", contentParam);
      if (extParam) u.searchParams.set("ext", extParam);
      if (sortParam) u.searchParams.set("sort", sortParam);

      const r = await fetch(u.toString(), {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
        signal: AbortSignal.timeout(4800),
      });
      if (!r.ok) continue;
      let html = await r.text();
      // Anna's Archive often wraps off-screen results inside HTML comments <!-- ... -->
      html = html.replace(/<!--/g, "").replace(/-->/g, "");

      const cards = [];
      const seenMd5 = new Set();
      const anchorRe = /<a[^>]+href=["']\/md5\/([a-f0-9]{32})["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = anchorRe.exec(html)) !== null && cards.length < 24) {
        const md5 = m[1].toLowerCase();
        if (seenMd5.has(md5)) continue;
        const inner = m[2];
        const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
        const h3Match = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        const metaMatch = inner.match(/(?:pdf|epub|cbz|cbr|mobi|djvu|azw3)[^<]{0,80}/i);
        const authorMatch = inner.match(/class=["'][^"']*italic[^"']*["'][^>]*>([\s\S]*?)<\//i);

        const title = stripHtmlTags(h3Match ? h3Match[1] : inner);
        if (!title || title.length < 2) continue;
        seenMd5.add(md5);

        const metaStr = stripHtmlTags(metaMatch ? metaMatch[0] : "");
        const extDetected = (metaStr.match(/\b(pdf|epub|cbz|cbr|mobi|djvu)\b/i)?.[1] || extParam || "pdf").toLowerCase();
        const sizeDetected = metaStr.match(/\b(\d+(?:\.\d+)?\s*(?:MB|KB|GB))\b/i)?.[1] || "";

        cards.push({
          id: `aa_${md5}`,
          title: title.slice(0, 180),
          author: stripHtmlTags(authorMatch ? authorMatch[1] : "") || "Anna's Archive Catalog",
          year: metaStr.match(/\b(19\d\d|20\d\d)\b/)?.[1] || "",
          language: metaStr.match(/\b(Arabic|English|French|Spanish|ar|en|fr|es)\b/i)?.[1]?.slice(0, 2).toLowerCase() || "en",
          coverUrl: imgMatch ? imgMatch[1] : "",
          isbn: "",
          md5,
          iaId: "",
          gutenbergId: "",
          doi: "",
          filesize: sizeDetected,
          ext: extDetected,
          source: "Anna's Archive",
          downloads: 1000,
          directReadFormats: {},
        });
      }
      if (cards.length > 0) return cards;
    } catch {
      // try next mirror
    }
  }

  // Fallback to LibGen search if Anna's Archive mirrors are under protection challenge
  try {
    const lgUrl = `https://libgen.is/search.php?req=${encodeURIComponent(q)}&res=25&view=simple&column=def`;
    const r = await fetch(lgUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(4800),
    });
    if (!r.ok) return [];
    const html = await r.text();
    const out = [];
    const seen = new Set();
    const md5Re = /md5=([A-Fa-f0-9]{32})[^>]*>([^<]{3,200})<\/a>/gi;
    let m;
    while ((m = md5Re.exec(html)) !== null && out.length < 20) {
      const md5 = m[1].toLowerCase();
      if (seen.has(md5)) continue;
      const title = stripHtmlTags(m[2]);
      if (!title || /^(?:\[\d+\]|mirror|edit|libgen)/i.test(title)) continue;
      seen.add(md5);
      out.push({
        id: `lg_${md5}`,
        title,
        author: "LibGen Index",
        year: "",
        language: "en",
        coverUrl: "",
        isbn: "",
        md5,
        iaId: "",
        gutenbergId: "",
        doi: "",
        ext: extParam || "pdf",
        source: "Anna's Archive",
        downloads: 600,
        directReadFormats: {},
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function handleBooksTrending(reqUrl) {
  const period = reqUrl.searchParams.get("period") || "weekly";
  const subject = reqUrl.searchParams.get("subject") || "";
  const lang = reqUrl.searchParams.get("lang") || "all";
  const page = Math.max(1, parseInt(reqUrl.searchParams.get("page") || "1", 10) || 1);

  const settled = await Promise.allSettled([
    fetchOpenLibraryTrending(period, subject, lang, page),
    fetchGutendexBooks("", lang, subject, page),
    fetchInternetArchiveTexts("", subject, lang, page),
  ]);

  const lists = settled.map((s) => (s.status === "fulfilled" ? s.value : []));
  const merged = mergeBookLists(lists);

  return jsonResponse(
    {
      page,
      period,
      subject: subject || "trending",
      total: merged.length,
      books: merged,
    },
    200,
    10800,
  );
}

async function handleBooksSearch(reqUrl) {
  const q = (reqUrl.searchParams.get("q") || "").trim();
  const category = reqUrl.searchParams.get("category") || "all";
  const ext = reqUrl.searchParams.get("ext") || "all";
  const lang = reqUrl.searchParams.get("lang") || "all";
  const sort = reqUrl.searchParams.get("sort") || "popular";
  const page = Math.max(1, parseInt(reqUrl.searchParams.get("page") || "1", 10) || 1);

  if (!q) {
    return handleBooksTrending(reqUrl);
  }

  const tasks = [
    scrapeAnnasArchiveAndLibgen(q, category, ext, sort),
    fetchGoogleBooksSearch(q, lang),
    fetchOpenLibrarySearch(q, lang, page),
    fetchGutendexBooks(q, lang, "", page),
    fetchInternetArchiveTexts(q, "", lang, page),
    fetchOpenAlexSearch(q, page),
  ];

  const settled = await Promise.allSettled(tasks);
  const lists = settled.map((s) => (s.status === "fulfilled" ? s.value : []));
  let merged = mergeBookLists(lists);

  if (ext && ext !== "all") {
    if (ext === "inapp") {
      merged = merged.filter(
        (b) =>
          b.iaId ||
          b.gutenbergId ||
          b.directReadFormats?.embed ||
          b.directReadFormats?.pdf ||
          b.directReadFormats?.epub ||
          b.directReadFormats?.html,
      );
    } else {
      merged = merged.filter((b) => String(b.ext || "").toLowerCase() === ext.toLowerCase());
    }
  }

  return jsonResponse(
    {
      query: q,
      category,
      ext,
      lang,
      page,
      total: merged.length,
      books: merged,
    },
    200,
    1800,
  );
}

async function handleBooksResolve(reqUrl) {
  const md5 = (reqUrl.searchParams.get("md5") || "").trim().toLowerCase();
  const iaId = (reqUrl.searchParams.get("iaId") || "").trim();
  const isbn = (reqUrl.searchParams.get("isbn") || "").trim();
  const doi = (reqUrl.searchParams.get("doi") || "").trim().replace(/^https?:\/\/doi\.org\//i, "");
  const gutenbergId = (reqUrl.searchParams.get("gutenbergId") || "").trim();
  const title = (reqUrl.searchParams.get("title") || "").trim();

  const directReadFormats = {};
  const mirrors = [];
  let downloadsCount = 0;

  if (iaId) {
    directReadFormats.embed = `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`;
    try {
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(5500),
      });
      if (r.ok) {
        const meta = await r.json();
        const files = Array.isArray(meta.files) ? meta.files : [];
        for (const f of files) {
          if (!f || !f.name) continue;
          const lower = f.name.toLowerCase();
          const dlUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(f.name)}`;
          if (!directReadFormats.pdf && lower.endsWith(".pdf")) {
            directReadFormats.pdf = dlUrl;
          } else if (!directReadFormats.epub && lower.endsWith(".epub")) {
            directReadFormats.epub = dlUrl;
          }
        }
      }
    } catch {}
    mirrors.push({
      id: "ia-embed",
      label: "Internet Archive Reader",
      host: "archive.org",
      url: `https://archive.org/details/${encodeURIComponent(iaId)}`,
      badge: "Direct Read",
    });
  }

  if (gutenbergId) {
    directReadFormats.html = `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}.html.images`;
    directReadFormats.epub = `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}.epub3.images`;
    mirrors.push({
      id: "gutenberg-main",
      label: "Project Gutenberg (EPUB / HTML)",
      host: "gutenberg.org",
      url: `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}`,
      badge: "Public Domain",
    });
  }

  if (/^[a-f0-9]{32}$/.test(md5)) {
    try {
      const infoRes = await fetch(`https://annas-archive.gl/dyn/md5/inline_info/${md5}`, {
        headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
        signal: AbortSignal.timeout(3500),
      });
      if (infoRes.ok) {
        const txt = await infoRes.text();
        const dlMatch = txt.match(/"downloads_total"\s*:\s*(\d+)/);
        if (dlMatch) downloadsCount = parseInt(dlMatch[1], 10) || 0;
      }
    } catch {}

    mirrors.push(
      {
        id: "aa-gl",
        label: "Anna's Archive (Mirror .gl)",
        host: "annas-archive.gl",
        url: `https://annas-archive.gl/md5/${md5}`,
        badge: "MD5 Direct",
      },
      {
        id: "aa-gd",
        label: "Anna's Archive (Mirror .gd)",
        host: "annas-archive.gd",
        url: `https://annas-archive.gd/md5/${md5}`,
        badge: "MD5 Mirror",
      },
      {
        id: "aa-pk",
        label: "Anna's Archive (Mirror .pk)",
        host: "annas-archive.pk",
        url: `https://annas-archive.pk/md5/${md5}`,
        badge: "MD5 Mirror",
      },
      {
        id: "aa-vg",
        label: "Anna's Archive (Mirror .vg)",
        host: "annas-archive.vg",
        url: `https://annas-archive.vg/md5/${md5}`,
        badge: "MD5 Mirror",
      },
      {
        id: "libgen-lol",
        label: "Library.lol (Direct IPFS / Cloudflare)",
        host: "library.lol",
        url: `https://library.lol/main/${md5}`,
        badge: "Fast Direct",
      },
      {
        id: "libgen-li",
        label: "LibGen.li Direct Gateway",
        host: "libgen.li",
        url: `https://libgen.li/ads.php?md5=${md5}`,
        badge: "LibGen",
      },
    );
  } else {
    const searchTarget = isbn || title;
    if (searchTarget) {
      mirrors.push(
        {
          id: "aa-search-gl",
          label: "Anna's Archive (.gl Search)",
          host: "annas-archive.gl",
          url: `https://annas-archive.gl/search?q=${encodeURIComponent(searchTarget)}`,
          badge: "Anna's Archive",
        },
        {
          id: "aa-search-gd",
          label: "Anna's Archive (.gd Mirror)",
          host: "annas-archive.gd",
          url: `https://annas-archive.gd/search?q=${encodeURIComponent(searchTarget)}`,
          badge: "Mirror .gd",
        },
        {
          id: "aa-search-pk",
          label: "Anna's Archive (.pk Mirror)",
          host: "annas-archive.pk",
          url: `https://annas-archive.pk/search?q=${encodeURIComponent(searchTarget)}`,
          badge: "Mirror .pk",
        },
        {
          id: "aa-search-vg",
          label: "Anna's Archive (.vg Mirror)",
          host: "annas-archive.vg",
          url: `https://annas-archive.vg/search?q=${encodeURIComponent(searchTarget)}`,
          badge: "Mirror .vg",
        },
        {
          id: "libgen-is-search",
          label: "LibGen.is Direct Search",
          host: "libgen.is",
          url: `https://libgen.is/search.php?req=${encodeURIComponent(searchTarget)}`,
          badge: "LibGen",
        },
      );
    }
  }

  if (doi) {
    mirrors.push(
      {
        id: "aa-scidb",
        label: "Anna's Archive SciDB",
        host: "annas-archive.gl",
        url: `https://annas-archive.gl/scidb/${encodeURIComponent(doi)}`,
        badge: "SciDB Paper",
      },
      {
        id: "scihub-se",
        label: "Sci-Hub (.se Mirror)",
        host: "sci-hub.se",
        url: `https://sci-hub.se/${encodeURIComponent(doi)}`,
        badge: "DOI Direct",
      },
      {
        id: "scihub-st",
        label: "Sci-Hub (.st Mirror)",
        host: "sci-hub.st",
        url: `https://sci-hub.st/${encodeURIComponent(doi)}`,
        badge: "DOI Mirror",
      },
    );
  }

  return jsonResponse(
    {
      md5,
      iaId,
      isbn,
      doi,
      gutenbergId,
      downloads: downloadsCount,
      directReadFormats,
      mirrors,
    },
    200,
    21600,
  );
}

/* ---------------- الكتب الصوتية والتسجيلات (Audiobooks Harvester) ---------------- */

async function fetchLibriVoxCatalog(q, page) {
  const offset = (Math.max(1, page) - 1) * 24;
  // IMPORTANT: Never combine `title` and `author` in the same LibriVox API request to prevent HTTP 500
  let url = `https://librivox.org/api/feed/audiobooks/?format=json&extended=1&limit=24&offset=${offset}`;
  if (q) {
    url += `&title=^${encodeURIComponent(q)}`;
  }
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const books = Array.isArray(data.books) ? data.books : [];
  return books.map((b) => {
    let iaId = "";
    if (b.url_iarchive) {
      const m = String(b.url_iarchive).match(/\/details\/([^/?#]+)/);
      if (m) iaId = m[1];
    }
    const authors = Array.isArray(b.authors)
      ? b.authors.map((a) => `${a.first_name || ""} ${a.last_name || ""}`.trim()).filter(Boolean).join(", ")
      : "LibriVox Narrator";
    return {
      id: `lv_${b.id}`,
      librivoxId: String(b.id),
      iaId,
      title: stripHtmlTags(b.title || "Untitled Audiobook"),
      author: authors || "LibriVox",
      description: stripHtmlTags(b.description || "").slice(0, 600),
      language: b.language || "English",
      runtime: b.totaltime || "",
      year: b.copyright_year || "",
      coverUrl: iaId ? `https://archive.org/services/img/${encodeURIComponent(iaId)}` : "",
      source: "LibriVox",
      chapterCount: Number(b.num_sections) || 0,
      rssUrl: b.url_rss || "",
      previewUrl: "",
    };
  });
}

async function fetchInternetArchiveAudiobooks(q, genre, lang, page) {
  const parts = ["mediatype:audio", "collection:(audio_bookspoetry OR opensource_audio)"];
  if (q) parts.unshift(`(${q})`);
  if (genre && genre !== "all" && genre !== "popular") parts.push(`subject:(${genre})`);
  if (lang && lang !== "all") parts.push(`language:(${lang})`);

  const u = new URL("https://archive.org/advancedsearch.php");
  u.searchParams.set("q", parts.join(" AND "));
  ["identifier", "title", "creator", "description", "downloads", "runtime", "year", "language"].forEach((f) =>
    u.searchParams.append("fl[]", f),
  );
  u.searchParams.append("sort[]", "downloads desc");
  u.searchParams.set("rows", "24");
  u.searchParams.set("page", String(Math.max(1, page)));
  u.searchParams.set("output", "json");

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = data?.response?.docs || [];
  return docs.map((d) => {
    const iaId = d.identifier;
    const creator = Array.isArray(d.creator) ? d.creator.join(", ") : d.creator || "Audio Archive";
    const desc = Array.isArray(d.description) ? d.description.join(" ") : d.description || "";
    return {
      id: `ia_audio_${iaId}`,
      librivoxId: "",
      iaId,
      title: d.title || iaId,
      author: creator,
      description: stripHtmlTags(desc).slice(0, 600),
      language: Array.isArray(d.language) ? d.language[0] : d.language || "English",
      runtime: d.runtime || "",
      year: d.year || "",
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      source: "Internet Archive Audio",
      downloads: Number(d.downloads) || 0,
      chapterCount: 0,
      previewUrl: "",
    };
  });
}

async function fetchItunesAudiobooks(q, genre) {
  const term = q || (genre && genre !== "popular" && genre !== "all" ? genre : "classic literature");
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", term);
  u.searchParams.set("media", "audiobook");
  u.searchParams.set("limit", "24");

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((item) => {
    const hiResCover = String(item.artworkUrl100 || "").replace(/100x100bb/g, "600x600bb");
    return {
      id: `itunes_${item.collectionId || Math.random().toString(36).slice(2)}`,
      librivoxId: "",
      iaId: "",
      title: item.collectionName || item.trackName || "Audiobook",
      author: item.artistName || "Narrator",
      description: stripHtmlTags(item.description || "").slice(0, 600),
      language: "English",
      runtime: item.trackTimeMillis
        ? `${Math.round(item.trackTimeMillis / 60000)} min`
        : "",
      year: item.releaseDate ? String(item.releaseDate).slice(0, 4) : "",
      coverUrl: hiResCover,
      source: "Apple Books",
      chapterCount: Number(item.trackCount) || 1,
      previewUrl: item.previewUrl || "",
      externalUrl: item.collectionViewUrl || "",
    };
  });
}

async function fetchLocAudio(q, genre) {
  const term = q || (genre && genre !== "popular" && genre !== "all" ? genre : "literature poetry");
  const u = new URL("https://www.loc.gov/audio/");
  u.searchParams.set("fo", "json");
  u.searchParams.set("at", "results,pagination");
  u.searchParams.set("c", "16");
  u.searchParams.set("q", term);

  const r = await fetch(u.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((item, idx) => {
    const img = Array.isArray(item.image_url) && item.image_url.length > 0 ? item.image_url[item.image_url.length - 1] : "";
    const desc = Array.isArray(item.description) ? item.description.join(" ") : "";
    const contrib = Array.isArray(item.contributor) ? item.contributor.join(", ") : "Library of Congress";
    return {
      id: `loc_${idx}_${encodeURIComponent(item.id || item.title || String(idx)).slice(-24)}`,
      librivoxId: "",
      iaId: "",
      title: item.title || "Historical Audio Recording",
      author: contrib,
      description: stripHtmlTags(desc).slice(0, 500),
      language: Array.isArray(item.language) ? item.language[0] : "English",
      runtime: "",
      year: item.date ? String(item.date).slice(0, 4) : "",
      coverUrl: img,
      source: "Library of Congress",
      chapterCount: 1,
      previewUrl: "",
      externalUrl: item.url || item.id || "",
    };
  });
}

async function handleAudiobooksCatalog(reqUrl) {
  const q = (reqUrl.searchParams.get("q") || "").trim();
  const genre = (reqUrl.searchParams.get("genre") || "popular").trim();
  const lang = (reqUrl.searchParams.get("lang") || "all").trim();
  const page = Math.max(1, parseInt(reqUrl.searchParams.get("page") || "1", 10) || 1);

  const settled = await Promise.allSettled([
    fetchInternetArchiveAudiobooks(q, genre, lang, page),
    fetchLibriVoxCatalog(q, page),
    fetchItunesAudiobooks(q, genre),
    fetchLocAudio(q, genre),
  ]);

  const combined = [];
  const seenKeys = new Set();
  const [iaRes, lvRes, itunesRes, locRes] = settled.map((s) =>
    s.status === "fulfilled" ? s.value : [],
  );

  // Enrich IA / LibriVox covers with high-res 600x600 iTunes covers when titles match
  const itunesCoverMap = new Map();
  for (const it of itunesRes) {
    if (it.coverUrl && it.title) {
      itunesCoverMap.set(normalizeBookKey(it.title, ""), it.coverUrl);
    }
  }

  for (const item of [...iaRes, ...lvRes, ...itunesRes, ...locRes]) {
    if (!item || !item.title) continue;
    const k = item.iaId ? `ia:${item.iaId}` : normalizeBookKey(item.title, item.author);
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);

    const tKey = normalizeBookKey(item.title, "");
    if ((!item.coverUrl || item.coverUrl.includes("/services/img/")) && itunesCoverMap.has(tKey)) {
      item.fallbackCoverUrl = item.coverUrl;
      item.coverUrl = itunesCoverMap.get(tKey);
    }
    combined.push(item);
  }

  return jsonResponse(
    {
      query: q,
      genre,
      lang,
      page,
      total: combined.length,
      audiobooks: combined,
    },
    200,
    7200,
  );
}

async function handleAudiobookTracks(reqUrl) {
  let iaId = (reqUrl.searchParams.get("iaId") || "").trim();
  const librivoxId = (reqUrl.searchParams.get("librivoxId") || "").trim();

  if (!iaId && librivoxId) {
    try {
      const lvRes = await fetch(
        `https://librivox.org/api/feed/audiobooks/?id=${encodeURIComponent(librivoxId)}&format=json&extended=1`,
        {
          headers: { "User-Agent": UA, Accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (lvRes.ok) {
        const lvData = await lvRes.json();
        const book = Array.isArray(lvData.books) ? lvData.books[0] : null;
        if (book) {
          if (book.url_iarchive) {
            const m = String(book.url_iarchive).match(/\/details\/([^/?#]+)/);
            if (m) iaId = m[1];
          }
          if (!iaId && Array.isArray(book.sections) && book.sections.length > 0) {
            const tracks = book.sections
              .map((sec, idx) => ({
                index: idx + 1,
                title: sec.title || `Chapter ${idx + 1}`,
                url: sec.listen_url || "",
                duration: sec.playtime ? Number(sec.playtime) : 0,
                format: "mp3",
              }))
              .filter((t) => Boolean(t.url));
            return jsonResponse({ iaId: "", librivoxId, tracks }, 200, 43200);
          }
        }
      }
    } catch {}
  }

  if (!iaId) {
    return jsonResponse({ error: "missing_iaId", tracks: [] }, 400);
  }

  const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) {
    return jsonResponse({ error: `ia_metadata_${r.status}`, tracks: [] }, 502);
  }

  const data = await r.json();
  const files = Array.isArray(data.files) ? data.files : [];
  let coverUrl = `https://archive.org/services/img/${encodeURIComponent(iaId)}`;

  for (const f of files) {
    if (f && f.name && /\.(jpg|jpeg|png)$/i.test(f.name) && !f.name.includes("_thumb")) {
      coverUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(f.name)}`;
      break;
    }
  }

  // Prefer original or 128kbps MP3 files, deduplicating 64kb/ogg derivatives of the same base chapter
  const mp3Files = files.filter(
    (f) =>
      f &&
      typeof f.name === "string" &&
      /\.(mp3|m4a|ogg)$/i.test(f.name) &&
      !/_64kb\.mp3$/i.test(f.name) &&
      !/\.ogg$/i.test(f.name),
  );
  const candidateFiles =
    mp3Files.length > 0
      ? mp3Files
      : files.filter((f) => f && typeof f.name === "string" && /\.(mp3|m4a|ogg)$/i.test(f.name));

  const seenBase = new Set();
  const tracks = [];
  for (const f of candidateFiles) {
    const base = f.name
      .replace(/_(?:64kb|128kb|vbr)\.[^.]+$/i, "")
      .replace(/\.[^.]+$/, "");
    if (seenBase.has(base)) continue;
    seenBase.add(base);

    const trackNum = parseInt(String(f.track || "").split("/")[0], 10) || tracks.length + 1;
    let durationSec = 0;
    if (f.length) {
      if (/^\d+(\.\d+)?$/.test(String(f.length))) {
        durationSec = Math.round( parseFloat(f.length) );
      } else {
        const parts = String(f.length).split(":").map(Number);
        if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
      }
    }

    tracks.push({
      index: trackNum,
      title: f.title || base.replace(/[_-]+/g, " ").trim() || `Chapter ${tracks.length + 1}`,
      url: `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(f.name)}`,
      duration: durationSec,
      size: f.size ? Number(f.size) : 0,
      format: (f.name.split(".").pop() || "mp3").toLowerCase(),
    });
  }

  tracks.sort((a, b) => a.index - b.index);
  tracks.forEach((t, idx) => {
    t.index = idx + 1;
  });

  return jsonResponse(
    {
      iaId,
      librivoxId,
      title: data?.metadata?.title || iaId,
      author: data?.metadata?.creator || "",
      coverUrl,
      tracks,
    },
    200,
    43200,
  );
}

