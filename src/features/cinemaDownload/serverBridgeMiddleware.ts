/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Node.js WebTorrent TCP/UDP/DHT & HLS Bridge Middleware
 * Mounted in BOTH `vite.config.ts` (for Google AI Studio, Vite dev, and Vite preview)
 * AND `server.ts` (for standalone Express).
 */

import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DEFAULT_BRIDGE_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'https://tracker.tamersunion.org:443/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
];

let wtClientPromise: Promise<any> | null = null;
let memoryChunkStoreMod: any = null;
const torrentLastAccess = new Map<string, number>();
const pendingTorrents = new Map<
  string,
  Promise<{ torrent: any; mainFile: any }>
>();
const uploadedTorrentBuffers = new Map<string, Buffer>();

async function getWebTorrentClient() {
  if (!wtClientPromise) {
    wtClientPromise = (async () => {
      // @ts-expect-error webtorrent ships without bundled .d.ts
      const wtMod: any = await import('webtorrent');
      const WebTorrentCtor = wtMod.default || wtMod;
      try {
        // @ts-expect-error memory-chunk-store ships without bundled .d.ts
        const memMod: any = await import('memory-chunk-store');
        memoryChunkStoreMod = memMod.default || memMod;
      } catch {
        memoryChunkStoreMod = undefined;
      }
      const client = new WebTorrentCtor({
        dht: true,
        tracker: true,
        webSeeds: true,
      });
      client.on('error', () => {});
      return client;
    })();
  }
  return wtClientPromise;
}

async function fetchTorrentBufferFromPublicCache(
  infoHash: string,
): Promise<Buffer | null> {
  const clean = infoHash.toLowerCase();
  const uploaded = uploadedTorrentBuffers.get(clean);
  if (uploaded) return uploaded;

  const upper = infoHash.toUpperCase();
  const cacheUrls = [
    `https://itorrents.org/torrent/${upper}.torrent`,
    `https://btcache.me/torrent/${upper}`,
    `https://torrage.info/torrent.php?h=${upper}`,
  ];
  for (const url of cacheUrls) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('text/html')) {
          const ab = await r.arrayBuffer();
          const buf = Buffer.from(ab);
          if (buf.length > 100 && buf[0] === 0x64) {
            uploadedTorrentBuffers.set(clean, buf);
            return buf;
          }
        }
      }
    } catch {}
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
    if (!torrent || typeof torrent.critical !== 'function') return;
    const tPieceLen = Math.max(16384, Number(torrent.pieceLength) || 262144);
    const fileOffset = Number(mainFile.offset) || 0;
    const fileLen = Number(mainFile.length) || 0;
    if (fileLen <= 0) return;
    const clampedStart = Math.max(0, Math.min(fileLen - 1, byteStart));
    const clampedEnd = Math.max(clampedStart, Math.min(fileLen - 1, byteEnd));
    const startPiece = Math.floor((fileOffset + clampedStart) / tPieceLen);
    const endPiece = Math.floor((fileOffset + clampedEnd) / tPieceLen);
    torrent.critical(startPiece, Math.max(startPiece, endPiece));
  } catch {}
}

