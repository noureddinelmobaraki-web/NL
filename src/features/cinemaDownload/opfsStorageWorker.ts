/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * TPPIECES v2 — OPFS append-only store of FILE-RELATIVE verified slices
 * (pieces.dat + pieces.idx) + IndexedDB spillover + 256 KiB exact merger.
 *
 * Contract:
 *  - Bitfield / pieceIndex are LOCAL (0 .. geometry.filePieceCount-1).
 *  - Network delivers WHOLE torrent pieces (bytesKind 'torrent-piece');
 *    SHA-1 is checked against expectedHashes[firstPieceIndex + local],
 *    then trimmed to [trimStart, trimEnd) before storage.
 *  - OPEN_BYTE_RANGE / FINALIZE_AND_EXPORT operate on selected-file bytes.
 */

import type { DownloadStorageTargetMode } from './types';
import {
  buildIdentityGeometry,
  checkLength,
  computeSelectedFileGeometry,
  fileByteToLocalPieceIndex,
  getLocalPieceSlice,
  type SelectedFileGeometry,
} from './bencodeAndInputManager';

const HEADER_MAGIC = new TextEncoder().encode('TPPIECES');
const INDEX_VERSION = 2;
const LAYOUT_VERSION = 2;
const HEADER_LEN = 36; // 8B magic + 4B version + 4B pieceCount + 20B infoHash
const RECORD_LEN = 24; // 4B local piece + 4B len + 8B offset + 8B checksum
const STREAM_CHUNK = 256 * 1024;

type PieceBytesKind = 'torrent-piece' | 'file-slice';

interface PieceSlot {
  at: number;
  len: number;
  inIdb: boolean;
  verified: boolean;
  fileStart: number;
}

interface TorrentSessionHandle {
  infoHash: string;
  infoHashBytes: Uint8Array;
  originalFileName: string;
  /** Selected FILE length in bytes (estimate for variable segments). */
  totalSize: number;
  pieceLength: number;
  /** LOCAL piece count. */
  totalPieces: number;
  /** null => variable-length segments (HLS). */
  geometry: SelectedFileGeometry | null;
  hasTorrentHashes: boolean;
  allowUnverifiedBoundary: boolean;
  opfsMaxByteLimit: number;
  storageMode: DownloadStorageTargetMode;
  isVariableSegments: boolean;
  writtenBytes: number;
  nextDataOffset: number;
  nextIdxOffset: number;
  expectedHashes: string[];
  bitfield: Uint8Array;
  slots: (PieceSlot | null)[];
  dirHandle: FileSystemDirectoryHandle | null;
  dataHandle: FileSystemFileHandle | null;
  idxHandle: FileSystemFileHandle | null;
  dataAccess: any | null;
  idxAccess: any | null;
  mediaSnapshot?: unknown;
  releaseSnapshot?: unknown;
}

interface PersistedTorrentRecord {
  infoHash: string;
  layoutVersion?: number;
  geometry?: SelectedFileGeometry | null;
  originalFileName: string;
  totalSize: number;
  pieceLength: number;
  totalPieces: number;
  opfsMaxByteLimit?: number;
  storageMode?: DownloadStorageTargetMode;
  isVariableSegments?: boolean;
  writtenBytes?: number;
  nextDataOffset?: number;
  nextIdxOffset?: number;
  bitfield: number[];
  slots?: (PieceSlot | null)[];
  mediaSnapshot?: unknown;
  releaseSnapshot?: unknown;
  exportedToDevice?: boolean;
  updatedAt: number;
}

interface LoadedState {
  bitfield: Uint8Array;
  slots: (PieceSlot | null)[];
  writtenBytes: number;
  nextDataOffset: number;
  nextIdxOffset: number;
  exportedToDevice: boolean;
}

const sessions = new Map<string, TorrentSessionHandle>();
const pieceWaiters = new Map<string, Set<() => void>>();
let rootDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function notifyWaiters(infoHash: string): void {
  const set = pieceWaiters.get(infoHash);
  if (!set) return;
  for (const wake of [...set]) {
    set.delete(wake);
    wake();
  }
}

