/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download & Progressive Torrent Streaming Types
 */

import type { Media } from '../../components/Movies/moviesDataClient';

export type DownloadQualityTier = '2160p' | '1080p' | '720p' | '480p';

export type DownloadSourceKind =
  | 'torrent-hybrid'
  | 'direct-mp4'
  | 'direct-hls';

export interface DownloadMediaContext {
  id: number;
  tmdbId: number;
  imdbId?: string;
  mediaType: Media;
  title: string;
  originalTitle?: string;
  year?: string;
  posterUrl: string;
  backdropUrl?: string;
  rating?: number;
  runtimeMinutes?: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

export interface ParsedReleaseMetadata {
  rawTitle: string;
  cleanTitle: string;
  year?: number;
  season?: number;
  episode?: number;
  type: 'movie' | 'episode';
  screenSize: DownloadQualityTier;
  source: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: string;
  colorDepth: string[];
  releaseGroup: string;
  container?: string;
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
  securityNotes: string[];
  parsedMeta: ParsedReleaseMetadata;
  isRealSource?: boolean;
}

export type DownloadTaskLifecycleStatus =
  | 'initializing'
  | 'downloading'
  | 'paused'
  | 'exporting'
  | 'completed'
  | 'error';

export type DownloadStorageTargetMode =
  | 'opfs-cache'
  | 'hybrid-extended'
  | 'direct-disk';

export type SlidingWindowPriorityPhase =
  | 'header-tail'
  | 'seek-window'
  | 'playhead-window'
  | 'sequential';

export type PieceMapBucketKind =
  | 'empty'
  | 'header-tail'
  | 'playhead-window'
  | 'verified';

export interface DownloadTaskState {
  taskId: string;
  infoHash: string;
  media: DownloadMediaContext;
  release: DiscoveredReleaseOption;
  status: DownloadTaskLifecycleStatus;
  storageMode: DownloadStorageTargetMode;
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
  // Progressive Torrent Streaming & Sliding-Window Seeking State
  isStreamingActive?: boolean;
  streamUrl?: string;
  headerAndTailReady?: boolean;
  playheadPieceIndex?: number;
  activeDownloadingPieceIndex?: number;
  priorityPhase?: SlidingWindowPriorityPhase;
  pieceMapBuckets?: PieceMapBucketKind[];
}

export interface BrowserStorageQuotaInfo {
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

export interface CinemaDownloadSnapshot {
  isModalOpen: boolean;
  activeMedia: DownloadMediaContext | null;
  isDiscovering: boolean;
  discoveredReleases: DiscoveredReleaseOption[];
  discoveryError: string | null;
  selectedQualityFilter: DownloadQualityTier | 'all';
  activeTab: 'discover' | 'tasks';
  activeStreamingTaskHash: string | null;
  quota: BrowserStorageQuotaInfo;
  tasks: Record<string, DownloadTaskState>;
  activeTaskIds: string[];
  liveTrackersCount: number;
}
