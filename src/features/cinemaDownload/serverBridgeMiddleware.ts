/**
 * Unified WebTorrent (TCP/uTP/DHT) bridge. Mountable in Vite, Express, or standalone node:http.
 */
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const DEFAULT_TRACKERS = [
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
const VIDEO_RE = /\.(mp4|mkv|webm|avi|mov|m4v|ts)$/i;
const IDLE_TTL_MS = Number(process.env.BRIDGE_IDLE_TTL_MS) || 15 * 60 * 1000;
const READ_IDLE_MS = Number(process.env.BRIDGE_READ_IDLE_MS) || 45000;
const ALLOWED_ORIGINS = (process.env.BRIDGE_ALLOWED_ORIGINS ||
  'https://noureddinelmobaraki-web.github.io,http://localhost:3000,http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

interface TorrentEntry {
  torrent: any;
  mainFile: any | null;
  ready: Promise<void>;
  error: string | null;
  lastAccess: number;
  source: 'buffer' | 'magnet';
}

const entries = new Map<string, TorrentEntry>();
const torrentBuffers = new Map<string, Buffer>();
let clientPromise: Promise<any> | null = null;
let gcTimer: NodeJS.Timeout | null = null;

function getClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = (async () => {
      // @ts-expect-error webtorrent ships without bundled .d.ts
      const mod: any = await import('webtorrent');
      const WebTorrent = mod.default || mod;
      const client = new WebTorrent({
        dht: process.env.BRIDGE_DISABLE_DHT !== '1',
        utp: process.env.BRIDGE_DISABLE_UTP !== '1',
        lsd: false,
        natUpnp: false,
        natPmp: false,
        maxConns: Number(process.env.BRIDGE_MAX_CONNS) || 80,
      });
      client.on('error', (err: Error) => {
        console.error('[bridge] client error', err?.message);
        entries.clear();
        clientPromise = null;
      });
      if (!gcTimer) {
        gcTimer = setInterval(collectIdleTorrents, 60000);
        gcTimer.unref();
      }
      return client;
    })();
  }
  return clientPromise;
}

function collectIdleTorrents(): void {
  const now = Date.now();
  for (const [hash, entry] of entries) {
    if (now - entry.lastAccess > IDLE_TTL_MS) {
      try {
        entry.torrent.destroy({ destroyStore: true });
      } catch {
        /* already destroyed */
      }
      entries.delete(hash);
    }
  }
}

function looksLikeTorrent(buf: Buffer): boolean {
  return buf.length > 60 && buf[0] === 0x64 && buf.includes('4:info');
}