function waitForPieceChange(infoHash: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let set = pieceWaiters.get(infoHash);
    if (!set) {
      set = new Set();
      pieceWaiters.set(infoHash, set);
    }
    set.add(resolve);
  });
}

function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!rootDirPromise) {
    rootDirPromise =
      typeof navigator !== 'undefined' && navigator.storage?.getDirectory
        ? navigator.storage.getDirectory().catch(() => null)
        : Promise.resolve(null);
  }
  return rootDirPromise;
}

function hexToBytes20(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().padEnd(40, '0').slice(0, 40);
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  return bufferToHex(await crypto.subtle.digest('SHA-1', bytes as unknown as BufferSource));
}

function sanitizeOpfsName(name: string): string {
  const base = (name || 'movie.mp4').split('/').pop() || 'movie.mp4';
  const clean = base.replace(/[\\/\0:<>|?*]/g, '_').slice(0, 200);
  return clean === 'pieces.dat' || clean === 'pieces.idx' ? `export-${clean}` : clean;
}

function sameGeometry(a: SelectedFileGeometry | null | undefined, b: SelectedFileGeometry | null): boolean {
  if (!a || !b) return !a && !b;
  return (
    a.pieceLength === b.pieceLength &&
    a.torrentTotalLength === b.torrentTotalLength &&
    a.fileOffset === b.fileOffset &&
    a.fileLength === b.fileLength &&
    a.filePieceCount === b.filePieceCount
  );
}

function buildTpPiecesHeader(pieceCount: number, infoHashBytes: Uint8Array): Uint8Array {
  const hdr = new Uint8Array(HEADER_LEN);
  const view = new DataView(hdr.buffer);
  hdr.set(HEADER_MAGIC, 0);
  view.setUint32(8, INDEX_VERSION, true);
  view.setUint32(12, pieceCount >>> 0, true);
  hdr.set(infoHashBytes.subarray(0, 20), 16);
  return hdr;
}

async function buildTpPiecesRecord(
  infoHashBytes: Uint8Array,
  piece: number,
  len: number,
  at: number,
): Promise<Uint8Array> {
  const rec = new Uint8Array(RECORD_LEN);
  const view = new DataView(rec.buffer);
  view.setUint32(0, piece >>> 0, true);
  view.setUint32(4, len >>> 0, true);
  view.setBigUint64(8, BigInt(Math.max(0, at)), true);
  const checkInput = new Uint8Array(36);
  checkInput.set(infoHashBytes.subarray(0, 20), 0);
  checkInput.set(rec.subarray(0, 16), 20);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', checkInput));
  rec.set(digest.subarray(0, 8), 16);
  return rec;
}

