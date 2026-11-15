/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type {
  ArchiveAudioTrack,
  ArchiveCatalogSearchResult,
  ArchiveDocumentFormats,
  ArchiveLuceneParams,
  ArchiveResolvedMetadata,
  ArchiveScrapeResult,
  ArchiveSearchDoc,
  ArchiveSubtitleTrack,
  ArchiveVideoVariant,
} from './archiveTypes';
import {
  applyBorrowLockGuard,
  buildArchiveAlbumZipUrl,
  buildArchiveBookEmbedUrl,
  buildArchiveDetailsUrl,
  buildArchiveDirectDownloadUrl,
  buildArchiveDownloadUrl,
  buildArchiveEmbedUrl,
  buildArchiveItemDetailsUrl,
  buildArchiveMetadataUrl,
  buildArchiveSpreadReaderUrl,
  buildArchiveThumbnailUrl,
  buildArchiveTorrentUrl,
  buildArchiveVideoEmbedUrl,
  buildRuntimeNodeUrl,
  encodeArchivePath,
} from './archiveUrlBuilder';

export * from './archiveTypes';
export * from './archiveUrlBuilder';

const metadataCache = new Map<string, ArchiveResolvedMetadata>();

function firstString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0].trim();
  return '';
}

function stripBaseExt(name: string): string {
  return name
    .replace(/\.ia\.mp4$/i, '')
    .replace(/\.(mp4|mkv|ogv|webm|avi|mov|srt|vtt)$/i, '')
    .replace(/\.[a-z]{2,3}$/i, '');
}

function normalizeSearchDoc(raw: Record<string, any>): ArchiveSearchDoc {
  const identifier = String(raw?.identifier || '').trim();
  const rawYear =
    raw?.year !== undefined && raw?.year !== null
      ? String(raw.year).slice(0, 4)
      : typeof raw?.date === 'string'
        ? raw.date.slice(0, 4)
        : undefined;
  return {
    identifier,
    title: firstString(raw?.title) || identifier,
    creator: firstString(raw?.creator) || undefined,
    year: rawYear,
    date: typeof raw?.date === 'string' ? raw.date : undefined,
    description: firstString(raw?.description) || undefined,
    mediatype: typeof raw?.mediatype === 'string' ? raw.mediatype : undefined,
    downloads: typeof raw?.downloads === 'number' ? raw.downloads : Number(raw?.downloads) || undefined,
    avg_rating: typeof raw?.avg_rating === 'number' ? raw.avg_rating : Number(raw?.avg_rating) || undefined,
    item_size: typeof raw?.item_size === 'number' ? raw.item_size : Number(raw?.item_size) || undefined,
    subject: raw?.subject,
    language: raw?.language,
    licenseurl: typeof raw?.licenseurl === 'string' ? raw.licenseurl : undefined,
  };
}

