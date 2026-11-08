import express from "express";
import path from "path";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Simple API
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Cinema Download Hybrid Indexer Discovery Proxy (Torrentio + YTS + EZTV)
  app.get("/api/cinema-download/discover", async (req, res) => {
    const imdbId = String(req.query.imdbId || "").trim();
    const mediaType = String(req.query.mediaType || "movie").trim();
    const season = Math.max(1, Number(req.query.season) || 1);
    const episode = Math.max(1, Number(req.query.episode) || 1);

    const results: Array<{
      source: string;
      title: string;
      infoHash: string;
      sizeBytes?: number;
      seeders?: number;
      leechers?: number;
      quality?: string;
      videoCodec?: string;
    }> = [];

    if (!imdbId || !/^tt\d+$/.test(imdbId)) {
      res.json({ items: results });
      return;
    }

    const tasks: Promise<void>[] = [];

    // 1. Torrentio Indexer (Movies & Series SxxExx)
    tasks.push(
      (async () => {
        try {
          const endpoint =
            mediaType === "tv"
              ? `https://torrentio.strem.fun/stream/series/${encodeURIComponent(imdbId)}:${season}:${episode}.json`
              : `https://torrentio.strem.fun/stream/movie/${encodeURIComponent(imdbId)}.json`;
          const r = await fetch(endpoint, {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
            signal: AbortSignal.timeout(4500),
          });
          if (!r.ok) return;
          const data = (await r.json()) as {
            streams?: Array<{ name?: string; title?: string; infoHash?: string }>;
          };
          for (const st of data.streams || []) {
            if (!st.infoHash || !/^[0-9a-fA-F]{40}$/.test(st.infoHash)) continue;
            const rawTitle = `${st.name || ""} ${st.title || ""}`.replace(/\r?\n/g, " ");
            const seedMatch = rawTitle.match(/👤\s*(\d+)/);
            const sizeMatch = rawTitle.match(/💾\s*([\d.]+)\s*(GB|MB)/i);
            let sizeBytes = 0;
            if (sizeMatch) {
              const num = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2].toUpperCase();
              sizeBytes = Math.round(
                num * (unit === "GB" ? 1024 * 1024 * 1024 : 1024 * 1024),
              );
            }
            const firstLine = (st.title || "").split(/\r?\n/)[0] || rawTitle;
            results.push({
              source: "Torrentio",
              title: firstLine.trim(),
              infoHash: st.infoHash.toLowerCase(),
              sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
              seeders: seedMatch ? Number(seedMatch[1]) : 25,
            });
          }
        } catch {
          // Ignore individual indexer timeout
        }
      })(),
    );

    // 2. YTS API for Movies
    if (mediaType === "movie") {
      tasks.push(
        (async () => {
          try {
            const r = await fetch(
              `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}`,
              { signal: AbortSignal.timeout(4000) },
            );
            if (!r.ok) return;
            const json = (await r.json()) as any;
            const movies = json?.data?.movies;
            if (!Array.isArray(movies)) return;
            for (const mv of movies) {
              const mvTitle = mv?.title_long || mv?.title || "Movie";
              for (const tor of mv?.torrents || []) {
                if (!tor?.hash || !/^[0-9a-fA-F]{40}$/.test(tor.hash)) continue;
                const qual = tor.quality || "1080p";
                const typeLabel = (tor.type || "web").toUpperCase();
                const codec = tor.video_codec === "x265" ? "H.265" : "H.264";
                results.push({
                  source: "YTS",
                  title: `${mvTitle}.${qual}.${typeLabel}.${codec}-YTS`,
                  infoHash: tor.hash.toLowerCase(),
                  sizeBytes: Number(tor.size_bytes) || 0,
                  seeders: Number(tor.seeds) || 15,
                  leechers: Number(tor.peers) || 4,
                  quality: qual,
                  videoCodec: codec,
                });
              }
            }
          } catch {
            // Ignore timeout
          }
        })(),
      );
    }

    // 3. EZTV API for TV Series
    if (mediaType === "tv") {
      tasks.push(
        (async () => {
          try {
            const numericId = imdbId.replace(/^tt/i, "");
            const r = await fetch(
              `https://eztv.re/api/get-torrents?imdb_id=${encodeURIComponent(numericId)}&limit=60`,
              { signal: AbortSignal.timeout(4000) },
            );
            if (!r.ok) return;
            const json = (await r.json()) as any;
            for (const tor of json?.torrents || []) {
              if (!tor?.hash || !/^[0-9a-fA-F]{40}$/.test(tor.hash)) continue;
              const sNum = Number(tor.season);
              const eNum = Number(tor.episode);
              if (sNum === season && eNum === episode) {
                results.push({
                  source: "EZTV",
                  title: String(tor.title || tor.filename || ""),
                  infoHash: String(tor.hash).toLowerCase(),
                  sizeBytes: Number(tor.size_bytes) || 0,
                  seeders: Math.max(1, Number(tor.seeds) || 10),
                  leechers: Number(tor.peers) || 2,
                });
              }
            }
          } catch {
            // Ignore timeout
          }
        })(),
      );
    }

    await Promise.allSettled(tasks);
    res.json({ items: results });
  });

  // ── Real WebTorrent P2P Hybrid Bridge (Zero Server Disk Storage) ──────────
  let wtClientPromise: Promise<any> | null = null;
  let memoryChunkStoreMod: any = null;
  const torrentLastAccess = new Map<string, number>();

  const DEFAULT_BRIDGE_TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://open.demonii.com:1337/announce",
    "http://tracker.opentrackr.org:1337/announce",
    "wss://tracker.openwebtorrent.com",
    "wss://tracker.btorrent.xyz",
  ];

  async function getWebTorrentClient() {
    if (!wtClientPromise) {
      wtClientPromise = (async () => {
        // @ts-expect-error webtorrent ships without bundled .d.ts
        const wtMod: any = await import("webtorrent");
        const WebTorrentCtor = wtMod.default || wtMod;
        try {
          // @ts-expect-error memory-chunk-store ships without bundled .d.ts
          const memMod: any = await import("memory-chunk-store");
          memoryChunkStoreMod = memMod.default || memMod;
        } catch {
          memoryChunkStoreMod = undefined;
        }
        const client = new WebTorrentCtor({
          dht: true,
          tracker: true,
          webSeeds: true,
        });
        client.on("error", () => {});
        return client;
      })();
    }
    return wtClientPromise;
  }

  async function fetchTorrentBufferFromPublicCache(
    infoHash: string,
  ): Promise<Buffer | null> {
    const upper = infoHash.toUpperCase();
    const cacheUrls = [
      `https://itorrents.org/torrent/${upper}.torrent`,
      `https://btcache.me/torrent/${upper}`,
    ];
    for (const url of cacheUrls) {
      try {
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
          signal: AbortSignal.timeout(2500),
        });
        if (r.ok) {
          const ct = r.headers.get("content-type") || "";
          if (!ct.includes("text/html")) {
            const ab = await r.arrayBuffer();
            if (ab.byteLength > 100) {
              return Buffer.from(ab);
            }
          }
        }
      } catch {
        // try next cache
      }
    }
    return null;
  }

  function markFileByteRangeCritical(
    torrent: any,
    mainFile: any,
    byteStart: number,
    byteEnd: number,
  ): void {
    try {
      if (!torrent || typeof torrent.critical !== "function") return;
      const tPieceLen = Math.max(16384, Number(torrent.pieceLength) || 262144);
      const fileOffset = Number(mainFile.offset) || 0;
      const fileLen = Number(mainFile.length) || 0;
      const clampedStart = Math.max(0, Math.min(fileLen - 1, byteStart));
      const clampedEnd = Math.max(
        clampedStart,
        Math.min(fileLen - 1, byteEnd),
      );
      const startPiece = Math.floor((fileOffset + clampedStart) / tPieceLen);
      const endPiece = Math.floor((fileOffset + clampedEnd) / tPieceLen);
      torrent.critical(startPiece, Math.max(startPiece, endPiece));
    } catch {
      // ignore if critical range is out of bounds
    }
  }

  async function ensureActiveTorrent(
    infoHash: string,
    magnetUri?: string,
    timeoutMs = 15000,
  ): Promise<{ torrent: any; mainFile: any }> {
    const client = await getWebTorrentClient();
    const cleanHash = infoHash.trim().toLowerCase();
    torrentLastAccess.set(cleanHash, Date.now());

    // Clean up idle torrents older than 10 minutes to free memory
    for (const tor of client.torrents || []) {
      const h = String(tor.infoHash || "").toLowerCase();
      const last = torrentLastAccess.get(h) || Date.now();
      if (h !== cleanHash && Date.now() - last > 10 * 60 * 1000) {
        try {
          tor.destroy();
          torrentLastAccess.delete(h);
        } catch {}
      }
    }

    let torrent = (client.torrents || []).find(
      (t: any) => String(t.infoHash || "").toLowerCase() === cleanHash,
    );

    if (!torrent) {
      const cachedTorrentBuf =
        await fetchTorrentBufferFromPublicCache(cleanHash);
      // Merge trackers from the incoming magnet URI with default bridge trackers
      const mergedTrackers = new Set<string>(DEFAULT_BRIDGE_TRACKERS);
      if (magnetUri) {
        try {
          const qIdx = magnetUri.indexOf("?");
          if (qIdx >= 0) {
            const sp = new URLSearchParams(magnetUri.slice(qIdx + 1));
            for (const tr of sp.getAll("tr")) {
              if (tr) mergedTrackers.add(tr);
            }
          }
        } catch {}
      }
      const announceList = Array.from(mergedTrackers);
      const targetId =
        cachedTorrentBuf ||
        magnetUri ||
        `magnet:?xt=urn:btih:${cleanHash}&tr=${announceList.map(encodeURIComponent).join("&tr=")}`;

      const addOpts: Record<string, unknown> = {
        announce: announceList,
      };
      if (memoryChunkStoreMod) {
        addOpts.store = memoryChunkStoreMod;
      }
      torrent = client.add(targetId, addOpts);
    }

    if (!torrent.ready) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(
            new Error("انتهت مهلة انتظار استجابة النظراء في سرب التورنت"),
          );
        }, timeoutMs);

        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = (err: Error) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          clearTimeout(timer);
          torrent.removeListener("ready", onReady);
          torrent.removeListener("error", onError);
        };

        torrent.once("ready", onReady);
        torrent.once("error", onError);
      });
    }

    const files: any[] = torrent.files || [];
    if (files.length === 0) {
      throw new Error("لا توجد ملفات فيديو داخل هذا التورنت");
    }

    const videoFiles = files.filter((f) =>
      /\.(mp4|mkv|webm|avi|mov|m4v|ts)$/i.test(String(f.name || "")),
    );
    const pool = videoFiles.length > 0 ? videoFiles : files;
    const mainFile = pool.reduce((a, b) => (a.length >= b.length ? a : b));

    // Deselect non-main files so 100% of swarm bandwidth goes to the video
    for (const f of files) {
      if (f !== mainFile && typeof f.deselect === "function") {
        f.deselect();
      }
    }

    // Secret #1: Prioritize Header (first 2 MB) + Tail (last 2 MB for MP4 moov / MKV Cues) immediately!
    const fileLen = Number(mainFile.length) || 0;
    if (fileLen > 0) {
      const twoMB = Math.min(fileLen, 2 * 1024 * 1024);
      markFileByteRangeCritical(torrent, mainFile, 0, twoMB - 1);
      if (fileLen > twoMB) {
        markFileByteRangeCritical(
          torrent,
          mainFile,
          Math.max(0, fileLen - twoMB),
          fileLen - 1,
        );
      }
    }

    return { torrent, mainFile };
  }

  function readStreamRangeToBuffer(
    mainFile: any,
    start: number,
    end: number,
    timeoutMs = 22000,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = mainFile.createReadStream({ start, end });
      const timer = setTimeout(() => {
        try {
          stream.destroy();
        } catch {}
        reject(new Error("انتهت مهلة سحب القطعة من نظراء التورنت"));
      }, timeoutMs);

      stream.on("data", (chunk: Buffer) => {
        chunks.push(Buffer.from(chunk));
      });
      stream.on("end", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      stream.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // 1. Resolve Real Torrent Metadata (True File Size, True Video File Name, Peers)
  app.get("/api/cinema-download/torrent-meta", async (req, res) => {
    const infoHash = String(req.query.infoHash || "").trim().toLowerCase();
    const magnetUri = String(req.query.magnet || "").trim();

    if (!/^[0-9a-f]{40}$/.test(infoHash)) {
      res.status(400).json({ ok: false, error: "بصمة infoHash غير صالحة" });
      return;
    }

    try {
      const { torrent, mainFile } = await ensureActiveTorrent(
        infoHash,
        magnetUri || undefined,
        15000,
      );
      const fileSize = Number(mainFile.length) || 0;
      const chunkLen =
        fileSize >= 2 * 1024 * 1024 * 1024 ? 2 * 1024 * 1024 : 1024 * 1024;
      const totalPieces = Math.max(1, Math.ceil(fileSize / chunkLen));

      res.json({
        ok: true,
        infoHash,
        fileName: String(mainFile.name || "movie.mp4"),
        fileSize,
        pieceLength: chunkLen,
        totalPieces,
        peers: Math.max(1, Number(torrent.numPeers) || 1),
      });
    } catch (err: any) {
      res.status(504).json({
        ok: false,
        error: err?.message || "تعذر الاتصال بموزعي هذا التورنت حالياً",
      });
    }
  });

  // 1B. Dynamic Seek Reprioritization Endpoint (Sliding-Window Seek Priority)
  app.post("/api/cinema-download/seek-priority", async (req, res) => {
    const infoHash = String(req.body?.infoHash || "")
      .trim()
      .toLowerCase();
    const magnetUri = String(req.body?.magnet || "").trim();
    const byteOffset = Math.max(0, Number(req.body?.byteOffset) || 0);
    const windowBytes = Math.max(
      2 * 1024 * 1024,
      Number(req.body?.windowBytes) || 12 * 1024 * 1024,
    );

    if (!/^[0-9a-f]{40}$/.test(infoHash)) {
      res.status(400).json({ ok: false });
      return;
    }

    try {
      const { torrent, mainFile } = await ensureActiveTorrent(
        infoHash,
        magnetUri || undefined,
        10000,
      );
      markFileByteRangeCritical(
        torrent,
        mainFile,
        byteOffset,
        byteOffset + windowBytes - 1,
      );
      res.json({
        ok: true,
        infoHash,
        byteOffset,
        peers: Math.max(1, Number(torrent.numPeers) || 1),
      });
    } catch {
      res.status(202).json({ ok: false });
    }
  });

  // 2. Resolve HLS (.m3u8) Media Playlist Segments for Real Direct Stream Assembly
  app.get("/api/cinema-download/hls-segments", async (req, res) => {
    const playlistUrl = String(req.query.url || "").trim();
    const referer = String(req.query.referer || "").trim();

    if (!/^https?:\/\//i.test(playlistUrl)) {
      res.status(400).json({ ok: false, error: "رابط قائمة HLS غير صالح" });
      return;
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    };
    if (referer) headers.Referer = referer;

    try {
      const r1 = await fetch(playlistUrl, {
        headers,
        signal: AbortSignal.timeout(7000),
      });
      if (!r1.ok) {
        throw new Error(`HTTP ${r1.status}`);
      }
      let manifestText = await r1.text();
      let activePlaylistUrl = playlistUrl;

      if (manifestText.includes("#EXT-X-STREAM-INF")) {
        const lines = manifestText.split(/\r?\n/);
        let bestBw = -1;
        let bestUri = "";
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXT-X-STREAM-INF")) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
            const bw = bwMatch ? Number(bwMatch[1]) : 0;
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (!nextLine) continue;
              if (!nextLine.startsWith("#")) {
                if (bw >= bestBw) {
                  bestBw = bw;
                  bestUri = new URL(nextLine, playlistUrl).toString();
                }
              }
              break;
            }
          }
        }
        if (bestUri) {
          activePlaylistUrl = bestUri;
          const r2 = await fetch(bestUri, {
            headers,
            signal: AbortSignal.timeout(7000),
          });
          if (r2.ok) {
            manifestText = await r2.text();
          }
        }
      }

      const segments: string[] = [];
      let isFmp4 = false;
      for (const rawLine of manifestText.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith("#EXT-X-MAP:")) {
          const uriMatch = line.match(/URI="([^"]+)"/i);
          if (uriMatch?.[1]) {
            segments.push(new URL(uriMatch[1], activePlaylistUrl).toString());
            isFmp4 = true;
          }
        } else if (!line.startsWith("#")) {
          segments.push(new URL(line, activePlaylistUrl).toString());
        }
      }

      if (segments.length === 0) {
        throw new Error("لم يتم العثور على مقاطع فيديو داخل قائمة البث");
      }

      res.json({
        ok: true,
        playlistUrl: activePlaylistUrl,
        isFmp4,
        totalSegments: segments.length,
        segments,
      });
    } catch (err: any) {
      res.status(502).json({
        ok: false,
        error: err?.message || "تعذر تحليل قائمة مقاطع البث المباشر",
      });
    }
  });

  // 3. Real Binary Piece & Segment Fetcher with Sliding-Window Swarm Priority (Zero Synthetic Bytes!)
  app.get("/api/cinema-download/piece", async (req, res) => {
    const infoHash = String(req.query.infoHash || "").trim().toLowerCase();
    const magnetUri = String(req.query.magnet || "").trim();
    const pieceIndex = Math.max(0, Number(req.query.pieceIndex) || 0);
    const pieceLength = Math.min(
      4 * 1024 * 1024,
      Math.max(16384, Number(req.query.pieceLength) || 1048576),
    );
    const totalSize = Math.max(
      pieceLength,
      Number(req.query.totalSize) || pieceLength,
    );
    const directUrl = String(req.query.directUrl || "").trim();
    const segmentUrl = String(req.query.segmentUrl || "").trim();
    const referer = String(req.query.referer || "").trim();

    // Path A: Fetch a complete HLS Video Segment (.ts / .m4s)
    if (segmentUrl && /^https?:\/\//i.test(segmentUrl)) {
      try {
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        };
        if (referer) headers.Referer = referer;
        const upstream = await fetch(segmentUrl, {
          headers,
          signal: AbortSignal.timeout(12000),
        });
        if (!upstream.ok) {
          res
            .status(502)
            .json({ error: `فشل سحب مقطع الفيديو HTTP ${upstream.status}` });
          return;
        }
        const arrBuf = await upstream.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length === 0) {
          res.status(502).json({ error: "مقطع الفيديو المستلم فارغ" });
          return;
        }
        const sha1 = crypto.createHash("sha1").update(buf).digest("hex");
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Piece-Index", String(pieceIndex));
        res.setHeader("X-Piece-SHA1", sha1);
        res.setHeader("X-Piece-Length", String(buf.length));
        res.setHeader("Cache-Control", "no-store");
        res.send(buf);
        return;
      } catch (err: any) {
        res.status(502).json({ error: err?.message || "فشل تحميل مقطع البث" });
        return;
      }
    }

    const byteStart = pieceIndex * pieceLength;
    const remaining = Math.max(0, totalSize - byteStart);
    const actualLen = Math.min(pieceLength, remaining || pieceLength);

    // Path B: Direct MP4 HTTP Byte-Range Request
    if (directUrl && /^https?:\/\//i.test(directUrl)) {
      try {
        const rangeEnd = byteStart + actualLen - 1;
        const headers: Record<string, string> = {
          Range: `bytes=${byteStart}-${rangeEnd}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        };
        if (referer) headers.Referer = referer;
        const upstream = await fetch(directUrl, {
          headers,
          signal: AbortSignal.timeout(12000),
        });
        if (upstream.ok || upstream.status === 206) {
          const arrBuf = await upstream.arrayBuffer();
          const buf = Buffer.from(arrBuf).subarray(0, actualLen);
          if (buf.length > 0) {
            const sha1 = crypto.createHash("sha1").update(buf).digest("hex");
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("X-Piece-Index", String(pieceIndex));
            res.setHeader("X-Piece-SHA1", sha1);
            res.setHeader("X-Piece-Length", String(buf.length));
            res.setHeader("Cache-Control", "no-store");
            res.send(buf);
            return;
          }
        }
        res
          .status(502)
          .json({ error: "الخادم المباشر لم يعد بيانات صالحة لهذه القطعة" });
        return;
      } catch (err: any) {
        res.status(502).json({
          error: err?.message || "فشل الاتصال برابط الفيديو المباشر",
        });
        return;
      }
    }

    // Path C: Real WebTorrent Swarm Byte-Range Read with Sliding-Window Priority
    if (/^[0-9a-f]{40}$/.test(infoHash)) {
      try {
        const { torrent, mainFile } = await ensureActiveTorrent(
          infoHash,
          magnetUri || undefined,
          16000,
        );
        const trueFileSize = Number(mainFile.length) || totalSize;
        if (byteStart >= trueFileSize) {
          res.status(416).json({ error: "تجاوز نهاية ملف الفيديو الفعلي" });
          return;
        }
        const byteEnd = Math.min(trueFileSize - 1, byteStart + pieceLength - 1);
        // Mark this piece + next 3 pieces critical in the BitTorrent swarm!
        markFileByteRangeCritical(
          torrent,
          mainFile,
          byteStart,
          Math.min(trueFileSize - 1, byteEnd + 3 * pieceLength),
        );

        const buf = await readStreamRangeToBuffer(
          mainFile,
          byteStart,
          byteEnd,
          24000,
        );
        const sha1 = crypto.createHash("sha1").update(buf).digest("hex");

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Piece-Index", String(pieceIndex));
        res.setHeader("X-Piece-SHA1", sha1);
        res.setHeader("X-Piece-Length", String(buf.length));
        res.setHeader("X-Real-File-Size", String(trueFileSize));
        res.setHeader(
          "X-Real-File-Name",
          encodeURIComponent(String(mainFile.name || "")),
        );
        res.setHeader(
          "X-Active-Peers",
          String(Math.max(1, Number(torrent.numPeers) || 1)),
        );
        res.setHeader("Cache-Control", "no-store");
        res.send(buf);
        return;
      } catch (err: any) {
        res.status(504).json({
          error:
            err?.message ||
            "لم يستجب نظراء التورنت في الوقت المحدد — يرجى الضغط على استئناف أو اختيار جودة أخرى",
        });
        return;
      }
    }

    res.status(400).json({ error: "طلب قطعة غير مكتمل المعطيات" });
  });

  // 4. HTTP 206 Partial Content Progressive Torrent & Direct Video Streamer (Secret #2)
  // Powers instant `<video>` playback + arbitrary byte-range time seeking (e.g. jumping to 55:00)
  app.get("/api/cinema-download/range-stream", async (req, res) => {
    const infoHash = String(req.query.infoHash || "").trim().toLowerCase();
    const magnetUri = String(req.query.magnet || "").trim();
    const directUrl = String(req.query.directUrl || "").trim();
    const referer = String(req.query.referer || "").trim();
    const rangeHeader = String(req.headers.range || "");

    // Direct HTTP URL Range Proxy
    if (directUrl && /^https?:\/\//i.test(directUrl)) {
      try {
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        };
        if (rangeHeader) headers.Range = rangeHeader;
        if (referer) headers.Referer = referer;
        const upstream = await fetch(directUrl, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        res.status(upstream.status);
        upstream.headers.forEach((val, key) => {
          const low = key.toLowerCase();
          if (
            low === "content-type" ||
            low === "content-length" ||
            low === "content-range" ||
            low === "accept-ranges"
          ) {
            res.setHeader(key, val);
          }
        });
        res.setHeader("Accept-Ranges", "bytes");
        if (upstream.body) {
          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!res.writableEnded) {
                res.write(Buffer.from(value));
              }
            }
            if (!res.writableEnded) res.end();
          };
          req.on("close", () => {
            try {
              reader.cancel();
            } catch {}
          });
          await pump();
        } else {
          res.end();
        }
        return;
      } catch (err: any) {
        res.status(502).send(err?.message || "Direct range stream error");
        return;
      }
    }

    // Real Magnet / WebTorrent HTTP 206 Byte-Range Streamer
    if (!/^[0-9a-f]{40}$/.test(infoHash)) {
      res.status(400).send("Invalid infoHash for HTTP 206 range stream");
      return;
    }

    try {
      const { torrent, mainFile } = await ensureActiveTorrent(
        infoHash,
        magnetUri || undefined,
        18000,
      );
      const totalSize = Number(mainFile.length) || 0;
      if (totalSize <= 0) {
        res.status(404).send("Empty torrent video file");
        return;
      }

      let start = 0;
      let end = totalSize - 1;

      if (rangeHeader && rangeHeader.startsWith("bytes=")) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const parsedStart = parseInt(parts[0], 10);
        if (!Number.isNaN(parsedStart) && parsedStart >= 0) {
          start = Math.min(totalSize - 1, parsedStart);
        }
        if (parts[1] && parts[1].length > 0) {
          const parsedEnd = parseInt(parts[1], 10);
          if (!Number.isNaN(parsedEnd) && parsedEnd >= start) {
            end = Math.min(totalSize - 1, parsedEnd);
          }
        }
      }

      // Dynamic Seek Reprioritization: mark 12 MB ahead of the requested byte offset as critical!
      markFileByteRangeCritical(
        torrent,
        mainFile,
        start,
        Math.min(totalSize - 1, start + 12 * 1024 * 1024),
      );

      const contentLength = end - start + 1;
      res.status(rangeHeader ? 206 : 200);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      if (rangeHeader) {
        res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      }
      res.setHeader("Content-Length", String(contentLength));
      res.setHeader("Cache-Control", "no-store");

      const stream = mainFile.createReadStream({ start, end });
      req.on("close", () => {
        try {
          stream.destroy();
        } catch {}
      });
      stream.on("error", () => {
        if (!res.writableEnded) res.end();
      });
      stream.pipe(res);
    } catch (err: any) {
      res.status(504).send(err?.message || "Torrent range stream timeout");
    }
  });

  // 5. Direct Native Browser Stream Download
  app.get("/api/cinema-download/stream-file", async (req, res) => {
    const infoHash = String(req.query.infoHash || "").trim().toLowerCase();
    const magnetUri = String(req.query.magnet || "").trim();
    const requestedName = String(req.query.fileName || "movie.mp4").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );

    if (!/^[0-9a-f]{40}$/.test(infoHash)) {
      res.status(400).send("Invalid infoHash");
      return;
    }

    try {
      const { mainFile } = await ensureActiveTorrent(
        infoHash,
        magnetUri || undefined,
        18000,
      );
      const totalLen = Number(mainFile.length) || 0;
      const safeName = String(mainFile.name || requestedName).replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"`,
      );
      if (totalLen > 0) {
        res.setHeader("Content-Length", String(totalLen));
      }
      const stream = mainFile.createReadStream();
      req.on("close", () => {
        try {
          stream.destroy();
        } catch {}
      });
      stream.pipe(res);
    } catch (err: any) {
      res.status(504).send(err?.message || "Torrent swarm timeout");
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/NL', express.static(distPath));
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
