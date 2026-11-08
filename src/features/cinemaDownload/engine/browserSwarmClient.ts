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
  type SelectedFileGeometry,
} from '../bencodeAndInputManager';

const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',
];

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

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

function buildBtHandshake(
  infoHashBytes: Uint8Array,
  peerIdBytes: Uint8Array,
): Uint8Array {
  const pstr = 'BitTorrent protocol';
  const buf = new Uint8Array(68);
  buf[0] = 19;
  for (let i = 0; i < 19; i++) {
    buf[1 + i] = pstr.charCodeAt(i);
  }
  // 8 reserved bytes (enable BEP-10 extension bit at byte 25 |= 0x10)
  buf[25] = 0x10;
  buf.set(infoHashBytes.subarray(0, 20), 28);
  buf.set(peerIdBytes.subarray(0, 20), 48);
  return buf;
}

function buildInterestedMessage(): Uint8Array {
  return new Uint8Array([0, 0, 0, 1, 2]);
}

function buildRequestBlockMessage(
  index: number,
  begin: number,
  length: number,
): Uint8Array {
  const buf = new Uint8Array(17);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 13, false);
  buf[4] = 6; // request message ID
  view.setUint32(5, index >>> 0, false);
  view.setUint32(9, begin >>> 0, false);
  view.setUint32(13, length >>> 0, false);
  return buf;
}

interface PendingOffer {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  createdAt: number;
}

