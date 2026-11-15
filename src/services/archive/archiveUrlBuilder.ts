/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export const BORROW_LOCK_GUARD =
  'AND NOT collection:inlibrary AND NOT collection:printdisabled AND NOT access-restricted-item:true';

export function encodeArchivePath(fileName: string): string {
  return fileName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildArchiveDetailsUrl(id: string): string {
  return `https://archive.org/details/${encodeURIComponent(id)}`;
}

export const buildArchiveItemDetailsUrl = buildArchiveDetailsUrl;

export function buildArchiveMetadataUrl(id: string): string {
  return `https://archive.org/metadata/${encodeURIComponent(id)}`;
}

export function buildArchiveThumbnailUrl(id: string): string {
  return `https://archive.org/services/img/${encodeURIComponent(id)}`;
}

export function buildArchiveDownloadUrl(id: string, fileName: string): string {
  return `https://archive.org/download/${encodeURIComponent(id)}/${encodeArchivePath(fileName)}`;
}

export const buildArchiveDirectDownloadUrl = buildArchiveDownloadUrl;

export function buildArchiveTorrentUrl(id: string): string {
  const safe = encodeURIComponent(id);
  return `https://archive.org/download/${safe}/${safe}_archive.torrent`;
}

export function buildArchiveAlbumZipUrl(id: string, format = 'VBR MP3'): string {
  return `https://archive.org/compress/${encodeURIComponent(id)}/formats=${encodeURIComponent(format)}`;
}

export function buildArchiveVideoEmbedUrl(
  id: string,
  fileName?: string,
  playlist = true,
): string {
  const base = fileName
    ? `https://archive.org/embed/${encodeURIComponent(id)}/${encodeArchivePath(fileName)}`
    : `https://archive.org/embed/${encodeURIComponent(id)}`;
  return playlist
    ? `${base}?autoplay=1&playlist=1&list_height=150`
    : `${base}?autoplay=1`;
}

export function buildArchiveEmbedUrl(
  id: string,
  opts?: { playlist?: boolean; autoplay?: boolean; fileName?: string },
): string {
  const base = opts?.fileName
    ? `https://archive.org/embed/${encodeURIComponent(id)}/${encodeArchivePath(opts.fileName)}`
    : `https://archive.org/embed/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (opts?.autoplay !== false) params.set('autoplay', '1');
  if (opts?.playlist) {
    params.set('playlist', '1');
    params.set('list_height', '150');
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function buildArchiveSpreadReaderUrl(id: string, page = 1): string {
  return `https://archive.org/stream/${encodeURIComponent(id)}?ui=embed#mode/2up/page/${page}`;
}

export const buildArchiveBookEmbedUrl = buildArchiveSpreadReaderUrl;

export function buildRuntimeNodeUrl(
  d2OrD1: string | undefined,
  dir: string | undefined,
  id: string,
  fileName: string,
): string {
  if (d2OrD1 && dir) {
    const cleanDir = dir.startsWith('/') ? dir : `/${dir}`;
    return `https://${d2OrD1}${cleanDir}/${encodeArchivePath(fileName)}`;
  }
  return buildArchiveDownloadUrl(id, fileName);
}

export function applyBorrowLockGuard(query: string, enforce = false): string {
  if (!enforce) return query;
  if (query.includes('NOT collection:inlibrary')) return query;
  return `(${query}) ${BORROW_LOCK_GUARD}`;
}
