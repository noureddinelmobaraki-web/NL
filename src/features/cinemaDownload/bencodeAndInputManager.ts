/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Browser Input Manager, strict Bencode decoder, Multi-File video selector,
 * BEP 19 WebSeed resolver and exact selected-file piece geometry.
 */

import type { ParsedTorrentMetainfo, TorrentFileEntry } from './types';

export const MAX_TORRENT_BYTES = 16 * 1024 * 1024; // 16 MiB
export const MAX_PIECE_LEN = 64 * 1024 * 1024; // 64 MiB
export const BLOCK_LEN = 16 * 1024; // 16 KiB
const MAX_BENCODE_DEPTH = 64;
const MAX_FILES = 50_000;

const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
const VIDEO_EXT_REGEX = /\.(mp4|mkv|webm|avi|mov|m4v|ts|ogv)$/i;
const PADDING_FILE_REGEX = /(^|\/)_____padding_file_/i;
const SAMPLE_REGEX = /(^|[\/._\-\s])sample([\/._\-\s]|$)/i;

const utf8 = new TextDecoder('utf-8');

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TorrentFileEntryEx extends TorrentFileEntry {
  isPadding: boolean;
}

export interface SelectedFileGeometry {
  pieceLength: number;
  torrentTotalLength: number;
  torrentPieceCount: number;
  fileIndex: number;
  fileOffset: number;
  fileLength: number;
  firstPieceIndex: number;
  lastPieceIndex: number;
  /** Byte where the selected file starts inside firstPieceIndex. */
  firstPieceByteOffset: number;
  /** Exclusive end of the selected file inside lastPieceIndex (1..pieceLength). */
  lastPieceByteLength: number;
  filePieceCount: number;
}

export interface LocalPieceSlice {
  localIndex: number;
  torrentPieceIndex: number;
  torrentPieceAbsStart: number;
  torrentPieceSize: number;
  /** Slice of the torrent piece that belongs to the selected file: [trimStart, trimEnd). */
  trimStart: number;
  trimEnd: number;
  /** File-relative offset of this slice's first byte. */
  fileStart: number;
  length: number;
}

export interface FileRangeSegment {
  file: TorrentFileEntryEx;
  fileStart: number;
  length: number;
  bufferOffset: number;
}

export interface ParsedTorrentWithGeometry extends ParsedTorrentMetainfo {
  files: TorrentFileEntryEx[];
  selectedFile: TorrentFileEntryEx;
  geometry: SelectedFileGeometry;
  isSingleFile: boolean;
  isV2Hybrid: boolean;
  webSeedRoots: string[];
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
    binary += String.fromCharCode(...sub);
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
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
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  const hex = out.map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== 40) throw new Error('بصمة Base32 لا تنتج 20 بايت');
  return hex;
}

/* ------------------------------------------------------------------ */
/* Magnet                                                              */
/* ------------------------------------------------------------------ */

export interface ParsedMagnetInput {
  infoHashHex: string;
  displayName?: string;
  trackers: string[];
  webSeeds: string[];
  exactTopicTorrentUrls: string[];
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
      exactTopicTorrentUrls: [],
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
  const btihParam = url.searchParams
    .getAll('xt')
    .find((xt) => xt.toLowerCase().startsWith('urn:btih:'));
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

