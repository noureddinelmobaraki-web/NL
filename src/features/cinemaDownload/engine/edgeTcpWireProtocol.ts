/**
 * Pure BitTorrent Peer Wire Protocol + BEP-10 Extension Protocol +
 * BEP-9 (ut_metadata) + BEP-11 (ut_pex) framing helpers for Edge TCP tunnels.
 */

import { decodeBencode } from '../bencodeAndInputManager';

export const EDGE_BLOCK_LEN = 16_384;
export const METADATA_BLOCK_LEN = 16_384;
export const UT_METADATA_LOCAL_ID = 1;
export const UT_PEX_LOCAL_ID = 2;

const asciiEncoder = new TextEncoder();

export function hexToBytes20(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new Error(`Invalid 40-char SHA-1 infoHash: ${hex}`);
  }
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function generatePeerIdBytes(): Uint8Array {
  const prefix = '-NL0100-';
  const out = new Uint8Array(20);
  for (let i = 0; i < prefix.length; i++) {
    out[i] = prefix.charCodeAt(i);
  }
  for (let i = prefix.length; i < 20; i++) {
    out[i] = 48 + Math.floor(Math.random() * 10);
  }
  return out;
}

/**
 * Builds the 68-byte BitTorrent handshake with BEP-10 Extension Protocol bit enabled (reserved[5] = 0x10).
 */
export function buildExtendedBtHandshake(
  infoHashBytes: Uint8Array,
  peerIdBytes: Uint8Array,
): Uint8Array {
  const buf = new Uint8Array(68);
  buf[0] = 19;
  buf.set(asciiEncoder.encode('BitTorrent protocol'), 1);
  // Byte 20..27 are the 8 reserved bytes; byte 25 = 0x10 advertises BEP-10 Extension Protocol support
  buf[25] = 0x10;
  buf.set(infoHashBytes.subarray(0, 20), 28);
  buf.set(peerIdBytes.subarray(0, 20), 48);
  return buf;
}

/**
 * Verifies an incoming 68-byte BitTorrent handshake and checks that its 20-byte infoHash matches.
 */
export function verifyIncomingBtHandshake(
  frame68: Uint8Array,
  expectedInfoHash: Uint8Array,
): { valid: boolean; supportsBep10: boolean } {
  if (frame68.byteLength < 68 || frame68[0] !== 19) {
    return { valid: false, supportsBep10: false };
  }
  const proto = 'BitTorrent protocol';
  for (let i = 0; i < proto.length; i++) {
    if (frame68[1 + i] !== proto.charCodeAt(i)) {
      return { valid: false, supportsBep10: false };
    }
  }
  for (let i = 0; i < 20; i++) {
    if (frame68[28 + i] !== expectedInfoHash[i]) {
      return { valid: false, supportsBep10: false };
    }
  }
  return {
    valid: true,
    supportsBep10: (frame68[25] & 0x10) !== 0,
  };
}

/**
 * Builds BEP-10 Extended Handshake message (msgId = 20, extId = 0).
 * Canonical lexicographically sorted dictionary: { m: { ut_metadata: 1, ut_pex: 2 }, reqq: 64, v: "NL Web 1.0" }.
 */
export function buildBep10ExtendedHandshake(): Uint8Array {
  const bencoded = asciiEncoder.encode(
    'd1:md11:ut_metadatai1e6:ut_pexi2ee4:reqqi64e1:v10:NL Web 1.0e',
  );
  const msgLen = 2 + bencoded.byteLength;
  const out = new Uint8Array(4 + msgLen);
  const view = new DataView(out.buffer);
  view.setUint32(0, msgLen, false);
  out[4] = 20;
  out[5] = 0;
  out.set(bencoded, 6);
  return out;
}

export function buildBtInterested(): Uint8Array {
  return new Uint8Array([0, 0, 0, 1, 2]);
}

export function buildBtKeepAlive(): Uint8Array {
  return new Uint8Array([0, 0, 0, 0]);
}

export function buildBtRequestBlock(
  pieceIndex: number,
  begin: number,
  length: number,
): Uint8Array {
  const out = new Uint8Array(17);
  const view = new DataView(out.buffer);
  view.setUint32(0, 13, false);
  out[4] = 6;
  view.setUint32(5, pieceIndex, false);
  view.setUint32(9, begin, false);
  view.setUint32(13, length, false);
  return out;
}

export function buildBtCancelBlock(
  pieceIndex: number,
  begin: number,
  length: number,
): Uint8Array {
  const out = new Uint8Array(17);
  const view = new DataView(out.buffer);
  view.setUint32(0, 13, false);
  out[4] = 8;
  view.setUint32(5, pieceIndex, false);
  view.setUint32(9, begin, false);
  view.setUint32(13, length, false);
  return out;
}

export function buildBtHave(pieceIndex: number): Uint8Array {
  const out = new Uint8Array(9);
  const view = new DataView(out.buffer);
  view.setUint32(0, 5, false);
  out[4] = 4;
  view.setUint32(5, pieceIndex >>> 0, false);
  return out;
}

export function buildUtMetadataRequest(
  peerUtMetadataId: number,
  metadataPiece: number,
): Uint8Array {
  const dictBytes = asciiEncoder.encode(
    `d8:msg_typei0e5:piecei${metadataPiece}ee`,
  );
  const msgLen = 2 + dictBytes.byteLength;
  const out = new Uint8Array(4 + msgLen);
  const view = new DataView(out.buffer);
  view.setUint32(0, msgLen, false);
  out[4] = 20;
  out[5] = peerUtMetadataId & 0xff;
  out.set(dictBytes, 6);
  return out;
}

