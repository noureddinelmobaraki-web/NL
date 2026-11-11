/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export type SpacetoonPlanetId =
  | 'all'
  | 'action'
  | 'adventure'
  | 'sports'
  | 'zomoroda'
  | 'comedy'
  | 'science'
  | 'history'
  | 'abjad'
  | 'bonbon'
  | 'movies'
  | 'songs'
  | 'global';

export type DubbingStudioTag =
  | 'مركز الزهرة'
  | 'سبيستون'
  | 'سبيس باور'
  | 'دبلجة أردنية / خليجية'
  | 'كرتون زمان (الثمانينات)'
  | 'أنيميشن عالمي';

export interface CartoonSeriesItem {
  id: string;
  titleAr: string;
  titleEn: string;
  planet: SpacetoonPlanetId;
  planetLabelAr: string;
  studio: DubbingStudioTag;
  year: number;
  rating: number;
  episodesCount: number;
  synopsisAr: string;
  posterUrl: string;
  backdropUrl: string;
  tmdbId?: number;
  malId?: number;
  imdbId?: string;
  mediaType: 'tv' | 'movie';
  archiveIds: string[];
  youtubePlaylistIds?: string[];
}

export interface CartoonEpisodeStream {
  episodeNumber: number;
  titleAr: string;
  rawFileName: string;
  archiveIdentifier: string;
  streamUrl: string;
  mirrorUrl?: string;
  downloadUrl: string;
  thumbnailUrl: string;
  sizeMegabytes?: number;
  durationSeconds?: number;
}

export type CartoonPlaySourceKind =
  | 'archive-primary'
  | 'archive-mirror'
  | 'youtube-playlist'
  | 'embed-server';

export interface CartoonPlayOption {
  id: string;
  label: string;
  kind: CartoonPlaySourceKind;
  url: string;
  downloadUrl?: string;
  sizeMegabytes?: number;
}