  const exactTopicTorrentUrls = url.searchParams
    .getAll('xs')
    .filter((u) => /^https?:\/\//i.test(u));

  return {
    infoHashHex,
    displayName: url.searchParams.get('dn') || undefined,
    trackers: url.searchParams.getAll('tr').filter(Boolean),
    webSeeds,
    exactTopicTorrentUrls,
  };
}

/* ------------------------------------------------------------------ */
/* Strict Bencode decoder                                              */
/* ------------------------------------------------------------------ */

interface BencodeSpan {
  value: any;
  nextOffset: number;
  infoStart?: number;
  infoEnd?: number;
}

const INT_RE = /^-?(0|[1-9]\d*)$/;
const LEN_RE = /^(0|[1-9]\d*)$/;

export function decodeBencode(
  buf: Uint8Array,
  offset = 0,
  trackInfo = false,
  depth = 0,
): BencodeSpan {
  if (depth > MAX_BENCODE_DEPTH) throw new Error('تداخل Bencode عميق جداً');
  if (offset >= buf.length) throw new Error('نهاية غير متوقعة لبيانات Bencode');
  const byte = buf[offset];

  if (byte === 0x69 /* i */) {
    const end = buf.indexOf(0x65, offset + 1);
    if (end === -1) throw new Error('عدد Bencode غير مكتمل');
    const text = utf8.decode(buf.subarray(offset + 1, end));
    if (!INT_RE.test(text) || text === '-0') throw new Error('عدد Bencode غير صالح');
    const num = Number(text);
    if (!Number.isSafeInteger(num)) throw new Error('عدد Bencode خارج النطاق الآمن');
    return { value: num, nextOffset: end + 1 };
  }

  if (byte === 0x6c /* l */) {
    const list: any[] = [];
    let cur = offset + 1;
    for (;;) {
      if (cur >= buf.length) throw new Error('قائمة Bencode غير مغلقة');
      if (buf[cur] === 0x65) break;
      const item = decodeBencode(buf, cur, false, depth + 1);
      list.push(item.value);
      cur = item.nextOffset;
    }
    return { value: list, nextOffset: cur + 1 };
  }

  if (byte === 0x64 /* d */) {
    const dict: Record<string, any> = Object.create(null);
    let cur = offset + 1;
    let infoStart: number | undefined;
    let infoEnd: number | undefined;
    for (;;) {
      if (cur >= buf.length) throw new Error('قاموس Bencode غير مغلق');
      if (buf[cur] === 0x65) break;
      const keySpan = decodeBencode(buf, cur, false, depth + 1);
      if (!(keySpan.value instanceof Uint8Array)) {
        throw new Error('مفتاح قاموس Bencode ليس سلسلة');
      }
      const key = utf8.decode(keySpan.value);
      const valStart = keySpan.nextOffset;
      const valSpan = decodeBencode(buf, valStart, false, depth + 1);
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
    const lenText = utf8.decode(buf.subarray(offset, colon));
    if (!LEN_RE.test(lenText)) throw new Error('طول سلسلة Bencode غير صالح');
    const len = Number(lenText);
    const start = colon + 1;
    const end = start + len;
    if (!Number.isSafeInteger(end) || end > buf.length) {
      throw new Error('نهاية غير متوقعة لبيانات Bencode');
    }
    return { value: buf.subarray(start, end), nextOffset: end };
  }

  throw new Error(`رمز Bencode غير معروف عند الإزاحة ${offset}`);
}

function flattenBencodeStrings(raw: unknown, out: string[] = []): string[] {
  if (!raw) return out;
  if (raw instanceof Uint8Array) {
    const str = utf8.decode(raw).trim();
    if (str) out.push(str);
  } else if (Array.isArray(raw)) {
    for (const item of raw) flattenBencodeStrings(item, out);
  }
  return out;
}

function bytesToString(raw: unknown): string {
  return raw instanceof Uint8Array ? utf8.decode(raw) : '';
}

/* ------------------------------------------------------------------ */
/* Piece geometry                                                      */
/* ------------------------------------------------------------------ */

export function torrentPieceSize(
  pieceIndex: number,
  pieceLength: number,
  totalLength: number,
): number {
  const start = pieceIndex * pieceLength;
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0 || start >= totalLength) {
    throw new RangeError(`فهرس قطعة خارج التورنت: ${pieceIndex}`);
  }
  return Math.min(pieceLength, totalLength - start);
}

export function computeSelectedFileGeometry(input: {
  pieceLength: number;
  torrentTotalLength: number;
  torrentPieceCount: number;
  fileIndex?: number;
  fileOffset: number;
  fileLength: number;
}): SelectedFileGeometry {
  const { pieceLength, torrentTotalLength, torrentPieceCount, fileOffset, fileLength } = input;
  if (!Number.isSafeInteger(pieceLength) || pieceLength <= 0) {
    throw new Error(`pieceLength غير صالح: ${pieceLength}`);
  }
  if (!Number.isSafeInteger(torrentTotalLength) || torrentTotalLength <= 0) {
    throw new Error(`طول التورنت غير صالح: ${torrentTotalLength}`);
  }
  if (!Number.isSafeInteger(fileOffset) || fileOffset < 0) {
    throw new Error(`إزاحة الملف غير صالحة: ${fileOffset}`);
  }
  if (!Number.isSafeInteger(fileLength) || fileLength <= 0) {
    throw new Error(`طول الملف غير صالح: ${fileLength}`);
  }
  if (fileOffset + fileLength > torrentTotalLength) {
    throw new Error('الملف المختار يتجاوز نهاية التورنت');
  }
  const expectedCount = Math.ceil(torrentTotalLength / pieceLength);
  if (torrentPieceCount !== expectedCount) {
    throw new Error(
      `عدد القطع ${torrentPieceCount} لا يطابق ceil(${torrentTotalLength}/${pieceLength}) = ${expectedCount}`,
    );
  }
  const fileEnd = fileOffset + fileLength;
  const firstPieceIndex = Math.floor(fileOffset / pieceLength);
  const lastPieceIndex = Math.floor((fileEnd - 1) / pieceLength);
  return {
    pieceLength,
    torrentTotalLength,
    torrentPieceCount,
    fileIndex: input.fileIndex ?? 0,
    fileOffset,
    fileLength,
    firstPieceIndex,
    lastPieceIndex,
    firstPieceByteOffset: fileOffset - firstPieceIndex * pieceLength,
    lastPieceByteLength: fileEnd - lastPieceIndex * pieceLength,
    filePieceCount: lastPieceIndex - firstPieceIndex + 1,
  };
}

/** Identity geometry for direct (non-torrent) sources: file == "torrent". */
export function buildIdentityGeometry(size: number, pieceLength: number): SelectedFileGeometry {
  const safeLen = Math.max(1, Math.floor(pieceLength));
  return computeSelectedFileGeometry({
    pieceLength: safeLen,
    torrentTotalLength: size,
    torrentPieceCount: Math.ceil(size / safeLen),
    fileIndex: 0,
    fileOffset: 0,
    fileLength: size,
  });
}

export function getLocalPieceSlice(g: SelectedFileGeometry, localIndex: number): LocalPieceSlice {
  if (!Number.isInteger(localIndex) || localIndex < 0 || localIndex >= g.filePieceCount) {
    throw new RangeError(`فهرس قطعة محلي خارج الملف: ${localIndex}`);
  }
  const t = g.firstPieceIndex + localIndex;
  const absStart = t * g.pieceLength;
  const size = torrentPieceSize(t, g.pieceLength, g.torrentTotalLength);
  const fileAbsEnd = g.fileOffset + g.fileLength;
  const segStart = Math.max(absStart, g.fileOffset);
  const segEnd = Math.min(absStart + size, fileAbsEnd);
  return {
    localIndex,
    torrentPieceIndex: t,
    torrentPieceAbsStart: absStart,
    torrentPieceSize: size,
    trimStart: segStart - absStart,
    trimEnd: segEnd - absStart,
    fileStart: segStart - g.fileOffset,
    length: segEnd - segStart,
  };
}

export function fileByteToLocalPieceIndex(g: SelectedFileGeometry, fileByte: number): number {
  const clamped = Math.min(Math.max(0, Math.floor(fileByte || 0)), g.fileLength - 1);
  return Math.floor((g.fileOffset + clamped) / g.pieceLength) - g.firstPieceIndex;
}

export function localToTorrentPieceIndex(g: SelectedFileGeometry, localIndex: number): number {
  return g.firstPieceIndex + localIndex;
}

/** Split an absolute torrent byte range [absStart, absEnd) into per-file segments. */
export function mapTorrentRangeToFiles(
  files: TorrentFileEntryEx[],
  absStart: number,
  absEndExclusive: number,
): FileRangeSegment[] {
  const out: FileRangeSegment[] = [];
  for (const f of files) {
    if (f.length === 0) continue;
    const fEnd = f.offset + f.length;
    if (fEnd <= absStart) continue;
    if (f.offset >= absEndExclusive) break;
    const s = Math.max(absStart, f.offset);
    const e = Math.min(absEndExclusive, fEnd);
    out.push({ file: f, fileStart: s - f.offset, length: e - s, bufferOffset: s - absStart });
  }
  return out;
}

/** check_length(count, fileLength) */
export function checkLength(byteCount: number, fileLength: number): void {
  if (byteCount !== fileLength) {
    throw new Error(`طول الملف المدمج ${byteCount} ≠ الطول المتوقع ${fileLength}`);
  }
}

/** BEP 19 WebSeed URL for one file. */
export function buildWebSeedUrl(
  root: string,
  torrentName: string,
  file: TorrentFileEntry,
  isSingleFile: boolean,
): string {
  if (isSingleFile) {
    return root.endsWith('/') ? `${root}${encodeURIComponent(torrentName)}` : root;
  }
  const base = root.endsWith('/') ? root : `${root}/`;
  const parts = [torrentName, ...file.path.split('/')]
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${base}${parts}`;
}

/* ------------------------------------------------------------------ */
/* .torrent parser                                                     */
/* ------------------------------------------------------------------ */

function pickMainFile(files: TorrentFileEntryEx[]): TorrentFileEntryEx {
  const playable = files.filter((f) => !f.isPadding && f.length > 0);
  const videos = playable.filter((f) => VIDEO_EXT_REGEX.test(f.path));
  const nonSample = videos.filter((f) => !SAMPLE_REGEX.test(f.path));
  const pool = nonSample.length ? nonSample : videos.length ? videos : playable;
  if (pool.length === 0) throw new Error('لا يوجد ملف قابل للتشغيل داخل التورنت');
  return pool.reduce((a, b) => (a.length >= b.length ? a : b));
}

function resolveWebSeeds(
  roots: string[],
  name: string,
  file: TorrentFileEntryEx,
  isSingleFile: boolean,
  archiveOrigin: boolean,
): string[] {
  const out = roots.map((ws) => buildWebSeedUrl(ws, name, file, isSingleFile));
  if (archiveOrigin) {
    const cleanId = name.replace(/\.[^.]+$/, '');
    const inner = (isSingleFile ? name : file.path)
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');
    out.push(`https://archive.org/download/${encodeURIComponent(cleanId)}/${inner}`);
  }
  return Array.from(new Set(out));
}

