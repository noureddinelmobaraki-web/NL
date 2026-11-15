export type SharatArtistGroupId =
  | 'all'
  | 'rasha'
  | 'tarek'
  | 'hala'
  | 'aida'
  | 'sonia'
  | 'sammy'
  | 'assem'
  | 'bessam'
  | 'samir'
  | 'tala_mohammed';

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
}
