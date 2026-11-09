import { buildWorkerProxyUrl } from '../../../services/videoExtractor';
import { computeRealPieceGeometry } from '../releaseDiscoveryService';
import type {
  ActiveTransportMode,
  DiscoveredReleaseOption,
  ParsedTorrentMetainfo,
  TransportGeometry,
} from '../types';
import { abortableSleep, withTimeout } from './abortUtils';
import type { BrowserSwarmSession } from './browserSwarmClient';
import type { EdgeTcpSwarmSession } from './edgeTcpSwarmClient';
import type { StageProbeResult } from './transportFailoverMachine';

export const PROXY_PREFIX = 'https://broad-block-7bd7.';

/** Shape returned by the existing `resolveFallbackStreamTransport` in downloadManager.ts */
export interface LegacyStreamSource {
  realSizeBytes: number;
  pieceLength: number;
  totalPieces: number;
  activePeers: number;
  hlsSegments?: string[];
  directRangeUrl?: string;
  directRangeReferer?: string;
  transportMode: ActiveTransportMode;
}

export interface ProbeEnv {
  infoHash: string;
  release: DiscoveredReleaseOption;
  metainfo: ParsedTorrentMetainfo | null;
  frozen: TransportGeometry | null;
  signal: AbortSignal;
  getSwarm: () => BrowserSwarmSession;
  getEdgeSwarm: () => EdgeTcpSwarmSession;
  onMetainfoResolved?: (meta: ParsedTorrentMetainfo) => void;
  resolveStreamFallback: () => Promise<LegacyStreamSource | null>;
}

type ByteProbe =
  | { ok: true; totalSize: number | null }
  | { ok: false; detail: string; httpStatus?: number; permanent: boolean };

export function proxify(url: string, referer?: string): string {
  return url.startsWith(PROXY_PREFIX) ? url : buildWorkerProxyUrl(url, referer);
}

export function isPermanentHttpStatus(status: number): boolean {
  return [400, 401, 403, 404, 410, 416, 451].includes(status);
}

export function parseContentRangeTotal(header: string | null): number | null {
  const m = header?.match(/bytes\s+\d+-\d+\/(\d+)/i);
  return m ? Number(m[1]) : null;
}

export function describeFetchError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError' ? 'Timed out' : 'Network/CORS failure';
}

/** 1-byte Range probe. Rejects servers that ignore Range (HTTP 200) — never downloads the full body. */
export async function probeOneByte(url: string, signal: AbortSignal, timeoutMs = 7_000): Promise<ByteProbe> {
  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-0' },
      signal: withTimeout(signal, timeoutMs),
    });
    const ct = res.headers.get('content-type') || '';
    if (res.status === 206) {
      try { await res.body?.cancel(); } catch {}
      return { ok: true, totalSize: parseContentRangeTotal(res.headers.get('content-range')) };
    }
    try { await res.body?.cancel(); } catch {}
    if (res.status === 200) {
      return { ok: false, detail: 'Server ignores Range (HTTP 200)', httpStatus: 200, permanent: true };
    }
    if (ct.includes('text/html')) {
      return { ok: false, detail: 'HTML error page instead of media', httpStatus: res.status, permanent: true };
    }
    return { ok: false, detail: `HTTP ${res.status}`, httpStatus: res.status, permanent: isPermanentHttpStatus(res.status) };
  } catch (err) {
    if (signal.aborted) throw err;
    return { ok: false, detail: describeFetchError(err), permanent: false };
  }
}

/** BEP-19: multi-file torrents append `<name>/<path>` when the seed URL ends with `/`. */
export function buildWebSeedFileUrl(seed: string, meta: ParsedTorrentMetainfo | null): string {
  if (!meta || !seed.endsWith('/')) return seed;
  const isMulti = meta.files.length > 1 || meta.selectedFile.path.includes('/');
  const rel = isMulti ? `${meta.name}/${meta.selectedFile.path}` : meta.name;
  return seed + rel.split('/').map(encodeURIComponent).join('/');
}

