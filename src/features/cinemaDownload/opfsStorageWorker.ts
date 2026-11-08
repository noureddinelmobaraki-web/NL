/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated Hybrid OPFS Append-Only Store (TPPIECES: pieces.dat + pieces.idx)
 * + Extended IndexedDB Spillover + 256 KiB Atomic File Merger
 */

import type { DownloadStorageTargetMode } from './types';

const HEADER_MAGIC = new TextEncoder().encode('TPPIECES'); // 8 bytes magic signature
const INDEX_VERSION = 1;
const HEADER_LEN = 36; // 8B magic + 4B version + 4B pieceCount + 20B infoHash
const RECORD_LEN = 24; // 4B piece + 4B len + 8B offset + 8B sha1 checksum
const STREAM_CHUNK = 256 * 1024; // 256 KiB streaming copy buffer

interface PieceSlot {
  at: number;
  len: number;
  inIdb: boolean;
  verified: boolean;
}

interface TorrentSessionHandle {
  infoHash: string;
  infoHashBytes: Uint8Array;
  originalFileName: string;
  totalSize: number;
  pieceLength: number;
  totalPieces: number;
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

const sessions = new Map<string, TorrentSessionHandle>();
const pieceWaiters = new Map<string, Set<() => void>>();
let rootDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

function notifyWaiters(infoHash: string): void {
  const set = pieceWaiters.get(infoHash);
  if (!set) return;
  for (const wake of [...set]) {
    set.delete(wake);
    wake();
  }
}

function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!rootDirPromise) {
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      rootDirPromise = navigator.storage.getDirectory().catch(() => null);
    } else {
      rootDirPromise = Promise.resolve(null);
    }
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
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function buildTpPiecesHeader(
  pieceCount: number,
  infoHashBytes: Uint8Array,
): Uint8Array {
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

  const checkInput = new Uint8Array(20 + 16);
  checkInput.set(infoHashBytes.subarray(0, 20), 0);
  checkInput.set(rec.subarray(0, 16), 20);
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-1', checkInput),
  );
  rec.set(digest.subarray(0, 8), 16);
  return rec;
}

interface PersistedTorrentRecord {
  infoHash: string;
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

function openStateDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('BrowserTorrentCacheDB', 5);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('torrents')) {
        db.createObjectStore('torrents', { keyPath: 'infoHash' });
      }
      if (!db.objectStoreNames.contains('pieceChunks')) {
        const chunkStore = db.createObjectStore('pieceChunks', {
          keyPath: 'chunkId',
        });
        chunkStore.createIndex('byInfoHash', 'infoHash', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOverflowChunkToIDB(
  infoHash: string,
  pieceIndex: number,
  data: Uint8Array,
): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pieceChunks', 'readwrite');
      tx.objectStore('pieceChunks').put({
        chunkId: `${infoHash}_${pieceIndex}`,
        infoHash,
        pieceIndex,
        buffer: data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function loadOverflowChunkFromIDB(
  infoHash: string,
  pieceIndex: number,
): Promise<Uint8Array | null> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('pieceChunks', 'readonly');
      const req = tx
        .objectStore('pieceChunks')
        .get(`${infoHash}_${pieceIndex}`);
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
      const idx = store.index('byInfoHash');
      const req = idx.openKeyCursor(IDBKeyRange.only(infoHash));
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

async function saveSessionStateToIDB(
  session: TorrentSessionHandle,
  exportedToDevice = false,
): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('torrents', 'readwrite');
      const record: PersistedTorrentRecord = {
        infoHash: session.infoHash,
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
): Promise<{
  bitfield: Uint8Array;
  slots: (PieceSlot | null)[];
  writtenBytes: number;
  nextDataOffset: number;
  nextIdxOffset: number;
  exportedToDevice: boolean;
}> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('torrents', 'readonly');
      const req = tx.objectStore('torrents').get(infoHash);
      req.onsuccess = () => {
        const res = req.result as PersistedTorrentRecord | undefined;
        if (
          res &&
          Array.isArray(res.bitfield) &&
          res.bitfield.length === totalPieces
        ) {
          resolve({
            bitfield: new Uint8Array(res.bitfield),
            slots:
              Array.isArray(res.slots) && res.slots.length === totalPieces
                ? res.slots
                : new Array(totalPieces).fill(null),
            writtenBytes: Number(res.writtenBytes) || 0,
            nextDataOffset: Number(res.nextDataOffset) || 0,
            nextIdxOffset: Number(res.nextIdxOffset) || HEADER_LEN,
            exportedToDevice: Boolean(res.exportedToDevice),
          });
        } else {
          resolve({
            bitfield: new Uint8Array(totalPieces),
            slots: new Array(totalPieces).fill(null),
            writtenBytes: 0,
            nextDataOffset: 0,
            nextIdxOffset: HEADER_LEN,
            exportedToDevice: false,
          });
        }
      };
      req.onerror = () =>
        resolve({
          bitfield: new Uint8Array(totalPieces),
          slots: new Array(totalPieces).fill(null),
          writtenBytes: 0,
          nextDataOffset: 0,
          nextIdxOffset: HEADER_LEN,
          exportedToDevice: false,
        });
    });
  } catch {
    return {
      bitfield: new Uint8Array(totalPieces),
      slots: new Array(totalPieces).fill(null),
      writtenBytes: 0,
      nextDataOffset: 0,
      nextIdxOffset: HEADER_LEN,
      exportedToDevice: false,
    };
  }
}

