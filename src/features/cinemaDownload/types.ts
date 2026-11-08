/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download System — Type Definitions (OPFS + Direct Disk + Real WebTorrent / HLS Assembler)
 */

export type DownloadMediaType = 'movie' | 'tv';

export type DownloadQualityTier = '2160p' | '1080p' | '720p' | '480p';

export type DownloadSourceKind =
  | 'torrent-hybrid'
  | 'webrtc-p2p'
  | 'direct-mp4'
  | 'direct-hls';

export type DownloadStorageTargetMode = 'opfs-cache' | 'direct-disk';

export interface DownloadMediaContext {
  id: number;
  tmdbId: number;
  imdbId?: string;
  mediaType: DownloadMediaType;
  title: string;
  originalTitle?: string;
  year?: string;
  posterUrl: string;
  backdropUrl?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  runtimeMinutes?: number;
  rating?: number;
}

export interface ParsedReleaseMetadata {
  rawTitle: string;
  cleanTitle: string;
  year?: number;
  type: 'movie' | 'episode';
  season?: number;
  episode?: number;
  episodeTitle?: string;
  screenSize: DownloadQualityTier;
  source: string;
  videoCodec: string;
  colorDepth: string[];
  audioCodec: string;
  audioChannels: string;
  releaseGroup: string;
}

export interface DiscoveredReleaseOption {
  id: string;
  title: string;
  cleanFileName: string;
  quality: DownloadQualityTier;
  sourceKind: DownloadSourceKind;
  sizeBytes: number;
  sizeFormatted: string;
  seeders: number;
  leechers: number;
  infoHash: string;
  magnetUri: string;
  torrentCacheUrls: string[];
  directStreamUrl?: string;
  streamReferer?: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: string;
  hdrBadges: string[];
  sourceLabel: string;
  releaseGroup: string;
  pieceLength: number;
  totalPieces: number;
  verifiedSafe: boolean;
  isRealSource: boolean;
  securityNotes: string[];
  parsedMeta: ParsedReleaseMetadata;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  freeBytes: number;
  usageMB: number;
  quotaMB: number;
  freeGB: number;
  persisted: boolean;
  opfsSupported: boolean;
  directDiskSupported: boolean;
}

export type DownloadTaskStatus =
  | 'initializing'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'exporting'
  | 'completed'
  | 'error';

export interface DownloadTaskState {
  taskId: string;
  infoHash: string;
  media: DownloadMediaContext;
  release: DiscoveredReleaseOption;
  storageMode: DownloadStorageTargetMode;
  status: DownloadTaskStatus;
  progressPct: number;
  completedPieces: number;
  totalPieces: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  verifiedPiecesCount: number;
  corruptPiecesRetried: number;
  activePeers: number;
  exportedToDevice: boolean;
  cacheCleared: boolean;
  statusMessage: string;
  errorMessage?: string;
  startedAt: number;
  updatedAt: number;
}

export interface CinemaDownloadSnapshot {
  isModalOpen: boolean;
  activeMedia: DownloadMediaContext | null;
  isDiscovering: boolean;
  discoveredReleases: DiscoveredReleaseOption[];
  discoveryError: string | null;
  selectedQualityFilter: DownloadQualityTier | 'all';
  activeTab: 'discover' | 'tasks';
  quota: StorageQuotaInfo;
  tasks: Record<string, DownloadTaskState>;
  activeTaskIds: string[];
  liveTrackersCount: number;
}
