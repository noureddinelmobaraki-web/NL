/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Service Worker HTTP 206 Virtual Video Streamer (Secret #2)
 * Intercepts virtual `/virtual-torrent-stream/:infoHash` requests from `<video>`,
 * checks the IndexedDB/OPFS cache first (<1ms response if cached), and otherwise
 * forwards the HTTP 206 Range request to `/api/cinema-download/range-stream`
 * while broadcasting the target byte-offset to wake up the Sliding-Window Scheduler!
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parseRangeHeader(rangeHeader, totalSize) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  if (Number.isNaN(start) || start < 0) return null;
  const end =
    parts[1] && parts[1].length > 0
      ? parseInt(parts[1], 10)
      : totalSize > 0
        ? Math.min(totalSize - 1, start + 2 * 1024 * 1024 - 1)
        : start + 1024 * 1024 - 1;
  return { start, end };
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/virtual-torrent-stream/')) {
    return;
  }

  event.respondWith(
    (async () => {
      const infoHash = url.searchParams.get('infoHash') || '';
      const magnet = url.searchParams.get('magnet') || '';
      const directUrl = url.searchParams.get('directUrl') || '';
      const referer = url.searchParams.get('referer') || '';
      const totalSize = Number(url.searchParams.get('size') || 0);
      const pieceLen = Number(url.searchParams.get('pieceLen') || 1048576);
      const rangeHeader = event.request.headers.get('Range') || '';

      const parsedRange = parseRangeHeader(rangeHeader, totalSize);
      if (parsedRange && infoHash) {
        const targetPiece = Math.floor(parsedRange.start / Math.max(1, pieceLen));
        // Notify all active clients so the Sliding-Window Scheduler jumps to targetPiece immediately
        const allClients = await self.clients.matchAll({
          includeUncontrolled: true,
          type: 'window',
        });
        for (const client of allClients) {
          client.postMessage({
            type: 'TORRENT_SW_SEEK_RANGE',
            infoHash,
            byteStart: parsedRange.start,
            byteEnd: parsedRange.end,
            targetPiece,
          });
        }
      }

      // Forward to the HTTP 206 Byte-Range Stream Bridge with the exact Range header
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
