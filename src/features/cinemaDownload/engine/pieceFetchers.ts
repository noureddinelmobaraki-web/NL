import type { ResolvedTransport } from '../types';
import { anySignal } from './abortUtils';
import type { BrowserSwarmSession } from './browserSwarmClient';
import type { EdgeTcpSwarmSession } from './edgeTcpSwarmClient';
import { isPermanentHttpStatus } from './transportProbes';

export type PieceFetchResult =
  | { ok: true; buffer: ArrayBuffer; expectedSha1?: string; peers?: number; realSize?: number }
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
  timeoutMs?: number;
}

export async function fetchPiece(req: PieceRequest): Promise<PieceFetchResult> {
  const timeout = AbortSignal.timeout(
    req.timeoutMs ?? (req.transport.stage === 'edge-tcp' ? 45_000 : 30_000),
  );
  const signal = anySignal([req.seekSignal, req.cancelSignal, timeout]);
  const { transport: t, pieceIndex } = req;

  try {
    if (t.hlsSegments?.length) {
      const url = t.hlsSegments[pieceIndex];
      if (!url) return { ok: false, reason: `Missing segment #${pieceIndex + 1}`, permanent: true };
      const res = await fetch(url, { signal });
      if (!res.ok) return httpFail(res.status, pieceIndex);
      const buf = await res.arrayBuffer();
      return buf.byteLength ? { ok: true, buffer: buf } : { ok: false, reason: 'Empty segment', permanent: false };
    }

    if (t.directRangeUrl) {
      const start = pieceIndex * req.pieceLength;
      const end = Math.min(req.totalSize - 1, start + req.pieceLength - 1);
      const res = await fetch(t.directRangeUrl, { headers: { Range: `bytes=${start}-${end}` }, signal });
      if (res.status !== 206) {
        try { await res.body?.cancel(); } catch {}
        return res.status === 200
          ? { ok: false, reason: 'Server ignored Range (HTTP 200) — refusing full-body download', httpStatus: 200, permanent: true }
          : httpFail(res.status, pieceIndex);
      }
      const buf = await res.arrayBuffer();
      const expected = end - start + 1;
      if (buf.byteLength < expected) return { ok: false, reason: `Short read ${buf.byteLength}/${expected}`, permanent: false };
      return { ok: true, buffer: buf.byteLength === expected ? buf : buf.slice(0, expected) };
    }

    if (t.useBridgeBackend) {
      const params = new URLSearchParams({
        infoHash: req.infoHash, pieceIndex: String(pieceIndex), pieceLength: String(req.pieceLength),
        totalSize: String(req.totalSize), magnet: req.magnetUri,
      });
      const res = await fetch(`/api/cinema-download/piece?${params}`, { signal });
      if (!res.ok || !res.headers.get('Content-Type')?.includes('application/octet-stream')) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, reason: j?.error || `Bridge HTTP ${res.status}`, httpStatus: res.status, permanent: res.status === 404 };
      }
      const buf = await res.arrayBuffer();
      return {
        ok: true, buffer: buf,
        expectedSha1: res.headers.get('X-Piece-SHA1') || undefined,
        peers: Number(res.headers.get('X-Active-Peers')) || undefined,
        realSize: Number(res.headers.get('X-Real-File-Size')) || undefined,
      };
    }

    if (t.stage === 'edge-tcp' && req.edgeSwarm) {
      const buf = await req.edgeSwarm.fetchPieceInBrowser(
        pieceIndex,
        req.pieceLength,
        req.totalSize,
        signal,
      );
      if (buf && buf.byteLength) {
        return {
          ok: true,
          buffer: buf,
          peers: req.edgeSwarm.getSeederPeersCount() || req.edgeSwarm.getConnectedPeersCount(),
        };
      }
      return {
        ok: false,
        reason: 'Edge TCP peer stalled or choked on piece',
        permanent: false,
      };
    }

    if (req.swarm) {
      const buf = await req.swarm.fetchPieceInBrowser(pieceIndex, req.pieceLength, req.totalSize, signal);
      if (buf && buf.byteLength) return { ok: true, buffer: buf, peers: req.swarm.getConnectedPeersCount() };
      return { ok: false, reason: 'No WebRTC peer delivered the piece', permanent: req.swarm.getConnectedPeersCount() === 0 };
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
  return { ok: false, reason: `HTTP ${status} on piece #${idx + 1}`, httpStatus: status, permanent: isPermanentHttpStatus(status) };
}
