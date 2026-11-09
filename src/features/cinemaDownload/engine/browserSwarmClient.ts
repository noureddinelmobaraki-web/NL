/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Pure-Browser WebRTC Swarm (WebTorrent WSS Trackers + DataChannel BEP-03 Wire Protocol)
 * + Direct HTTP 206 WebSeed Range Engine (Zero Node Server Required)
 */

import {
  BLOCK_LEN,
  buildIdentityGeometry,
  getLocalPieceSlice,
  parseTorrentFileBytes,
  type ParsedTorrentWithGeometry,
  type SelectedFileGeometry,
} from '../bencodeAndInputManager';
import { abortableSleep } from './abortUtils';
import {
  METADATA_BLOCK_LEN,
  UT_METADATA_LOCAL_ID,
  buildBep10ExtendedHandshake,
  buildBtCancelBlock,
  buildBtHave,
  buildBtInterested,
  buildBtKeepAlive,
  buildBtRequestBlock,
  buildExtendedBtHandshake,
  buildUtMetadataRequest,
  parseBep10Handshake,
  parseUtMetadataMessage,
  peerHasPiece,
  verifyIncomingBtHandshake,
  wrapRawInfoDictAsTorrent,
} from './edgeTcpWireProtocol';

const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.files.fm:7073/announce',
  'wss://tracker.novage.com.ua',
];

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const WEBRTC_PIPELINE_DEPTH = 8;
const WEBRTC_BLOCK_IDLE_MS = 12_000;
const WEBRTC_MAX_BUFFERED_BYTES = 262_144;
const WEBRTC_PEER_WAIT_MS = 16_000;
const STALE_OFFER_TTL_MS = 35_000;

function hexToBinaryString(hex: string): string {
  const clean = hex.trim().toLowerCase();
  let out = '';
  for (let i = 0; i < 40; i += 2) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16) || 0);
  }
  return out;
}

