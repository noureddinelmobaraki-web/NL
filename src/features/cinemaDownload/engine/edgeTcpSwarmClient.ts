/**
 * Browser-side BitTorrent TCP Swarm Client tunneled over Cloudflare Worker WebSockets (/bt-tunnel).
 * - Discovers peers via /bt-peers (HTTP/HTTPS trackers) + BEP-11 ut_pex (DHT/UDP peer exchange).
 * - Resolves magnet-only metainfo via BEP-9 (ut_metadata) when public .torrent caches miss.
 * - Downloads full torrent pieces with 10-block (160 KiB) request pipelining and rotates tunnels
 *   every 48 MB to stay well below Cloudflare Workers Free 10 ms per-invocation CPU limits.
 */

import { WORKER_BASE_URL } from '../../../services/videoExtractor';
import {
  buildIdentityGeometry,
  getLocalPieceSlice,
  parseTorrentFileBytes,
  type ParsedTorrentWithGeometry,
  type SelectedFileGeometry,
} from '../bencodeAndInputManager';
import { abortableSleep } from './abortUtils';
import {
  EDGE_BLOCK_LEN,
  METADATA_BLOCK_LEN,
  UT_METADATA_LOCAL_ID,
  UT_PEX_LOCAL_ID,
  buildBep10ExtendedHandshake,
  buildBtCancelBlock,
  buildBtHave,
  buildBtInterested,
  buildBtKeepAlive,
  buildBtRequestBlock,
  buildExtendedBtHandshake,
  buildUtMetadataRequest,
  generatePeerIdBytes,
  hexToBytes20,
  parseBep10Handshake,
  parseUtMetadataMessage,
  parseUtPexPeers,
  peerHasPiece,
  prioritizeCandidatePeers,
  verifyIncomingBtHandshake,
  wrapRawInfoDictAsTorrent,
} from './edgeTcpWireProtocol';

const MAX_CONNECTED_SEEDERS = 10;
const MAX_DIALING_TUNNELS = 14;
const PIPELINE_DEPTH = 12;
const BLOCK_IDLE_TIMEOUT_MS = 12_000;
const CONNECT_HANDSHAKE_TIMEOUT_MS = 5_500;
const PEER_WAIT_QUEUE_TIMEOUT_MS = 18_000;
const ROTATE_AFTER_BYTES = 48 * 1024 * 1024;
const TOKEN_RENEW_MARGIN_SEC = 60;

interface DirectTcpSocketOpenedInfo {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

interface DirectTcpSocketInstance {
  opened: Promise<DirectTcpSocketOpenedInfo>;
  closed: Promise<void>;
  close(): Promise<void>;
}

type DirectTcpSocketConstructor = new (
  remoteAddress: string,
  remotePort: number,
  options?: { noDelay?: boolean; keepAliveDelay?: number },
) => DirectTcpSocketInstance;

interface PeerByteChannel {
  readonly isDirectTcp: boolean;
  isOpen: () => boolean;
  send: (data: Uint8Array) => void;
  close: () => void;
}

interface SignedPeerToken {
  sig: string;
  exp: number;
}

interface BlockSpec {
  begin: number;
  length: number;
}

interface InFlightPieceJob {
  pieceIndex: number;
  pieceLength: number;
  buffer: Uint8Array;
  receivedBytes: number;
  pendingBlocks: BlockSpec[];
  inFlightBlocks: Map<number, number>;
  receivedOffsets: Set<number>;
  idleTimer: ReturnType<typeof setTimeout>;
  armIdle: () => void;
  finish: (result: ArrayBuffer | null) => void;
}

interface EdgePeerConn {
  addr: string;
  channel: PeerByteChannel;
  handshakeDone: boolean;
  choked: boolean;
  hasAnyPiece: boolean;
  bitfield: Uint8Array | null;
  haveSet: Set<number>;
  recvBuffer: Uint8Array;
  utMetadataId: number | null;
  metadataSize: number | null;
  bytesReceived: number;
  completedPieces: number;
  failures: number;
  job: InFlightPieceJob | null;
  handshakeTimer: ReturnType<typeof setTimeout> | null;
}

interface MetadataAssembly {
  totalSize: number;
  totalBlocks: number;
  blocks: Array<Uint8Array | null>;
  receivedCount: number;
}

function getDirectTcpSocketCtor(): DirectTcpSocketConstructor | null {
  const maybeCtor = (globalThis as { TCPSocket?: unknown }).TCPSocket;
  return typeof maybeCtor === 'function' ? (maybeCtor as DirectTcpSocketConstructor) : null;
}

export class EdgeTcpSwarmSession {
  public readonly infoHash: string;
  private readonly infoHashBytes: Uint8Array;
  private readonly peerIdBytes: Uint8Array;
  private geometry: SelectedFileGeometry | null;
  private trackers = new Set<string>();
  private peers = new Map<string, EdgePeerConn>();
  private dialing = new Set<string>();
  private candidateQueue: string[] = [];
  private provenSeeders = new Set<string>();
  private seenCandidates = new Set<string>();
  private peerTokens = new Map<string, SignedPeerToken>();
  private awaitingTokenSign = new Set<string>();
  private tokenSignAttempts = new Map<string, number>();
  private workerRequiresTokens = false;
  private signingBatchInFlight = false;
  private destroyed = false;
  private discoveryPromise: Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private metaAssembly: MetadataAssembly | null = null;
  private resolvedMeta: ParsedTorrentWithGeometry | null = null;
  private availabilityWaiters = new Set<() => void>();

