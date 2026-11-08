/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Browser Input Manager, Bencode Metainfo Decoder & Path Sanitizer
 * Ported from TorrentPlayer v0.3.3 (crates/torrentplayer-torrent/src/{source,paths,metainfo}.rs)
 */

import type { ParsedTorrentMetainfo, TorrentFileEntry } from './types';

export const MAX_TORRENT_BYTES = 16 * 1024 * 1024; // 16 MiB
export const MAX_PIECE_LEN = 64 * 1024 * 1024;     // 64 MiB
export const BLOCK_LEN = 16 * 1024;                // 16 KiB

const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function sanitizeTorrentPath(components: string[]): string {
  const nonEmpty = components.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length === 0) {
    throw new Error('مسار الملف داخل التورنت فارغ');
  }
  const cleaned = nonEmpty.map((part) => {
    if (
      part === '.' ||
      part === '..' ||
      part.includes('/') ||
      part.includes('\\') ||
      part.includes('\0') ||
      RESERVED_WINDOWS_NAMES.test(part)
    ) {
      return part.replace(/[\\/\0:<>|?*]/g, '_').replace(/^\.+$/, '_');
    }
    return part;
  });
  return cleaned.join('/');
}

function base32ToHex(b32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of b32.toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('حرف Base32 غير صالح في رابط Magnet');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return out.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ParsedMagnetInput {
  infoHashHex: string;
  displayName?: string;
  trackers: string[];
  webSeeds: string[];
}

export function parseMagnetUriInput(rawUri: string): ParsedMagnetInput {
  const trimmed = rawUri.trim();
  if (trimmed.length > 16 * 1024) {
    throw new Error('رابط الـ Magnet يتجاوز الحد الأقصى المسموح (16 KB)');
  }
  if (/^[0-9a-fA-F]{40}$/.test(trimmed)) {
    return {
      infoHashHex: trimmed.toLowerCase(),
      trackers: [],
      webSeeds: [],
    };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('صيغة رابط الـ Magnet غير صالحة');
  }
  if (url.protocol !== 'magnet:') {
    throw new Error(`مخطط غير مدعوم: ${url.protocol}`);
  }
  const xtList = url.searchParams.getAll('xt');
  const btihParam = xtList.find((xt) =>
    xt.toLowerCase().startsWith('urn:btih:'),
  );
  if (!btihParam) {
    throw new Error('رابط الـ Magnet يفتقد معامل urn:btih:');
  }
  const rawHash = btihParam.slice('urn:btih:'.length).trim();
  let infoHashHex: string;
  if (/^[0-9a-fA-F]{40}$/.test(rawHash)) {
    infoHashHex = rawHash.toLowerCase();
  } else if (/^[A-Z2-7]{32}$/i.test(rawHash)) {
    infoHashHex = base32ToHex(rawHash);
  } else {
    throw new Error('بصمة info_hash داخل رابط الـ Magnet غير صالحة');
  }

  const webSeeds = [
    ...url.searchParams.getAll('ws'),
    ...url.searchParams.getAll('as'),
  ].filter((u) => /^https?:\/\//i.test(u));

  return {
    infoHashHex,
    displayName: url.searchParams.get('dn') || undefined,
    trackers: url.searchParams.getAll('tr').filter(Boolean),
    webSeeds,
  };
}

interface BencodeSpan {
  value: any;
  nextOffset: number;
  infoStart?: number;
  infoEnd?: number;
}

function decodeBencode(
  buf: Uint8Array,
  offset = 0,
  trackInfo = false,
): BencodeSpan {
  const byte = buf[offset];
  const decoder = new TextDecoder();

  if (byte === 0x69) {
    const end = buf.indexOf(0x65, offset + 1);
    if (end === -1) throw new Error('عدد Bencode غير مكتمل');
    const num = Number(decoder.decode(buf.subarray(offset + 1, end)));
    if (!Number.isFinite(num)) throw new Error('عدد Bencode غير صالح');
    return { value: num, nextOffset: end + 1 };
  }

  if (byte === 0x6c) {
    const list: any[] = [];
    let cur = offset + 1;
    while (buf[cur] !== 0x65) {
      if (cur >= buf.length) throw new Error('قائمة Bencode غير مغلقة');
      const item = decodeBencode(buf, cur, false);
      list.push(item.value);
      cur = item.nextOffset;
    }
    return { value: list, nextOffset: cur + 1 };
  }

  if (byte === 0x64) {
    const dict: Record<string, any> = {};
    let cur = offset + 1;
    let infoStart: number | undefined;
    let infoEnd: number | undefined;
    while (buf[cur] !== 0x65) {
      if (cur >= buf.length) throw new Error('قاموس Bencode غير مغلق');
      const keySpan = decodeBencode(buf, cur, false);
      const key = decoder.decode(keySpan.value as Uint8Array);
      const valStart = keySpan.nextOffset;
      const valSpan = decodeBencode(buf, valStart, false);
      dict[key] = valSpan.value;
      if (trackInfo && key === 'info') {
        infoStart = valStart;
        infoEnd = valSpan.nextOffset;
      }
      cur = valSpan.nextOffset;
    }
    return { value: dict, nextOffset: cur + 1, infoStart, infoEnd };
  }

  if (byte >= 0x30 && byte <= 0x39) {
    const colon = buf.indexOf(0x3a, offset);
    if (colon === -1) throw new Error('سلسلة Bencode غير صالحة');
    const len = Number(decoder.decode(buf.subarray(offset, colon)));
    const start = colon + 1;
    const end = start + len;
    if (end > buf.length) throw new Error('نهاية غير متوقعة لبيانات Bencode');
    return { value: buf.subarray(start, end), nextOffset: end };
  }

  throw new Error(`رمز Bencode غير معروف عند الإزاحة ${offset}`);
}

export async function parseTorrentFileBytes(
  rawBytes: Uint8Array,
): Promise<ParsedTorrentMetainfo> {
  if (rawBytes.byteLength === 0 || rawBytes.byteLength > MAX_TORRENT_BYTES) {
    throw new Error(`حجم ملف التورنت غير مسموح (${rawBytes.byteLength} بايت)`);
  }
  const root = decodeBencode(rawBytes, 0, true);
  if (root.infoStart === undefined || root.infoEnd === undefined) {
    throw new Error('ملف التورنت يفتقد قاموس info');
  }

  const infoSlice = rawBytes.subarray(root.infoStart, root.infoEnd);
  const hashBuf = await crypto.subtle.digest(
    'SHA-1',
    infoSlice as unknown as BufferSource,
  );
  const infoHashBytes = new Uint8Array(hashBuf);
  const infoHashHex = bufferToHex(infoHashBytes);

  const decoder = new TextDecoder();
  const info = root.value.info;
  const rawName = info.name
    ? decoder.decode(info.name as Uint8Array)
    : `torrent_${infoHashHex.slice(0, 8)}`;
  const name = sanitizeTorrentPath([rawName]);

  const pieceLength = Number(info['piece length']);
  if (!pieceLength || pieceLength <= 0 || pieceLength > MAX_PIECE_LEN) {
    throw new Error(`حجم القطعة غير صالح: ${pieceLength}`);
  }

  const rawPieces: Uint8Array = info.pieces;
  if (!rawPieces || rawPieces.byteLength % 20 !== 0) {
    throw new Error('مصفوفة بصمات SHA-1 تالفة داخل ملف التورنت');
  }
  const pieceCount = rawPieces.byteLength / 20;
  const pieceHashesHex: string[] = [];
  for (let i = 0; i < pieceCount; i++) {
    pieceHashesHex.push(
      bufferToHex(rawPieces.subarray(i * 20, (i + 1) * 20)),
    );
  }

  const files: TorrentFileEntry[] = [];
  let totalLength = 0;
  if (typeof info.length === 'number') {
    totalLength = info.length;
    files.push({ index: 0, path: name, offset: 0, length: info.length });
  } else if (Array.isArray(info.files)) {
    if (info.files.length > 50_000) {
      throw new Error('عدد الملفات داخل التورنت يتجاوز الحد الآمن (50,000)');
    }
    info.files.forEach((f: any, idx: number) => {
      const parts = Array.isArray(f.path)
        ? (f.path as Uint8Array[]).map((p) => decoder.decode(p))
        : [String(idx)];
      const safeRelPath = sanitizeTorrentPath([name, ...parts]);
      const fileLen = Number(f.length) || 0;
      files.push({
        index: idx,
        path: safeRelPath,
        offset: totalLength,
        length: fileLen,
      });
      totalLength += fileLen;
    });
  } else {
    throw new Error('ملف التورنت لا يحتوي على طول ملف صالح');
  }

  const announceList: string[] = [];
  if (root.value.announce instanceof Uint8Array) {
    announceList.push(decoder.decode(root.value.announce));
  }
  if (Array.isArray(root.value['announce-list'])) {
    for (const tier of root.value['announce-list']) {
      if (Array.isArray(tier)) {
        for (const tr of tier) {
          if (tr instanceof Uint8Array) {
            announceList.push(decoder.decode(tr));
          }
        }
      }
    }
  }

  const webSeeds: string[] = [];
  const urlList = root.value['url-list'];
  if (urlList instanceof Uint8Array) {
    webSeeds.push(decoder.decode(urlList));
  } else if (Array.isArray(urlList)) {
    for (const u of urlList) {
      if (u instanceof Uint8Array) webSeeds.push(decoder.decode(u));
    }
  }

  return {
    infoHashHex,
    infoHashBytes,
    name,
    pieceLength,
    pieceCount,
    totalLength,
    pieceHashesHex,
    files,
    announceList: Array.from(new Set(announceList)),
    webSeeds: webSeeds.filter((u) => /^https?:\/\//i.test(u)),
  };
}
