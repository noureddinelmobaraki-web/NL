/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Service Worker HTTP 206 Virtual Video Streamer (TPPIECES OPFS + Bridge Fallback)
 * Intercepts `/__tp_stream__/:infoHash` and `/virtual-torrent-stream/:infoHash`
 * requests from `<video>`, opens a MessageChannel (`SW_OPEN_RANGE`) to stream
 * verified 256 KiB chunks directly from `opfsStorageWorker.ts`, and falls back
 * to `/api/cinema-download/range-stream` if needed.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parseHttpRange(rangeHeader, totalLen) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return {
      status: 200,
      start: 0,
      end: totalLen > 0 ? totalLen - 1 : 2 * 1024 * 1024 - 1,
    };
  }
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  if (Number.isNaN(start) || start < 0) {
    return {
      status: 200,
      start: 0,
      end: totalLen > 0 ? totalLen - 1 : 2 * 1024 * 1024 - 1,
    };
  }
  const rawEnd =
    parts[1] && parts[1].length > 0
      ? parseInt(parts[1], 10)
      : totalLen > 0
        ? totalLen - 1
        : start + 2 * 1024 * 1024 - 1;
  const end =
    totalLen > 0 ? Math.min(totalLen - 1, Math.max(start, rawEnd)) : rawEnd;
  return { status: 206, start, end };
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isTpStream =
    url.pathname.includes('/__tp_stream__/') ||
    url.pathname.startsWith('/virtual-torrent-stream/');
  if (!isTpStream) {
    return;
  }

  event.respondWith(
    (async () => {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const pathHash = pathParts[pathParts.length - 1] || '';
      const infoHash = (
        url.searchParams.get('infoHash') ||
        pathHash ||
        ''
      ).toLowerCase();
      const totalSize = Number(url.searchParams.get('size') || 0);
      const pieceLen = Number(url.searchParams.get('pieceLen') || 1048576);
      const rangeHeader = event.request.headers.get('Range') || '';
      const { status, start, end } = parseHttpRange(rangeHeader, totalSize);

      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });

      const targetClient = allClients[0];
      if (targetClient && infoHash) {
        const targetPiece = Math.floor(start / Math.max(1, pieceLen));
        for (const client of allClients) {
          client.postMessage({
            type: 'TORRENT_SW_SEEK_RANGE',
            infoHash,
            byteStart: start,
            byteEnd: end,
            targetPiece,
          });
        }

        const channel = new MessageChannel();
        const stream = new ReadableStream({
          start(controller) {
            channel.port1.onmessage = (msgEvent) => {
              const msg = msgEvent.data;
              if (!msg) return;
              if (msg.type === 'CHUNK' && msg.buffer) {
                controller.enqueue(new Uint8Array(msg.buffer));
              } else if (msg.type === 'EOF') {
                try {
                  controller.close();
                } catch {}
                channel.port1.close();
              } else if (msg.type === 'ERROR') {
                try {
                  controller.error(new Error(msg.message || 'Stream error'));
                } catch {}
                channel.port1.close();
              }
            };
            targetClient.postMessage(
              {
                type: 'SW_OPEN_RANGE',
                infoHash,
                start,
                end,
              },
              [channel.port2],
            );
          },
          cancel() {
            try {
              channel.port1.postMessage({ type: 'ABORT_RANGE' });
              channel.port1.close();
            } catch {}
          },
        });

        const headers = new Headers({
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
        });
        if (totalSize > 0) {
          const contentLen = Math.max(0, end - start + 1);
          headers.set('Content-Length', String(contentLen));
          if (status === 206) {
            headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
          }
        }

        return new Response(stream, {
          status,
          statusText: status === 206 ? 'Partial Content' : 'OK',
          headers,
        });
      }

      const magnet = url.searchParams.get('magnet') || '';
      const directUrl = url.searchParams.get('directUrl') || '';
      const referer = url.searchParams.get('referer') || '';
      const apiParams = new URLSearchParams({
        infoHash,
        magnet,
        directUrl,
        referer,
      });
      const forwardHeaders = new Headers();
      if (rangeHeader) {
        forwardHeaders.set('Range', rangeHeader);
      }

      return fetch(`/api/cinema-download/range-stream?${apiParams.toString()}`, {
        method: 'GET',
        headers: forwardHeaders,
      });
    })(),
  );
});