  constructor(
    infoHash: string,
    announceTrackers: string[] = [],
    initialGeometry: SelectedFileGeometry | null = null,
  ) {
    this.infoHash = infoHash.trim().toLowerCase();
    this.infoHashBytes = hexToBytes20(this.infoHash);
    this.peerIdBytes = generatePeerIdBytes();
    this.geometry = initialGeometry;
    this.addTrackers(announceTrackers);

    this.keepAliveTimer = setInterval(() => {
      for (const peer of this.peers.values()) {
        if (peer.handshakeDone && peer.channel.isOpen()) {
          peer.channel.send(buildBtKeepAlive());
        }
      }
      this.replenishPool();
    }, 25_000);

    this.refreshTimer = setInterval(() => {
      if (!this.destroyed && this.candidateQueue.length < 12 && this.getSeederPeersCount() < 6) {
        this.discoveryPromise = null;
        void this.startDiscovery();
      }
    }, 55_000);
  }

  public setGeometry(geometry: SelectedFileGeometry): void {
    this.geometry = geometry;
  }

  public addTrackers(list: string[]): void {
    for (const raw of list) {
      const t = raw.trim();
      if (t.startsWith('http://') || t.startsWith('https://')) {
        this.trackers.add(t);
      }
    }
  }

  public getConnectedPeersCount(): number {
    let n = 0;
    for (const p of this.peers.values()) {
      if (p.handshakeDone && p.channel.isOpen()) n++;
    }
    return n;
  }

  public getSeederPeersCount(): number {
    let n = 0;
    for (const p of this.peers.values()) {
      if (p.handshakeDone && p.hasAnyPiece && p.channel.isOpen()) n++;
    }
    return n;
  }

