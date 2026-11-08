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
  verifyIncomingBtHandshake,
  wrapRawInfoDictAsTorrent,
} from './edgeTcpWireProtocol';

const MAX_ACTIVE_TUNNELS = 6;
const PIPELINE_DEPTH = 10;
const BLOCK_IDLE_TIMEOUT_MS = 12_000;
const CONNECT_HANDSHAKE_TIMEOUT_MS = 8_500;
const ROTATE_AFTER_BYTES = 48 * 1024 * 1024;

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
  idleTimer: ReturnType<typeof setTimeout>;
  armIdle: () => void;
  finish: (result: ArrayBuffer | null) => void;
}

interface EdgePeerConn {
  addr: string;
  ws: WebSocket;
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

function sendWsBinary(ws: WebSocket, data: Uint8Array): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(data as unknown as BufferSource);
  }
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
  private destroyed = false;
  private discoveryPromise: Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private metaAssembly: MetadataAssembly | null = null;
  private resolvedMeta: ParsedTorrentWithGeometry | null = null;

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
        if (peer.handshakeDone) sendWsBinary(peer.ws, buildBtKeepAlive());
      }
      this.replenishPool();
    }, 25_000);

    this.refreshTimer = setInterval(() => {
      if (!this.destroyed && this.candidateQueue.length < 8 && this.getSeederPeersCount() < 3) {
        this.discoveryPromise = null;
        void this.startDiscovery();
      }
    }, 75_000);
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
      if (p.handshakeDone && p.ws.readyState === WebSocket.OPEN) n++;
    }
    return n;
  }

  public getSeederPeersCount(): number {
    let n = 0;
    for (const p of this.peers.values()) {
      if (p.handshakeDone && p.hasAnyPiece && p.ws.readyState === WebSocket.OPEN) n++;
    }
    return n;
  }

  public startDiscovery(
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> {
    if (this.discoveryPromise) return this.discoveryPromise;
    this.discoveryPromise = this.fetchTrackerPeers(signal);
    return this.discoveryPromise;
  }

  private async fetchTrackerPeers(
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; workerMissing?: boolean; detail: string }> {
    try {
      const u = new URL('/bt-peers', WORKER_BASE_URL);
      u.searchParams.set('infoHash', this.infoHash);
      let addedTr = 0;
      for (const tr of this.trackers) {
        u.searchParams.append('tr', tr);
        if (++addedTr >= 8) break;
      }
      const timeoutSig = AbortSignal.timeout(8_500);
      const combined =
        signal && typeof AbortSignal.any === 'function'
          ? AbortSignal.any([signal, timeoutSig])
          : timeoutSig;
      const res = await fetch(u.toString(), { signal: combined });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        btPeersEndpoint?: boolean;
        peers?: string[];
      } | null;

      if (!data?.btPeersEndpoint) {
        return {
          ok: false,
          workerMissing: true,
          detail: 'Cloudflare Worker needs /bt-peers & /bt-tunnel update',
        };
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

  private enqueuePeers(addrs: string[], highPriority: boolean): void {
    for (const raw of addrs) {
      const addr = raw.trim();
      if (!addr || this.peers.has(addr) || this.dialing.has(addr)) continue;
      if (!highPriority && this.seenCandidates.has(addr)) continue;
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
    while (
      this.peers.size + this.dialing.size < MAX_ACTIVE_TUNNELS &&
      this.candidateQueue.length > 0
    ) {
      const nextAddr = this.candidateQueue.shift();
      if (nextAddr && !this.peers.has(nextAddr) && !this.dialing.has(nextAddr)) {
        this.openPeerTunnel(nextAddr);
      }
    }
  }

  private openPeerTunnel(addr: string): void {
    const colon = addr.lastIndexOf(':');
    if (colon <= 0) return;
    const host = addr.slice(0, colon);
    const port = Number(addr.slice(colon + 1));
    if (!host || !Number.isInteger(port)) return;

    const wsBase = WORKER_BASE_URL.replace(/^http/i, 'ws');
    const wsUrl = `${wsBase}/bt-tunnel?host=${encodeURIComponent(host)}&port=${port}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }
    ws.binaryType = 'arraybuffer';
    this.dialing.add(addr);

    const conn: EdgePeerConn = {
      addr,
      ws,
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
      sendWsBinary(ws, buildExtendedBtHandshake(this.infoHashBytes, this.peerIdBytes));
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (this.destroyed || !(ev.data instanceof ArrayBuffer)) return;
      const chunk = new Uint8Array(ev.data);
      if (chunk.byteLength === 0) return;
      if (conn.recvBuffer.byteLength === 0) {
        conn.recvBuffer = chunk;
      } else {
        const merged = new Uint8Array(conn.recvBuffer.byteLength + chunk.byteLength);
        merged.set(conn.recvBuffer, 0);
        merged.set(chunk, conn.recvBuffer.byteLength);
        conn.recvBuffer = merged;
      }
      this.consumePeerBuffer(conn);
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
    try {
      if (conn.ws.readyState === WebSocket.OPEN || conn.ws.readyState === WebSocket.CONNECTING) {
        conn.ws.close();
      }
    } catch {}
    if (!this.destroyed && requeueAsProven) {
      this.enqueuePeers([conn.addr], true);
    }
    this.replenishPool();
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

      if (check.supportsBep10) {
        sendWsBinary(conn.ws, buildBep10ExtendedHandshake());
      }
      sendWsBinary(conn.ws, buildBtInterested());
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
      if (conn.job) this.pumpBlockPipeline(conn);
      return;
    }
    if (msgId === 4 && payload.byteLength >= 4) {
      const idx = new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0, false);
      conn.haveSet.add(idx);
      conn.hasAnyPiece = true;
      return;
    }
    if (msgId === 5) {
      conn.bitfield = new Uint8Array(payload);
      if (payload.some((b) => b !== 0)) {
        conn.hasAnyPiece = true;
        sendWsBinary(conn.ws, buildBtInterested());
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

    if (
      pieceIdx !== job.pieceIndex ||
      !job.inFlightBlocks.has(begin) ||
      begin + block.byteLength > job.buffer.byteLength
    ) {
      return;
    }

    job.inFlightBlocks.delete(begin);
    job.buffer.set(block, begin);
    job.receivedBytes += block.byteLength;
    conn.bytesReceived += block.byteLength;
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

      // Proactive tunnel rotation to reset Cloudflare Free 10ms per-invocation CPU counter
      if (conn.bytesReceived >= ROTATE_AFTER_BYTES) {
        this.dropPeer(conn, true);
      }
      return;
    }

    this.pumpBlockPipeline(conn);
  }

  private pumpBlockPipeline(conn: EdgePeerConn): void {
    const job = conn.job;
    if (!job || conn.choked || conn.ws.readyState !== WebSocket.OPEN) return;
    while (job.inFlightBlocks.size < PIPELINE_DEPTH && job.pendingBlocks.length > 0) {
      const next = job.pendingBlocks.shift()!;
      job.inFlightBlocks.set(next.begin, next.length);
      sendWsBinary(conn.ws, buildBtRequestBlock(job.pieceIndex, next.begin, next.length));
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
          (p) => p.utMetadataId !== null && p.metadataSize !== null && p.ws.readyState === WebSocket.OPEN,
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
            sendWsBinary(metaPeer.ws, buildUtMetadataRequest(metaPeer.utMetadataId, b));
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
        p.ws.readyState === WebSocket.OPEN &&
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
        if (conn.job?.pieceIndex === torrentPieceIndex) {
          conn.job = null;
          conn.failures += 1;
          if (conn.failures >= 2) this.dropPeer(conn, false);
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
            sendWsBinary(conn.ws, buildBtCancelBlock(torrentPieceIndex, begin, length));
          }
          conn.job = null;
          clearTimeout(job.idleTimer);
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
        sendWsBinary(conn.ws, buildBtInterested());
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
        await abortableSleep(600, signal ?? new AbortController().signal).catch(() => {});
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
    for (const conn of Array.from(this.peers.values())) {
      this.dropPeer(conn, false);
    }
  }
}