function hexToUint8(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

function generatePeerIdBinary(): { binary: string; bytes: Uint8Array } {
  const prefix = '-WW0109-';
  const bytes = new Uint8Array(20);
  for (let i = 0; i < prefix.length; i++) {
    bytes[i] = prefix.charCodeAt(i);
  }
  crypto.getRandomValues(bytes.subarray(prefix.length));
  let binary = '';
  for (let i = 0; i < 20; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { binary, bytes };
}

function generateOfferIdBinary(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 20; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function sendDcBinary(dc: RTCDataChannel, data: Uint8Array): void {
  if (dc.readyState !== 'open') return;
  const exact =
    data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
      ? (data.buffer as ArrayBuffer)
      : (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  dc.send(exact);
}

interface PendingOffer {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  createdAt: number;
}

interface WebRtcBlockSpec {
  begin: number;
  length: number;
}

interface WebRtcPieceJob {
  pieceIndex: number;
  pieceLength: number;
  buffer: Uint8Array;
  receivedBytes: number;
  pendingBlocks: WebRtcBlockSpec[];
  inFlightBlocks: Map<number, number>;
  receivedOffsets: Set<number>;
  idleTimer: ReturnType<typeof setTimeout>;
  armIdle: () => void;
  finish: (data: ArrayBuffer | null) => void;
}

interface WebRtcMetaAssembly {
  totalSize: number;
  totalBlocks: number;
  blocks: Array<Uint8Array | null>;
  receivedCount: number;
}

interface ConnectedWebRtcPeer {
  id: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  choked: boolean;
  handshakeDone: boolean;
  hasPieces: boolean;
  recvBuffer: Uint8Array;
  bitfield: Uint8Array | null;
  haveSet: Set<number>;
  utMetadataId: number | null;
  metadataSize: number | null;
  completedPieces: number;
  failures: number;
  job: WebRtcPieceJob | null;
}

export class BrowserSwarmSession {
  private readonly infoHashHex: string;
  private readonly infoHashBin: string;
  private readonly infoHashBytes: Uint8Array;
  private readonly peerIdBin: string;
  private readonly peerIdBytes: Uint8Array;
  private readonly trackers: string[];
  private readonly webSeeds: string[];
  private geometry: SelectedFileGeometry | null;
  private readonly trackerSockets = new Map<string, WebSocket>();
  private readonly pendingOffers = new Map<string, PendingOffer>();
  private readonly peers = new Map<string, ConnectedWebRtcPeer>();
  private readonly peerWaiters = new Set<() => void>();
  private readonly availabilityWaiters = new Set<() => void>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private announceIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private metaAssembly: WebRtcMetaAssembly | null = null;
  private resolvedMeta: ParsedTorrentWithGeometry | null = null;
  private started = false;
  private destroyed = false;

  constructor(
    infoHashHex: string,
    webSeedsOrTrackers: string[] = [],
    _selectedFileOffset = 0,
    geometry: SelectedFileGeometry | null = null,
  ) {
    this.infoHashHex = infoHashHex.trim().toLowerCase();
    this.infoHashBin = hexToBinaryString(this.infoHashHex);
    this.infoHashBytes = hexToUint8(this.infoHashHex);
    const pid = generatePeerIdBinary();
    this.peerIdBin = pid.binary;
    this.peerIdBytes = pid.bytes;
    void _selectedFileOffset;
    this.geometry = geometry;

    const wssList = webSeedsOrTrackers.filter((t) => /^wss:\/\//i.test(t));
    this.webSeeds = webSeedsOrTrackers.filter((t) => /^https?:\/\//i.test(t));
    this.trackers = Array.from(new Set([...WSS_TRACKERS, ...wssList])).slice(0, 6);
    this.start();
  }

  public setGeometry(geometry: SelectedFileGeometry | null): void {
    this.geometry = geometry;
  }

  public getWebSeeds(): string[] {
    return [...this.webSeeds];
  }

  public start(): void {
    if (this.started || this.destroyed || typeof WebSocket === 'undefined') {
      return;
    }
    this.started = true;
    for (const trackerUrl of this.trackers) {
      this.connectToTracker(trackerUrl);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.destroyed) return;
      const now = Date.now();
      for (const [offerId, pending] of this.pendingOffers) {
        if (now - pending.createdAt > STALE_OFFER_TTL_MS) {
          this.pendingOffers.delete(offerId);
          try {
            pending.dc.close();
            pending.pc.close();
          } catch {}
        }
      }
      const keepAlive = buildBtKeepAlive();
      for (const peer of this.peers.values()) {
        if (peer.handshakeDone && peer.dc.readyState === 'open') {
          try {
            sendDcBinary(peer.dc, keepAlive);
          } catch {}
        }
      }
    }, 25_000);

    this.announceIntervalTimer = setInterval(() => {
      if (this.destroyed) return;
      if (this.getSeederPeersCount() >= 8) return;
      for (const trackerUrl of this.trackers) {
        const existing = this.trackerSockets.get(trackerUrl);
        if (!existing || existing.readyState === WebSocket.CLOSED) {
          this.connectToTracker(trackerUrl);
        } else if (existing.readyState === WebSocket.OPEN) {
          void this.sendTrackerAnnounce(existing, 8, '');
        }
      }
    }, 28_000);
  }

  public getConnectedPeerCount(): number {
    return this.peers.size;
  }

  public getConnectedPeersCount(): number {
    return this.peers.size;
  }

  public getSeederPeersCount(): number {
    return Array.from(this.peers.values()).filter(
      (p) => p.handshakeDone && p.hasPieces && p.dc.readyState === 'open',
    ).length;
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
        p.dc.readyState === 'open' &&
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
        p.dc.readyState === 'open' &&
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
      if (peer.handshakeDone && peer.dc.readyState === 'open') {
        try {
          sendDcBinary(peer.dc, frame);
        } catch {}
      }
    }
  }

  public waitForConnectedPeer(
    timeoutMs = 4500,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (this.getSeederPeersCount() > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.peerWaiters.delete(onPeer);
        signal?.removeEventListener('abort', onAbort);
        resolve(this.peers.size > 0);
      }, timeoutMs);

      const onPeer = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.peerWaiters.delete(onPeer);
        signal?.removeEventListener('abort', onAbort);
        resolve(true);
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.peerWaiters.delete(onPeer);
        resolve(false);
      };

      this.peerWaiters.add(onPeer);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.announceIntervalTimer !== null) {
      clearInterval(this.announceIntervalTimer);
      this.announceIntervalTimer = null;
    }
    for (const ws of this.trackerSockets.values()) {
      try {
        ws.close();
      } catch {}
    }
    this.trackerSockets.clear();
    for (const offer of this.pendingOffers.values()) {
      try {
        offer.dc.close();
        offer.pc.close();
      } catch {}
    }
    this.pendingOffers.clear();
    for (const peer of this.peers.values()) {
      try {
        if (peer.job) {
          clearTimeout(peer.job.idleTimer);
          peer.job.finish(null);
          peer.job = null;
        }
        peer.dc.close();
        peer.pc.close();
      } catch {}
    }
    this.peers.clear();
    this.notifyAvailability();
  }

  private notifyPeerConnected(): void {
    for (const wake of [...this.peerWaiters]) {
      this.peerWaiters.delete(wake);
      wake();
    }
    this.notifyAvailability();
  }

  private notifyAvailability(): void {
    for (const wake of [...this.availabilityWaiters]) {
      this.availabilityWaiters.delete(wake);
      wake();
    }
  }

  private async createOfferItems(count: number): Promise<
    Array<{
      offer_id: string;
      offer: { type: 'offer'; sdp: string };
    }>
  > {
    if (typeof RTCPeerConnection === 'undefined') return [];
    const results: Array<{
      offer_id: string;
      offer: { type: 'offer'; sdp: string };
    }> = [];

    for (let i = 0; i < count; i++) {
      if (this.destroyed || this.pendingOffers.size >= 36) break;
      try {
        const offerId = generateOfferIdBinary();
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const dc = pc.createDataChannel('webrtc-datachannel');
        dc.binaryType = 'arraybuffer';

        this.bindDataChannel(offerId, pc, dc);

        const desc = await pc.createOffer();
        await pc.setLocalDescription(desc);

        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
            return;
          }
          const timer = setTimeout(resolve, 1200);
          pc.onicecandidate = (e) => {
            if (!e.candidate) {
              clearTimeout(timer);
              resolve();
            }
          };
        });

        if (pc.localDescription?.sdp) {
          this.pendingOffers.set(offerId, {
            pc,
            dc,
            createdAt: Date.now(),
          });
          results.push({
            offer_id: offerId,
            offer: { type: 'offer', sdp: pc.localDescription.sdp },
          });
        } else {
          pc.close();
        }
      } catch {}
    }
    return results;
  }

  private async sendTrackerAnnounce(
    ws: WebSocket,
    numwant = 8,
    event: 'started' | '' = 'started',
  ): Promise<void> {
    const offers = await this.createOfferItems(numwant);
    if (this.destroyed || ws.readyState !== WebSocket.OPEN || offers.length === 0) return;
    const payload: Record<string, unknown> = {
      action: 'announce',
      info_hash: this.infoHashBin,
      peer_id: this.peerIdBin,
      numwant: offers.length,
      uploaded: 0,
      downloaded: 0,
      left: 1,
      offers,
    };
    if (event) payload.event = event;
    ws.send(JSON.stringify(payload));
  }

  private connectToTracker(url: string): void {
    try {
      const ws = new WebSocket(url);
      this.trackerSockets.set(url, ws);

      ws.onopen = () => {
        if (this.destroyed) return;
        void this.sendTrackerAnnounce(ws, 8, 'started');
      };

      ws.onmessage = (ev) => {
        if (this.destroyed || typeof ev.data !== 'string') return;
        void this.handleTrackerMessage(ws, ev.data);
      };

      ws.onclose = () => {
        if (this.trackerSockets.get(url) === ws) {
          this.trackerSockets.delete(url);
        }
      };
    } catch {}
  }

  private async handleTrackerMessage(ws: WebSocket, raw: string): Promise<void> {
    try {
      const data = JSON.parse(raw);
      if (data.info_hash !== this.infoHashBin) return;

      if (data.answer && data.offer_id) {
        const pending = this.pendingOffers.get(data.offer_id);
        if (pending) {
          this.pendingOffers.delete(data.offer_id);
          await pending.pc.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
        }
      } else if (data.offer && data.offer_id && data.peer_id) {
        await this.answerIncomingPeerOffer(
          ws,
          String(data.offer_id),
          String(data.peer_id),
          data.offer,
        );
      }
    } catch {}
  }

  private async answerIncomingPeerOffer(
    ws: WebSocket,
    offerId: string,
    remotePeerId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.ondatachannel = (dce) => {
        const dc = dce.channel;
        dc.binaryType = 'arraybuffer';
        this.bindDataChannel(remotePeerId, pc, dc);
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, 1200);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            clearTimeout(timer);
            resolve();
          }
        };
      });

      if (ws.readyState === WebSocket.OPEN && pc.localDescription?.sdp) {
        ws.send(
          JSON.stringify({
            action: 'announce',
            info_hash: this.infoHashBin,
            peer_id: this.peerIdBin,
            to_peer_id: remotePeerId,
            offer_id: offerId,
            answer: { type: 'answer', sdp: pc.localDescription.sdp },
          }),
        );
      }
    } catch {}
  }

  private bindDataChannel(
    id: string,
    pc: RTCPeerConnection,
    dc: RTCDataChannel,
  ): void {
    const peer: ConnectedWebRtcPeer = {
      id,
      pc,
      dc,
      choked: true,
      handshakeDone: false,
      hasPieces: false,
      recvBuffer: new Uint8Array(0),
      bitfield: null,
      haveSet: new Set<number>(),
      utMetadataId: null,
      metadataSize: null,
      completedPieces: 0,
      failures: 0,
      job: null,
    };

    try {
      dc.bufferedAmountLowThreshold = 65_536;
    } catch {}
    dc.onbufferedamountlow = () => {
      this.pumpPeerPipeline(peer);
    };

    dc.onopen = () => {
      if (this.destroyed) {
        try {
          dc.close();
          pc.close();
        } catch {}
        return;
      }
      this.peers.set(id, peer);
      try {
        sendDcBinary(dc, buildExtendedBtHandshake(this.infoHashBytes, this.peerIdBytes));
      } catch {}
    };

    const cleanupPeer = () => {
      this.peers.delete(id);
      if (peer.job) {
        const stalled = peer.job;
        peer.job = null;
        clearTimeout(stalled.idleTimer);
        stalled.finish(null);
      }
      this.notifyAvailability();
    };

    dc.onclose = cleanupPeer;
    dc.onerror = cleanupPeer;

    dc.onmessage = (ev) => {
      if (this.destroyed || !(ev.data instanceof ArrayBuffer)) return;
      const incoming = new Uint8Array(ev.data);
      if (incoming.byteLength === 0) return;
      if (peer.recvBuffer.byteLength === 0) {
        peer.recvBuffer = incoming;
      } else {
        const merged = new Uint8Array(peer.recvBuffer.byteLength + incoming.byteLength);
        merged.set(peer.recvBuffer, 0);
        merged.set(incoming, peer.recvBuffer.byteLength);
        peer.recvBuffer = merged;
      }
      this.parseWireStream(peer);
    };
  }

  private parseWireStream(peer: ConnectedWebRtcPeer): void {
    if (!peer.handshakeDone) {
      if (peer.recvBuffer.byteLength < 68) return;
      const check = verifyIncomingBtHandshake(
        peer.recvBuffer.subarray(0, 68),
        this.infoHashBytes,
      );
      if (!check.valid) {
        try {
          peer.dc.close();
          peer.pc.close();
        } catch {}
        return;
      }
      peer.handshakeDone = true;
      peer.recvBuffer = peer.recvBuffer.subarray(68);
      try {
        if (check.supportsBep10) {
          sendDcBinary(peer.dc, buildBep10ExtendedHandshake());
        }
        sendDcBinary(peer.dc, buildBtInterested());
      } catch {}
      this.notifyPeerConnected();
    }

    while (peer.recvBuffer.byteLength >= 4 && !this.destroyed) {
      const view = new DataView(
        peer.recvBuffer.buffer,
        peer.recvBuffer.byteOffset,
        peer.recvBuffer.byteLength,
      );
      const msgLen = view.getUint32(0, false);
      if (msgLen === 0) {
        peer.recvBuffer = peer.recvBuffer.subarray(4);
        continue;
      }
      if (msgLen > 2 * 1024 * 1024) {
        try {
          peer.dc.close();
          peer.pc.close();
        } catch {}
        return;
      }
      if (peer.recvBuffer.byteLength < 4 + msgLen) break;

      const msgId = peer.recvBuffer[4];
      const payload = peer.recvBuffer.subarray(5, 4 + msgLen);
      peer.recvBuffer = peer.recvBuffer.subarray(4 + msgLen);
      this.handlePeerWireMessage(peer, msgId, payload);
    }
  }

  private handlePeerWireMessage(
    peer: ConnectedWebRtcPeer,
    msgId: number,
    payload: Uint8Array,
  ): void {
    if (msgId === 0) {
      peer.choked = true;
      if (peer.job) {
        const stalled = peer.job;
        peer.job = null;
        clearTimeout(stalled.idleTimer);
        stalled.finish(null);
      }
      return;
    }
    if (msgId === 1) {
      peer.choked = false;
      if (peer.job) {
        this.pumpPeerPipeline(peer);
      } else {
        this.notifyAvailability();
      }
      return;
    }
    if (msgId === 4 && payload.byteLength >= 4) {
      const idx = new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0, false);
      peer.haveSet.add(idx);
      peer.hasPieces = true;
      try {
        sendDcBinary(peer.dc, buildBtInterested());
      } catch {}
      this.notifyPeerConnected();
      return;
    }
    if (msgId === 5) {
      peer.bitfield = new Uint8Array(payload);
      if (payload.some((b) => b !== 0)) {
        peer.hasPieces = true;
        try {
          sendDcBinary(peer.dc, buildBtInterested());
        } catch {}
        this.notifyPeerConnected();
      }
      return;
    }
    if (msgId === 7 && payload.byteLength >= 8) {
      this.handlePieceBlock(peer, payload);
      return;
    }
    if (msgId === 20 && payload.byteLength >= 1) {
      this.handleExtendedMessage(peer, payload);
    }
  }

  private handleExtendedMessage(peer: ConnectedWebRtcPeer, payload: Uint8Array): void {
    const extId = payload[0];
    if (extId === 0) {
      const ext = parseBep10Handshake(payload);
      peer.utMetadataId = ext.utMetadataId;
      peer.metadataSize = ext.metadataSize;
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
    }
  }

  private handlePieceBlock(peer: ConnectedWebRtcPeer, payload: Uint8Array): void {
    const job = peer.job;
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
    peer.failures = 0;
    job.armIdle();

    if (job.receivedBytes >= job.pieceLength) {
      peer.job = null;
      peer.completedPieces += 1;
      clearTimeout(job.idleTimer);
      const out = job.buffer.buffer.slice(
        job.buffer.byteOffset,
        job.buffer.byteOffset + job.pieceLength,
      ) as ArrayBuffer;
      job.finish(out);
      this.notifyAvailability();
      return;
    }

    this.pumpPeerPipeline(peer);
  }

  private pumpPeerPipeline(peer: ConnectedWebRtcPeer): void {
    const job = peer.job;
    if (!job || peer.choked || peer.dc.readyState !== 'open') return;
    while (
      job.inFlightBlocks.size < WEBRTC_PIPELINE_DEPTH &&
      job.pendingBlocks.length > 0 &&
      peer.dc.bufferedAmount <= WEBRTC_MAX_BUFFERED_BYTES
    ) {
      const next = job.pendingBlocks.shift()!;
      job.inFlightBlocks.set(next.begin, next.length);
      try {
        sendDcBinary(peer.dc, buildBtRequestBlock(job.pieceIndex, next.begin, next.length));
      } catch {
        job.pendingBlocks.unshift(next);
        job.inFlightBlocks.delete(next.begin);
        break;
      }
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
          (p) =>
            p.utMetadataId !== null &&
            p.metadataSize !== null &&
            p.dc.readyState === 'open',
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
            try {
              sendDcBinary(metaPeer.dc, buildUtMetadataRequest(metaPeer.utMetadataId, b));
            } catch {}
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
            if (parsed.infoHashHex.toLowerCase() === this.infoHashHex) {
              this.resolvedMeta = parsed;
              this.geometry = parsed.geometry;
              return parsed;
            }
          } catch {}
        }
        requested = false;
      }

      await abortableSleep(250, signal);
    }
    return null;
  }

  private pickPeerForPiece(
    torrentPieceIndex: number,
    exclude: ReadonlySet<string>,
  ): ConnectedWebRtcPeer | null {
    const candidates = Array.from(this.peers.values()).filter(
      (p) =>
        !exclude.has(p.id) &&
        p.handshakeDone &&
        p.dc.readyState === 'open' &&
        p.job === null &&
        peerHasPiece(p.bitfield, p.haveSet, torrentPieceIndex),
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (a.choked !== b.choked) return a.choked ? 1 : -1;
      if (a.failures !== b.failures) return a.failures - b.failures;
      return b.completedPieces - a.completedPieces;
    });
    return candidates[0];
  }

  private downloadPieceFromPeer(
    peer: ConnectedWebRtcPeer,
    torrentPieceIndex: number,
    expectedTorrentPieceLength: number,
    idleTimeoutMs: number,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    return new Promise<ArrayBuffer | null>((resolve) => {
      let settled = false;
      const pendingBlocks: WebRtcBlockSpec[] = [];
      for (let off = 0; off < expectedTorrentPieceLength; off += BLOCK_LEN) {
        pendingBlocks.push({
          begin: off,
          length: Math.min(BLOCK_LEN, expectedTorrentPieceLength - off),
        });
      }

      const finish = (res: ArrayBuffer | null) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        resolve(res);
      };

      const onTimeout = () => {
        if (peer.job === job) {
          for (const [begin, length] of job.inFlightBlocks) {
            try {
              sendDcBinary(peer.dc, buildBtCancelBlock(torrentPieceIndex, begin, length));
            } catch {}
          }
          peer.job = null;
          peer.failures += 1;
          this.notifyAvailability();
        }
        finish(null);
      };

      const job: WebRtcPieceJob = {
        pieceIndex: torrentPieceIndex,
        pieceLength: expectedTorrentPieceLength,
        buffer: new Uint8Array(expectedTorrentPieceLength),
        receivedBytes: 0,
        pendingBlocks,
        inFlightBlocks: new Map<number, number>(),
        receivedOffsets: new Set<number>(),
        idleTimer: setTimeout(onTimeout, idleTimeoutMs),
        armIdle: () => {
          clearTimeout(job.idleTimer);
          job.idleTimer = setTimeout(onTimeout, idleTimeoutMs);
        },
        finish,
      };

      const onAbort = () => {
        if (peer.job === job) {
          for (const [begin, length] of job.inFlightBlocks) {
            try {
              sendDcBinary(peer.dc, buildBtCancelBlock(torrentPieceIndex, begin, length));
            } catch {}
          }
          peer.job = null;
          clearTimeout(job.idleTimer);
          this.notifyAvailability();
        }
        finish(null);
      };

      if (signal?.aborted) {
        finish(null);
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });

      peer.job = job;
      if (peer.choked) {
        try {
          sendDcBinary(peer.dc, buildBtInterested());
        } catch {}
      } else {
        this.pumpPeerPipeline(peer);
      }
    });
  }

  public async requestPieceFromSwarm(
    torrentPieceIndex: number,
    expectedTorrentPieceLength: number,
    timeoutMs = WEBRTC_BLOCK_IDLE_MS,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    const peer = this.pickPeerForPiece(torrentPieceIndex, new Set<string>());
    if (!peer) return null;
    return this.downloadPieceFromPeer(
      peer,
      torrentPieceIndex,
      expectedTorrentPieceLength,
      timeoutMs,
      signal,
    );
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

    if (this.getSeederPeersCount() === 0) {
      await this.waitForConnectedPeer(3500, signal);
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted || this.destroyed) return null;

      let peer = this.pickPeerForPiece(slice.torrentPieceIndex, tried);
      if (!peer) {
        const waitMs = this.hasAnyPeerForPiece(localPieceIndex, pieceLength, totalSize)
          ? WEBRTC_PEER_WAIT_MS
          : 2_500;
        await this.waitForIdleSlot(localPieceIndex, pieceLength, totalSize, waitMs, signal);
        peer = this.pickPeerForPiece(slice.torrentPieceIndex, tried);
      }
      if (!peer) continue;

      tried.add(peer.id);
      const buf = await this.downloadPieceFromPeer(
        peer,
        slice.torrentPieceIndex,
        slice.torrentPieceSize,
        WEBRTC_BLOCK_IDLE_MS,
        signal,
      );
      if (buf && buf.byteLength === slice.torrentPieceSize) {
        return buf;
      }
    }

    return null;
  }
}

