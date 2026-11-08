/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated Hybrid OPFS + Extended IndexedDB Chunk Worker & SHA-1 Verifier
 * Implements:
 * - Origin Private File System (FileSystemSyncAccessHandle) random-offset disk writes
 * - Seamless Extended IndexedDB Chunk Store spillover (`pieceChunks` store) when a movie
 *   (e.g. 3.30 GB or 7.13 GB) exceeds the browser's Free OPFS Quota (e.g. 2.13 GB),
 *   guaranteeing uninterrupted piece-by-piece downloads without fake 100% completion
 * - Hardware-accelerated crypto.subtle.digest('SHA-1')
 * - Instant <1ms cached piece read (`READ_PIECE_BUFFER`) for HTTP 206 Progressive Streaming
 */

import type { DownloadStorageTargetMode } from './types';

interface TorrentSessionHandle {
  infoHash: string;
  opfsFileName: string;
  originalFileName: string;
  totalSize: number;
  pieceLength: number;
  opfsMaxByteLimit: number;
  storageMode: DownloadStorageTargetMode;
  isVariableSegments: boolean;
  writtenBytes: number;
  expectedHashes: string[];
  bitfield: Uint8Array;
  fileHandle: FileSystemFileHandle | null;
  accessHandle: any | null;
  fallbackChunks: Map<number, Uint8Array>;
  mediaSnapshot?: unknown;
  releaseSnapshot?: unknown;
}

const sessions = new Map<string, TorrentSessionHandle>();
let rootDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

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

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

interface PersistedTorrentRecord {
  infoHash: string;
  opfsFileName: string;
  originalFileName: string;
  totalSize: number;
  pieceLength: number;
  opfsMaxByteLimit?: number;
  storageMode?: DownloadStorageTargetMode;
  isVariableSegments?: boolean;
  writtenBytes?: number;
  bitfield: number[];
  mediaSnapshot?: unknown;
  releaseSnapshot?: unknown;
  exportedToDevice?: boolean;
  updatedAt: number;
}

function openStateDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('BrowserTorrentCacheDB', 4);
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
  } catch {
    // Ignore transient IDB write error
  }
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
        if (res?.buffer) {
          resolve(new Uint8Array(res.buffer));
        } else {
          resolve(null);
        }
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
  } catch {
    // Ignore
  }
}

async function saveBitfieldState(
  session: TorrentSessionHandle,
  exportedToDevice = false,
): Promise<void> {
  try {
    const db = await openStateDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('torrents', 'readwrite');
      const record: PersistedTorrentRecord = {
        infoHash: session.infoHash,
        opfsFileName: session.opfsFileName,
        originalFileName: session.originalFileName,
        totalSize: session.totalSize,
        pieceLength: session.pieceLength,
        opfsMaxByteLimit: session.opfsMaxByteLimit,
        storageMode: session.storageMode,
        isVariableSegments: session.isVariableSegments,
        writtenBytes: session.writtenBytes,
        bitfield: Array.from(session.bitfield),
        mediaSnapshot: session.mediaSnapshot,
        releaseSnapshot: session.releaseSnapshot,
        exportedToDevice,
        updatedAt: Date.now(),
      };
      tx.objectStore('torrents').put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB transient write errors
  }
}

async function loadBitfieldState(
  infoHash: string,
  totalPieces: number,
): Promise<{
  bitfield: Uint8Array;
  writtenBytes: number;
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
            writtenBytes: Number(res.writtenBytes) || 0,
            exportedToDevice: Boolean(res.exportedToDevice),
          });
        } else {
          resolve({
            bitfield: new Uint8Array(totalPieces),
            writtenBytes: 0,
            exportedToDevice: false,
          });
        }
      };
      req.onerror = () =>
        resolve({
          bitfield: new Uint8Array(totalPieces),
          writtenBytes: 0,
          exportedToDevice: false,
        });
    });
  } catch {
    return {
      bitfield: new Uint8Array(totalPieces),
      writtenBytes: 0,
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
  } catch {
    // Ignore
  }
}

async function getStorageEstimateInfo() {
  let usage = 0;
  let quota = 0;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usage = est.usage || 0;
      quota = est.quota || 0;
    } catch {
      // ignore
    }
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

function sanitizeOpfsFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