  public startDiscovery(
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> {
    if (this.discoveryPromise) return this.discoveryPromise;
    const task = this.fetchTrackerPeers(signal)
      .then((res) => {
        if (!res.ok) {
          // Never cache failed discovery promise so subsequent probe attempts trigger a real new request
          this.discoveryPromise = null;
        }
        return res;
      })
      .catch((err) => {
        this.discoveryPromise = null;
        throw err;
      });
    this.discoveryPromise = task;
    return task;
  }

  private async fetchTrackerPeers(
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> {
    try {
      const u = new URL('/bt-peers', WORKER_BASE_URL);
      u.searchParams.set('v', '2');
      u.searchParams.set('infoHash', this.infoHash);
      let addedTr = 0;
      for (const tr of this.trackers) {
        u.searchParams.append('tr', tr);
        if (++addedTr >= 8) break;
      }
      const timeoutSig = AbortSignal.timeout(9_500);
      const combined =
        signal && typeof AbortSignal.any === 'function'
          ? AbortSignal.any([signal, timeoutSig])
          : timeoutSig;
      const res = await fetch(u.toString(), { signal: combined });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        btPeersEndpoint?: boolean;
        peers?: string[];
        tokens?: Record<string, string>;
        exp?: number;
      } | null;

      if (!data?.btPeersEndpoint) {
        return {
          ok: false,
          workerMissing: true,
          detail: 'Cloudflare Worker needs /bt-peers & /bt-tunnel update',
        };
      }
      if (data.tokens && typeof data.exp === 'number') {
        this.workerRequiresTokens = true;
        for (const [peerAddr, sig] of Object.entries(data.tokens)) {
          if (typeof sig === 'string' && sig.length > 0) {
            this.peerTokens.set(peerAddr, { sig, exp: data.exp });
            this.tokenSignAttempts.delete(peerAddr);
          }
        }
      }
      const list = Array.isArray(data.peers) ? data.peers : [];
      this.enqueuePeers(list, false);
      this.replenishPool();
      if (list.length === 0 && this.peers.size === 0) {
        return { ok: false, detail: 'HTTP trackers returned 0 public IPv4 peers' };
      }
      return { ok: true, detail: `Discovered ${list.length} candidate TCP peer(s)` };
    } catch (err) {
      if (signal?.aborted) throw err;
      return { ok: false, detail: 'Tracker discovery request failed' };
    }
  }

  private async flushTokenSigningBatch(): Promise<void> {
    if (this.signingBatchInFlight || this.destroyed || this.awaitingTokenSign.size === 0) return;
    this.signingBatchInFlight = true;
    try {
      while (!this.destroyed && this.awaitingTokenSign.size > 0) {
        const batch = Array.from(this.awaitingTokenSign).slice(0, 48);
        for (const addr of batch) {
          this.awaitingTokenSign.delete(addr);
        }
        try {
          const u = new URL('/bt-sign-peers', WORKER_BASE_URL);
          const res = await fetch(u.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ infoHash: this.infoHash, peers: batch }),
            signal: AbortSignal.timeout(5_000),
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            tokens?: Record<string, string>;
            exp?: number;
          } | null;
          if (data?.ok && data.tokens && typeof data.exp === 'number') {
            const normalSigned: string[] = [];
            const provenSigned: string[] = [];
            for (const [peerAddr, sig] of Object.entries(data.tokens)) {
              if (typeof sig === 'string' && sig.length > 0) {
                this.peerTokens.set(peerAddr, { sig, exp: data.exp });
                this.tokenSignAttempts.delete(peerAddr);
                if (this.provenSeeders.has(peerAddr)) {
                  provenSigned.push(peerAddr);
                } else {
                  normalSigned.push(peerAddr);
                }
              }
            }
            if (normalSigned.length > 0) this.enqueuePeers(normalSigned, false, true);
            if (provenSigned.length > 0) this.enqueuePeers(provenSigned, true, true);
          }
        } catch {
          // Transient token signing error; remaining pool continues
        }
      }
    } finally {
      this.signingBatchInFlight = false;
      if (!this.destroyed) {
        this.replenishPool();
      }
    }
  }

  private notifyAvailability(): void {
    for (const wake of [...this.availabilityWaiters]) {
      this.availabilityWaiters.delete(wake);
      wake();
    }
  }

  public hasIdlePeerForPiece(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
  ): boolean {
    const geom = this.geometry ?? buildIdentityGeometry(totalSize, pieceLength);
    const slice = getLocalPieceSlice(geom, localPieceIndex);
    for (const p of this.peers.values()) {
      if (
        p.handshakeDone &&
        !p.choked &&
        p.job === null &&
        p.channel.isOpen() &&
        peerHasPiece(p.bitfield, p.haveSet, slice.torrentPieceIndex)
      ) {
        return true;
      }
    }
    return false;
  }

  public hasAnyPeerForPiece(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
  ): boolean {
    const geom = this.geometry ?? buildIdentityGeometry(totalSize, pieceLength);
    const slice = getLocalPieceSlice(geom, localPieceIndex);
    for (const p of this.peers.values()) {
      if (
        p.handshakeDone &&
        p.channel.isOpen() &&
        peerHasPiece(p.bitfield, p.haveSet, slice.torrentPieceIndex)
      ) {
        return true;
      }
    }
    return false;
  }