async function fetchTorrentFromCaches(hash: string, extraUrls: string[]): Promise<Buffer | null> {
  const upper = hash.toUpperCase();
  const urls = [
    ...extraUrls,
    `https://itorrents.org/torrent/${upper}.torrent`,
    `https://btcache.me/torrent/${upper}`,
    `https://torrage.info/torrent.php?h=${upper}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'application/x-bittorrent',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (looksLikeTorrent(buf)) return buf;
    } catch {
      /* try next cache */
    }
  }
  return null;
}

function parseMagnet(magnet?: string): { trackers: string[]; xs: string[] } {
  const out = { trackers: [] as string[], xs: [] as string[] };
  if (!magnet) return out;
  const q = magnet.indexOf('?');
  if (q < 0) return out;
  const sp = new URLSearchParams(magnet.slice(q + 1));
  out.trackers = sp.getAll('tr').filter(Boolean);
  out.xs = sp.getAll('xs').filter((u) => /^https?:\/\//i.test(u));
  return out;
}

function markCritical(torrent: any, file: any, start: number, end: number): void {
  try {
    const pl = Number(torrent.pieceLength) || 262144;
    const off = Number(file.offset) || 0;
    const len = Number(file.length) || 0;
    if (len <= 0) return;
    const s = Math.max(0, Math.min(len - 1, start));
    const e = Math.max(s, Math.min(len - 1, end));
    torrent.critical(Math.floor((off + s) / pl), Math.floor((off + e) / pl));
  } catch {
    /* torrent not ready */
  }
}

function pickMainFile(torrent: any): any {
  const files: any[] = torrent.files || [];
  const pool = files.filter((f) => VIDEO_RE.test(String(f.name)) && !/sample/i.test(String(f.name)));
  const candidates = pool.length ? pool : files;
  return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
}

async function addTorrent(hash: string, magnet?: string): Promise<TorrentEntry> {
  const client = await getClient();
  const { trackers, xs } = parseMagnet(magnet);
  let buf = torrentBuffers.get(hash) || null;
  if (!buf) {
    buf = await fetchTorrentFromCaches(hash, xs);
    if (buf) torrentBuffers.set(hash, buf);
  }
  const announce = Array.from(new Set([...DEFAULT_TRACKERS, ...trackers]));
  const id = buf || magnet || `magnet:?xt=urn:btih:${hash}`;
  const torrent = client.add(id, {
    announce,
    deselect: true,
    path: path.join(os.tmpdir(), 'nl-bridge'),
    destroyStoreOnDestroy: true,
    strategy: 'sequential',
  });

  const entry: TorrentEntry = {
    torrent,
    mainFile: null,
    error: null,
    lastAccess: Date.now(),
    source: buf ? 'buffer' : 'magnet',
    ready: Promise.resolve(),
  };

  entry.ready = new Promise<void>((resolve, reject) => {
    const onReady = () => {
      if (String(torrent.infoHash).toLowerCase() !== hash) {
        entry.error = 'infoHash mismatch between cached .torrent and requested hash';
        torrentBuffers.delete(hash);
        try {
          torrent.destroy();
        } catch {
          /* ignore */
        }
        reject(new Error(entry.error));
        return;
      }
      const main = pickMainFile(torrent);
      for (const f of torrent.files) if (f !== main) f.deselect();
      main.select();
      entry.mainFile = main;
      const two = Math.min(main.length, 2 * 1024 * 1024);
      markCritical(torrent, main, 0, two - 1);
      if (main.length > two) markCritical(torrent, main, main.length - two, main.length - 1);
      resolve();
    };
    const onError = (err: Error) => {
      entry.error = err?.message || 'torrent error';
      entries.delete(hash);
      reject(err);
    };
    if (torrent.ready) onReady();
    else torrent.once('ready', onReady);
    torrent.once('error', onError);
  });
  entry.ready.catch(() => undefined);
  entries.set(hash, entry);
  return entry;
}

async function getEntry(hash: string, magnet?: string): Promise<TorrentEntry> {
  const existing = entries.get(hash);
  if (existing) {
    existing.lastAccess = Date.now();
    const upgrade = existing.source === 'magnet' && !existing.torrent.ready && torrentBuffers.has(hash);
    if (!upgrade) return existing;
    try {
      existing.torrent.destroy();
    } catch {
      /* ignore */
    }
    entries.delete(hash);
  }
  return addTorrent(hash, magnet);
}

function waitWithTimeout(p: Promise<void>, ms: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(false), ms);
    p.then(
      () => {
        clearTimeout(t);
        resolve(true);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function readRange(file: any, start: number, end: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = file.createReadStream({ start, end });
    let idle: NodeJS.Timeout;
    const arm = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        try {
          stream.destroy();
        } catch {
          /* ignore */
        }
        reject(new Error('No data from peers for this piece (idle timeout)'));
      }, READ_IDLE_MS);
    };
    arm();
    stream.on('data', (c: Buffer) => {
      chunks.push(Buffer.from(c));
      arm();
    });
    stream.on('end', () => {
      clearTimeout(idle);
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', (e: Error) => {
      clearTimeout(idle);
      reject(e);
    });
  });
}

function readBody(req: IncomingMessage, limit = 24 * 1024 * 1024): Promise<Buffer> {
  const pre = (req as any).body;
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) {
    return Promise.resolve(Buffer.from(JSON.stringify(pre)));
  }
  if (Buffer.isBuffer(pre)) return Promise.resolve(pre);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(c));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = String(req.headers.origin || '');
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Range');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Piece-Index,X-Piece-SHA1,X-Piece-Length,X-Real-File-Size,X-Real-File-Name,X-Active-Peers,Content-Range,Accept-Ranges,Content-Length',
  );
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function sendPiece(
  res: ServerResponse,
  idx: number,
  buf: Buffer,
  extra: Record<string, string> = {},
): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('X-Piece-Index', String(idx));
  res.setHeader('X-Piece-SHA1', crypto.createHash('sha1').update(buf).digest('hex'));
  res.setHeader('X-Piece-Length', String(buf.length));
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(buf);
}

const isHash = (h: string) => /^[0-9a-f]{40}$/.test(h);

async function handleProxyPiece(
  sp: URLSearchParams,
  res: ServerResponse,
  idx: number,
  start: number,
  len: number,
): Promise<boolean> {
  const segmentUrl = String(sp.get('segmentUrl') || '');
  const directUrl = String(sp.get('directUrl') || '');
  const referer = String(sp.get('referer') || '');
  const target = /^https?:\/\//i.test(segmentUrl)
    ? segmentUrl
    : /^https?:\/\//i.test(directUrl)
      ? directUrl
      : '';
  if (!target) return false;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
  if (referer) headers.Referer = referer;
  if (target === directUrl) headers.Range = `bytes=${start}-${start + len - 1}`;
  try {
    const up = await fetch(target, { headers, signal: AbortSignal.timeout(20000) });
    if (target === directUrl && up.status !== 206 && !(up.status === 200 && start === 0)) {
      await up.body?.cancel();
      sendJson(res, 502, { error: `Upstream ignored Range (HTTP ${up.status})` });
      return true;
    }
    if (!up.ok) {
      sendJson(res, 502, { error: `Upstream HTTP ${up.status}` });
      return true;
    }
    let buf = Buffer.from(await up.arrayBuffer());
    if (target === directUrl) buf = buf.subarray(0, len);
    if (!buf.length) {
      sendJson(res, 502, { error: 'Empty upstream body' });
      return true;
    }
    sendPiece(res, idx, buf);
  } catch (e: any) {
    sendJson(res, 502, { error: e?.message || 'Upstream fetch failed' });
  }
  return true;
}

async function handleUploadTorrentRoute(
  req: IncomingMessage,
  res: ServerResponse,
  sp: URLSearchParams,
): Promise<void> {
  const raw = await readBody(req);
  const ct = String(req.headers['content-type'] || '');
  let hash = String(sp.get('infoHash') || '').toLowerCase();
  let buf: Buffer;
  if (ct.includes('application/json')) {
    const body = JSON.parse(raw.toString('utf8') || '{}');
    hash = String(body.infoHash || hash).toLowerCase();
    buf = Buffer.from(String(body.torrentBase64 || ''), 'base64');
  } else {
    buf = raw;
  }
  if (!isHash(hash) || !looksLikeTorrent(buf)) {
    sendJson(res, 400, { ok: false, error: 'Invalid torrent payload' });
    return;
  }
  torrentBuffers.set(hash, buf);
  const entry = await getEntry(hash);
  sendJson(res, 200, { ok: true, infoHash: hash, cachedBytes: buf.length, source: entry.source });
}

async function handleTorrentMetaRoute(res: ServerResponse, sp: URLSearchParams): Promise<void> {
  const hash = String(sp.get('infoHash') || '').toLowerCase();
  if (!isHash(hash)) {
    sendJson(res, 400, { ok: false, error: 'Invalid infoHash' });
    return;
  }
  const waitMs = Math.min(25000, Math.max(0, Number(sp.get('waitMs')) || 12000));
  const entry = await getEntry(hash, sp.get('magnet') || undefined);
  const ready = await waitWithTimeout(entry.ready, waitMs);
  if (!ready || !entry.mainFile) {
    sendJson(res, 202, {
      ok: false,
      pending: true,
      peers: entry.torrent.numPeers || 0,
      source: entry.source,
    });
    return;
  }
  const f = entry.mainFile;
  const pieceLength = f.length >= 2 * 1024 ** 3 ? 2 * 1024 * 1024 : 1024 * 1024;
  sendJson(res, 200, {
    ok: true,
    infoHash: hash,
    fileName: String(f.name),
    fileSize: f.length,
    pieceLength,
    totalPieces: Math.max(1, Math.ceil(f.length / pieceLength)),
    peers: entry.torrent.numPeers || 0,
    downloadSpeed: entry.torrent.downloadSpeed || 0,
    torrentBase64: Buffer.from(entry.torrent.torrentFile).toString('base64'),
  });
}

async function handlePieceRoute(res: ServerResponse, sp: URLSearchParams): Promise<void> {
  const idx = Math.max(0, Number(sp.get('pieceIndex')) || 0);
  const pieceLength = Math.min(4 * 1024 * 1024, Math.max(16384, Number(sp.get('pieceLength')) || 1048576));
  const totalSize = Math.max(pieceLength, Number(sp.get('totalSize')) || pieceLength);
  const start = idx * pieceLength;
  const len = Math.min(pieceLength, Math.max(1, totalSize - start));
  if (await handleProxyPiece(sp, res, idx, start, len)) return;

  const hash = String(sp.get('infoHash') || '').toLowerCase();
  if (!isHash(hash)) {
    sendJson(res, 400, { error: 'Incomplete piece request' });
    return;
  }
  const entry = await getEntry(hash, sp.get('magnet') || undefined);
  if (!(await waitWithTimeout(entry.ready, 20000)) || !entry.mainFile) {
    sendJson(res, 503, {
      error: 'Metadata still resolving — retry',
      pending: true,
      peers: entry.torrent.numPeers || 0,
    });
    return;
  }
  const f = entry.mainFile;
  if (start >= f.length) {
    sendJson(res, 416, { error: 'Beyond end of file' });
    return;
  }
  const end = Math.min(f.length - 1, start + pieceLength - 1);
  markCritical(entry.torrent, f, start, Math.min(f.length - 1, end + 4 * pieceLength));
  const buf = await readRange(f, start, end);
  sendPiece(res, idx, buf, {
    'X-Real-File-Size': String(f.length),
    'X-Real-File-Name': encodeURIComponent(String(f.name)),
    'X-Active-Peers': String(entry.torrent.numPeers || 0),
  });
}

async function handleRangeStreamRoute(
  req: IncomingMessage,
  res: ServerResponse,
  sp: URLSearchParams,
): Promise<void> {
  const hash = String(sp.get('infoHash') || '').toLowerCase();
  if (!isHash(hash)) {
    res.statusCode = 400;
    res.end('Invalid infoHash');
    return;
  }
  const entry = await getEntry(hash, sp.get('magnet') || undefined);
  if (!(await waitWithTimeout(entry.ready, 25000)) || !entry.mainFile) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '3');
    res.end('Metadata resolving');
    return;
  }
  const f = entry.mainFile;
  const total = f.length;
  let start = 0;
  let end = total - 1;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (m) {
    if (m[1]) start = Math.min(total - 1, Number(m[1]));
    if (m[2]) end = Math.min(total - 1, Math.max(start, Number(m[2])));
    if (!m[1] && m[2]) {
      start = Math.max(0, total - Number(m[2]));
      end = total - 1;
    }
  }
  markCritical(entry.torrent, f, start, Math.min(total - 1, start + 12 * 1024 * 1024));
  res.statusCode = m ? 206 : 200;
  res.setHeader('Content-Type', /\.mkv$/i.test(f.name) ? 'video/x-matroska' : 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', String(end - start + 1));
  if (m) res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  const stream = f.createReadStream({ start, end });
  req.on('close', () => {
    try {
      stream.destroy();
    } catch {
      /* ignore */
    }
  });
  stream.on('error', () => {
    if (!res.writableEnded) res.end();
  });
  stream.pipe(res);
}

export function createCinemaDownloadBridgeMiddleware() {
  return async function cinemaDownloadBridgeMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) {
    const url = (req.url || '').replace(/^\/NL(?=\/api\/cinema-download)/i, '');
    if (!url.startsWith('/api/cinema-download/')) {
      next();
      return;
    }
    applyCors(req, res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsed = new URL(url, 'http://localhost');
    const p = parsed.pathname;
    const sp = parsed.searchParams;

    try {
      if (p === '/api/cinema-download/health') {
        sendJson(res, 200, {
          ok: true,
          bridge: 'webtorrent-node',
          dht: process.env.BRIDGE_DISABLE_DHT !== '1',
          activeTorrents: entries.size,
        });
        return;
      }
      if (p === '/api/cinema-download/upload-torrent' && req.method === 'POST') {
        await handleUploadTorrentRoute(req, res, sp);
        return;
      }
      if (p === '/api/cinema-download/torrent-meta' || p === '/api/cinema-download/status') {
        await handleTorrentMetaRoute(res, sp);
        return;
      }
      if (p === '/api/cinema-download/seek-priority' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        const hash = String(body.infoHash || '').toLowerCase();
        const entry = isHash(hash) ? entries.get(hash) : undefined;
        if (!entry?.mainFile) {
          sendJson(res, 202, { ok: false });
          return;
        }
        const off = Math.max(0, Number(body.byteOffset) || 0);
        const win = Math.max(2 * 1024 * 1024, Number(body.windowBytes) || 12 * 1024 * 1024);
        markCritical(entry.torrent, entry.mainFile, off, off + win - 1);
        sendJson(res, 200, { ok: true, peers: entry.torrent.numPeers || 0 });
        return;
      }
      if (p === '/api/cinema-download/piece') {
        await handlePieceRoute(res, sp);
        return;
      }
      if (p === '/api/cinema-download/range-stream') {
        await handleRangeStreamRoute(req, res, sp);
        return;
      }
    } catch (err: any) {
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Bridge error' });
      }
      return;
    }
    next();
  };
}

export function startStandaloneBridge(port: number): void {
  const mw = createCinemaDownloadBridgeMiddleware();
  createServer((req, res) => {
    void mw(req, res, () => {
      applyCors(req, res);
      sendJson(res, 404, { error: 'Not found' });
    });
  }).listen(port, '0.0.0.0', () => console.log(`[bridge] listening on :${port}`));
}
