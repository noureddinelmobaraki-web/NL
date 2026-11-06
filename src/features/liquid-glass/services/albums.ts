/**
 * Copyright (c) 2026 NL Archive.
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';
import type { LiquidGlassAlbum } from '../albumsData';

const TrackSchema = z.object({
  num: z.number(),
  title: z.string(),
  url: z.string(),
});

const AlbumSchema = z.object({
  id: z.string(),
  index: z.number(),
  title: z.string(),
  artist: z.string(),
  coverUrl: z.string(),
  tracks: z.array(TrackSchema),
});

const AlbumsCatalogSchema = z.array(AlbumSchema);

export const NL_AUDIO_CDN_ALBUMS_URL =
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/data/albums.json';
export const NL_JSDELIVR_ALBUMS_URL =
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/data/albums.json';

let cache: Promise<LiquidGlassAlbum[]> | null = null;
let syncAlbumsCache: LiquidGlassAlbum[] | null = null;

async function fetchAndValidateAlbums(url: string): Promise<LiquidGlassAlbum[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const raw = await res.json();
  const parsed = AlbumsCatalogSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid albums.json schema');
  }
  syncAlbumsCache = parsed.data;
  return parsed.data;
}

/**
 * Loads the 99 albums catalog on-demand from `nl-audio-cdn/data/albums.json`
 * (with automatic fallback to jsDelivr mirror).
 */
export function loadAlbums(): Promise<LiquidGlassAlbum[]> {
  if (syncAlbumsCache && syncAlbumsCache.length > 0) {
    return Promise.resolve(syncAlbumsCache);
  }
  cache ??= fetchAndValidateAlbums(NL_AUDIO_CDN_ALBUMS_URL)
    .catch(() => fetchAndValidateAlbums(NL_JSDELIVR_ALBUMS_URL))
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}

export function getCachedAlbumsSync(): LiquidGlassAlbum[] {
  return syncAlbumsCache ?? [];
}