function torrentGeometry(env: ProbeEnv, sizeOverride?: number | null): TransportGeometry {
  if (env.frozen && !env.frozen.isVariableSegments) return env.frozen;
  if (env.metainfo) {
    const g = env.metainfo.geometry;
    return {
      sizeBytes: g ? g.fileLength : env.metainfo.totalLength,
      pieceLength: env.metainfo.pieceLength,
      totalPieces: g ? g.filePieceCount : env.metainfo.pieceCount,
      isVariableSegments: false,
      pieceHashesHex: env.metainfo.pieceHashesHex,
      fileGeometry: g ?? null,
    };
  }
  const size = sizeOverride || env.release.sizeBytes;
  const { pieceLength, totalPieces } = computeRealPieceGeometry(size);
  return {
    sizeBytes: size,
    pieceLength,
    totalPieces,
    isVariableSegments: false,
    pieceHashesHex: [],
    fileGeometry: env.release.fileGeometry ?? null,
  };
}

export async function probeBridge(env: ProbeEnv): Promise<StageProbeResult> {
  try {
    const health = await fetch('/api/cinema-download/health', { signal: withTimeout(env.signal, 2_500) });
    const ct = health.headers.get('content-type') || '';
    if (!health.ok || !ct.includes('application/json')) {
      return { ok: false, detail: 'Bridge not deployed (static hosting)', httpStatus: health.status, permanent: true };
    }
    const params = new URLSearchParams({ infoHash: env.infoHash, magnet: env.release.magnetUri });
    const res = await fetch(`/api/cinema-download/torrent-meta?${params}`, { signal: withTimeout(env.signal, 15_000) });
    if (!res.ok) return { ok: false, detail: `Bridge meta HTTP ${res.status}`, httpStatus: res.status, permanent: isPermanentHttpStatus(res.status) };
    const meta = (await res.json()) as { ok?: boolean; fileSize?: number; pieceLength?: number; totalPieces?: number; peers?: number };
    const peers = Number(meta.peers) || 0;
    if (!meta.ok || !meta.fileSize) return { ok: false, detail: 'Bridge could not fetch metadata', permanent: false };
    if (peers <= 0) return { ok: false, detail: 'Bridge reached 0 peers', permanent: false };
    const pieceLength = meta.pieceLength || computeRealPieceGeometry(meta.fileSize).pieceLength;
    const geometry: TransportGeometry = env.frozen && !env.frozen.isVariableSegments
      ? env.frozen
      : {
          sizeBytes: meta.fileSize,
          pieceLength,
          totalPieces: meta.totalPieces || Math.ceil(meta.fileSize / pieceLength),
          isVariableSegments: false,
          pieceHashesHex: env.metainfo?.pieceHashesHex ?? [],
          fileGeometry: env.metainfo?.geometry ?? env.release.fileGeometry ?? null,
        };
    return {
      ok: true,
      detail: `Bridge alive · ${peers} peers`,
      transport: { stage: 'bridge', mode: 'webtorrent-bridge', geometry, useBridgeBackend: true, peers, httpSources: 0 },
    };
  } catch (err) {
    if (env.signal.aborted) throw err;
    return { ok: false, detail: describeFetchError(err), permanent: false };
  }
}

export async function probeWebSeed(env: ProbeEnv): Promise<StageProbeResult> {
  const seeds = new Set<string>([...(env.release.webSeeds ?? []), ...(env.metainfo?.webSeeds ?? [])]);
  const direct = env.release.sourceKind === 'direct-mp4' ? env.release.directStreamUrl : undefined;
  const candidates = direct
    ? [proxify(direct, env.release.streamReferer)]
    : [...seeds].map((s) => proxify(buildWebSeedFileUrl(s, env.metainfo)));
  if (!candidates.length) return { ok: false, detail: 'No HTTP WebSeeds in metadata', permanent: true };

  let last = 'All WebSeeds failed';
  for (const url of candidates) {
    const r = await probeOneByte(url, env.signal);
    if (r.ok) {
      const geometry = direct
        ? (() => {
            const size = r.totalSize || env.release.sizeBytes;
            const { pieceLength, totalPieces } = computeRealPieceGeometry(size);
            return env.frozen ?? { sizeBytes: size, pieceLength, totalPieces, isVariableSegments: false, pieceHashesHex: [] };
          })()
        : torrentGeometry(env, r.totalSize);
      if (r.totalSize && !direct && Math.abs(r.totalSize - geometry.sizeBytes) > 1) {
        last = `WebSeed size mismatch (${r.totalSize} ≠ ${geometry.sizeBytes})`;
        continue;
      }
      return {
        ok: true,
        detail: `1-byte probe OK (206) · ${candidates.length} HTTP source(s)`,
        transport: {
          stage: 'webseed', mode: 'webseed-range', geometry, useBridgeBackend: false,
          directRangeUrl: url, directRangeReferer: env.release.streamReferer,
          peers: 0, httpSources: candidates.length,
        },
      };
    }
    last = r.detail;
  }
  return { ok: false, detail: last, permanent: false };
}