export function parseBep10Handshake(payload: Uint8Array): {
  utMetadataId: number | null;
  metadataSize: number | null;
} {
  if (payload.byteLength < 3 || payload[0] !== 0) {
    return { utMetadataId: null, metadataSize: null };
  }
  try {
    const span = decodeBencode(payload, 1);
    const root = span.value as Record<string, unknown> | null;
    const mDict = (root?.m ?? null) as Record<string, unknown> | null;
    const rawMetaId = mDict ? Number(mDict.ut_metadata) : NaN;
    const rawMetaSize = root ? Number(root.metadata_size) : NaN;
    return {
      utMetadataId:
        Number.isInteger(rawMetaId) && rawMetaId > 0 ? rawMetaId : null,
      metadataSize:
        Number.isInteger(rawMetaSize) &&
        rawMetaSize > 0 &&
        rawMetaSize <= 4 * 1024 * 1024
          ? rawMetaSize
          : null,
    };
  } catch {
    return { utMetadataId: null, metadataSize: null };
  }
}

export function parseUtMetadataMessage(payload: Uint8Array): {
  msgType: number;
  piece: number;
  dataSlice: Uint8Array;
} | null {
  if (payload.byteLength < 4 || payload[0] !== UT_METADATA_LOCAL_ID) {
    return null;
  }
  try {
    const span = decodeBencode(payload, 1);
    const dict = span.value as Record<string, unknown> | null;
    const msgType = Number(dict?.msg_type);
    const piece = Number(dict?.piece);
    if (!Number.isInteger(msgType) || !Number.isInteger(piece) || piece < 0) {
      return null;
    }
    return {
      msgType,
      piece,
      dataSlice: payload.subarray(span.nextOffset),
    };
  } catch {
    return null;
  }
}

export function isRoutablePublicIpv4(
  a: number,
  b: number,
  c: number,
  port: number,
): boolean {
  if (port < 80 || port > 65535) return false;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 1 && (b === 1 || b === 0) && (c === 1 || c === 0)) return false;
  if (a === 104 && b >= 16 && b <= 31) return false;
  if (a === 172 && b >= 64 && b <= 71) return false;
  if (a === 162 && (b === 158 || b === 159)) return false;
  if (a === 108 && b === 162) return false;
  return true;
}

export function parseCompactIpv4Peers(compact: Uint8Array): string[] {
  const out = new Set<string>();
  const usable = compact.byteLength - (compact.byteLength % 6);
  for (let i = 0; i < usable; i += 6) {
    const a = compact[i];
    const b = compact[i + 1];
    const c = compact[i + 2];
    const d = compact[i + 3];
    const port = (compact[i + 4] << 8) | compact[i + 5];
    if (isRoutablePublicIpv4(a, b, c, port)) {
      out.add(`${a}.${b}.${c}.${d}:${port}`);
    }
  }
  return Array.from(out);
}

export function parseUtPexPeers(payload: Uint8Array): string[] {
  if (payload.byteLength < 3 || payload[0] !== UT_PEX_LOCAL_ID) return [];
  try {
    const span = decodeBencode(payload, 1);
    const dict = span.value as Record<string, unknown> | null;
    const added = dict?.added;
    if (added instanceof Uint8Array && added.byteLength >= 6) {
      return parseCompactIpv4Peers(added);
    }
    return [];
  } catch {
    return [];
  }
}

export function peerHasPiece(
  bitfield: Uint8Array | null,
  haveSet: ReadonlySet<number>,
  pieceIndex: number,
): boolean {
  if (haveSet.has(pieceIndex)) return true;
  if (!bitfield) return false;
  const byteIdx = pieceIndex >> 3;
  if (byteIdx < 0 || byteIdx >= bitfield.byteLength) return false;
  return (bitfield[byteIdx] & (0x80 >> (pieceIndex & 7))) !== 0;
}

/**
 * Wraps raw BEP-9 `info` dictionary bytes into a minimal valid `.torrent` buffer (`d4:info<infoBytes>e`)
 * so `parseTorrentFileBytes` can validate SHA-1(info) and compute multi-file piece geometry directly.
 */
export function wrapRawInfoDictAsTorrent(infoBytes: Uint8Array): Uint8Array {
  const prefix = asciiEncoder.encode('d4:info');
  const out = new Uint8Array(prefix.byteLength + infoBytes.byteLength + 1);
  out.set(prefix, 0);
  out.set(infoBytes, prefix.byteLength);
  out[out.byteLength - 1] = 0x65; // 'e'
  return out;
}

/**
 * Ranks public BitTorrent peer addresses so reachable dedicated seedboxes and UPnP-mapped
 * ports (e.g. 51413, 8999, 10000..65535) are dialed ahead of NAT-heavy default port 6881.
 */
export function scorePeerPortPriority(addr: string): number {
  const colon = addr.lastIndexOf(':');
  if (colon <= 0) return 0;
  const port = Number(addr.slice(colon + 1));
  if (!Number.isInteger(port) || port < 80 || port > 65535) return 0;
  if (port === 6881) return 0;
  if (port === 51413 || port === 8999 || port >= 10_000) return 3;
  if (port >= 6882 && port <= 9_999) return 2;
  return 1;
}

export function prioritizeCandidatePeers(addrs: readonly string[]): string[] {
  return [...addrs].sort((a, b) => scorePeerPortPriority(b) - scorePeerPortPriority(a));
}
