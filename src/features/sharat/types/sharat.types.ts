export type SharatArtistGroupId =
  | 'all'
  | 'top_classics'
  | 'rasha'
  | 'tarek'
  | 'hala'
  | 'aida'
  | 'sonia'
  | 'sammy'
  | 'assem'
  | 'bessam'
  | 'samir'
  | 'tala_mohammed'
  | 'zaman_jamil'
  | 'mbc3_cn_nick';

export interface SharatTrack {
  id: string;
  titleAr: string;
  seriesAr: string;
  artistAr: string;
  artistGroupId: SharatArtistGroupId;
  channelAr: string;
  planetAr: string;
  year: number;
  posterUrl: string;
  /** Verified direct Archive.org MP4/MP3 stream URL */
  archiveUrl: string;
  /** Primary verified YouTube video ID for the exact Arabic opening */
  youtubeId: string;
  /** Backup YouTube video ID if primary is restricted */
  backupYoutubeId?: string;
  /** Direct permanent download URL */
  downloadUrl: string;
  /** Lower rank = pinned higher at the top of the Sharat page (1..25 = Top Iconic Classics) */
  priorityRank?: number;
  /** True ONLY if archiveUrl points to an exact verified stream for this specific track */
  hasExactArchiveStream?: boolean;
  malId?: number;
  tmdbId?: number;
}

