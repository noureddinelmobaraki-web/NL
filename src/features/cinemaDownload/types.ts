import type { SelectedFileGeometry } from './bencodeAndInputManager';

export type DownloadQualityTier = '2160p' | '1080p' | '720p' | '480p';

export type DownloadStorageTargetMode =
  | 'opfs-cache'
  | 'direct-disk'
  | 'hybrid-extended';

export type DownloadTaskStatus =
  | 'idle'
  | 'discovering'
  | 'initializing'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'exporting'
  | 'completed'
  | 'error';

export type ReleaseSourceKind =
  | 'torrent-hybrid'
  | 'direct-mp4'
  | 'direct-hls';

export type ActiveTransportMode =
  | 'webtorrent-bridge'
  | 'browser-webrtc-swarm'
  | 'webseed-range'
  | 'hls-assembler'
  | 'initializing';

export type CandidateTransportStage = 'bridge' | 'webseed' | 'webrtc' | 'hls-stream';
export type TransportStage = 'probing' | CandidateTransportStage | 'fallback-needed';
export type StageProbeOutcome = 'pending' | 'probing' | 'ok' | 'failed' | 'skipped';

export interface TransportAttemptLogEntry {
  at: number;
  stage: CandidateTransportStage;
  kind: 'probe' | 'piece';
  ok: boolean;
  detail: string;
  httpStatus?: number;
}

export interface TransportDiagnostics {
  stage: TransportStage;
  probingStage: CandidateTransportStage | null;
  committedStage: CandidateTransportStage | null;
  stageOutcomes: Record<CandidateTransportStage, StageProbeOutcome>;
  attemptInStage: number;
  maxAttemptsInStage: number;
  nextRetryAt: number | null;
  webrtcPeers: number;
  bridgePeers: number;
  httpSources: number;
  lastError: string | null;
  autoReprobeRound: number;
  geometrySwitchBlocked: boolean;
  log: TransportAttemptLogEntry[];
}

export interface TransportGeometry {
  sizeBytes: number;
  pieceLength: number;
  totalPieces: number;
  isVariableSegments: boolean;
  pieceHashesHex: string[];
  fileGeometry?: SelectedFileGeometry | null;
}

export interface ResolvedTransport {
  stage: CandidateTransportStage;
  mode: ActiveTransportMode;
  geometry: TransportGeometry;
  useBridgeBackend: boolean;
  directRangeUrl?: string;
  directRangeReferer?: string;
  hlsSegments?: string[];
  peers: number;
  httpSources: number;
}

export interface DownloadMediaContext {
  id: number;
  tmdbId: number;
  imdbId?: string;
  mediaType: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  year?: string;
  posterUrl: string;
  backdropUrl?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  runtimeMinutes?: string | number;
  rating?: number;
}

export interface ParsedSceneRelease {
  rawTitle: string;
  cleanTitle: string;
  year?: number;
  season?: number;
  episode?: number;
  screenSize: DownloadQualityTier;
  source: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: string;
  colorDepth: string[];
  releaseGroup: string;
  container: 'mp4' | 'mkv' | 'webm' | 'avi' | 'ts';
  type: 'movie' | 'episode';
  isSafe?: boolean;
  rejectionReason?: string;
}

export type ParsedReleaseMetadata = ParsedSceneRelease;

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
  geometry?: SelectedFileGeometry;
}

export interface DiscoveredReleaseOption {
  id: string;
  title: string;
  cleanFileName: string;
  quality: DownloadQualityTier;
  sourceKind: ReleaseSourceKind;
  sizeBytes: number;
  sizeFormatted: string;
  seeders: number;
  leechers: number;
  infoHash: string;
  magnetUri: string;
  torrentCacheUrls: string[];
  directTorrentUrl?: string;
  rawTorrentBase64?: string;
  selectedFileOffset?: number;
  selectedFileLength?: number;
  fileGeometry?: SelectedFileGeometry;
  webSeeds: string[];
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
  parsedMeta: ParsedSceneRelease;
  isRealSource: boolean;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  freeBytes: number;
  usageMB: number;
  quotaMB: number;
  freeGB: number;
  opfsSupported: boolean;
  directSaveSupported?: boolean;
  directDiskSupported?: boolean;
  persisted: boolean;
}

export type BrowserStorageQuotaInfo = StorageQuotaInfo;

export type PieceBucketState =
  | 'empty'
  | 'header-tail'
  | 'playhead-window'
  | 'verified';

export type PieceMapBucketKind = PieceBucketState;

export type SlidingWindowPriorityPhase =
  | 'header-tail'
  | 'seek-window'
  | 'deadline-window'
  | 'playhead-window'
  | 'sequential'
  | 'critical-phase';

export interface DownloadTaskState {
  taskId: string;
  infoHash: string;
  media: DownloadMediaContext;
  release: DiscoveredReleaseOption;
  status: DownloadTaskStatus;
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
  isStreamingActive: boolean;
  showPieceMap: boolean;
  streamUrl?: string;
  blobStreamUrl?: string;
  headerAndTailReady: boolean;
  playheadPieceIndex: number;
  activeDownloadingPieceIndex?: number;
  priorityPhase: SlidingWindowPriorityPhase;
  pieceMapBuckets?: PieceBucketState[];
  statusMessage: string;
  errorMessage?: string;
  diagnostics?: TransportDiagnostics;
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
  tasks: Record<string, DownloadTaskState>;
  activeStreamingTaskHash: string | null;
  quota: StorageQuotaInfo;
  liveTrackersCount: number;
  bridgeHealthy: boolean;
}
