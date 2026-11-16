export interface SharatTrack {
  id: string;
  catalogNumber: number;
  seriesAr: string;
  titleAr: string;
  originalTitle: string;
  artistAr: string;
  youtubeId: string;
  animeThemesSlug?: string;
  animeThemesUrl?: string;
  malId?: number;
  tmdbId?: number;
  tmdbMediaType?: 'tv' | 'movie';
  archiveUrl?: string;
  archiveBundleId?: string;
  hasExactArchiveStream?: boolean;
  posterUrl: string;
  backdropUrl: string;
  backdropFallbackUrl: string;
  rawWebmUrl?: string;
  rawAudioOggUrl?: string;
}