async function getAllSavedRecords(): Promise<PersistedTorrentRecord[]> {
  try {
    const db = await openStateDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('torrents', 'readonly');
      const req = tx.objectStore('torrents').getAll();
      req.onsuccess = () =>
        resolve((req.result as PersistedTorrentRecord[]) || []);
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

async function readVerifiedPieceBytes(
  session: TorrentSessionHandle,
  pieceIndex: number,
): Promise<Uint8Array | null> {
  if (session.bitfield[pieceIndex] !== 1) return null;
  const slot = session.slots[pieceIndex];
  if (slot) {
    if (!slot.inIdb && session.dataAccess && slot.len > 0) {
      try {
        const buf = new Uint8Array(slot.len);
        session.dataAccess.read(buf, { at: slot.at });
        return buf;
      } catch {}
    }
    const idbChunk = await loadOverflowChunkFromIDB(
      session.infoHash,
      pieceIndex,
    );
    if (idbChunk) return idbChunk;
  }
  return await loadOverflowChunkFromIDB(session.infoHash, pieceIndex);
}

function closeSessionHandles(session?: TorrentSessionHandle): void {
  if (!session) return;
  if (session.dataAccess) {
    try {
      session.dataAccess.flush();
      session.dataAccess.close();
    } catch {}
    session.dataAccess = null;
  }
  if (session.idxAccess) {
    try {
      session.idxAccess.flush();
      session.idxAccess.close();
    } catch {}
    session.idxAccess = null;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { action, payload } = event.data || {};

  try {
    if (action === 'GET_QUOTA_AND_SAVED') {
      const estimate = await getStorageEstimateInfo();
      const savedRecords = await getAllSavedRecords();
      self.postMessage({
        type: 'QUOTA_AND_SAVED',
        quota: estimate,
        savedRecords,
      });
    } else if (action === 'INIT') {
      const {
        infoHash,
        fileName,
        size,
        pieceLen,
        totalPieces: explicitTotalPieces,
        isVariableSegments = false,
        pieceHashes,
        mediaSnapshot,
        releaseSnapshot,
      } = payload;

      const estimate = await getStorageEstimateInfo();
      const safeFreeOpfs =
        estimate.freeBytes > 0 ? Math.floor(estimate.freeBytes * 0.85) : size;
      const needsHybridExtended =
        estimate.freeBytes > 0 && size > safeFreeOpfs;
      const storageMode: DownloadStorageTargetMode = needsHybridExtended
        ? 'hybrid-extended'
        : 'opfs-cache';
      const opfsMaxByteLimit = needsHybridExtended
        ? Math.max(0, Math.floor(safeFreeOpfs / pieceLen) * pieceLen)
        : size;

      closeSessionHandles(sessions.get(infoHash));

      const totalPieces =
        explicitTotalPieces && explicitTotalPieces > 0
          ? explicitTotalPieces
          : Math.max(1, Math.ceil(size / Math.max(1, pieceLen)));

      const loaded = await loadSessionStateFromIDB(infoHash, totalPieces);
      const infoHashBytes = hexToBytes20(infoHash);

      const rootDir = await getOpfsRoot();
      let dirHandle: FileSystemDirectoryHandle | null = null;
      let dataHandle: FileSystemFileHandle | null = null;
      let idxHandle: FileSystemFileHandle | null = null;
      let dataAccess: any | null = null;
      let idxAccess: any | null = null;

      if (rootDir && opfsMaxByteLimit > 0) {
        try {
          const swarmRoot = await rootDir.getDirectoryHandle(
            'torrentplayer-swarm',
            { create: true },
          );
          dirHandle = await swarmRoot.getDirectoryHandle(infoHash, {
            create: true,
          });
          dataHandle = await dirHandle.getFileHandle('pieces.dat', {
            create: true,
          });
          idxHandle = await dirHandle.getFileHandle('pieces.idx', {
            create: true,
          });

          if (typeof (dataHandle as any).createSyncAccessHandle === 'function') {
            dataAccess = await (dataHandle as any).createSyncAccessHandle();
            idxAccess = await (idxHandle as any).createSyncAccessHandle();

            const expectedHdr = buildTpPiecesHeader(totalPieces, infoHashBytes);
            if (idxAccess.getSize() < HEADER_LEN || loaded.writtenBytes === 0) {
              idxAccess.truncate(0);
              idxAccess.write(expectedHdr, { at: 0 });
              idxAccess.flush();
              dataAccess.truncate(0);
              dataAccess.flush();
              loaded.nextDataOffset = 0;
              loaded.nextIdxOffset = HEADER_LEN;
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
        originalFileName: fileName || 'movie.mp4',
        totalSize: size,
        pieceLength: pieceLen,
        totalPieces,
        opfsMaxByteLimit,
        storageMode,
        isVariableSegments: Boolean(isVariableSegments),
        writtenBytes: loaded.writtenBytes,
        nextDataOffset: loaded.nextDataOffset,
        nextIdxOffset: loaded.nextIdxOffset,
        expectedHashes: Array.isArray(pieceHashes) ? pieceHashes : [],
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

      const completedCount = session.bitfield.reduce((acc, v) => acc + v, 0);
      const updatedEstimate = await getStorageEstimateInfo();

      self.postMessage({
        type: 'INIT_READY',
        infoHash,
        storageMode,
        bitfield: Array.from(session.bitfield),
        completedPieces: completedCount,
        totalPieces,
        writtenBytes: session.writtenBytes,
        exportedToDevice: loaded.exportedToDevice,
        quota: updatedEstimate,
      });
    } else if (action === 'WRITE_PIECE') {
      const { infoHash, pieceIndex, buffer, expectedHash } = payload;
      const session = sessions.get(infoHash);
      if (!session) return;

      if (session.bitfield[pieceIndex] === 1) {
        const done = session.bitfield.reduce((acc, v) => acc + v, 0);
        self.postMessage({
          type: 'PIECE_VERIFIED',
          infoHash,
          pieceIndex,
          skipped: true,
          pieceByteLength: 0,
          writtenBytes: session.writtenBytes,
          completedPieces: done,
          totalPieces: session.totalPieces,
          progress: Number(((done / session.totalPieces) * 100).toFixed(2)),
        });
        return;
      }

      const digestBuffer = await crypto.subtle.digest('SHA-1', buffer);
      const actualHex = bufferToHex(digestBuffer);
      const targetHash = expectedHash || session.expectedHashes[pieceIndex];

      if (targetHash && actualHex !== targetHash.toLowerCase()) {
        self.postMessage({
          type: 'PIECE_CORRUPT',
          infoHash,
          pieceIndex,
          reason: 'فشل تطابق بصمة SHA-1 للقطعة — سيتم إعادة طلبها تلقائياً',
        });
        return;
      }

      const view = new Uint8Array(buffer);
      const appendAt = session.nextDataOffset;
      const fitsInOpfs =
        session.dataAccess &&
        session.opfsMaxByteLimit > 0 &&
        appendAt + view.byteLength <= session.opfsMaxByteLimit;

      let storedInIdb = false;

      if (fitsInOpfs && session.dataAccess) {
        try {
          session.dataAccess.write(view, { at: appendAt });
          session.nextDataOffset += view.byteLength;

          if (session.idxAccess) {
            const rec = await buildTpPiecesRecord(
              session.infoHashBytes,
              pieceIndex,
              view.byteLength,
              appendAt,
            );
            session.idxAccess.write(rec, { at: session.nextIdxOffset });
            session.nextIdxOffset += RECORD_LEN;
          }
        } catch {
          storedInIdb = true;
          await saveOverflowChunkToIDB(infoHash, pieceIndex, view);
        }
      } else {
        storedInIdb = true;
        await saveOverflowChunkToIDB(infoHash, pieceIndex, view);
      }

      session.slots[pieceIndex] = {
        at: storedInIdb ? 0 : appendAt,
        len: view.byteLength,
        inIdb: storedInIdb,
        verified: true,
      };
      session.bitfield[pieceIndex] = 1;
      session.writtenBytes += view.byteLength;

      const done = session.bitfield.reduce((acc, v) => acc + v, 0);
      const total = session.totalPieces;
      if (done % 8 === 0 || done === total) {
        try {
          session.dataAccess?.flush();
          session.idxAccess?.flush();
        } catch {}
        await saveSessionStateToIDB(session, false);
      }

      notifyWaiters(infoHash);

      const progress = Number(((done / total) * 100).toFixed(2));
      self.postMessage({
        type: 'PIECE_VERIFIED',
        infoHash,
        pieceIndex,
        sha1: actualHex,
        pieceByteLength: view.byteLength,
        writtenBytes: session.writtenBytes,
        completedPieces: done,
        totalPieces: total,
        progress,
      });
    } else if (action === 'READ_PIECE_BUFFER') {
      const { infoHash, pieceIndex, requestId } = payload;
      const session = sessions.get(infoHash);
      if (!session || session.bitfield[pieceIndex] !== 1) {
        self.postMessage({
          type: 'PIECE_BUFFER_RESULT',
          requestId,
          infoHash,
          pieceIndex,
          found: false,
        });
        return;
      }

      const outBuf = await readVerifiedPieceBytes(session, pieceIndex);
      if (outBuf) {
        const copy = outBuf.slice();
        (self as any).postMessage(
          {
            type: 'PIECE_BUFFER_RESULT',
            requestId,
            infoHash,
            pieceIndex,
            found: true,
            buffer: copy.buffer,
          },
          [copy.buffer],
        );
      } else {
        self.postMessage({
          type: 'PIECE_BUFFER_RESULT',
          requestId,
          infoHash,
          pieceIndex,
          found: false,
        });
      }
    } else if (action === 'OPEN_BYTE_RANGE' && event.ports[0]) {
      const port = event.ports[0];
      const { infoHash, start, end } = payload;
      const session = sessions.get(infoHash);
      if (!session) {
        port.postMessage({ type: 'ERROR', message: 'Session not initialized' });
        port.close();
        return;
      }

      let aborted = false;
      port.onmessage = (ctrl) => {
        if (ctrl.data?.type === 'ABORT_RANGE') {
          aborted = true;
          notifyWaiters(infoHash);
        }
      };

      (async () => {
        const safeEnd = Math.min(
          session.totalSize - 1,
          Number(end) || session.totalSize - 1,
        );
        let pos = Math.max(0, Number(start) || 0);

        try {
          while (pos <= safeEnd && !aborted) {
            const pieceIdx = Math.min(
              session.totalPieces - 1,
              Math.floor(pos / session.pieceLength),
            );

            while (session.bitfield[pieceIdx] !== 1 && !aborted) {
              await new Promise<void>((resolve) => {
                let set = pieceWaiters.get(infoHash);
                if (!set) {
                  set = new Set();
                  pieceWaiters.set(infoHash, set);
                }
                set.add(resolve);
              });
            }
            if (aborted) break;

            const pieceBytes = await readVerifiedPieceBytes(session, pieceIdx);
            if (!pieceBytes) {
              throw new Error(`Piece ${pieceIdx} unavailable in store`);
            }

            const pieceStartByte = pieceIdx * session.pieceLength;
            const offsetInPiece = Math.max(0, pos - pieceStartByte);
            const availableInPiece = Math.max(
              0,
              pieceBytes.byteLength - offsetInPiece,
            );
            if (availableInPiece <= 0) break;

            const toSend = Math.min(
              availableInPiece,
              safeEnd - pos + 1,
              STREAM_CHUNK,
            );
            const slice = pieceBytes.slice(
              offsetInPiece,
              offsetInPiece + toSend,
            );
            pos += toSend;

            port.postMessage(
              { type: 'CHUNK', buffer: slice.buffer },
              [slice.buffer],
            );
          }
          if (!aborted) {
            port.postMessage({ type: 'EOF' });
          }
        } catch (err: any) {
          if (!aborted) {
            port.postMessage({
              type: 'ERROR',
              message: err?.message || 'Range stream interrupted',
            });
          }
        } finally {
          port.close();
        }
      })();
    } else if (action === 'PAUSE_SESSION') {
      const { infoHash } = payload;
      const session = sessions.get(infoHash);
      if (session) {
        try {
          session.dataAccess?.flush();
          session.idxAccess?.flush();
        } catch {}
        await saveSessionStateToIDB(session, false);
      }
      self.postMessage({
        type: 'SESSION_PAUSED',
        infoHash,
      });
    } else if (action === 'FINALIZE_AND_EXPORT') {
      const { infoHash, writableStream } = payload;
      const session = sessions.get(infoHash);
      if (!session) {
        throw new Error('لم يتم العثور على جلسة التحميل في الكاش القرصي');
      }

      try {
        session.dataAccess?.flush();
        session.idxAccess?.flush();
      } catch {}

      if (writableStream && typeof writableStream.write === 'function') {
        let totalMerged = 0;
        for (let i = 0; i < session.totalPieces; i++) {
          const pieceBytes = await readVerifiedPieceBytes(session, i);
          if (!pieceBytes) continue;
          for (let off = 0; off < pieceBytes.byteLength; off += STREAM_CHUNK) {
            const slice = pieceBytes.subarray(
              off,
              Math.min(pieceBytes.byteLength, off + STREAM_CHUNK),
            );
            await writableStream.write(slice);
            totalMerged += slice.byteLength;
          }
        }
        await writableStream.close();
        await saveSessionStateToIDB(session, true);
        const estimate = await getStorageEstimateInfo();
        self.postMessage({
          type: 'EXPORT_READY',
          infoHash,
          fileName: session.originalFileName,
          file: null,
          savedDirectlyToDisk: true,
          actualSizeBytes: totalMerged,
          quota: estimate,
        });
        return;
      }

      let mergedFile: File | null = null;
      if (session.dirHandle) {
        try {
          const outHandle = await session.dirHandle.getFileHandle(
            session.originalFileName,
            { create: true },
          );
          if (typeof (outHandle as any).createSyncAccessHandle === 'function') {
            const outAccess = await (outHandle as any).createSyncAccessHandle();
            outAccess.truncate(0);
            let writePos = 0;
            for (let i = 0; i < session.totalPieces; i++) {
              const pieceBytes = await readVerifiedPieceBytes(session, i);
              if (!pieceBytes) continue;
              outAccess.write(pieceBytes, { at: writePos });
              writePos += pieceBytes.byteLength;
            }
            outAccess.flush();
            outAccess.close();
            mergedFile = await outHandle.getFile();
          }
        } catch {
          mergedFile = null;
        }
      }

      if (!mergedFile) {
        const parts: BlobPart[] = [];
        for (let i = 0; i < session.totalPieces; i++) {
          const pieceBytes = await readVerifiedPieceBytes(session, i);
          if (pieceBytes) {
            parts.push(pieceBytes.slice() as unknown as BlobPart);
          }
        }
        const mimeType = session.originalFileName.endsWith('.ts')
          ? 'video/mp2t'
          : 'video/mp4';
        mergedFile = new File(parts, session.originalFileName, {
          type: mimeType,
        });
      }

      await saveSessionStateToIDB(session, true);
      const estimate = await getStorageEstimateInfo();

      self.postMessage({
        type: 'EXPORT_READY',
        infoHash,
        fileName: session.originalFileName,
        file: mergedFile,
        actualSizeBytes: mergedFile.size,
        quota: estimate,
      });
    } else if (action === 'CLEANUP_CACHE') {
      const { infoHash } = payload;
      const session = sessions.get(infoHash);
      closeSessionHandles(session);
      sessions.delete(infoHash);
      notifyWaiters(infoHash);

      const rootDir = await getOpfsRoot();
      if (rootDir) {
        try {
          const swarmRoot = await rootDir.getDirectoryHandle(
            'torrentplayer-swarm',
            { create: false },
          );
          await swarmRoot.removeEntry(infoHash, { recursive: true });
        } catch {}
      }

      await deleteOverflowChunksForHash(infoHash);
      await deleteSavedRecord(infoHash);
      const estimate = await getStorageEstimateInfo();

      self.postMessage({
        type: 'CACHE_CLEARED',
        infoHash,
        quota: estimate,
      });
    }
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      infoHash: payload?.infoHash,
      message: err?.message || 'حدث خطأ في مخزن القطع القرصي TPPIECES OPFS',
    });
  }
};