function extractFilesFromInfoDict(info: any, name: string): {
  files: TorrentFileEntryEx[];
  totalLength: number;
  isSingleFile: boolean;
} {
  const files: TorrentFileEntryEx[] = [];
  let totalLength = 0;
  const isSingleFile = typeof info.length === 'number';

  if (isSingleFile) {
    if (!Number.isSafeInteger(info.length) || info.length <= 0) {
      throw new Error('طول الملف المفرد غير صالح');
    }
    totalLength = info.length;
    files.push({ index: 0, path: name, offset: 0, length: info.length, isPadding: false });
  } else if (Array.isArray(info.files)) {
    if (info.files.length === 0 || info.files.length > MAX_FILES) {
      throw new Error(`عدد الملفات داخل التورنت غير آمن (${info.files.length})`);
    }
    info.files.forEach((f: any, idx: number) => {
      const rawPath = Array.isArray(f['path.utf-8']) ? f['path.utf-8'] : f.path;
      const parts = Array.isArray(rawPath)
        ? rawPath.map((p: unknown) => (p instanceof Uint8Array ? utf8.decode(p) : String(p)))
        : [String(idx)];
      const safeRelPath = sanitizeTorrentPath(parts.length ? parts : [String(idx)]);
      const len = f.length;
      if (typeof len !== 'number' || !Number.isSafeInteger(len) || len < 0) {
        throw new Error(`طول غير صالح للملف #${idx}`);
      }
      const attr = bytesToString(f.attr);
      files.push({
        index: idx,
        path: safeRelPath,
        offset: totalLength,
        length: len,
        isPadding: attr.includes('p') || PADDING_FILE_REGEX.test(safeRelPath),
      });
      totalLength += len;
    });
  } else {
    throw new Error('ملف التورنت لا يحتوي على طول ملف صالح');
  }
  return { files, totalLength, isSingleFile };
}