async function ensureActiveTorrent(
  infoHash: string,
  magnetUri?: string,
  timeoutMs = 22000,
): Promise<{ torrent: any; mainFile: any }> {
  const cleanHash = infoHash.trim().toLowerCase();
  const inflight = pendingTorrents.get(cleanHash);
  if (inflight) {
    return inflight;
  }

  const promise = (async () => {
    const client = await getWebTorrentClient();
    torrentLastAccess.set(cleanHash, Date.now());

    for (const tor of client.torrents || []) {
      const h = String(tor.infoHash || '').toLowerCase();
      const last = torrentLastAccess.get(h) || Date.now();
      if (h !== cleanHash && Date.now() - last > 10 * 60 * 1000) {
        try {
          tor.destroy();
          torrentLastAccess.delete(h);
        } catch {}
      }
    }

    let torrent = (client.torrents || []).find(
      (t: any) => String(t.infoHash || '').toLowerCase() === cleanHash,
    );

    if (!torrent) {
      const cachedTorrentBuf =
        await fetchTorrentBufferFromPublicCache(cleanHash);
      const mergedTrackers = new Set<string>(DEFAULT_BRIDGE_TRACKERS);
      if (magnetUri) {
        try {
          const qIdx = magnetUri.indexOf('?');
          if (qIdx >= 0) {
            const sp = new URLSearchParams(magnetUri.slice(qIdx + 1));
            for (const tr of sp.getAll('tr')) {
              if (tr) mergedTrackers.add(tr);
            }
          }
        } catch {}
      }
      const announceList = Array.from(mergedTrackers);
      const targetId =
        cachedTorrentBuf ||
        magnetUri ||
        `magnet:?xt=urn:btih:${cleanHash}&tr=${announceList.map(encodeURIComponent).join('&tr=')}`;

      const addOpts: Record<string, unknown> = {
        announce: announceList,
      };
      if (memoryChunkStoreMod) {
        addOpts.store = memoryChunkStoreMod;
      }
      const existingAgain = (client.torrents || []).find(
        (t: any) => String(t.infoHash || '').toLowerCase() === cleanHash,
      );
      torrent = existingAgain || client.add(targetId, addOpts);
    }

    if (!torrent.ready) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(
            new Error('انتهت مهلة انتظار استجابة النظراء في سرب التورنت'),
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
          torrent.removeListener('ready', onReady);
          torrent.removeListener('error', onError);
        };

        torrent.once('ready', onReady);
        torrent.once('error', onError);
      });
    }

    const files: any[] = torrent.files || [];
    if (files.length === 0) {
      throw new Error('لا توجد ملفات فيديو داخل هذا التورنت');
    }

    const videoFiles = files.filter((f) =>
      /\.(mp4|mkv|webm|avi|mov|m4v|ts)$/i.test(String(f.name || '')),
    );
    const pool = videoFiles.length > 0 ? videoFiles : files;
    const mainFile = pool.reduce((a, b) => (a.length >= b.length ? a : b));

    for (const f of files) {
      if (f !== mainFile && typeof f.deselect === 'function') {
        f.deselect();
      }
    }
    if (typeof mainFile.select === 'function') {
      mainFile.select();
    }

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
  })();

  pendingTorrents.set(cleanHash, promise);
  try {
    return await promise;
  } finally {
    pendingTorrents.delete(cleanHash);
  }
}

function readStreamRangeToBuffer(
  mainFile: any,
  start: number,
  end: number,
  timeoutMs = 25000,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = mainFile.createReadStream({ start, end });
    const timer = setTimeout(() => {
      try {
        stream.destroy();
      } catch {}
      reject(new Error('انتهت مهلة سحب القطعة من نظراء التورنت'));
    }, timeoutMs);

    stream.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body && typeof (req as any).body === 'object') {
    return Promise.resolve((req as any).body);
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function handleDiscoverRequest(sp: URLSearchParams, res: ServerResponse) {
  const imdbId = String(sp.get('imdbId') || '').trim();
  const mediaType = String(sp.get('mediaType') || 'movie').trim();
  const season = Math.max(1, Number(sp.get('season')) || 1);
  const episode = Math.max(1, Number(sp.get('episode')) || 1);
  const results: any[] = [];

  if (!imdbId || !/^tt\d+$/.test(imdbId)) {
    sendJson(res, 200, { items: results });
    return;
  }

  try {
    const endpoint =
      mediaType === 'tv'
        ? `https://torrentio.strem.fun/stream/series/${encodeURIComponent(imdbId)}:${season}:${episode}.json`
        : `https://torrentio.strem.fun/stream/movie/${encodeURIComponent(imdbId)}.json`;
    const r = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      signal: AbortSignal.timeout(4500),
    });
    if (r.ok) {
      const data = (await r.json()) as { streams?: any[] };
      for (const st of data.streams || []) {
        if (!st.infoHash || !/^[0-9a-fA-F]{40}$/.test(st.infoHash)) continue;
        const rawTitle = `${st.name || ''} ${st.title || ''}`.replace(
          /\r?\n/g,
          ' ',
        );
        const seedMatch = rawTitle.match(/👤\s*(\d+)/);
        const sizeMatch = rawTitle.match(/💾\s*([\d.]+)\s*(GB|MB)/i);
        let sizeBytes = 0;
        if (sizeMatch) {
          const num = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toUpperCase();
          sizeBytes = Math.round(
            num * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024),
          );
        }
        const firstLine = (st.title || '').split(/\r?\n/)[0] || rawTitle;
        results.push({
          source: 'Torrentio',
          title: firstLine.trim(),
          infoHash: st.infoHash.toLowerCase(),
          sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
          seeders: seedMatch ? Number(seedMatch[1]) : 25,
        });
      }
    }
  } catch {}

  sendJson(res, 200, { items: results });
}

