/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Types for the Standalone Art Hub (Photos & Museums, Drawings & Studio, Avatars Lab)
 */

export type ArtTabId = 'photos' | 'drawings' | 'avatars';

export type MuseumSourceId =
  | 'all'
  | 'chicago'
  | 'met'
  | 'cleveland'
  | 'picsum'
  | 'nl-lens';

export interface ArtMuseumPiece {
  id: string;
  source: MuseumSourceId;
  sourceLabel: string;
  title: string;
  artist: string;
  dateDisplay: string;
  mediumDisplay: string;
  imageUrl: string;
  highResUrl: string;
  dominantHex?: string;
  dimensions?: string;
  externalUrl?: string;
}

export interface PicsumPhotoConfig {
  id: string;
  author: string;
  width: number;
  height: number;
  baseDownloadUrl: string;
  blur: number; // 0..10
  grayscale: boolean;
}

export interface ArtistDrawingItem {
  id: string;
  title: string;
  category: 'my-drawings' | 'mebit' | 'user-created';
  imageUrl: string;
  accentHex: string;
  description: string;
  createdAt?: string;
}

export type ColorHarmonyMode =
  | 'analogic'
  | 'complement'
  | 'triad'
  | 'monochrome'
  | 'quad';

export interface ColorSwatchItem {
  hex: string;
  name: string;
  rgb: string;
  hsl: string;
}

export type DiceBearStyleId =
  | 'pixel-art'
  | 'adventurer'
  | 'lorelei'
  | 'bottts'
  | 'avataaars'
  | 'notionists'
  | 'fun-emoji'
  | 'identicon'
  | 'shapes';

export type AvatarEngineId = 'dicebear' | 'robohash' | 'waifu';

export interface AvatarConfigState {
  engine: AvatarEngineId;
  seed: string;
  dicebearStyle: DiceBearStyleId;
  backgroundColor: string;
  radius: number;
  robohashSet: 'set1' | 'set2' | 'set3' | 'set4';
  waifuCategory: 'waifu' | 'neko' | 'shinobu' | 'megumin';
}
