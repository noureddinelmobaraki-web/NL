/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Pure In-Browser WebRTC P2P Swarm (wss:// Trackers + BitTorrent Wire Protocol)
 * & Multi-File HTTP WebSeed Byte-Range Client
 */

import { buildWorkerProxyUrl } from '../../../services/videoExtractor';
import { BLOCK_LEN } from '../bencodeAndInputManager';

const WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
];

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

function generatePeerIdBytes(): Uint8Array {
  const prefix = new TextEncoder().encode('-WW0303-');
  const rnd = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rnd);
  }
  const out = new Uint8Array(20);
  out.set(prefix, 0);
  for (let i = 0; i < 12; i++) {
    out[8 + i] = 48 + (rnd[i] % 10);
  }
  return out;
}

function buildBitTorrentHandshake(
  infoHashBytes: Uint8Array,
  peerIdBytes: Uint8Array,
): Uint8Array {
  const buf = new Uint8Array(68);
  buf[0] = 19;
  buf.set(new TextEncoder().encode('BitTorrent protocol'), 1);
  buf.set(infoHashBytes.subarray(0, 20), 28);
  buf.set(peerIdBytes.subarray(0, 20), 48);
  return buf;
}

function buildInterestedMessage(): Uint8Array {
  return new Uint8Array([0, 0, 0, 1, 2]);
}

function buildRequestBlockMessage(
  pieceIndex: number,
  begin: number,
  length: number,
): Uint8Array {
  const buf = new Uint8Array(17);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 13, false);
  buf[4] = 6;
  view.setUint32(5, pieceIndex, false);
  view.setUint32(9, begin, false);
  view.setUint32(13, length, false);
  return buf;
}

interface WebRtcPeerConnectionEntry {
  offerId: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  unchoked: boolean;
  handshakeDone: boolean;
  recvBuffer: Uint8Array;
}

export class BrowserSwarmSession {
  private readonly infoHashBytes: Uint8Array;
  private readonly peerIdBytes: Uint8Array;
  private readonly infoHashBinary: string;
  private readonly peerIdBinary: string;
  private sockets: WebSocket[] = [];
  private peers = new Map<string, WebRtcPeerConnectionEntry>();
  private pendingPieceWaiters = new Map<
    number,
    {
      pieceLength: number;
      receivedBlocks: Map<number, Uint8Array>;
      expectedBlocks: number;
      resolve: (buf: ArrayBuffer | null) => void;
    }
  >();
  private destroyed = false;

  constructor(
    public readonly infoHashHex: string,
    public readonly webSeeds: string[] = [],
    public readonly selectedFileOffset = 0,
  ) {
    this.infoHashBytes = hexToBytes(infoHashHex);
    this.peerIdBytes = generatePeerIdBytes();
    this.infoHashBinary = bytesToBinaryString(this.infoHashBytes);
    this.peerIdBinary = bytesToBinaryString(this.peerIdBytes);
    if (
      typeof window !== 'undefined' &&
      typeof RTCPeerConnection !== 'undefined'
    ) {
      this.connectToWssTrackers();
    }
  }

  public getConnectedPeersCount(): number {
    let count = 0;
    for (const p of this.peers.values()) {
      if (p.dc && p.dc.readyState === 'open') count++;
    }
    return count;
  }