async function resolveHybridMetainfo(
  env: ProbeEnv,
  edgeSwarm: EdgeTcpSwarmSession,
  rtcSwarm: BrowserSwarmSession,
): Promise<ParsedTorrentMetainfo | null> {
  if (env.metainfo) return env.metainfo;
  const raceCtrl = new AbortController();
  const onParentAbort = () => raceCtrl.abort();
  env.signal.addEventListener('abort', onParentAbort, { once: true });

  try {
    const results = await Promise.all([
      edgeSwarm
        .resolveMetainfoFromPeers(raceCtrl.signal, 10_000)
        .then((m) => {
          if (m) raceCtrl.abort();
          return m;
        })
        .catch(() => null),
      rtcSwarm
        .resolveMetainfoFromPeers(raceCtrl.signal, 10_000)
        .then((m) => {
          if (m) raceCtrl.abort();
          return m;
        })
        .catch(() => null),
    ]);
    const fetched = results[0] ?? results[1] ?? null;
    if (fetched) {
      edgeSwarm.setGeometry(fetched.geometry);
      rtcSwarm.setGeometry(fetched.geometry);
      env.onMetainfoResolved?.(fetched);
    }
    return fetched;
  } finally {
    env.signal.removeEventListener('abort', onParentAbort);
  }
}

export async function probeEdgeTcp(env: ProbeEnv, waitMs = 10_000): Promise<StageProbeResult> {
  // Warm up BOTH Edge TCP and Browser WebRTC swarms simultaneously so both discover peers in parallel
  const rtcSwarm = env.getSwarm();
  const edgeSwarm = env.getEdgeSwarm();
  const disc = await edgeSwarm.startDiscovery(env.signal);
  if (!disc.ok && disc.workerMissing) {
    return { ok: false, detail: disc.detail, permanent: true };
  }

  const started = Date.now();
  while (Date.now() - started < waitMs) {
    const edgeSeeders = edgeSwarm.getSeederPeersCount();
    const rtcSeeders = rtcSwarm.getSeederPeersCount();

    if (edgeSeeders > 0) {
      let activeMeta = env.metainfo;
      if (!activeMeta && !env.frozen?.pieceHashesHex.length) {
        activeMeta = await resolveHybridMetainfo(env, edgeSwarm, rtcSwarm);
        if (!activeMeta) {
          return {
            ok: false,
            detail: 'Connected to TCP peers, but BEP-9 metadata was not delivered in time',
            permanent: false,
          };
        }
      }

      const geometry = torrentGeometry({ ...env, metainfo: activeMeta });
      return {
        ok: true,
        detail: `${edgeSeeders} TCP seeder(s) via Cloudflare Edge${rtcSeeders > 0 ? ` + ${rtcSeeders} WebRTC` : ''}`,
        transport: {
          stage: 'edge-tcp',
          mode: 'edge-tcp-swarm',
          geometry,
          useBridgeBackend: false,
          peers: edgeSeeders + rtcSeeders,
          httpSources: 0,
        },
      };
    }

    // Fast handoff: if WebRTC already found seeders after 4.5s, start downloading immediately while Edge TCP continues dialing in the background
    if (Date.now() - started >= 4_500 && rtcSeeders > 0) {
      return {
        ok: false,
        detail: 'WebRTC seeders ready first — Edge TCP continues connecting in hybrid background',
        permanent: true,
      };
    }

    await abortableSleep(400, env.signal);
  }

  const connected = edgeSwarm.getConnectedPeersCount();
  if (connected > 0) {
    return {
      ok: false,
      detail: `Connected to ${connected} TCP peer(s) with 0% pieces`,
      permanent: false,
    };
  }
  return {
    ok: false,
    detail: disc.ok ? '0 TCP BitTorrent seeders accepted tunnel handshake yet' : disc.detail,
    permanent: false,
  };
}