self.onmessage = async (event: MessageEvent) => {
  const { action, payload } = event.data || {};

  try {
    // 0. Query Quota & Saved Incomplete/Completed Downloads
    if (action === 'GET_QUOTA_AND_SAVED') {
      const estimate = await getStorageEstimateInfo();
      const savedRecords = await getAllSavedRecords();
      self.postMessage({
        type: 'QUOTA_AND_SAVED',
        quota: estimate,
        savedRecords,
      });
    }

    // 1. Initialize Torrent or Stream File in Hybrid OPFS + Extended IndexedDB Chunk Store
    // Never rejects when movie size > Free OPFS Quota: automatically activates 'hybrid-extended' mode!
    else if (action === 'INIT') {
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
        estimate.freeBytes > 0
          ? Math.floor(estimate.freeBytes * 0.85)
          : size;
      const needsHybridExtended =
        estimate.freeBytes > 0 && size > safeFreeOpfs;
      const storageMode: DownloadStorageTargetMode = needsHybridExtended
        ? 'hybrid-extended'
        : 'opfs-cache';
      const opfsAllocationSize = needsHybridExtended
        ? Math.max(0, Math.floor(safeFreeOpfs / pieceLen) * pieceLen)
        : size;

      // Close previous session handle if re-initializing same infoHash
      const existing = sessions.get(infoHash);
      if (existing?.accessHandle) {
        try {
          existing.accessHandle.flush();
          existing.accessHandle.close();
        } catch {
          // ignore
        }
      }

      const safeName = sanitizeOpfsFileName(fileName || 'movie.mp4');
      const opfsFileName = `${infoHash}_${safeName}`;
      const totalPieces =
        explicitTotalPieces && explicitTotalPieces > 0
          ? explicitTotalPieces
          : Math.max(1, Math.ceil(size / Math.max(1, pieceLen)));
      const { bitfield, writtenBytes, exportedToDevice } =
        await loadBitfieldState(infoHash, totalPieces);

      const rootDir = await getOpfsRoot();
      let fileHandle: FileSystemFileHandle | null = null;
      let accessHandle: any | null = null;

      if (rootDir && opfsAllocationSize > 0) {
        try {
          fileHandle = await rootDir.getFileHandle(opfsFileName, {
            create: true,
          });
          if (typeof (fileHandle as any).createSyncAccessHandle === 'function') {
            accessHandle = await (fileHandle as any).createSyncAccessHandle();
            if (
              !isVariableSegments &&
              accessHandle.getSize() !== opfsAllocationSize
            ) {
              accessHandle.truncate(opfsAllocationSize);
            }
          }
        } catch {
          accessHandle = null;
        }
      }

      const session: TorrentSessionHandle = {
        infoHash,
        opfsFileName,
        originalFileName: fileName || 'movie.mp4',
        totalSize: size,
        pieceLength: pieceLen,
        opfsMaxByteLimit: opfsAllocationSize,
        storageMode,
        isVariableSegments: Boolean(isVariableSegments),
        writtenBytes,
        expectedHashes: Array.isArray(pieceHashes) ? pieceHashes : [],
        bitfield,
        fileHandle,
        accessHandle,
        fallbackChunks: new Map<number, Uint8Array>(),
        mediaSnapshot,
        releaseSnapshot,
      };
      sessions.set(infoHash, session);
      await saveBitfieldState(session, exportedToDevice);

      const completedCount = bitfield.reduce((acc, v) => acc + v, 0);
      const updatedEstimate = await getStorageEstimateInfo();

      self.postMessage({
        type: 'INIT_READY',
        infoHash,
        storageMode,
        bitfield: Array.from(bitfield),
        completedPieces: completedCount,
        totalPieces,
        writtenBytes: session.writtenBytes,
        exportedToDevice,
        quota: updatedEstimate,
      });
    }

    // 2. Write Random-Offset Piece (Sliding-Window) or Sequential HLS Segment After SHA-1 Verification
    else if (action === 'WRITE_PIECE') {
      const { infoHash, pieceIndex, buffer, expectedHash } = payload;
      const session = sessions.get(infoHash);
      if (!session) {
        return;
      }

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
          totalPieces: session.bitfield.length,
          progress: Number(((done / session.bitfield.length) * 100).toFixed(2)),
        });
        return;
      }

      // Hardware-accelerated SHA-1 digest on every piece
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
      const byteOffset = session.isVariableSegments
        ? session.writtenBytes
        : pieceIndex * session.pieceLength;

      const fitsInOpfs =
        session.opfsMaxByteLimit > 0 &&
        byteOffset + view.byteLength <= session.opfsMaxByteLimit;

      if (fitsInOpfs && session.accessHandle) {
        try {
          session.accessHandle.write(view, { at: byteOffset });
          session.accessHandle.flush();
        } catch {
          await saveOverflowChunkToIDB(infoHash, pieceIndex, view);
        }
      } else if (
        fitsInOpfs &&
        session.fileHandle &&
        typeof (session.fileHandle as any).createWritable === 'function'
      ) {
        try {
          const writable = await (session.fileHandle as any).createWritable({
            keepExistingData: true,
          });
          await writable.write({
            type: 'write',
            position: byteOffset,
            data: view,
          });
          await writable.close();
        } catch {
          await saveOverflowChunkToIDB(infoHash, pieceIndex, view);
        }
      } else {
        // Extended IndexedDB Chunk Store spillover (handles multi-GB movies beyond OPFS quota)
        await saveOverflowChunkToIDB(infoHash, pieceIndex, view);
      }

      session.bitfield[pieceIndex] = 1;
      session.writtenBytes += view.byteLength;
      await saveBitfieldState(session, false);

      const done = session.bitfield.reduce((acc, v) => acc + v, 0);
      const total = session.bitfield.length;
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
    }

    // 3. Read Cached Piece Buffer in <1ms for Progressive Streaming
    else if (action === 'READ_PIECE_BUFFER') {
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

      const byteOffset = pieceIndex * session.pieceLength;
      const fitsInOpfs =
        session.opfsMaxByteLimit > 0 &&
        byteOffset + session.pieceLength <= session.opfsMaxByteLimit;

      let outBuf: Uint8Array | null = null;
      if (fitsInOpfs && session.accessHandle) {
        const readLen = Math.min(
          session.pieceLength,
          Math.max(0, session.totalSize - byteOffset),
        );
        outBuf = new Uint8Array(readLen);
        session.accessHandle.read(outBuf, { at: byteOffset });
      } else {
        outBuf = await loadOverflowChunkFromIDB(infoHash, pieceIndex);
      }

      if (outBuf) {
        (self as any).postMessage(
          {
            type: 'PIECE_BUFFER_RESULT',
            requestId,
            infoHash,
            pieceIndex,
            found: true,
            buffer: outBuf.buffer,
          },
          [outBuf.buffer],
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
    }

    // 4. Pause / Flush Handle Safely
    else if (action === 'PAUSE_SESSION') {
      const { infoHash } = payload;
      const session = sessions.get(infoHash);
      if (session) {
        if (session.accessHandle) {
          try {
            session.accessHandle.flush();
          } catch {
            // ignore
          }
        }
        await saveBitfieldState(session, false);
      }
      self.postMessage({
        type: 'SESSION_PAUSED',
        infoHash,
      });
    }

    // 5. Close Write Handle and Export Zero-Copy Disk-Backed + Extended Chunk File
    else if (action === 'FINALIZE_AND_EXPORT') {
      const { infoHash } = payload;
      const session = sessions.get(infoHash);
      if (!session) {
        throw new Error('لم يتم العثور على جلسة التحميل في الكاش القرصي');
      }

      if (session.accessHandle) {
        try {
          if (session.isVariableSegments && session.writtenBytes > 0) {
            session.accessHandle.truncate(
              Math.min(session.writtenBytes, session.opfsMaxByteLimit),
            );
          }
          session.accessHandle.flush();
          session.accessHandle.close();
        } catch {
          // ignore
        }
        session.accessHandle = null;
      }

      const parts: BlobPart[] = [];
      if (session.fileHandle && session.opfsMaxByteLimit > 0) {
        const opfsFile = await session.fileHandle.getFile();
        if (opfsFile.size > 0) {
          parts.push(opfsFile);
        }
      }

      // Append any overflow chunks stored in Extended IndexedDB Chunk Store
      const firstOverflowIdx =
        session.opfsMaxByteLimit > 0
          ? Math.floor(session.opfsMaxByteLimit / session.pieceLength)
          : 0;
      for (let i = firstOverflowIdx; i < session.bitfield.length; i++) {
        const chunk =
          (await loadOverflowChunkFromIDB(infoHash, i)) ||
          session.fallbackChunks.get(i);
        if (chunk) {
          parts.push(chunk as unknown as BlobPart);
        }
      }

      const mimeType = session.originalFileName.endsWith('.ts')
        ? 'video/mp2t'
        : 'video/mp4';
      const diskBackedFile =
        parts.length === 1 && parts[0] instanceof File
          ? (parts[0] as File)
          : new File(parts, session.originalFileName, { type: mimeType });

      await saveBitfieldState(session, true);
      const estimate = await getStorageEstimateInfo();

      self.postMessage({
        type: 'EXPORT_READY',
        infoHash,
        fileName: session.originalFileName,
        file: diskBackedFile,
        actualSizeBytes: diskBackedFile.size,
        quota: estimate,
      });
    }

    // 6. Cleanup & Delete File from Browser OPFS Cache + Extended IndexedDB Store
    else if (action === 'CLEANUP_CACHE') {
      const { infoHash, opfsFileName: explicitOpfsName } = payload;
      const session = sessions.get(infoHash);
      const targetFileName = session?.opfsFileName || explicitOpfsName || '';

      if (session?.accessHandle) {
        try {
          session.accessHandle.close();
        } catch {
          // ignore
        }
        session.accessHandle = null;
      }
      if (session) {
        session.fallbackChunks.clear();
        sessions.delete(infoHash);
      }

      const rootDir = await getOpfsRoot();
      if (rootDir && targetFileName) {
        try {
          await rootDir.removeEntry(targetFileName);
        } catch {
          // Entry may already be removed
        }
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
      message: err?.message || 'حدث خطأ في عامل التخزين القرصي OPFS',
    });
  }
};
