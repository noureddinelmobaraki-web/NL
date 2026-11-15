/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export type NoirCategoryId =
  | 'all'
  | 'noir'
  | 'silent_comedy'
  | 'horror_scifi'
  | 'hitchcock_thriller'
  | 'vaults';

export interface NoirCategoryInfo {
  id: NoirCategoryId;
  label: string;
  tagline: string;
  accentHex: string;
}

export interface NoirFilmItem {
  id: string;
  title: string;
  director: string;
  year: number;
  rating: number;
  runtimeMinutes?: number;
  category: Exclude<NoirCategoryId, 'all'>;
  categoryLabel: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  archiveId: string;
  secondaryArchiveIds?: string[];
  tmdbId?: number;
  imdbId?: string;
  wikimediaTitle?: string;
  locId?: string;
  isVaultCollection?: boolean;
}

export interface NoirResolvedStream {
  partNumber: number;
  title: string;
  rawFileName: string;
  archiveIdentifier: string;
  directNodeUrl: string;
  cdnStreamUrl: string;
  downloadUrl: string;
  sizeMegabytes?: number;
  durationSeconds?: number;
}