export async function probeWebRtc(env: ProbeEnv, waitMs = 10_000): Promise<StageProbeResult> {
  const swarm = env.getSwarm();
  const edgeSwarm = env.getEdgeSwarm();
  const started = Date.now();

  while (Date.now() - started < waitMs) {
    const rtcSeeders = swarm.getSeederPeersCount();
    const edgeSeeders = edgeSwarm.getSeederPeersCount();
    if (rtcSeeders > 0 || edgeSeeders > 0) {
      let activeMeta = env.metainfo;
      if (!activeMeta && !env.frozen?.pieceHashesHex.length) {
        activeMeta = await resolveHybridMetainfo(env, edgeSwarm, swarm);
        if (!activeMeta) {
          return {
            ok: false,
            detail: 'Connected to P2P peers, but BEP-9 metadata was not delivered in time',
            permanent: false,
          };
        }
      }

      const geometry = torrentGeometry({ ...env, metainfo: activeMeta });
      if (rtcSeeders > 0) {
        return {
          ok: true,
          detail: `${rtcSeeders} WebRTC seeder(s) connected (${swarm.getConnectedPeersCount()} total)${edgeSeeders > 0 ? ` + ${edgeSeeders} TCP` : ''}`,
          transport: {
            stage: 'webrtc',
            mode: 'browser-webrtc-swarm',
            geometry,
            useBridgeBackend: false,
            peers: rtcSeeders + edgeSeeders,
            httpSources: 0,
          },
        };
      }
      return {
        ok: true,
        detail: `${edgeSeeders} TCP seeder(s) connected during hybrid probe`,
        transport: {
          stage: 'edge-tcp',
          mode: 'edge-tcp-swarm',
          geometry,
          useBridgeBackend: false,
          peers: edgeSeeders,
          httpSources: 0,
        },
      };
    }
    await abortableSleep(450, env.signal);
  }

  const totalPeers = swarm.getConnectedPeersCount();
  if (totalPeers > 0) {
    return { ok: false, detail: 'Connected WebRTC peer has 0% pieces (leecher only)', permanent: false };
  }
  return { ok: false, detail: '0 WebRTC peers reachable from the browser sandbox', permanent: false };
}

export async function probeHlsStream(env: ProbeEnv): Promise<StageProbeResult> {
  try {
    const src = await env.resolveStreamFallback();
    if (!src) return { ok: false, detail: 'No extractable HLS/MP4 stream', permanent: true };
    if (src.hlsSegments?.length) {
      const r = await probeOneByte(src.hlsSegments[0], env.signal);
      if (!r.ok && r.httpStatus !== 200) return { ok: false, detail: `First segment: ${r.detail}`, httpStatus: r.httpStatus, permanent: r.permanent };
      return {
        ok: true,
        detail: `${src.hlsSegments.length} HLS segments reachable`,
        transport: {
          stage: 'hls-stream', mode: 'hls-assembler', useBridgeBackend: false, hlsSegments: src.hlsSegments,
          geometry: { sizeBytes: src.realSizeBytes, pieceLength: src.pieceLength, totalPieces: src.hlsSegments.length, isVariableSegments: true, pieceHashesHex: [] },
          peers: 0, httpSources: 1,
        },
      };
    }
    if (src.directRangeUrl) {
      const r = await probeOneByte(src.directRangeUrl, env.signal);
      if (!r.ok) return { ok: false, detail: `Extracted MP4: ${r.detail}`, httpStatus: r.httpStatus, permanent: r.permanent };
      const size = r.totalSize || src.realSizeBytes;
      const { pieceLength, totalPieces } = computeRealPieceGeometry(size);
      return {
        ok: true,
        detail: 'Extracted MP4 passed 1-byte probe',
        transport: {
          stage: 'hls-stream', mode: 'webseed-range', useBridgeBackend: false,
          directRangeUrl: src.directRangeUrl, directRangeReferer: src.directRangeReferer,
          geometry: { sizeBytes: size, pieceLength, totalPieces, isVariableSegments: false, pieceHashesHex: [] },
          peers: 0, httpSources: 1,
        },
      };
    }
    return { ok: false, detail: 'Stream source had no URL', permanent: true };
  } catch (err) {
    if (env.signal.aborted) throw err;
    return { ok: false, detail: describeFetchError(err), permanent: false };
  }
}