  public waitForIdleSlot(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (this.hasIdlePeerForPiece(localPieceIndex, pieceLength, totalSize)) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.availabilityWaiters.delete(onWake);
        signal?.removeEventListener('abort', onAbort);
        resolve(ok);
      };
      const onWake = () => {
        if (this.destroyed) {
          finish(false);
          return;
        }
        if (this.hasIdlePeerForPiece(localPieceIndex, pieceLength, totalSize)) {
          finish(true);
        }
      };
      const onAbort = () => finish(false);
      const timer = setTimeout(() => finish(false), timeoutMs);
      if (signal?.aborted || this.destroyed) {
        finish(false);
        return;
      }
      this.availabilityWaiters.add(onWake);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  public announceHavePiece(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
  ): void {
    const geom = this.geometry ?? buildIdentityGeometry(totalSize, pieceLength);
    const slice = getLocalPieceSlice(geom, localPieceIndex);
    const frame = buildBtHave(slice.torrentPieceIndex);
    for (const peer of this.peers.values()) {
      if (peer.handshakeDone && peer.channel.isOpen()) {
        peer.channel.send(frame);
      }
    }
  }

  private enqueuePeers(addrs: string[], highPriority: boolean, allowSeen = false): void {
    const ordered = highPriority ? addrs : prioritizeCandidatePeers(addrs);
    for (const raw of ordered) {
      const addr = raw.trim();
      if (!addr || this.peers.has(addr) || this.dialing.has(addr)) continue;
      if (!highPriority && !allowSeen && this.seenCandidates.has(addr)) continue;
      this.seenCandidates.add(addr);
      if (highPriority) {
        this.candidateQueue.unshift(addr);
      } else {
        this.candidateQueue.push(addr);
      }
    }
  }

  private replenishPool(): void {
    if (this.destroyed) return;
    const directCtor = getDirectTcpSocketCtor();
    const nowSec = Math.floor(Date.now() / 1000);
    let needBatchSign = false;

    while (
      this.peers.size < MAX_CONNECTED_SEEDERS &&
      this.dialing.size < MAX_DIALING_TUNNELS &&
      this.candidateQueue.length > 0
    ) {
      const nextAddr = this.candidateQueue.shift();
      if (!nextAddr || this.peers.has(nextAddr) || this.dialing.has(nextAddr)) continue;

      if (!directCtor && this.workerRequiresTokens) {
        const tok = this.peerTokens.get(nextAddr);
        if (!tok || tok.exp - nowSec < TOKEN_RENEW_MARGIN_SEC) {
          const attempts = this.tokenSignAttempts.get(nextAddr) ?? 0;
          if (attempts < 2 && !this.awaitingTokenSign.has(nextAddr)) {
            this.tokenSignAttempts.set(nextAddr, attempts + 1);
            this.awaitingTokenSign.add(nextAddr);
            needBatchSign = true;
          }
          continue;
        }
      }

      this.openPeerTunnel(nextAddr, directCtor);
    }

    if (needBatchSign) {
      void this.flushTokenSigningBatch();
    }
  }

  private ingestIncomingChunk(conn: EdgePeerConn, chunk: Uint8Array): void {
    if (this.destroyed || chunk.byteLength === 0) return;
    if (conn.recvBuffer.byteLength === 0) {
      conn.recvBuffer = chunk;
    } else {
      const merged = new Uint8Array(conn.recvBuffer.byteLength + chunk.byteLength);
      merged.set(conn.recvBuffer, 0);
      merged.set(chunk, conn.recvBuffer.byteLength);
      conn.recvBuffer = merged;
    }
    this.consumePeerBuffer(conn);
  }

