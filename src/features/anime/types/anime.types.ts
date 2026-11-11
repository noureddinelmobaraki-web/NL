/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export type AnimeAudioMode = 'sub' | 'dub';

export type AnimeCategoryFilter =
  | 'all'
  | 'trending'
  | 'seasonal'
  | 'top_rated'
  | 'movies'
  | 'arabic_dub';

export interface AnimeIdentifiers {
  malId?: number;
  anilistId?: number;
  kitsuId?: number;
  anidbId?: number;
  imdbId?: string;
  tmdbId?: number;
  tvdbId?: number;
  resolvedSeason?: number;
  episodeOffset?: number;
}

export interface AnimeNextAiring {
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface AnimeItem {
  id: string;
  malId?: number;
  anilistId?: number;
  kitsuId?: number;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  titleAr?: string;
  titleRomaji?: string;
  titleNative?: string;
  synopsis: string;
  synopsisAr?: string;
  posterUrl: string;
  bannerUrl: string;
  trailerYoutubeId?: string;
  score: number;
  episodesCount: number;
  status: 'AIRING' | 'FINISHED' | 'UPCOMING';
  format: 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL';
  year: number;
  season?: string;
  studios: string[];
  genres: string[];
  hasSub: boolean;
  hasDub: boolean;
  hasArabicDub?: boolean;
  nextAiring?: AnimeNextAiring | null;
}

export interface AnimeEpisodeInfo {
  number: number;
  title: string;
  titleAr?: string;
  overview?: string;
  image?: string;
  airDate?: string;
  durationMin?: number;
  isFiller?: boolean;
  seasonNumber?: number;
  imdbEpisodeNumber?: number;
}

export interface AnimeSkipWindow {
  type: 'op' | 'ed';
  startTime: number;
  endTime: number;
  episodeLength?: number;
}

export interface AnimePlayServer {
  id: string;
  label: string;
  host: string;
  url: string;
  mode: AnimeAudioMode;
  isDirect?: boolean;
  quality?: string;
  timeoutMs: number;
}

export interface AnimeSubtitleTrack {
  id: string;
  label: string;
  lang: string;
  format: 'ass' | 'vtt' | 'srt';
  url: string;
  isArabic: boolean;
  releaseName?: string;
}

export interface AnimeTorrentRelease {
  id: string;
  title: string;
  group?: string;
  resolution: string;
  sizeLabel: string;
  sizeBytes?: number;
  seeders: number;
  magnetUri?: string;
  torrentUrl?: string;
  infoHash?: string;
  isSeaDexBest?: boolean;
  isDualAudio?: boolean;
  subtitles?: AnimeSubtitleTrack[];
  source: 'AnimeTosho' | 'SeaDex' | 'Torrentio' | 'Comet' | 'MediaFusion';
}

export interface TraceMoeMatch {
  anilistId: number;
  malId?: number;
  title: string;
  episode: number | null;
  fromSec: number;
  toSec: number;
  similarity: number;
  videoPreviewUrl?: string;
  imagePreviewUrl?: string;
}