interface ConnectedWebRtcPeer {
  id: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  choked: boolean;
  handshakeDone: boolean;
  recvBuffer: Uint8Array;
  bitfield: Uint8Array | null;
  inFlightPiece: {
    pieceIndex: number;
    pieceLength: number;
    buffer: Uint8Array;
    receivedBytes: number;
    resolve: (data: ArrayBuffer) => void;
    reject: (err: Error) => void;
    timer: number;
  } | null;
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
  private readonly sockets: WebSocket[] = [];
  private readonly pendingOffers = new Map<string, PendingOffer>();
  private readonly peers = new Map<string, ConnectedWebRtcPeer>();
  private readonly peerWaiters = new Set<() => void>();
  private announceIntervalTimer: number | null = null;
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
    this.trackers = Array.from(new Set([...WSS_TRACKERS, ...wssList])).slice(
      0,
      6,
    );
    this.start();
  }

  public setGeometry(geometry: SelectedFileGeometry | null): void {
    this.geometry = geometry;
  }

  public start(): void {
    if (this.started || this.destroyed || typeof WebSocket === 'undefined') {
      return;
    }
    this.started = true;
    for (const trackerUrl of this.trackers) {
      this.connectToTracker(trackerUrl);
    }
    this.announceIntervalTimer = window.setInterval(() => {
      if (this.destroyed) return;
      for (const ws of this.sockets) {
        if (ws.readyState === WebSocket.OPEN && this.peers.size < 8) {
          void this.sendTrackerAnnounce(ws, 3, '');
        }
      }
    }, 35000);
  }

  public getConnectedPeerCount(): number {
    return this.peers.size;
  }

  public getConnectedPeersCount(): number {
    return this.peers.size;
  }

  public waitForConnectedPeer(
    timeoutMs = 4500,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (this.peers.size > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.peerWaiters.delete(onPeer);
        signal?.removeEventListener('abort', onAbort);
        resolve(this.peers.size > 0);
      }, timeoutMs);

      const onPeer = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        this.peerWaiters.delete(onPeer);
        signal?.removeEventListener('abort', onAbort);
        resolve(true);
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        this.peerWaiters.delete(onPeer);
        resolve(false);
      };

      this.peerWaiters.add(onPeer);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.announceIntervalTimer !== null) {
      window.clearInterval(this.announceIntervalTimer);
      this.announceIntervalTimer = null;
    }
    for (const ws of this.sockets) {
      try {
        ws.close();
      } catch {}
    }
    this.sockets.length = 0;
    for (const offer of this.pendingOffers.values()) {
      try {
        offer.dc.close();
        offer.pc.close();
      } catch {}
    }
    this.pendingOffers.clear();
    for (const peer of this.peers.values()) {
      try {
        if (peer.inFlightPiece) {
          window.clearTimeout(peer.inFlightPiece.timer);
          peer.inFlightPiece.reject(new Error('Swarm session closed'));
        }
        peer.dc.close();
        peer.pc.close();
      } catch {}
    }
    this.peers.clear();
  }

  private notifyPeerConnected(): void {
    for (const wake of [...this.peerWaiters]) {
      this.peerWaiters.delete(wake);
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
          const timer = window.setTimeout(resolve, 1500);
          pc.onicecandidate = (e) => {
            if (!e.candidate) {
              window.clearTimeout(timer);
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
    numwant = 4,
    event: 'started' | '' = 'started',
  ): Promise<void> {
    const offers = await this.createOfferItems(numwant);
    if (this.destroyed || ws.readyState !== WebSocket.OPEN) return;
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
      this.sockets.push(ws);

      ws.onopen = () => {
        if (this.destroyed) return;
        void this.sendTrackerAnnounce(ws, 4, 'started');
      };

      ws.onmessage = (ev) => {
        if (this.destroyed || typeof ev.data !== 'string') return;
        void this.handleTrackerMessage(ws, ev.data);
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
        const timer = window.setTimeout(resolve, 1500);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            window.clearTimeout(timer);
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
      recvBuffer: new Uint8Array(0),
      bitfield: null,
      inFlightPiece: null,
    };

    dc.onopen = () => {
      if (this.destroyed) return;
      this.peers.set(id, peer);
      this.notifyPeerConnected();
      try {
        // Send only 68-byte BitTorrent handshake on channel open; send interested after handshake/have/bitfield
        dc.send(
          buildBtHandshake(
            this.infoHashBytes,
            this.peerIdBytes,
          ) as unknown as ArrayBufferView<ArrayBuffer>,
        );
      } catch {}
    };

    dc.onclose = () => {
      this.peers.delete(id);
      if (peer.inFlightPiece) {
        window.clearTimeout(peer.inFlightPiece.timer);
        peer.inFlightPiece.reject(new Error('Peer disconnected'));
        peer.inFlightPiece = null;
      }
    };

    dc.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      const incoming = new Uint8Array(ev.data);
      const merged = new Uint8Array(
        peer.recvBuffer.byteLength + incoming.byteLength,
      );
      merged.set(peer.recvBuffer, 0);
      merged.set(incoming, peer.recvBuffer.byteLength);
      peer.recvBuffer = merged;
      this.parseWireStream(peer);
    };
  }

  private parseWireStream(peer: ConnectedWebRtcPeer): void {
    // 1. Parse 68-byte BitTorrent handshake if not yet completed
    if (!peer.handshakeDone) {
      if (peer.recvBuffer.byteLength < 68) return;
      if (peer.recvBuffer[0] === 19) {
        peer.handshakeDone = true;
        peer.recvBuffer = peer.recvBuffer.subarray(68);
        try {
          peer.dc.send(
            buildInterestedMessage() as unknown as ArrayBufferView<ArrayBuffer>,
          );
        } catch {}
      } else {
        peer.dc.close();
        return;
      }
    }

    // 2. Parse length-prefixed BitTorrent wire messages
    while (peer.recvBuffer.byteLength >= 4) {
      const view = new DataView(
        peer.recvBuffer.buffer,
        peer.recvBuffer.byteOffset,
        peer.recvBuffer.byteLength,
      );
      const msgLen = view.getUint32(0, false);
      if (msgLen === 0) {
        // Keep-alive
        peer.recvBuffer = peer.recvBuffer.subarray(4);
        continue;
      }
      if (peer.recvBuffer.byteLength < 4 + msgLen) break;

      const msgId = peer.recvBuffer[4];
      const payload = peer.recvBuffer.subarray(5, 4 + msgLen);
      peer.recvBuffer = peer.recvBuffer.subarray(4 + msgLen);

      if (msgId === 0) {
        peer.choked = true;
      } else if (msgId === 1) {
        peer.choked = false;
      } else if (msgId === 4 || msgId === 5) {
        if (msgId === 5) peer.bitfield = new Uint8Array(payload);
        try {
          peer.dc.send(
            buildInterestedMessage() as unknown as ArrayBufferView<ArrayBuffer>,
          );
        } catch {}
      } else if (msgId === 7 && payload.byteLength >= 8 && peer.inFlightPiece) {
        const pView = new DataView(
          payload.buffer,
          payload.byteOffset,
          payload.byteLength,
        );
        const pieceIdx = pView.getUint32(0, false);
        const begin = pView.getUint32(4, false);
        const block = payload.subarray(8);

        if (
          pieceIdx === peer.inFlightPiece.pieceIndex &&
          begin + block.byteLength <= peer.inFlightPiece.buffer.byteLength
        ) {
          peer.inFlightPiece.buffer.set(block, begin);
          peer.inFlightPiece.receivedBytes += block.byteLength;
          if (
            peer.inFlightPiece.receivedBytes >= peer.inFlightPiece.pieceLength
          ) {
            const done = peer.inFlightPiece;
            peer.inFlightPiece = null;
            window.clearTimeout(done.timer);
            done.resolve(done.buffer.buffer as ArrayBuffer);
          }
        }
      }
    }
  }

  public async requestPieceFromSwarm(
    torrentPieceIndex: number,
    expectedTorrentPieceLength: number,
    timeoutMs = 10000,
  ): Promise<ArrayBuffer | null> {
    const candidates = Array.from(this.peers.values()).filter(
      (p) =>
        p.dc.readyState === 'open' && !p.inFlightPiece && !p.choked,
    );
    const fallbackCandidates =
      candidates.length > 0
        ? candidates
        : Array.from(this.peers.values()).filter(
            (p) => p.dc.readyState === 'open' && !p.inFlightPiece,
          );

    if (fallbackCandidates.length === 0) return null;
    const peer =
      fallbackCandidates[torrentPieceIndex % fallbackCandidates.length];

    return new Promise<ArrayBuffer | null>((resolve) => {
      const buffer = new Uint8Array(expectedTorrentPieceLength);
      const timer = window.setTimeout(() => {
        if (peer.inFlightPiece?.pieceIndex === torrentPieceIndex) {
          peer.inFlightPiece = null;
        }
        resolve(null);
      }, timeoutMs);

      peer.inFlightPiece = {
        pieceIndex: torrentPieceIndex,
        pieceLength: expectedTorrentPieceLength,
        buffer,
        receivedBytes: 0,
        resolve: (ab) => resolve(ab),
        reject: () => resolve(null),
        timer,
      };

      try {
        if (peer.choked) {
          peer.dc.send(
            buildInterestedMessage() as unknown as ArrayBufferView<ArrayBuffer>,
          );
        }
        for (
          let offset = 0;
          offset < expectedTorrentPieceLength;
          offset += BLOCK_LEN
        ) {
          const len = Math.min(
            BLOCK_LEN,
            expectedTorrentPieceLength - offset,
          );
          peer.dc.send(
            buildRequestBlockMessage(
              torrentPieceIndex,
              offset,
              len,
            ) as unknown as ArrayBufferView<ArrayBuffer>,
          );
        }
      } catch {
        window.clearTimeout(timer);
        peer.inFlightPiece = null;
        resolve(null);
      }
    });
  }

  public async fetchPieceInBrowser(
    localPieceIndex: number,
    pieceLength: number,
    totalSize: number,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    const geom =
      this.geometry ?? buildIdentityGeometry(totalSize, pieceLength);
    const slice = getLocalPieceSlice(geom, localPieceIndex);

    if (this.getConnectedPeersCount() === 0) {
      await this.waitForConnectedPeer(4500, signal);
    }

    if (this.getConnectedPeersCount() > 0) {
      const buf = await this.requestPieceFromSwarm(
        slice.torrentPieceIndex,
        slice.torrentPieceSize,
        10000,
      );
      if (buf && buf.byteLength === slice.torrentPieceSize) {
        return buf;
      }
    }

    if (this.webSeeds.length > 0) {
      return fetchPieceDirectFromWebSeedsOrStream({
        localPieceIndex,
        geometry: geom,
        webSeeds: this.webSeeds,
        signal,
      });
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