async function handlePieceRequest(sp: URLSearchParams, res: ServerResponse) {
  const infoHash = String(sp.get('infoHash') || '')
    .trim()
    .toLowerCase();
  const magnetUri = String(sp.get('magnet') || '').trim();
  const pieceIndex = Math.max(0, Number(sp.get('pieceIndex')) || 0);
  const pieceLength = Math.min(
    4 * 1024 * 1024,
    Math.max(16384, Number(sp.get('pieceLength')) || 1048576),
  );
  const totalSize = Math.max(
    pieceLength,
    Number(sp.get('totalSize')) || pieceLength,
  );
  const directUrl = String(sp.get('directUrl') || '').trim();
  const segmentUrl = String(sp.get('segmentUrl') || '').trim();
  const referer = String(sp.get('referer') || '').trim();

  if (segmentUrl && /^https?:\/\//i.test(segmentUrl)) {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };
      if (referer) headers.Referer = referer;
      const upstream = await fetch(segmentUrl, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) {
        sendJson(res, 502, {
          error: `فشل سحب مقطع الفيديو HTTP ${upstream.status}`,
        });
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Piece-Index', String(pieceIndex));
      res.setHeader('X-Piece-SHA1', sha1);
      res.setHeader('X-Piece-Length', String(buf.length));
      res.setHeader('Cache-Control', 'no-store');
      res.end(buf);
      return;
    } catch (err: any) {
      sendJson(res, 502, { error: err?.message || 'فشل تحميل مقطع البث' });
      return;
    }
  }

  const byteStart = pieceIndex * pieceLength;
  const remaining = Math.max(0, totalSize - byteStart);
  const actualLen = Math.min(pieceLength, remaining || pieceLength);

  if (directUrl && /^https?:\/\//i.test(directUrl)) {
    try {
      const rangeEnd = byteStart + actualLen - 1;
      const headers: Record<string, string> = {
        Range: `bytes=${byteStart}-${rangeEnd}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };
      if (referer) headers.Referer = referer;
      const upstream = await fetch(directUrl, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (upstream.ok || upstream.status === 206) {
        const buf = Buffer.from(await upstream.arrayBuffer()).subarray(
          0,
          actualLen,
        );
        if (buf.length > 0) {
          const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('X-Piece-Index', String(pieceIndex));
          res.setHeader('X-Piece-SHA1', sha1);
          res.setHeader('X-Piece-Length', String(buf.length));
          res.setHeader('Cache-Control', 'no-store');
          res.end(buf);
          return;
        }
      }
      sendJson(res, 502, {
        error: 'الخادم المباشر لم يعد بيانات صالحة لهذه القطعة',
      });
      return;
    } catch (err: any) {
      sendJson(res, 502, {
        error: err?.message || 'فشل الاتصال برابط الفيديو المباشر',
      });
      return;
    }
  }

  if (/^[0-9a-f]{40}$/.test(infoHash)) {
    try {
      const { torrent, mainFile } = await ensureActiveTorrent(
        infoHash,
        magnetUri || undefined,
        20000,
      );
      const trueFileSize = Number(mainFile.length) || totalSize;
      if (byteStart >= trueFileSize) {
        sendJson(res, 416, { error: 'تجاوز نهاية ملف الفيديو الفعلي' });
        return;
      }
      const byteEnd = Math.min(
        trueFileSize - 1,
        byteStart + pieceLength - 1,
      );
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
        25000,
      );
      const sha1 = crypto.createHash('sha1').update(buf).digest('hex');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Piece-Index', String(pieceIndex));
      res.setHeader('X-Piece-SHA1', sha1);
      res.setHeader('X-Piece-Length', String(buf.length));
      res.setHeader('X-Real-File-Size', String(trueFileSize));
      res.setHeader(
        'X-Real-File-Name',
        encodeURIComponent(String(mainFile.name || '')),
      );
      res.setHeader(
        'X-Active-Peers',
        String(Math.max(1, Number(torrent.numPeers) || 1)),
      );
      res.setHeader('Cache-Control', 'no-store');
      res.end(buf);
      return;
    } catch (err: any) {
      sendJson(res, 504, {
        error:
          err?.message ||
          'لم يستجب نظراء التورنت في الوقت المحدد — اضغط استئناف أو جرب جودة أخرى',
      });
      return;
    }
  }

  sendJson(res, 400, { error: 'طلب قطعة غير مكتمل المعطيات' });
}

export function createCinemaDownloadBridgeMiddleware() {
  return async function cinemaDownloadBridgeMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) {
    const rawUrl = req.url || '';
    const normalizedUrl = rawUrl.replace(/^\/NL(?=\/api\/cinema-download)/i, '');
    if (!normalizedUrl.startsWith('/api/cinema-download/')) {
      next();
      return;
    }

    const parsedUrl = new URL(normalizedUrl, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const sp = parsedUrl.searchParams;

    if (pathname === '/api/cinema-download/health') {
      sendJson(res, 200, { ok: true, bridge: 'webtorrent-node-tcp-udp' });
      return;
    }

    if (
      pathname === '/api/cinema-download/upload-torrent' &&
      req.method === 'POST'
    ) {
      const body = await readJsonBody(req);
      const infoHash = String(body?.infoHash || '')
        .trim()
        .toLowerCase();
      const torrentBase64 = String(body?.torrentBase64 || '').trim();
      if (!/^[0-9a-f]{40}$/.test(infoHash) || !torrentBase64) {
        sendJson(res, 400, { ok: false, error: 'Invalid torrent payload' });
        return;
      }
      try {
        const buf = Buffer.from(torrentBase64, 'base64');
        if (buf.length > 50 && buf[0] === 0x64) {
          uploadedTorrentBuffers.set(infoHash, buf);
        }
        sendJson(res, 200, { ok: true, infoHash, cachedBytes: buf.length });
      } catch (err: any) {
        sendJson(res, 500, { ok: false, error: err?.message });
      }
      return;
    }

    if (pathname === '/api/cinema-download/discover') {
      await handleDiscoverRequest(sp, res);
      return;
    }

    if (pathname === '/api/cinema-download/torrent-meta') {
      const infoHash = String(sp.get('infoHash') || '')
        .trim()
        .toLowerCase();
      const magnetUri = String(sp.get('magnet') || '').trim();

      if (!/^[0-9a-f]{40}$/.test(infoHash)) {
        sendJson(res, 400, { ok: false, error: 'بصمة infoHash غير صالحة' });
        return;
      }

      try {
        const { torrent, mainFile } = await ensureActiveTorrent(
          infoHash,
          magnetUri || undefined,
          18000,
        );
        const fileSize = Number(mainFile.length) || 0;
        const chunkLen =
          fileSize >= 2 * 1024 * 1024 * 1024 ? 2 * 1024 * 1024 : 1024 * 1024;
        const totalPieces = Math.max(1, Math.ceil(fileSize / chunkLen));

        sendJson(res, 200, {
          ok: true,
          infoHash,
          fileName: String(mainFile.name || 'movie.mp4'),
          fileSize,
          pieceLength: chunkLen,
          totalPieces,
          peers: Math.max(1, Number(torrent.numPeers) || 1),
        });
      } catch (err: any) {
        sendJson(res, 504, {
          ok: false,
          error: err?.message || 'تعذر الاتصال بموزعي هذا التورنت حالياً',
        });
      }
      return;
    }

    if (
      pathname === '/api/cinema-download/seek-priority' &&
      req.method === 'POST'
    ) {
      const body = await readJsonBody(req);
      const infoHash = String(body?.infoHash || '')
        .trim()
        .toLowerCase();
      const magnetUri = String(body?.magnet || '').trim();
      const byteOffset = Math.max(0, Number(body?.byteOffset) || 0);
      const windowBytes = Math.max(
        2 * 1024 * 1024,
        Number(body?.windowBytes) || 12 * 1024 * 1024,
      );

      if (!/^[0-9a-f]{40}$/.test(infoHash)) {
        sendJson(res, 400, { ok: false });
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
        sendJson(res, 200, {
          ok: true,
          infoHash,
          byteOffset,
          peers: Math.max(1, Number(torrent.numPeers) || 1),
        });
      } catch {
        sendJson(res, 202, { ok: false });
      }
      return;
    }

    if (pathname === '/api/cinema-download/piece') {
      await handlePieceRequest(sp, res);
      return;
    }

    if (pathname === '/api/cinema-download/range-stream') {
      const infoHash = String(sp.get('infoHash') || '')
        .trim()
        .toLowerCase();
      const magnetUri = String(sp.get('magnet') || '').trim();
      const rangeHeader = String(req.headers.range || '');

      if (!/^[0-9a-f]{40}$/.test(infoHash)) {
        res.statusCode = 400;
        res.end('Invalid infoHash');
        return;
      }

      try {
        const { torrent, mainFile } = await ensureActiveTorrent(
          infoHash,
          magnetUri || undefined,
          18000,
        );
        const totalSize = Number(mainFile.length) || 0;
        let start = 0;
        let end = totalSize - 1;

        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
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

        markFileByteRangeCritical(
          torrent,
          mainFile,
          start,
          Math.min(totalSize - 1, start + 12 * 1024 * 1024),
        );

        const contentLength = end - start + 1;
        res.statusCode = rangeHeader ? 206 : 200;
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        if (rangeHeader) {
          res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        }
        res.setHeader('Content-Length', String(contentLength));
        res.setHeader('Cache-Control', 'no-store');

        const stream = mainFile.createReadStream({ start, end });
        req.on('close', () => {
          try {
            stream.destroy();
          } catch {}
        });
        stream.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        stream.pipe(res);
      } catch (err: any) {
        res.statusCode = 504;
        res.end(err?.message || 'Torrent range stream timeout');
      }
      return;
    }

    next();
  };
}
