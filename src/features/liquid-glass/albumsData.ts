/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Lightweight HLS video stream manifest & album type definitions.
 * Heavy album tracklists (287 KB) have been moved out of the JS bundle to
 * `https://noureddinelmobaraki-web.github.io/nl-audio-cdn/data/albums.json`
 * and are loaded on-demand via `loadAlbums()` in `./services/albums.ts`.
 */

export interface LiquidGlassTrack {
  readonly num: number;
  readonly title: string;
  readonly url: string;
}

export interface LiquidGlassAlbum {
  readonly id: string;
  readonly index: number;
  readonly title: string;
  readonly artist: string;
  readonly coverUrl: string;
  readonly tracks: readonly LiquidGlassTrack[];
}

export const LIQUID_GLASS_ALL_HLS_VIDEOS: readonly string[] = [
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/1/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/2/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/3/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/4/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/5/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/6/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/7/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/8/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/9/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/10/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/11/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/12/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/13/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/14/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/15/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/16/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/17/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/18/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/19/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/20/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/21/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/21.5/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/22/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/23/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/24/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/25/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/26/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/27/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/28/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/29/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/30/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/31/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/32/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/33/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/34/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/35/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/36/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/37/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/38/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/39/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/40/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/41/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/42/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/43/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/44/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/45/index.m3u8',
];