function emptyState(totalPieces: number): LoadedState {
  return {
    bitfield: new Uint8Array(totalPieces),
    slots: new Array(totalPieces).fill(null),
    writtenBytes: 0,
    nextDataOffset: 0,
    nextIdxOffset: HEADER_LEN,
    exportedToDevice: false,
  };
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

function openStateDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('BrowserTorrentCacheDB', 5);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('torrents')) {
        db.createObjectStore('torrents', { keyPath: 'infoHash' });
      }
      if (!db.objectStoreNames.contains('pieceChunks')) {
        const store = db.createObjectStore('pieceChunks', { keyPath: 'chunkId' });
        store.createIndex('byInfoHash', 'infoHash', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOverflowChunkToIDB(infoHash: string, local: number, data: Uint8Array): Promise<boolean> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pieceChunks', 'readwrite');
      tx.objectStore('pieceChunks').put({
        chunkId: `${infoHash}_${local}`,
        infoHash,
        pieceIndex: local,
        buffer: data.slice().buffer,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

async function loadOverflowChunkFromIDB(infoHash: string, local: number): Promise<Uint8Array | null> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const req = db.transaction('pieceChunks', 'readonly').objectStore('pieceChunks').get(`${infoHash}_${local}`);
      req.onsuccess = () => {
        const res = req.result as { buffer?: ArrayBuffer } | undefined;
        resolve(res?.buffer ? new Uint8Array(res.buffer) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteOverflowChunksForHash(infoHash: string): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('pieceChunks', 'readwrite');
      const store = tx.objectStore('pieceChunks');
      const req = store.index('byInfoHash').openKeyCursor(IDBKeyRange.only(infoHash));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function saveSessionStateToIDB(session: TorrentSessionHandle, exportedToDevice = false): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('torrents', 'readwrite');
      const record: PersistedTorrentRecord = {
        infoHash: session.infoHash,
        layoutVersion: LAYOUT_VERSION,
        geometry: session.geometry,
        originalFileName: session.originalFileName,
        totalSize: session.totalSize,
        pieceLength: session.pieceLength,
        totalPieces: session.totalPieces,
        opfsMaxByteLimit: session.opfsMaxByteLimit,
        storageMode: session.storageMode,
        isVariableSegments: session.isVariableSegments,
        writtenBytes: session.writtenBytes,
        nextDataOffset: session.nextDataOffset,
        nextIdxOffset: session.nextIdxOffset,
        bitfield: Array.from(session.bitfield),
        slots: session.slots,
        mediaSnapshot: session.mediaSnapshot,
        releaseSnapshot: session.releaseSnapshot,
        exportedToDevice,
        updatedAt: Date.now(),
      };
      tx.objectStore('torrents').put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function loadSessionStateFromIDB(
  infoHash: string,
  totalPieces: number,
  geometry: SelectedFileGeometry | null,
): Promise<LoadedState> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const req = db.transaction('torrents', 'readonly').objectStore('torrents').get(infoHash);
      req.onsuccess = () => {
        const res = req.result as PersistedTorrentRecord | undefined;
        const valid =
          res &&
          res.layoutVersion === LAYOUT_VERSION &&
          Array.isArray(res.bitfield) &&
          res.bitfield.length === totalPieces &&
          sameGeometry(res.geometry ?? null, geometry);
        if (!valid) {
          resolve(emptyState(totalPieces));
          return;
        }
        resolve({
          bitfield: new Uint8Array(res!.bitfield),
          slots:
            Array.isArray(res!.slots) && res!.slots.length === totalPieces
              ? res!.slots
              : new Array(totalPieces).fill(null),
          writtenBytes: Number(res!.writtenBytes) || 0,
          nextDataOffset: Number(res!.nextDataOffset) || 0,
          nextIdxOffset: Number(res!.nextIdxOffset) || HEADER_LEN,
          exportedToDevice: Boolean(res!.exportedToDevice),
        });
      };
      req.onerror = () => resolve(emptyState(totalPieces));
    });
  } catch {
    return emptyState(totalPieces);
  }
}

async function getAllSavedRecords(): Promise<PersistedTorrentRecord[]> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const req = db.transaction('torrents', 'readonly').objectStore('torrents').getAll();
      req.onsuccess = () => resolve((req.result as PersistedTorrentRecord[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function deleteSavedRecord(infoHash: string): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('torrents', 'readwrite');
      tx.objectStore('torrents').delete(infoHash);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function getStorageEstimateInfo() {
  let usage = 0;
  let quota = 0;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usage = est.usage || 0;
      quota = est.quota || 0;
    } catch {}
  }
  const rootDir = await getOpfsRoot();
  return {
    usageBytes: usage,
    quotaBytes: quota,
    freeBytes: Math.max(0, quota - usage),
    usageMB: Math.round(usage / 1e6),
    quotaMB: Math.round(quota / 1e6),
    freeGB: Number((Math.max(0, quota - usage) / 1e9).toFixed(2)),
    opfsSupported: Boolean(rootDir),
  };
}

/* ------------------------------------------------------------------ */
/* Slice I/O                                                           */
/* ------------------------------------------------------------------ */

async function readStoredSlice(session: TorrentSessionHandle, local: number): Promise<Uint8Array | null> {
  if (session.bitfield[local] !== 1) return null;
  const slot = session.slots[local];
  if (slot && !slot.inIdb && session.dataAccess && slot.len > 0) {
    try {
      const buf = new Uint8Array(slot.len);
      const n = session.dataAccess.read(buf, { at: slot.at });
      if (n === slot.len) return buf;
    } catch {}
  }
  return loadOverflowChunkFromIDB(session.infoHash, local);
}

function closeSessionHandles(session?: TorrentSessionHandle): void {
  if (!session) return;
  for (const key of ['dataAccess', 'idxAccess'] as const) {
    const h = session[key];
    if (h) {
      try {
        h.flush();
        h.close();
      } catch {}
      session[key] = null;
    }
  }
}

type Locate =
  | { kind: 'ready'; local: number; offsetInSlot: number }
  | { kind: 'pending'; local: number }
  | { kind: 'eof' };

function locateFileByte(session: TorrentSessionHandle, pos: number): Locate {
  if (session.geometry) {
    const local = fileByteToLocalPieceIndex(session.geometry, pos);
    if (session.bitfield[local] !== 1) return { kind: 'pending', local };
    const slice = getLocalPieceSlice(session.geometry, local);
    return { kind: 'ready', local, offsetInSlot: pos - slice.fileStart };
  }
  let acc = 0;
  for (let i = 0; i < session.totalPieces; i++) {
    if (session.bitfield[i] !== 1) return { kind: 'pending', local: i };
    const len = session.slots[i]?.len ?? 0;
    if (pos < acc + len) return { kind: 'ready', local: i, offsetInSlot: pos - acc };
    acc += len;
  }
  return { kind: 'eof' };
}

/* ------------------------------------------------------------------ */
/* Message handler                                                     */
/* ------------------------------------------------------------------ */

self.onmessage = async (event: MessageEvent) => {
  const { action, payload } = event.data || {};

  try {
    if (action === 'GET_QUOTA_AND_SAVED') {
      self.postMessage({
        type: 'QUOTA_AND_SAVED',
        quota: await getStorageEstimateInfo(),
        savedRecords: await getAllSavedRecords(),
      });
      return;
    }

    if (action === 'INIT') {
      const {
        infoHash,
        fileName,
        size,
        pieceLen,
        totalPieces: explicitTotal,
        isVariableSegments = false,
        pieceHashes,
        geometry: rawGeometry,
        allowUnverifiedBoundary = true,
        mediaSnapshot,
        releaseSnapshot,
      } = payload;

      const variable = Boolean(isVariableSegments);
      const safePieceLen = Math.max(1, Math.floor(Number(pieceLen) || 1));
      let geometry: SelectedFileGeometry | null = null;
      if (!variable) {
        geometry = rawGeometry
          ? computeSelectedFileGeometry(rawGeometry)
          : buildIdentityGeometry(Math.max(1, Number(size) || 1), safePieceLen);
      }

      const hashes: string[] = Array.isArray(pieceHashes) ? pieceHashes : [];
      const totalPieces = geometry
        ? geometry.filePieceCount
        : Math.max(1, Number(explicitTotal) || Math.ceil((Number(size) || 1) / safePieceLen));
      const fileSize = geometry ? geometry.fileLength : Math.max(0, Number(size) || 0);

      const estimate = await getStorageEstimateInfo();
      const safeFree = estimate.freeBytes > 0 ? Math.floor(estimate.freeBytes * 0.85) : fileSize;
      const needsHybrid = estimate.freeBytes > 0 && fileSize > safeFree;
      const storageMode: DownloadStorageTargetMode = needsHybrid ? 'hybrid-extended' : 'opfs-cache';
      const opfsMaxByteLimit = needsHybrid ? Math.max(0, safeFree) : Number.MAX_SAFE_INTEGER;

      closeSessionHandles(sessions.get(infoHash));
      const loaded = await loadSessionStateFromIDB(infoHash, totalPieces, geometry);
      const infoHashBytes = hexToBytes20(infoHash);

      let dirHandle: FileSystemDirectoryHandle | null = null;
      let dataHandle: FileSystemFileHandle | null = null;
      let idxHandle: FileSystemFileHandle | null = null;
      let dataAccess: any = null;
      let idxAccess: any = null;
      const rootDir = await getOpfsRoot();
      if (rootDir) {
        try {
          const swarmRoot = await rootDir.getDirectoryHandle('torrentplayer-swarm', { create: true });
          dirHandle = await swarmRoot.getDirectoryHandle(infoHash, { create: true });
          dataHandle = await dirHandle.getFileHandle('pieces.dat', { create: true });
          idxHandle = await dirHandle.getFileHandle('pieces.idx', { create: true });
          if (typeof (dataHandle as any).createSyncAccessHandle === 'function') {
            dataAccess = await (dataHandle as any).createSyncAccessHandle();
            idxAccess = await (idxHandle as any).createSyncAccessHandle();
            const dataSize = dataAccess.getSize();
            const corrupt = dataSize < loaded.nextDataOffset || idxAccess.getSize() < HEADER_LEN;
            if (corrupt || loaded.writtenBytes === 0) {
              Object.assign(loaded, emptyState(totalPieces));
              idxAccess.truncate(0);
              idxAccess.write(buildTpPiecesHeader(totalPieces, infoHashBytes), { at: 0 });
              dataAccess.truncate(0);
              dataAccess.flush();
              idxAccess.flush();
            }
          }
        } catch {
          dataAccess = null;
          idxAccess = null;
        }
      }

      const session: TorrentSessionHandle = {
        infoHash,
        infoHashBytes,
        originalFileName: sanitizeOpfsName(fileName),
        totalSize: fileSize,
        pieceLength: geometry ? geometry.pieceLength : safePieceLen,
        totalPieces,
        geometry,
        hasTorrentHashes: Boolean(geometry) && hashes.length === geometry!.torrentPieceCount,
        allowUnverifiedBoundary: Boolean(allowUnverifiedBoundary),
        opfsMaxByteLimit,
        storageMode,
        isVariableSegments: variable,
        writtenBytes: loaded.writtenBytes,
        nextDataOffset: loaded.nextDataOffset,
        nextIdxOffset: loaded.nextIdxOffset,
        expectedHashes: hashes.map((h) => String(h).toLowerCase()),
        bitfield: loaded.bitfield,
        slots: loaded.slots,
        dirHandle,
        dataHandle,
        idxHandle,
        dataAccess,
        idxAccess,
        mediaSnapshot,
        releaseSnapshot,
      };
      sessions.set(infoHash, session);
      await saveSessionStateToIDB(session, loaded.exportedToDevice);

      self.postMessage({
        type: 'INIT_READY',
        infoHash,
        storageMode,
        geometry,
        bitfield: Array.from(session.bitfield),
        completedPieces: session.bitfield.reduce((a, v) => a + v, 0),
        totalPieces,
        writtenBytes: session.writtenBytes,
        exportedToDevice: loaded.exportedToDevice,
        quota: await getStorageEstimateInfo(),
      });
      return;
    }

    if (action === 'WRITE_PIECE') {
      const { infoHash, pieceIndex, buffer, expectedHash, bytesKind = 'torrent-piece' } = payload as {
        infoHash: string;
        pieceIndex: number;
        buffer: ArrayBuffer;
        expectedHash?: string;
        bytesKind?: PieceBytesKind;
      };
      const session = sessions.get(infoHash);
      if (!session) return;
      const local = pieceIndex;
      if (!Number.isInteger(local) || local < 0 || local >= session.totalPieces) {
        self.postMessage({ type: 'PIECE_CORRUPT', infoHash, pieceIndex, reason: 'فهرس قطعة خارج الملف' });
        return;
      }

      const progressMsg = (extra: Record<string, unknown>) => {
        const done = session.bitfield.reduce((a, v) => a + v, 0);
        return {
          type: 'PIECE_VERIFIED',
          infoHash,
          pieceIndex: local,
          writtenBytes: session.writtenBytes,
          completedPieces: done,
          totalPieces: session.totalPieces,
          progress: Number(((done / session.totalPieces) * 100).toFixed(2)),
          ...extra,
        };
      };

      if (session.bitfield[local] === 1) {
        self.postMessage(progressMsg({ skipped: true, pieceByteLength: 0 }));
        return;
      }

      const raw = new Uint8Array(buffer);
      let toStore: Uint8Array;
      let actualHex = '';

      if (session.geometry) {
        const slice = getLocalPieceSlice(session.geometry, local);
        if (bytesKind === 'torrent-piece') {
          if (raw.byteLength !== slice.torrentPieceSize) {
            self.postMessage({
              type: 'PIECE_CORRUPT',
              infoHash,
              pieceIndex: local,
              reason: `طول القطعة ${raw.byteLength} ≠ ${slice.torrentPieceSize}`,
            });
            return;
          }
          actualHex = await sha1Hex(raw);
          const target = (session.expectedHashes[slice.torrentPieceIndex] || expectedHash || '').toLowerCase();
          if (target && actualHex !== target) {
            self.postMessage({
              type: 'PIECE_CORRUPT',
              infoHash,
              pieceIndex: local,
              torrentPieceIndex: slice.torrentPieceIndex,
              reason: 'فشل تطابق بصمة SHA-1 للقطعة — سيتم إعادة طلبها تلقائياً',
            });
            return;
          }
          toStore = raw.subarray(slice.trimStart, slice.trimEnd);
        } else {
          // File-relative slice (e.g. WebSeed of a file inside a multi-file torrent).
          if (raw.byteLength !== slice.length) {
            self.postMessage({
              type: 'PIECE_CORRUPT',
              infoHash,
              pieceIndex: local,
              reason: `طول الشريحة ${raw.byteLength} ≠ ${slice.length}`,
            });
            return;
          }
          const fullyInside = slice.trimStart === 0 && slice.trimEnd === slice.torrentPieceSize;
          if (session.hasTorrentHashes && fullyInside) {
            actualHex = await sha1Hex(raw);
            if (actualHex !== session.expectedHashes[slice.torrentPieceIndex]) {
              self.postMessage({
                type: 'PIECE_CORRUPT',
                infoHash,
                pieceIndex: local,
                reason: 'فشل تطابق SHA-1 لشريحة WebSeed',
              });
              return;
            }
          } else if (session.hasTorrentHashes && !session.allowUnverifiedBoundary) {
            self.postMessage({
              type: 'PIECE_CORRUPT',
              infoHash,
              pieceIndex: local,
              reason: 'قطعة حدّية تتطلب القطعة الكاملة من التورنت للتحقق',
            });
            return;
          }
          toStore = raw;
        }
      } else {
        toStore = raw; // variable HLS segment, no hash
      }

      const appendAt = session.nextDataOffset;
      let storedInIdb = false;
      const fits =
        session.dataAccess && appendAt + toStore.byteLength <= session.opfsMaxByteLimit;
      if (fits) {
        try {
          const n = session.dataAccess.write(toStore, { at: appendAt });
          if (n !== toStore.byteLength) throw new Error('short write');
          session.nextDataOffset += toStore.byteLength;
          if (session.idxAccess) {
            const rec = await buildTpPiecesRecord(session.infoHashBytes, local, toStore.byteLength, appendAt);
            session.idxAccess.write(rec, { at: session.nextIdxOffset });
            session.nextIdxOffset += RECORD_LEN;
          }
        } catch {
          storedInIdb = true;
        }
      } else {
        storedInIdb = true;
      }
      if (storedInIdb && !(await saveOverflowChunkToIDB(infoHash, local, toStore))) {
        self.postMessage({
          type: 'ERROR',
          infoHash,
          message: 'تعذر حفظ القطعة: مساحة التخزين ممتلئة',
        });
        return;
      }

      session.slots[local] = {
        at: storedInIdb ? 0 : appendAt,
        len: toStore.byteLength,
        inIdb: storedInIdb,
        verified: true,
        fileStart: session.geometry ? getLocalPieceSlice(session.geometry, local).fileStart : -1,
      };
      session.bitfield[local] = 1;
      session.writtenBytes += toStore.byteLength;

      const done = session.bitfield.reduce((a, v) => a + v, 0);
      if (done % 8 === 0 || done === session.totalPieces) {
        try {
          session.dataAccess?.flush();
          session.idxAccess?.flush();
        } catch {}
        await saveSessionStateToIDB(session, false);
      }
      notifyWaiters(infoHash);
      self.postMessage(progressMsg({ sha1: actualHex, pieceByteLength: toStore.byteLength }));
      return;
    }

    if (action === 'READ_PIECE_BUFFER') {
      const { infoHash, pieceIndex, requestId } = payload;
      const session = sessions.get(infoHash);
      const buf = session ? await readStoredSlice(session, pieceIndex) : null;
      if (buf) {
        const copy = buf.slice();
        (self as any).postMessage(
          { type: 'PIECE_BUFFER_RESULT', requestId, infoHash, pieceIndex, found: true, buffer: copy.buffer },
          [copy.buffer],
        );
      } else {
        self.postMessage({ type: 'PIECE_BUFFER_RESULT', requestId, infoHash, pieceIndex, found: false });
      }
      return;
    }

    if (action === 'OPEN_BYTE_RANGE' && event.ports[0]) {
      const port = event.ports[0];
      const { infoHash, start, end } = payload;
      const session = sessions.get(infoHash);
      if (!session) {
        port.postMessage({ type: 'ERROR', message: 'Session not initialized' });
        port.close();
        return;
      }
      let aborted = false;
      let credits = 4; // backpressure: SW grants credits with { type: 'PULL' }
      let creditWake: (() => void) | null = null;
      port.onmessage = (ctrl) => {
        const t = ctrl.data?.type;
        if (t === 'ABORT_RANGE') {
          aborted = true;
          notifyWaiters(infoHash);
          creditWake?.();
        } else if (t === 'PULL') {
          credits += Number(ctrl.data.n) || 1;
          creditWake?.();
        }
      };

      void (async () => {
        const fileLen = session.totalSize;
        const safeEnd = Math.min(fileLen - 1, Number.isFinite(Number(end)) ? Number(end) : fileLen - 1);
        let pos = Math.max(0, Number(start) || 0);
        try {
          while (pos <= safeEnd && !aborted) {
            const loc = locateFileByte(session, pos);
            if (loc.kind === 'eof') break;
            if (loc.kind === 'pending') {
              self.postMessage({ type: 'STREAM_NEEDS_PIECE', infoHash, pieceIndex: loc.local });
              await waitForPieceChange(infoHash);
              continue;
            }
            const bytes = await readStoredSlice(session, loc.local);
            if (!bytes) throw new Error(`Piece ${loc.local} unavailable in store`);

            const avail = bytes.byteLength - loc.offsetInSlot;
            if (avail <= 0) throw new Error(`Empty slice for piece ${loc.local}`);
            let sent = 0;
            const want = Math.min(avail, safeEnd - pos + 1);
            while (sent < want && !aborted) {
              while (credits <= 0 && !aborted) {
                await new Promise<void>((r) => (creditWake = r));
                creditWake = null;
              }
              if (aborted) break;
              const n = Math.min(STREAM_CHUNK, want - sent);
              const chunk = bytes.slice(loc.offsetInSlot + sent, loc.offsetInSlot + sent + n);
              credits--;
              port.postMessage({ type: 'CHUNK', buffer: chunk.buffer }, [chunk.buffer]);
              sent += n;
            }
            pos += sent;
          }
          if (!aborted) port.postMessage({ type: 'EOF' });
        } catch (err: any) {
          if (!aborted) port.postMessage({ type: 'ERROR', message: err?.message || 'Range stream interrupted' });
        } finally {
          port.close();
        }
      })();
      return;
    }

    if (action === 'PAUSE_SESSION') {
      const session = sessions.get(payload.infoHash);
      if (session) {
        try {
          session.dataAccess?.flush();
          session.idxAccess?.flush();
        } catch {}
        await saveSessionStateToIDB(session, false);
      }
      self.postMessage({ type: 'SESSION_PAUSED', infoHash: payload.infoHash });
      return;
    }

    if (action === 'FINALIZE_AND_EXPORT') {
      const { infoHash, writableStream } = payload;
      const session = sessions.get(infoHash);
      if (!session) throw new Error('لم يتم العثور على جلسة التحميل في الكاش القرصي');

      const missing: number[] = [];
      for (let i = 0; i < session.totalPieces; i++) if (session.bitfield[i] !== 1) missing.push(i);
      if (missing.length) {
        throw new Error(`لا يمكن التصدير: ${missing.length} قطعة ناقصة (أولها #${missing[0]})`);
      }
      try {
        session.dataAccess?.flush();
        session.idxAccess?.flush();
      } catch {}

      const expectedLen = session.geometry ? session.geometry.fileLength : null;
      const forEachSlice = async (sink: (b: Uint8Array) => Promise<void> | void) => {
        let total = 0;
        for (let i = 0; i < session.totalPieces; i++) {
          const bytes = await readStoredSlice(session, i);
          if (!bytes) throw new Error(`القطعة #${i} غير مقروءة من المخزن`);
          if (session.geometry && bytes.byteLength !== getLocalPieceSlice(session.geometry, i).length) {
            throw new Error(`طول الشريحة #${i} غير مطابق للهندسة`);
          }
          for (let off = 0; off < bytes.byteLength; off += STREAM_CHUNK) {
            const part = bytes.subarray(off, Math.min(bytes.byteLength, off + STREAM_CHUNK));
            await sink(part);
            total += part.byteLength;
          }
        }
        if (expectedLen !== null) checkLength(total, expectedLen);
        return total;
      };

      const mime = /\.ts$/i.test(session.originalFileName)
        ? 'video/mp2t'
        : /\.mkv$/i.test(session.originalFileName)
          ? 'video/x-matroska'
          : /\.webm$/i.test(session.originalFileName)
            ? 'video/webm'
            : 'video/mp4';

      if (writableStream && typeof writableStream.write === 'function') {
        const total = await forEachSlice((b) => writableStream.write(b));
        await writableStream.close();
        await saveSessionStateToIDB(session, true);
        self.postMessage({
          type: 'EXPORT_READY',
          infoHash,
          fileName: session.originalFileName,
          file: null,
          savedDirectlyToDisk: true,
          actualSizeBytes: total,
          quota: await getStorageEstimateInfo(),
        });
        return;
      }

      let mergedFile: File | null = null;
      if (session.dirHandle) {
        try {
          const outHandle = await session.dirHandle.getFileHandle(session.originalFileName, { create: true });
          if (typeof (outHandle as any).createSyncAccessHandle === 'function') {
            const out = await (outHandle as any).createSyncAccessHandle();
            try {
              out.truncate(0);
              let at = 0;
              await forEachSlice((b) => {
                out.write(b, { at });
                at += b.byteLength;
              });
              out.flush();
            } finally {
              out.close();
            }
            const f = await outHandle.getFile();
            mergedFile = new File([f], session.originalFileName, { type: mime });
          }
        } catch (e) {
          if (e instanceof Error && /طول/.test(e.message)) throw e;
          mergedFile = null;
        }
      }
      if (!mergedFile) {
        const parts: BlobPart[] = [];
        await forEachSlice((b) => {
          parts.push(b.slice() as unknown as BlobPart);
        });
        mergedFile = new File(parts, session.originalFileName, { type: mime });
      }

      await saveSessionStateToIDB(session, true);
      self.postMessage({
        type: 'EXPORT_READY',
        infoHash,
        fileName: session.originalFileName,
        file: mergedFile,
        actualSizeBytes: mergedFile.size,
        quota: await getStorageEstimateInfo(),
      });
      return;
    }

    if (action === 'CLEANUP_CACHE') {
      const { infoHash } = payload;
      closeSessionHandles(sessions.get(infoHash));
      sessions.delete(infoHash);
      notifyWaiters(infoHash);
      const rootDir = await getOpfsRoot();
      if (rootDir) {
        try {
          const swarmRoot = await rootDir.getDirectoryHandle('torrentplayer-swarm', { create: false });
          await swarmRoot.removeEntry(infoHash, { recursive: true });
        } catch {}
      }
      await deleteOverflowChunksForHash(infoHash);
      await deleteSavedRecord(infoHash);
      self.postMessage({ type: 'CACHE_CLEARED', infoHash, quota: await getStorageEstimateInfo() });
    }
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      infoHash: payload?.infoHash,
      message: err?.message || 'حدث خطأ في مخزن القطع القرصي TPPIECES OPFS',
    });
  }
};