  private openPeerTunnel(addr: string, directCtor: DirectTcpSocketConstructor | null): void {
    const colon = addr.lastIndexOf(':');
    if (colon <= 0) return;
    const host = addr.slice(0, colon);
    const port = Number(addr.slice(colon + 1));
    if (!host || !Number.isInteger(port)) return;

    if (directCtor) {
      let tcp: DirectTcpSocketInstance;
      try {
        tcp = new directCtor(host, port, { noDelay: true, keepAliveDelay: 25_000 });
      } catch {
        return;
      }
      let openFlag = false;
      let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
      let writeChain = Promise.resolve();

      const channel: PeerByteChannel = {
        isDirectTcp: true,
        isOpen: () => openFlag,
        send: (data: Uint8Array) => {
          if (!openFlag || !writer) return;
          const copy = new Uint8Array(data);
          writeChain = writeChain
            .then(() => {
              if (openFlag && writer) return writer.write(copy);
              return undefined;
            })
            .catch(() => this.dropPeer(conn, false));
        },
        close: () => {
          openFlag = false;
          try {
            writer?.releaseLock();
          } catch {
            // Ignore lock release on closed stream
          }
          writer = null;
          void tcp.close().catch(() => {});
        },
      };

      this.dialing.add(addr);
      const conn: EdgePeerConn = {
        addr,
        channel,
        handshakeDone: false,
        choked: true,
        hasAnyPiece: false,
        bitfield: null,
        haveSet: new Set<number>(),
        recvBuffer: new Uint8Array(0),
        utMetadataId: null,
        metadataSize: null,
        bytesReceived: 0,
        completedPieces: 0,
        failures: 0,
        job: null,
        handshakeTimer: setTimeout(() => {
          if (!conn.handshakeDone) this.dropPeer(conn, false);
        }, CONNECT_HANDSHAKE_TIMEOUT_MS),
      };

      void tcp.opened
        .then(async ({ readable, writable }) => {
          if (this.destroyed) {
            this.dropPeer(conn, false);
            return;
          }
          writer = writable.getWriter();
          openFlag = true;
          conn.channel.send(buildExtendedBtHandshake(this.infoHashBytes, this.peerIdBytes));
          const reader = readable.getReader();
          try {
            while (!this.destroyed && openFlag) {
              const { done, value } = await reader.read();
              if (done || !value) break;
              this.ingestIncomingChunk(conn, value);
            }
          } catch {
            // Peer closed or reset native TCP stream
          } finally {
            try {
              reader.releaseLock();
            } catch {
              // Ignore reader release error
            }
            this.dropPeer(conn, conn.completedPieces > 0 && conn.failures === 0);
          }
        })
        .catch(() => this.dropPeer(conn, false));
      return;
    }

    const wsUrl = new URL('/bt-tunnel', WORKER_BASE_URL.replace(/^http/i, 'ws'));
    wsUrl.searchParams.set('host', host);
    wsUrl.searchParams.set('port', String(port));
    wsUrl.searchParams.set('infoHash', this.infoHash);
    const tok = this.peerTokens.get(addr);
    if (tok) {
      wsUrl.searchParams.set('exp', String(tok.exp));
      wsUrl.searchParams.set('sig', tok.sig);
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl.toString());
    } catch {
      return;
    }
    ws.binaryType = 'arraybuffer';

