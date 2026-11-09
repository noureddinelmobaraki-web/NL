import { getLocalPieceSlice } from '../bencodeAndInputManager';
import type { ResolvedTransport } from '../types';
import { anySignal } from './abortUtils';
import type { BrowserSwarmSession } from './browserSwarmClient';
import type { EdgeTcpSwarmSession } from './edgeTcpSwarmClient';
import { isPermanentHttpStatus } from './transportProbes';

export type PieceFetchResult =
  | {
      ok: true;
      buffer: ArrayBuffer;
      bytesKind?: 'torrent-piece' | 'file-slice';
      expectedSha1?: string;
      peers?: number;
      edgePeers?: number;
      webrtcPeers?: number;
      realSize?: number;
    }
  | { ok: false; reason: string; httpStatus?: number; permanent: boolean }
  | { ok: false; aborted: 'seek' | 'cancel' };

export interface PieceRequest {
  infoHash: string;
  magnetUri: string;
  pieceIndex: number;
  pieceLength: number;
  totalSize: number;
  transport: ResolvedTransport;
  seekSignal: AbortSignal;
  cancelSignal: AbortSignal;
  swarm: BrowserSwarmSession | null;
  edgeSwarm?: EdgeTcpSwarmSession | null;
  webSeedUrls?: string[];
  timeoutMs?: number;
}

async function fetchHttpRangeSlice(
  urls: readonly string[],
  req: PieceRequest,
  signal: AbortSignal,
): Promise<PieceFetchResult | null> {
  if (urls.length === 0) return null;
  const fg = req.transport.geometry.fileGeometry;
  let start: number;
  let expected: number;
  if (fg) {
    const slice = getLocalPieceSlice(fg, req.pieceIndex);
    start = slice.fileStart;
    expected = slice.length;
  } else {
    start = req.pieceIndex * req.pieceLength;
    const end = Math.min(req.totalSize - 1, start + req.pieceLength - 1);
    expected = end - start + 1;
  }
  const end = start + expected - 1;
  if (expected <= 0 || end < start) return null;

  let lastFailure: PieceFetchResult | null = null;
  for (const url of urls) {
    const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal });
    if (res.status !== 206) {
      try {
        await res.body?.cancel();
      } catch {}
      lastFailure =
        res.status === 200
          ? {
              ok: false,
              reason: 'Server ignored Range (HTTP 200) — refusing full-body download',
              httpStatus: 200,
              permanent: true,
            }
          : httpFail(res.status, req.pieceIndex);
      continue;
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html') || ct.includes('application/json')) {
      try {
        await res.body?.cancel();
      } catch {}
      lastFailure = { ok: false, reason: 'HTML/JSON response instead of media range', permanent: true };
      continue;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < expected) {
      lastFailure = { ok: false, reason: `Short read ${buf.byteLength}/${expected}`, permanent: false };
      continue;
    }
    return {
      ok: true,
      buffer: buf.byteLength === expected ? buf : buf.slice(0, expected),
      bytesKind: 'file-slice',
    };
  }
  return lastFailure;
}

async function fetchFromHybridP2pSwarm(
  req: PieceRequest,
  signal: AbortSignal,
): Promise<PieceFetchResult | null> {
  const { pieceIndex, pieceLength, totalSize, swarm, edgeSwarm } = req;
  if (!edgeSwarm && !swarm) return null;

  const edgeIdle = edgeSwarm?.hasIdlePeerForPiece(pieceIndex, pieceLength, totalSize) ?? false;
  const rtcIdle = swarm?.hasIdlePeerForPiece(pieceIndex, pieceLength, totalSize) ?? false;

  let order: Array<'edge-tcp' | 'webrtc'>;
  if (edgeIdle && !rtcIdle) {
    order = ['edge-tcp', 'webrtc'];
  } else if (rtcIdle && !edgeIdle) {
    order = ['webrtc', 'edge-tcp'];
  } else if (edgeIdle && rtcIdle) {
    order = (pieceIndex & 1) === 0 ? ['edge-tcp', 'webrtc'] : ['webrtc', 'edge-tcp'];
  } else {
    // Both swarms are currently busy or handshaking — race for whichever frees an unchoked seeder first
    const waiters: Array<Promise<'edge-tcp' | 'webrtc' | null>> = [];
    if (edgeSwarm) {
      waiters.push(
        edgeSwarm
          .waitForIdleSlot(pieceIndex, pieceLength, totalSize, 16_000, signal)
          .then((ok) => (ok ? ('edge-tcp' as const) : null)),
      );
    }
    if (swarm) {
      waiters.push(
        swarm
          .waitForIdleSlot(pieceIndex, pieceLength, totalSize, 16_000, signal)
          .then((ok) => (ok ? ('webrtc' as const) : null)),
      );
    }
    let winner: 'edge-tcp' | 'webrtc' | null = null;
    if (waiters.length === 2) {
      winner = await Promise.race(waiters);
    } else if (waiters.length === 1) {
      winner = await waiters[0];
    }
    if (winner === 'webrtc') {
      order = ['webrtc', 'edge-tcp'];
    } else if (winner === 'edge-tcp') {
      order = ['edge-tcp', 'webrtc'];
    } else {
      order = req.transport.stage === 'webrtc' ? ['webrtc', 'edge-tcp'] : ['edge-tcp', 'webrtc'];
    }
  }

  for (const provider of order) {
    if (signal.aborted) break;
    if (provider === 'edge-tcp' && edgeSwarm) {
      const buf = await edgeSwarm.fetchPieceInBrowser(pieceIndex, pieceLength, totalSize, signal);
      if (buf && buf.byteLength > 0) {
        const edgePeers = edgeSwarm.getSeederPeersCount() || edgeSwarm.getConnectedPeersCount();
        const webrtcPeers = swarm?.getSeederPeersCount() ?? 0;
        return {
          ok: true,
          buffer: buf,
          bytesKind: 'torrent-piece',
          peers: edgePeers + webrtcPeers,
          edgePeers,
          webrtcPeers,
        };
      }
    } else if (provider === 'webrtc' && swarm) {
      const buf = await swarm.fetchPieceInBrowser(pieceIndex, pieceLength, totalSize, signal);
      if (buf && buf.byteLength > 0) {
        const edgePeers = edgeSwarm?.getSeederPeersCount() ?? 0;
        const webrtcPeers = swarm.getSeederPeersCount() || swarm.getConnectedPeersCount();
        return {
          ok: true,
          buffer: buf,
          bytesKind: 'torrent-piece',
          peers: edgePeers + webrtcPeers,
          edgePeers,
          webrtcPeers,
        };
      }
    }
  }

  return null;
}

