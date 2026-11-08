/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated HTTP 206 Byte-Range Virtual Streamer Service Worker (`/__tp_stream__/:infoHash`)
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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
      const qs = new URLSearchParams({
        infoHash,
        magnet: url.searchParams.get('magnet') || '',
        directUrl: url.searchParams.get('directUrl') || '',
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
  const m = TP_STREAM_RE.exec(new URL(event.request.url).pathname);
  if (m) {
    tpHandleStream(event, m);
    event.stopImmediatePropagation();
  }
});
