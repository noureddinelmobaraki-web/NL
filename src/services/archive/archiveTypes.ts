/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export interface ArchiveSubtitleTrack {
  readonly label: string;
  readonly lang: string;
  readonly url: string;
  readonly format: 'srt' | 'vtt';
}

export interface ArchiveVideoVariant {
  readonly fileName: string;
  readonly rawFileName: string;
  readonly title: string;
  readonly episodeNumber: number;
  readonly partNumber: number;
  readonly archiveIdentifier: string;
  readonly format: string;
  readonly sizeBytes: number;
  readonly sizeMegabytes?: number;
  readonly durationSec?: number;
  readonly durationSeconds?: number;
  readonly primaryNodeUrl: string;
  readonly directNodeUrl: string;
  readonly permanentDownloadUrl: string;
  readonly cdnStreamUrl: string;
  readonly originalDownloadUrl: string;
  readonly downloadUrl: string;
  readonly embedUrl: string;
  readonly torrentUrl: string;
  readonly subtitles: ArchiveSubtitleTrack[];
}

export interface ArchiveAudioTrack {
  readonly num: number;
  readonly title: string;
  readonly fileName: string;
  readonly format: string;
  readonly durationSec?: number;
  readonly durationSeconds?: number;
  readonly streamUrl: string;
  readonly directNodeUrl: string;
  readonly cdnStreamUrl: string;
  readonly downloadUrl: string;
}

export interface ArchiveDocumentFormats {
  readonly embedSpreadUrl: string;
  readonly hasTwoPageSpread: boolean;
  readonly pdfUrl?: string;
  readonly epubUrl?: string;
  readonly mobiUrl?: string;
  readonly txtUrl?: string;
  readonly cbrUrl?: string;
  readonly cbzUrl?: string;
  readonly comicArchiveUrl?: string;
  readonly torrentUrl: string;
}

export interface ArchiveResolvedMetadata {
  readonly identifier: string;
  readonly title: string;
  readonly creator?: string;
  readonly year?: string;
  readonly description?: string;
  readonly licenseUrl?: string;
  readonly usageRights?: string;
  readonly detailsUrl: string;
  readonly metadataUrl: string;
  readonly thumbnailUrl: string;
  readonly embedUrl: string;
  readonly torrentUrl: string;
  readonly albumZipUrl: string;
  readonly videos: ArchiveVideoVariant[];
  readonly audioTracks: ArchiveAudioTrack[];
  readonly audios: ArchiveAudioTrack[];
  readonly documentFormats: ArchiveDocumentFormats;
  readonly texts: ArchiveDocumentFormats;
}

export interface ArchiveSearchDoc {
  readonly identifier: string;
  readonly title: string;
  readonly creator?: string;
  readonly year?: string;
  readonly date?: string;
  readonly description?: string;
  readonly mediatype?: string;
  readonly downloads?: number;
  readonly avg_rating?: number;
  readonly item_size?: number;
  readonly subject?: string | string[];
  readonly language?: string | string[];
  readonly licenseurl?: string;
}

export interface ArchiveLuceneParams {
  readonly query: string;
  readonly fields?: string[];
  readonly sort?: string | string[];
  readonly rows?: number;
  readonly page?: number;
  readonly enforceBorrowGuard?: boolean;
  readonly excludeBorrowLocked?: boolean;
  readonly signal?: AbortSignal;
}

export interface ArchiveCatalogSearchResult {
  readonly docs: ArchiveSearchDoc[];
  readonly items: ArchiveSearchDoc[];
  readonly total: number;
}

export interface ArchiveScrapeResult {
  readonly items: ArchiveSearchDoc[];
  readonly cursor: string | null;
  readonly total?: number;
}