    const channel: PeerByteChannel = {
      isDirectTcp: false,
      isOpen: () => ws.readyState === WebSocket.OPEN,
      send: (data: Uint8Array) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data as unknown as BufferSource);
        }
      },
      close: () => {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch {
          // Ignore WebSocket close error
        }
      },
    };

    this.dialing.add(addr);
    const conn: EdgePeerConn = {
      addr,
      channel,
      handshakeDone: false,
      choked: true,
      hasAnyPiece: false,
      bitfield: null,
      haveSet: new Set<number>(),
      recvBuffer: new Uint8Array(0),
      utMetadataId: null,
      metadataSize: null,
      bytesReceived: 0,
      completedPieces: 0,
      failures: 0,
      job: null,
      handshakeTimer: setTimeout(() => {
        if (!conn.handshakeDone) this.dropPeer(conn, false);
      }, CONNECT_HANDSHAKE_TIMEOUT_MS),
    };

    ws.onopen = () => {
      if (this.destroyed) {
        this.dropPeer(conn, false);
        return;
      }
      conn.channel.send(buildExtendedBtHandshake(this.infoHashBytes, this.peerIdBytes));
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (this.destroyed || !(ev.data instanceof ArrayBuffer)) return;
      this.ingestIncomingChunk(conn, new Uint8Array(ev.data));
    };

    ws.onerror = () => this.dropPeer(conn, false);
    ws.onclose = () => this.dropPeer(conn, conn.completedPieces > 0 && conn.failures === 0);
  }

  private dropPeer(conn: EdgePeerConn, requeueAsProven: boolean): void {
    this.dialing.delete(conn.addr);
    this.peers.delete(conn.addr);
    if (conn.handshakeTimer !== null) {
      clearTimeout(conn.handshakeTimer);
      conn.handshakeTimer = null;
    }
    if (conn.job) {
      const activeJob = conn.job;
      conn.job = null;
      clearTimeout(activeJob.idleTimer);
      activeJob.finish(null);
    }
    conn.channel.close();
    if (!this.destroyed && requeueAsProven) {
      this.enqueuePeers([conn.addr], true, true);
    }
    this.replenishPool();
    this.notifyAvailability();
  }

  private consumePeerBuffer(conn: EdgePeerConn): void {
    if (!conn.handshakeDone) {
      if (conn.recvBuffer.byteLength < 68) return;
      const check = verifyIncomingBtHandshake(conn.recvBuffer.subarray(0, 68), this.infoHashBytes);
      if (!check.valid) {
        this.dropPeer(conn, false);
        return;
      }
      conn.handshakeDone = true;
      conn.recvBuffer = conn.recvBuffer.subarray(68);
      if (conn.handshakeTimer !== null) {
        clearTimeout(conn.handshakeTimer);
        conn.handshakeTimer = null;
      }
      this.dialing.delete(conn.addr);
      this.peers.set(conn.addr, conn);
      this.replenishPool();

      if (check.supportsBep10) {
        conn.channel.send(buildBep10ExtendedHandshake());
      }
      conn.channel.send(buildBtInterested());
      this.notifyAvailability();
    }

    while (conn.recvBuffer.byteLength >= 4 && !this.destroyed) {
      const view = new DataView(
        conn.recvBuffer.buffer,
        conn.recvBuffer.byteOffset,
        conn.recvBuffer.byteLength,
      );
      const msgLen = view.getUint32(0, false);
      if (msgLen === 0) {
        conn.recvBuffer = conn.recvBuffer.subarray(4);
        continue;
      }
      if (msgLen > 2 * 1024 * 1024) {
        this.dropPeer(conn, false);
        return;
      }
      if (conn.recvBuffer.byteLength < 4 + msgLen) break;

      const msgId = conn.recvBuffer[4];
      const payload = conn.recvBuffer.subarray(5, 4 + msgLen);
      conn.recvBuffer = conn.recvBuffer.subarray(4 + msgLen);
      this.handlePeerMessage(conn, msgId, payload);
    }
  }

  private handlePeerMessage(conn: EdgePeerConn, msgId: number, payload: Uint8Array): void {
    if (msgId === 0) {
      conn.choked = true;
      if (conn.job) {
        const stalled = conn.job;
        conn.job = null;
        clearTimeout(stalled.idleTimer);
        stalled.finish(null);
      }
      return;
    }
    if (msgId === 1) {
      conn.choked = false;
      if (conn.job) {
        this.pumpBlockPipeline(conn);
      } else {
        this.notifyAvailability();
      }
      return;
    }
    if (msgId === 4 && payload.byteLength >= 4) {
      const idx = new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0, false);
      conn.haveSet.add(idx);
      conn.hasAnyPiece = true;
      this.notifyAvailability();
      return;
    }
    if (msgId === 5) {
      conn.bitfield = new Uint8Array(payload);
      if (payload.some((b) => b !== 0)) {
        conn.hasAnyPiece = true;
        conn.channel.send(buildBtInterested());
        this.notifyAvailability();
      }
      return;
    }
    if (msgId === 7 && payload.byteLength >= 8) {
      this.handlePieceBlock(conn, payload);
      return;
    }
    if (msgId === 20 && payload.byteLength >= 1) {
      this.handleExtendedMessage(conn, payload);
    }
  }

  private handleExtendedMessage(conn: EdgePeerConn, payload: Uint8Array): void {
    const extId = payload[0];
    if (extId === 0) {
      const ext = parseBep10Handshake(payload);
      conn.utMetadataId = ext.utMetadataId;
      conn.metadataSize = ext.metadataSize;
      return;
    }
    if (extId === UT_METADATA_LOCAL_ID && this.metaAssembly) {
      const msg = parseUtMetadataMessage(payload);
      if (!msg || msg.msgType !== 1) return;
      const asm = this.metaAssembly;
      if (msg.piece < asm.totalBlocks && !asm.blocks[msg.piece] && msg.dataSlice.byteLength > 0) {
        asm.blocks[msg.piece] = new Uint8Array(msg.dataSlice);
        asm.receivedCount += 1;
      }
      return;
    }
    if (extId === UT_PEX_LOCAL_ID) {
      const pexPeers = parseUtPexPeers(payload);
      if (pexPeers.length > 0) {
        this.enqueuePeers(pexPeers, false);
        this.replenishPool();
      }
    }
  }

  private handlePieceBlock(conn: EdgePeerConn, payload: Uint8Array): void {
    const job = conn.job;
    if (!job) return;
    const pView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const pieceIdx = pView.getUint32(0, false);
    const begin = pView.getUint32(4, false);
    const block = payload.subarray(8);

    const expectedLen = job.inFlightBlocks.get(begin);
    if (
      pieceIdx !== job.pieceIndex ||
      expectedLen !== block.byteLength ||
      job.receivedOffsets.has(begin) ||
      begin + block.byteLength > job.buffer.byteLength
    ) {
      return;
    }

    job.inFlightBlocks.delete(begin);
    job.receivedOffsets.add(begin);
    job.buffer.set(block, begin);
    job.receivedBytes += block.byteLength;
    conn.bytesReceived += block.byteLength;
    conn.failures = 0;
    job.armIdle();

    if (job.receivedBytes >= job.pieceLength) {
      conn.job = null;
      conn.completedPieces += 1;
      this.provenSeeders.add(conn.addr);
      clearTimeout(job.idleTimer);
      const out = job.buffer.buffer.slice(
        job.buffer.byteOffset,
        job.buffer.byteOffset + job.pieceLength,
      ) as ArrayBuffer;
      job.finish(out);

      // Proactive tunnel rotation to reset Cloudflare Free 10ms per-invocation CPU counter (skipped on Direct TCPSocket)
      if (!conn.channel.isDirectTcp && conn.bytesReceived >= ROTATE_AFTER_BYTES) {
        this.dropPeer(conn, true);
      } else {
        this.notifyAvailability();
      }
      return;
    }

    this.pumpBlockPipeline(conn);
  }

  private pumpBlockPipeline(conn: EdgePeerConn): void {
    const job = conn.job;
    if (!job || conn.choked || !conn.channel.isOpen()) return;
    while (job.inFlightBlocks.size < PIPELINE_DEPTH && job.pendingBlocks.length > 0) {
      const next = job.pendingBlocks.shift()!;
      job.inFlightBlocks.set(next.begin, next.length);
      conn.channel.send(buildBtRequestBlock(job.pieceIndex, next.begin, next.length));
    }
  }

  public async resolveMetainfoFromPeers(
    signal: AbortSignal,
    timeoutMs = 10_000,
  ): Promise<ParsedTorrentWithGeometry | null> {
    if (this.resolvedMeta) return this.resolvedMeta;
    const started = Date.now();
    let requested = false;

    while (Date.now() - started < timeoutMs) {
      if (signal.aborted || this.destroyed) return null;

      if (!requested) {
        const metaPeer = Array.from(this.peers.values()).find(
          (p) => p.utMetadataId !== null && p.metadataSize !== null && p.channel.isOpen(),
        );
        if (metaPeer && metaPeer.utMetadataId !== null && metaPeer.metadataSize !== null) {
          const totalBlocks = Math.ceil(metaPeer.metadataSize / METADATA_BLOCK_LEN);
          this.metaAssembly = {
            totalSize: metaPeer.metadataSize,
            totalBlocks,
            blocks: new Array<Uint8Array | null>(totalBlocks).fill(null),
            receivedCount: 0,
          };
          for (let b = 0; b < totalBlocks; b++) {
            metaPeer.channel.send(buildUtMetadataRequest(metaPeer.utMetadataId, b));
          }
          requested = true;
        }
      }

      const asm = this.metaAssembly;
      if (asm && asm.receivedCount >= asm.totalBlocks) {
        const fullInfo = new Uint8Array(asm.totalSize);
        let pos = 0;
        let validSlices = true;
        for (const slice of asm.blocks) {
          if (!slice || pos + slice.byteLength > asm.totalSize) {
            validSlices = false;
            break;
          }
          fullInfo.set(slice, pos);
          pos += slice.byteLength;
        }
        this.metaAssembly = null;
        if (validSlices && pos === asm.totalSize) {
          try {
            const wrapped = wrapRawInfoDictAsTorrent(fullInfo);
            const parsed = await parseTorrentFileBytes(wrapped);
            if (parsed.infoHashHex.toLowerCase() === this.infoHash) {
              this.resolvedMeta = parsed;
              this.geometry = parsed.geometry;
              return parsed;
            }
          } catch {
            // Invalid BEP-9 payload; retry on another peer
          }
        }
        requested = false;
      }

      await abortableSleep(250, signal);
    }
    return null;
  }

  private pickPeerForPiece(torrentPieceIndex: number, exclude: ReadonlySet<string>): EdgePeerConn | null {
    const idle = Array.from(this.peers.values()).filter(
      (p) =>
        !exclude.has(p.addr) &&
        p.handshakeDone &&
        p.channel.isOpen() &&
        p.job === null &&
        peerHasPiece(p.bitfield, p.haveSet, torrentPieceIndex),
    );
    if (idle.length === 0) return null;
    idle.sort((a, b) => {
      if (a.choked !== b.choked) return a.choked ? 1 : -1;
      if (this.provenSeeders.has(a.addr) !== this.provenSeeders.has(b.addr)) {
        return this.provenSeeders.has(a.addr) ? -1 : 1;
      }
      return b.completedPieces - a.completedPieces;
    });
    return idle[0];
  }

  private downloadPieceFromPeer(
    conn: EdgePeerConn,
    torrentPieceIndex: number,
    torrentPieceSize: number,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    return new Promise<ArrayBuffer | null>((resolve) => {
      let settled = false;
      const pendingBlocks: BlockSpec[] = [];
      for (let off = 0; off < torrentPieceSize; off += EDGE_BLOCK_LEN) {
        pendingBlocks.push({
          begin: off,
          length: Math.min(EDGE_BLOCK_LEN, torrentPieceSize - off),
        });
      }

      const finish = (res: ArrayBuffer | null) => {
        if (settled) return;
        settled = true;
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve(res);
      };

      const onTimeout = () => {
        if (conn.job === job) {
          for (const [begin, length] of job.inFlightBlocks) {
            conn.channel.send(buildBtCancelBlock(torrentPieceIndex, begin, length));
          }
          conn.job = null;
          conn.failures += 1;
          if (conn.failures >= 2) {
            this.dropPeer(conn, false);
          } else {
            this.notifyAvailability();
          }
        }
        finish(null);
      };

      const job: InFlightPieceJob = {
        pieceIndex: torrentPieceIndex,
        pieceLength: torrentPieceSize,
        buffer: new Uint8Array(torrentPieceSize),
        receivedBytes: 0,
        pendingBlocks,
        inFlightBlocks: new Map<number, number>(),
        receivedOffsets: new Set<number>(),
        idleTimer: setTimeout(onTimeout, BLOCK_IDLE_TIMEOUT_MS),
        armIdle: () => {
          clearTimeout(job.idleTimer);
          job.idleTimer = setTimeout(onTimeout, BLOCK_IDLE_TIMEOUT_MS);
        },
        finish,
      };

      const onAbort = () => {
        if (conn.job === job) {
          for (const [begin, length] of job.inFlightBlocks) {
            conn.channel.send(buildBtCancelBlock(torrentPieceIndex, begin, length));
          }
          conn.job = null;
          clearTimeout(job.idleTimer);
          this.notifyAvailability();
        }
        finish(null);
      };

      if (signal?.aborted) {
        finish(null);
        return;
      }
      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      conn.job = job;
      if (conn.choked) {
        conn.channel.send(buildBtInterested());
      } else {
        this.pumpBlockPipeline(conn);
      }
    });
  }

  public async fetchPieceInBrowser(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    const geom = this.geometry ?? buildIdentityGeometry(totalSize, pieceLength);
    const slice = getLocalPieceSlice(geom, localPieceIndex);
    const tried = new Set<string>();

    this.replenishPool();

    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted || this.destroyed) return null;

      let peer = this.pickPeerForPiece(slice.torrentPieceIndex, tried);
      if (!peer) {
        const waitMs =
          this.hasAnyPeerForPiece(localPieceIndex, pieceLength, totalSize) ||
          this.dialing.size > 0
            ? PEER_WAIT_QUEUE_TIMEOUT_MS
            : 2_500;
        await this.waitForIdleSlot(localPieceIndex, pieceLength, totalSize, waitMs, signal);
        peer = this.pickPeerForPiece(slice.torrentPieceIndex, tried);
      }
      if (!peer) continue;

      tried.add(peer.addr);
      const buf = await this.downloadPieceFromPeer(
        peer,
        slice.torrentPieceIndex,
        slice.torrentPieceSize,
        signal,
      );
      if (buf && buf.byteLength === slice.torrentPieceSize) {
        return buf;
      }
    }
    return null;
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.candidateQueue = [];
    this.awaitingTokenSign.clear();
    for (const conn of Array.from(this.peers.values())) {
      this.dropPeer(conn, false);
    }
    this.notifyAvailability();
  }
}