export async function parseTorrentFileBytes(
  rawBytes: Uint8Array,
): Promise<ParsedTorrentWithGeometry> {
  if (rawBytes.byteLength === 0 || rawBytes.byteLength > MAX_TORRENT_BYTES) {
    throw new Error(`حجم ملف التورنت غير مسموح (${rawBytes.byteLength} بايت)`);
  }
  const root = decodeBencode(rawBytes, 0, true);
  if (root.nextOffset !== rawBytes.byteLength) {
    console.warn('[torrent] trailing bytes after root dictionary');
  }
  if (root.infoStart === undefined || root.infoEnd === undefined) {
    throw new Error('ملف التورنت يفتقد قاموس info');
  }

  const infoSlice = rawBytes.subarray(root.infoStart, root.infoEnd);
  const infoHashBytes = new Uint8Array(
    await crypto.subtle.digest('SHA-1', infoSlice as unknown as BufferSource),
  );
  const infoHashHex = bufferToHex(infoHashBytes);

  const info = root.value.info;
  const isV2Hybrid = info['meta version'] === 2;
  if (!(info.pieces instanceof Uint8Array)) {
    throw new Error(
      isV2Hybrid
        ? 'تورنت BitTorrent v2 فقط (بدون pieces v1) غير مدعوم حالياً'
        : 'ملف التورنت يفتقد مصفوفة pieces',
    );
  }

  const rawName = bytesToString(info['name.utf-8']) || bytesToString(info.name);
  const name = sanitizeTorrentPath([rawName || `torrent_${infoHashHex.slice(0, 8)}`]);

  const pieceLength = Number(info['piece length']);
  if (!Number.isSafeInteger(pieceLength) || pieceLength <= 0 || pieceLength > MAX_PIECE_LEN) {
    throw new Error(`حجم القطعة غير صالح: ${pieceLength}`);
  }

  const rawPieces: Uint8Array = info.pieces;
  if (rawPieces.byteLength === 0 || rawPieces.byteLength % 20 !== 0) {
    throw new Error('مصفوفة بصمات SHA-1 تالفة داخل ملف التورنت');
  }
  const pieceCount = rawPieces.byteLength / 20;
  const pieceHashesHex: string[] = new Array(pieceCount);
  for (let i = 0; i < pieceCount; i++) {
    pieceHashesHex[i] = bufferToHex(rawPieces.subarray(i * 20, (i + 1) * 20));
  }

  const { files, totalLength, isSingleFile } = extractFilesFromInfoDict(info, name);
  if (pieceCount !== Math.ceil(totalLength / pieceLength)) {
    throw new Error(
      `عدد بصمات القطع (${pieceCount}) لا يطابق الطول الكلي (${totalLength}) / ${pieceLength}`,
    );
  }

  const selectedFile = pickMainFile(files);
  const geometry = computeSelectedFileGeometry({
    pieceLength,
    torrentTotalLength: totalLength,
    torrentPieceCount: pieceCount,
    fileIndex: selectedFile.index,
    fileOffset: selectedFile.offset,
    fileLength: selectedFile.length,
  });

  const announceList = Array.from(
    new Set([
      ...flattenBencodeStrings(root.value.announce),
      ...flattenBencodeStrings(root.value['announce-list']),
    ]),
  );

  const webSeedRoots = Array.from(
    new Set([
      ...flattenBencodeStrings(root.value['url-list']),
      ...flattenBencodeStrings(root.value.httpseeds),
    ]),
  ).filter((u) => /^https?:\/\//i.test(u));

  const commentStr = bytesToString(root.value.comment);
  const archiveOrigin =
    commentStr.includes('archive.org') || announceList.some((a) => a.includes('archive.org'));

  return {
    infoHashHex,
    infoHashBytes,
    name,
    pieceLength,
    pieceCount,
    totalLength,
    pieceHashesHex,
    files,
    selectedFile,
    announceList,
    webSeeds: resolveWebSeeds(webSeedRoots, name, selectedFile, isSingleFile, archiveOrigin),
    rawTorrentBase64: uint8ToBase64(rawBytes),
    geometry,
    isSingleFile,
    isV2Hybrid,
    webSeedRoots,
  };
}

/** Re-select another file (e.g. user picks episode 3 in a season pack). */
export function reselectTorrentFile(
  meta: ParsedTorrentWithGeometry,
  fileIndex: number,
): ParsedTorrentWithGeometry {
  const file = meta.files.find((f) => f.index === fileIndex);
  if (!file || file.isPadding || file.length === 0) {
    throw new Error(`الملف #${fileIndex} غير قابل للاختيار`);
  }
  const geometry = computeSelectedFileGeometry({
    pieceLength: meta.pieceLength,
    torrentTotalLength: meta.totalLength,
    torrentPieceCount: meta.pieceCount,
    fileIndex: file.index,
    fileOffset: file.offset,
    fileLength: file.length,
  });
  return {
    ...meta,
    selectedFile: file,
    geometry,
    webSeeds: resolveWebSeeds(meta.webSeedRoots, meta.name, file, meta.isSingleFile, false),
  };
}