export async function resolveArchiveItemMetadata(
  identifier: string,
  titleOrSignal?: string | AbortSignal,
  maybeSignal?: AbortSignal,
): Promise<ArchiveResolvedMetadata | null> {
  const cleanId = identifier.trim();
  if (!cleanId) return null;
  const cached = metadataCache.get(cleanId);
  if (cached) return cached;

  const fallbackTitle = typeof titleOrSignal === 'string' ? titleOrSignal : undefined;
  const signal =
    titleOrSignal instanceof AbortSignal ? titleOrSignal : maybeSignal;

  try {
    const res = await fetch(buildArchiveMetadataUrl(cleanId), {
      signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const files: Array<Record<string, any>> = Array.isArray(data?.files) ? data.files : [];
    const meta: Record<string, any> = data?.metadata || {};
    const nodeHost: string | undefined = data?.d2 || data?.d1 || data?.server;
    const dir: string | undefined = data?.dir;

    const subtitleByBase = new Map<string, ArchiveSubtitleTrack[]>();
    for (const f of files) {
      const name = String(f?.name || '');
      if (!/\.(srt|vtt)$/i.test(name)) continue;
      const ext = name.toLowerCase().endsWith('.vtt') ? 'vtt' : 'srt';
      const base = stripBaseExt(name).toLowerCase();
      const langMatch = name.match(/\.([a-z]{2,3})\.(srt|vtt)$/i);
      const lang = langMatch?.[1]?.toLowerCase() || 'en';
      const list = subtitleByBase.get(base) || [];
      list.push({
        label: lang.toUpperCase(),
        lang,
        url: buildArchiveDownloadUrl(cleanId, name),
        format: ext,
      });
      subtitleByBase.set(base, list);
    }

    const originalsByBase = new Map<string, string>();
    for (const f of files) {
      const name = String(f?.name || '');
      if (/\.(mp4|mkv)$/i.test(name) && !/\.ia\.mp4$/i.test(name)) {
        originalsByBase.set(stripBaseExt(name).toLowerCase(), name);
      }
    }

    const videoCandidates = files.filter((f) => {
      const name = String(f?.name || '');
      return /\.(mp4|webm)$/i.test(name) && !name.includes('__ia_thumb');
    });

    const preferredByBase = new Map<string, Record<string, any>>();
    for (const f of videoCandidates) {
      const name = String(f.name || '');
      const base = stripBaseExt(name).toLowerCase();
      const existing = preferredByBase.get(base);
      if (!existing || /\.ia\.mp4$/i.test(name)) {
        preferredByBase.set(base, f);
      }
    }

    const videos: ArchiveVideoVariant[] = Array.from(preferredByBase.values()).map((f, idx) => {
      const name = String(f.name || '');
      const base = stripBaseExt(name).toLowerCase();
      const origName = originalsByBase.get(base) || name;
      const sizeBytes = Number(f.size) || 0;
      const sizeMegabytes =
        sizeBytes > 0 ? Number((sizeBytes / (1024 * 1024)).toFixed(1)) : undefined;
      const durationSec = Number(f.length) || undefined;
      const primaryNodeUrl = buildRuntimeNodeUrl(nodeHost, dir, cleanId, name);
      const permanentDownloadUrl = buildArchiveDownloadUrl(cleanId, name);
      const originalDownloadUrl = buildArchiveDownloadUrl(cleanId, origName);

      return {
        fileName: name,
        rawFileName: origName,
        title: String(
          f.title || stripBaseExt(name).split('/').pop() || fallbackTitle || `Part ${idx + 1}`,
        ),
        episodeNumber: idx + 1,
        partNumber: idx + 1,
        archiveIdentifier: cleanId,
        format: String(f.format || 'h.264 IA'),
        sizeBytes,
        sizeMegabytes,
        durationSec,
        durationSeconds: durationSec,
        primaryNodeUrl,
        directNodeUrl: primaryNodeUrl,
        permanentDownloadUrl,
        cdnStreamUrl: permanentDownloadUrl,
        originalDownloadUrl,
        downloadUrl: originalDownloadUrl,
        embedUrl: buildArchiveVideoEmbedUrl(cleanId, origName, false),
        torrentUrl: buildArchiveTorrentUrl(cleanId),
        subtitles: subtitleByBase.get(base) || [],
      };
    });

    const audioFiles = files.filter((f) => /\.(mp3|flac|ogg)$/i.test(String(f?.name || '')));
    const audioTracks: ArchiveAudioTrack[] = audioFiles.map((f, idx) => {
      const name = String(f.name || '');
      const durationSec = Number(f.length) || undefined;
      const streamUrl = buildRuntimeNodeUrl(nodeHost, dir, cleanId, name);
      const downloadUrl = buildArchiveDownloadUrl(cleanId, name);
      return {
        num: Number(f.track) || idx + 1,
        title: String(f.title || name.replace(/\.(mp3|flac|ogg)$/i, '')),
        fileName: name,
        format: String(f.format || 'VBR MP3'),
        durationSec,
        durationSeconds: durationSec,
        streamUrl,
        directNodeUrl: streamUrl,
        cdnStreamUrl: downloadUrl,
        downloadUrl,
      };
    });

    const findExt = (re: RegExp) => files.find((f) => re.test(String(f?.name || '')));
    const pdfFile = findExt(/\.pdf$/i);
    const epubFile = findExt(/\.epub$/i);
    const mobiFile = findExt(/\.mobi$/i);
    const txtFile = findExt(/_djvu\.txt$|\.txt$/i);
    const cbrFile = findExt(/\.cbr$/i);
    const cbzFile = findExt(/\.cbz$/i);
    const hasTwoPageSpread = files.some((f) =>
      /_(jp2|images)\.zip$|scandata\.xml$/i.test(String(f?.name || '')),
    );

    const cbrUrl = cbrFile ? buildArchiveDownloadUrl(cleanId, String(cbrFile.name)) : undefined;
    const cbzUrl = cbzFile ? buildArchiveDownloadUrl(cleanId, String(cbzFile.name)) : undefined;

    const documentFormats: ArchiveDocumentFormats = {
      embedSpreadUrl: hasTwoPageSpread
        ? buildArchiveSpreadReaderUrl(cleanId, 1)
        : pdfFile
          ? buildArchiveDownloadUrl(cleanId, String(pdfFile.name))
          : `https://archive.org/embed/${encodeURIComponent(cleanId)}`,
      hasTwoPageSpread,
      pdfUrl: pdfFile ? buildArchiveDownloadUrl(cleanId, String(pdfFile.name)) : undefined,
      epubUrl: epubFile ? buildArchiveDownloadUrl(cleanId, String(epubFile.name)) : undefined,
      mobiUrl: mobiFile ? buildArchiveDownloadUrl(cleanId, String(mobiFile.name)) : undefined,
      txtUrl: txtFile ? buildArchiveDownloadUrl(cleanId, String(txtFile.name)) : undefined,
      cbrUrl,
      cbzUrl,
      comicArchiveUrl: cbzUrl || cbrUrl,
      torrentUrl: buildArchiveTorrentUrl(cleanId),
    };

    const resolved: ArchiveResolvedMetadata = {
      identifier: cleanId,
      title: firstString(meta.title) || fallbackTitle || cleanId,
      creator: firstString(meta.creator) || undefined,
      year: firstString(meta.year || meta.date)?.slice(0, 4) || undefined,
      description: firstString(meta.description) || undefined,
      licenseUrl: firstString(meta.licenseurl) || undefined,
      usageRights: firstString(meta.rights || meta.possible_copyright_status) || undefined,
      detailsUrl: buildArchiveDetailsUrl(cleanId),
      metadataUrl: buildArchiveMetadataUrl(cleanId),
      thumbnailUrl: buildArchiveThumbnailUrl(cleanId),
      embedUrl: buildArchiveVideoEmbedUrl(cleanId),
      torrentUrl: buildArchiveTorrentUrl(cleanId),
      albumZipUrl: buildArchiveAlbumZipUrl(cleanId),
      videos,
      audioTracks,
      audios: audioTracks,
      documentFormats,
      texts: documentFormats,
    };

    metadataCache.set(cleanId, resolved);
    return resolved;
  } catch {
    return null;
  }
}

export async function searchArchiveCatalog(
  params: ArchiveLuceneParams,
): Promise<ArchiveCatalogSearchResult> {
  const {
    query,
    fields = [
      'identifier',
      'title',
      'creator',
      'year',
      'date',
      'description',
      'mediatype',
      'downloads',
      'avg_rating',
      'item_size',
      'licenseurl',
    ],
    sort = ['downloads desc'],
    rows = 28,
    page = 1,
    enforceBorrowGuard = false,
    excludeBorrowLocked = false,
    signal,
  } = params;

  const shouldGuard = enforceBorrowGuard || excludeBorrowLocked;
  const finalQuery = applyBorrowLockGuard(query, shouldGuard);
  const url = new URL('https://archive.org/advancedsearch.php');
  url.searchParams.set('q', finalQuery);
  for (const fl of fields) url.searchParams.append('fl[]', fl);
  const sortList = Array.isArray(sort) ? sort : [sort];
  for (const s of sortList) {
    if (s) url.searchParams.append('sort[]', s);
  }
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('page', String(Math.max(1, page)));
  url.searchParams.set('output', 'json');

  try {
    const res = await fetch(url.toString(), {
      signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!res.ok) return { docs: [], items: [], total: 0 };
    const data = await res.json();
    const rawDocs: Record<string, any>[] = Array.isArray(data?.response?.docs)
      ? data.response.docs
      : [];
    const docs = rawDocs
      .map(normalizeSearchDoc)
      .filter((d) => Boolean(d.identifier));
    const total = Number(data?.response?.numFound) || docs.length;
    return { docs, items: docs, total };
  } catch {
    return { docs: [], items: [], total: 0 };
  }
}

export async function searchArchiveLucene(
  params: ArchiveLuceneParams,
): Promise<ArchiveSearchDoc[]> {
  const res = await searchArchiveCatalog(params);
  return res.docs;
}

export async function scrapeArchiveCursor(
  query: string,
  cursor: string | null = null,
  fields = 'identifier,title,creator,year,downloads,item_size',
  count = 100,
  enforceBorrowGuard = false,
  signal?: AbortSignal,
): Promise<ArchiveScrapeResult> {
  const finalQuery = applyBorrowLockGuard(query, enforceBorrowGuard);
  const url = new URL('https://archive.org/services/search/v1/scrape');
  url.searchParams.set('q', finalQuery);
  url.searchParams.set('fields', fields);
  url.searchParams.set('count', String(Math.max(100, count)));
  if (cursor) url.searchParams.set('cursor', cursor);

  try {
    const res = await fetch(url.toString(), {
      signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!res.ok) return { items: [], cursor: null };
    const data = await res.json();
    const rawItems: Record<string, any>[] = Array.isArray(data?.items) ? data.items : [];
    const items = rawItems.map(normalizeSearchDoc).filter((d) => Boolean(d.identifier));
    return {
      items,
      cursor: typeof data?.cursor === 'string' ? data.cursor : null,
      total: typeof data?.total === 'number' ? data.total : undefined,
    };
  } catch {
    return { items: [], cursor: null };
  }
}

export {
  buildArchiveBookEmbedUrl,
  buildArchiveDirectDownloadUrl,
  buildArchiveEmbedUrl,
  buildArchiveItemDetailsUrl,
  encodeArchivePath,
};