export { BrowserSwarmSession as BrowserWebRtcSwarmSession };

/**
 * Direct Browser HTTP 206 Range / WebSeed / Worker Proxy Piece Fetcher
 * Enforces strict HTTP 206 Partial Content and Content-Range verification.
 */
export async function fetchPieceDirectFromWebSeedsOrStream(params: {
  localPieceIndex: number;
  geometry: SelectedFileGeometry;
  webSeeds?: string[];
  directStreamUrl?: string;
  referer?: string;
  signal?: AbortSignal;
}): Promise<ArrayBuffer | null> {
  const {
    localPieceIndex,
    geometry,
    webSeeds = [],
    directStreamUrl,
    signal,
  } = params;

  const slice = getLocalPieceSlice(geometry, localPieceIndex);
  const startByte = slice.fileStart;
  const endByte = startByte + slice.length - 1;
  if (endByte < startByte || slice.length <= 0) return null;

  const candidateUrls: string[] = [];
  if (directStreamUrl) candidateUrls.push(directStreamUrl);
  for (const ws of webSeeds) {
    if (/^https?:\/\//i.test(ws)) candidateUrls.push(ws);
  }

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Range: `bytes=${startByte}-${endByte}`,
        },
        signal: signal ?? AbortSignal.timeout(16000),
      });

      if (res.status !== 206) {
        try {
          await res.body?.cancel();
        } catch {}
        continue;
      }

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('application/json')) {
        try {
          await res.body?.cancel();
        } catch {}
        continue;
      }

      const cr = res.headers.get('content-range');
      if (cr) {
        const m = cr.match(/bytes\s+(\d+)-(\d+)/i);
        if (m && Number(m[1]) !== startByte) {
          try {
            await res.body?.cancel();
          } catch {}
          continue;
        }
      }

      const ab = await res.arrayBuffer();
      if (ab.byteLength === slice.length) {
        return ab;
      }
      if (ab.byteLength > slice.length) {
        return ab.slice(0, slice.length);
      }
    } catch {
      // Try next URL
    }
  }

  return null;
}

export function ensureGeometry(
  geometry: SelectedFileGeometry | undefined,
  totalSize: number,
  pieceLength: number,
): SelectedFileGeometry {
  return geometry || buildIdentityGeometry(totalSize, pieceLength);
}