export async function fetchPiece(req: PieceRequest): Promise<PieceFetchResult> {
  const timeout = AbortSignal.timeout(req.timeoutMs ?? 55_000);
  const signal = anySignal([req.seekSignal, req.cancelSignal, timeout]);
  const { transport: t, pieceIndex } = req;

  try {
    if (t.hlsSegments?.length) {
      const url = t.hlsSegments[pieceIndex];
      if (!url) return { ok: false, reason: `Missing segment #${pieceIndex + 1}`, permanent: true };
      const res = await fetch(url, { signal });
      if (!res.ok) return httpFail(res.status, pieceIndex);
      const buf = await res.arrayBuffer();
      return buf.byteLength
        ? { ok: true, buffer: buf, bytesKind: 'file-slice' }
        : { ok: false, reason: 'Empty segment', permanent: false };
    }

    const rangeCandidates = Array.from(
      new Set([
        ...(t.directRangeUrl ? [t.directRangeUrl] : []),
        ...(req.webSeedUrls ?? []),
      ]),
    );

    if (t.directRangeUrl) {
      const rangeRes = await fetchHttpRangeSlice(rangeCandidates, req, signal);
      if (rangeRes?.ok) return rangeRes;
      if (!t.geometry.isVariableSegments && (req.edgeSwarm || req.swarm)) {
        const p2pAssist = await fetchFromHybridP2pSwarm(req, signal);
        if (p2pAssist?.ok) return p2pAssist;
      }
      return rangeRes ?? { ok: false, reason: 'WebSeed range request failed', permanent: false };
    }

    if (t.useBridgeBackend) {
      const params = new URLSearchParams({
        infoHash: req.infoHash,
        pieceIndex: String(pieceIndex),
        pieceLength: String(req.pieceLength),
        totalSize: String(req.totalSize),
        magnet: req.magnetUri,
      });
      const res = await fetch(`/api/cinema-download/piece?${params}`, { signal });
      if (!res.ok || !res.headers.get('Content-Type')?.includes('application/octet-stream')) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        return {
          ok: false,
          reason: j?.error || `Bridge HTTP ${res.status}`,
          httpStatus: res.status,
          permanent: res.status === 404,
        };
      }
      const buf = await res.arrayBuffer();
      return {
        ok: true,
        buffer: buf,
        bytesKind: 'file-slice',
        expectedSha1: res.headers.get('X-Piece-SHA1') || undefined,
        peers: Number(res.headers.get('X-Active-Peers')) || undefined,
        realSize: Number(res.headers.get('X-Real-File-Size')) || undefined,
      };
    }

    if (req.edgeSwarm || req.swarm) {
      const hybridRes = await fetchFromHybridP2pSwarm(req, signal);
      if (hybridRes?.ok) return hybridRes;

      if (rangeCandidates.length > 0 && !t.geometry.isVariableSegments) {
        const webSeedFallback = await fetchHttpRangeSlice(rangeCandidates, req, signal);
        if (webSeedFallback?.ok) return webSeedFallback;
      }

      const edgeSeeds = req.edgeSwarm?.getSeederPeersCount() ?? 0;
      const rtcSeeds = req.swarm?.getSeederPeersCount() ?? 0;
      return {
        ok: false,
        reason:
          edgeSeeds + rtcSeeds > 0
            ? 'All active P2P seeders choked or timed out on piece — retrying'
            : 'Waiting for reachable TCP/WebRTC seeders',
        permanent: false,
      };
    }

    return { ok: false, reason: 'Transport has no fetch strategy', permanent: true };
  } catch (err) {
    if (req.cancelSignal.aborted) return { ok: false, aborted: 'cancel' };
    if (req.seekSignal.aborted) return { ok: false, aborted: 'seek' };
    if (timeout.aborted) return { ok: false, reason: `Timed out on piece #${pieceIndex + 1}`, permanent: false };
    return { ok: false, reason: err instanceof Error ? err.message : 'Network failure', permanent: false };
  }
}

function httpFail(status: number, idx: number): PieceFetchResult {
  return {
    ok: false,
    reason: `HTTP ${status} on piece #${idx + 1}`,
    httpStatus: status,
    permanent: isPermanentHttpStatus(status),
  };
}
