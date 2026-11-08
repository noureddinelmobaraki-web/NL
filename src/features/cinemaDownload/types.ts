/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Isolated Cinema Download & Optional Progressive Torrent Streaming Types (Part 2)
 */

import type { Media } from '../../components/Movies/moviesDataClient';

export type DownloadQualityTier = '2160p' | '1080p' | '720p' | '480p';

export type DownloadSourceKind =
  | 'torrent-hybrid'
  | 'direct-mp4'
  | 'direct-hls';

export type ActiveTransportMode =
  | 'webtorrent-bridge'
  | 'browser-webrtc-swarm'
  | 'webseed-range'
  | 'hls-assembler'
  | 'initializing';

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

export interface TorrentFileEntry {
  index: number;
  path: string;
  offset: number;
  length: number;
}

export interface ParsedTorrentMetainfo {
  infoHashHex: string;
  infoHashBytes: Uint8Array;
  name: string;
  pieceLength: number;
  pieceCount: number;
  totalLength: number;
  pieceHashesHex: string[];
  files: TorrentFileEntry[];
  selectedFile: TorrentFileEntry;
  announceList: string[];
  webSeeds: string[];
  rawTorrentBase64: string;
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
  rawTorrentBase64?: string;
  selectedFileOffset?: number;
  selectedFileLength?: number;
  webSeeds?: string[];
  directStreamUrl?: string;
  streamReferer?: string;
  fallbackStreamUrl?: string;
  fallbackStreamType?: 'mp4' | 'hls';
  fallbackStreamReferer?: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: string;
  hdrBadges: string[];
  sourceLabel: string;
  releaseGroup: string;
  pieceLength: number;
  totalPieces: number;
  pieceHashesHex?: string[];
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
  | 'sequential'
  | 'header-tail'
  | 'critical-phase'
  | 'seek-window'
  | 'playhead-window';

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
  transportMode: ActiveTransportMode;
  progressPct: number;
  completedPieces: number;
  totalPieces: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  verifiedPiecesCount: number;
  corruptPiecesRetried: number;
  bannedPeersCount: number;
  activePeers: number;
  exportedToDevice: boolean;
  cacheCleared: boolean;
  statusMessage: string;
  errorMessage?: string;
  startedAt: number;
  updatedAt: number;
  // Strictly opt-in streaming & piece map visualization (OFF by default)
  isStreamingActive: boolean;
  showPieceMap: boolean;
  streamUrl?: string;
  blobStreamUrl?: string;
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
  bridgeServerAvailable: boolean;
}