  private connectToWssTrackers(): void {
    for (const trackerUrl of WSS_TRACKERS) {
      try {
        const ws = new WebSocket(trackerUrl);
        this.sockets.push(ws);
        ws.onopen = () => {
          void this.sendTrackerAnnounce(ws);
        };
        ws.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            this.handleTrackerMessage(ws, ev.data);
          }
        };
        ws.onerror = () => {};
      } catch {}
    }
  }

  private async sendTrackerAnnounce(ws: WebSocket): Promise<void> {
    if (this.destroyed || ws.readyState !== WebSocket.OPEN) return;
    const offers: Array<{
      offer_id: string;
      offer: RTCSessionDescriptionInit;
    }> = [];

    for (let i = 0; i < 3; i++) {
      try {
        const offerIdBytes = new Uint8Array(20);
        crypto.getRandomValues(offerIdBytes);
        const offerId = bytesToBinaryString(offerIdBytes);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        const dc = pc.createDataChannel('webrtc-datachannel');
        dc.binaryType = 'arraybuffer';

        const entry: WebRtcPeerConnectionEntry = {
          offerId,
          pc,
          dc,
          unchoked: false,
          handshakeDone: false,
          recvBuffer: new Uint8Array(0),
        };
        this.bindDataChannel(entry);
        this.peers.set(offerId, entry);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 1200);
          pc.onicecandidate = (e) => {
            if (!e.candidate) {
              clearTimeout(timer);
              resolve();
            }
          };
        });

        if (pc.localDescription) {
          offers.push({
            offer_id: offerId,
            offer: {
              type: 'offer',
              sdp: pc.localDescription.sdp,
            },
          });
        }
      } catch {}
    }

    if (ws.readyState === WebSocket.OPEN && offers.length > 0) {
      ws.send(
        JSON.stringify({
          action: 'announce',
          info_hash: this.infoHashBinary,
          peer_id: this.peerIdBinary,
          numwant: offers.length,
          uploaded: 0,
          downloaded: 0,
          left: 1024 * 1024 * 1024,
          offers,
        }),
      );
    }
  }

  private handleTrackerMessage(ws: WebSocket, raw: string): void {
    try {
      const data = JSON.parse(raw);
      if (data.info_hash !== this.infoHashBinary) return;

      if (data.answer && data.offer_id) {
        const entry = this.peers.get(data.offer_id);
        if (entry && entry.pc.signalingState === 'have-local-offer') {
          void entry.pc.setRemoteDescription(data.answer).catch(() => {});
        }
      } else if (data.offer && data.offer_id && data.peer_id) {
        void this.answerIncomingPeerOffer(ws, data.offer_id, data.offer);
      }
    } catch {}
  }

  private async answerIncomingPeerOffer(
    ws: WebSocket,
    offerId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      const entry: WebRtcPeerConnectionEntry = {
        offerId,
        pc,
        dc: null as any,
        unchoked: false,
        handshakeDone: false,
        recvBuffer: new Uint8Array(0),
      };
      pc.ondatachannel = (ev) => {
        entry.dc = ev.channel;
        entry.dc.binaryType = 'arraybuffer';
        this.bindDataChannel(entry);
        this.peers.set(offerId, entry);
      };
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1000);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            clearTimeout(timer);
            resolve();
          }
        };
      });

      if (ws.readyState === WebSocket.OPEN && pc.localDescription) {
        ws.send(
          JSON.stringify({
            action: 'announce',
            info_hash: this.infoHashBinary,
            peer_id: this.peerIdBinary,
            to_peer_id: offerId,
            offer_id: offerId,
            answer: {
              type: 'answer',
              sdp: pc.localDescription.sdp,
            },
          }),
        );
      }
    } catch {}
  }

  private bindDataChannel(entry: WebRtcPeerConnectionEntry): void {
    const dc = entry.dc;
    if (!dc) return;

    dc.onopen = () => {
      try {
        dc.send(
          buildBitTorrentHandshake(this.infoHashBytes, this.peerIdBytes)
            .buffer as ArrayBuffer,
        );
        dc.send(buildInterestedMessage().buffer as ArrayBuffer);
      } catch {}
    };

    dc.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      const incoming = new Uint8Array(ev.data);
      const merged = new Uint8Array(
        entry.recvBuffer.byteLength + incoming.byteLength,
      );
      merged.set(entry.recvBuffer, 0);
      merged.set(incoming, entry.recvBuffer.byteLength);
      entry.recvBuffer = merged;

      this.parseWireStream(entry);
    };
  }

  private parseWireStream(entry: WebRtcPeerConnectionEntry): void {
    if (!entry.handshakeDone) {
      if (entry.recvBuffer.byteLength < 68) return;
      if (entry.recvBuffer[0] === 19) {
        entry.handshakeDone = true;
        entry.recvBuffer = entry.recvBuffer.slice(68);
        try {
          entry.dc.send(buildInterestedMessage().buffer as ArrayBuffer);
        } catch {}
      } else {
        return;
      }
    }

    while (entry.recvBuffer.byteLength >= 4) {
      const view = new DataView(
        entry.recvBuffer.buffer,
        entry.recvBuffer.byteOffset,
        entry.recvBuffer.byteLength,
      );
      const msgLen = view.getUint32(0, false);
      if (msgLen === 0) {
        entry.recvBuffer = entry.recvBuffer.slice(4);
        continue;
      }
      if (entry.recvBuffer.byteLength < 4 + msgLen) break;

      const msgId = entry.recvBuffer[4];
      const payload = entry.recvBuffer.subarray(5, 4 + msgLen);

      if (msgId === 1) {
        entry.unchoked = true;
        this.requestPendingPiecesFromPeer(entry);
      } else if (msgId === 7 && payload.byteLength >= 8) {
        const pView = new DataView(
          payload.buffer,
          payload.byteOffset,
          payload.byteLength,
        );
        const pieceIdx = pView.getUint32(0, false);
        const begin = pView.getUint32(4, false);
        const blockData = payload.slice(8);
        this.onPieceBlockReceived(pieceIdx, begin, blockData);
      }

      entry.recvBuffer = entry.recvBuffer.slice(4 + msgLen);
    }
  }

  private requestPendingPiecesFromPeer(
    entry: WebRtcPeerConnectionEntry,
  ): void {
    if (!entry.dc || entry.dc.readyState !== 'open' || !entry.unchoked) return;
    for (const [pieceIndex, waiter] of this.pendingPieceWaiters.entries()) {
      for (let b = 0; b < waiter.expectedBlocks; b++) {
        if (!waiter.receivedBlocks.has(b)) {
          const begin = b * BLOCK_LEN;
          const len = Math.min(BLOCK_LEN, waiter.pieceLength - begin);
          try {
            entry.dc.send(
              buildRequestBlockMessage(pieceIndex, begin, len)
                .buffer as ArrayBuffer,
            );
          } catch {}
        }
      }
    }
  }

  private onPieceBlockReceived(
    pieceIndex: number,
    begin: number,
    block: Uint8Array,
  ): void {
    const waiter = this.pendingPieceWaiters.get(pieceIndex);
    if (!waiter) return;
    const blockIdx = Math.floor(begin / BLOCK_LEN);
    waiter.receivedBlocks.set(blockIdx, block);

    if (waiter.receivedBlocks.size >= waiter.expectedBlocks) {
      const fullPiece = new Uint8Array(waiter.pieceLength);
      let offset = 0;
      for (let i = 0; i < waiter.expectedBlocks; i++) {
        const chunk = waiter.receivedBlocks.get(i);
        if (chunk) {
          fullPiece.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }
      this.pendingPieceWaiters.delete(pieceIndex);
      waiter.resolve(fullPiece.buffer);
    }
  }

  public async fetchPieceInBrowser(
    pieceIndex: number,
    pieceLength: number,
    totalSize: number,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    const byteStart = pieceIndex * pieceLength;
    const actualLen = Math.min(
      pieceLength,
      Math.max(1, totalSize - byteStart),
    );
    const byteEnd = byteStart + actualLen - 1;

    for (const wsUrl of this.webSeeds) {
      try {
        const proxied = wsUrl.startsWith('https://broad-block-7bd7.')
          ? wsUrl
          : buildWorkerProxyUrl(wsUrl);
        const res = await fetch(proxied, {
          headers: { Range: `bytes=${byteStart}-${byteEnd}` },
          signal: signal || AbortSignal.timeout(12000),
        });
        if (res.ok || res.status === 206) {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (!ct.includes('text/html') && !ct.includes('application/json')) {
            const ab = await res.arrayBuffer();
            if (ab.byteLength > 0) {
              return ab.slice(0, actualLen);
            }
          }
        }
      } catch {}
    }

    const activePeers = Array.from(this.peers.values()).filter(
      (p) => p.dc && p.dc.readyState === 'open',
    );
    if (activePeers.length === 0) {
      return null;
    }

    return new Promise<ArrayBuffer | null>((resolve) => {
      const expectedBlocks = Math.max(1, Math.ceil(actualLen / BLOCK_LEN));
      const timer = setTimeout(() => {
        this.pendingPieceWaiters.delete(pieceIndex);
        resolve(null);
      }, 10000);

      this.pendingPieceWaiters.set(pieceIndex, {
        pieceLength: actualLen,
        receivedBlocks: new Map(),
        expectedBlocks,
        resolve: (buf) => {
          clearTimeout(timer);
          resolve(buf);
        },
      });

      for (const peer of activePeers) {
        this.requestPendingPiecesFromPeer(peer);
      }
    });
  }

  public destroy(): void {
    this.destroyed = true;
    for (const ws of this.sockets) {
      try {
        ws.close();
      } catch {}
    }
    for (const p of this.peers.values()) {
      try {
        p.dc?.close();
        p.pc?.close();
      } catch {}
    }
    this.peers.clear();
  }
}
