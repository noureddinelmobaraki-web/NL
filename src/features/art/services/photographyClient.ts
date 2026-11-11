/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Photography & High-Resolution Wallpaper Client:
 * - NL Lens Original Photography Archive
 * - Lorem Picsum Curated Photography API with interactive Blur & Grayscale filters
 */

import { ASSETS } from '../../../constants/assets';
import type { ArtMuseumPiece } from '../types/art.types';

export function getNlLensPhotography(): ArtMuseumPiece[] {
  return ASSETS.profile.lens.map((url, idx) => ({
    id: `nl-lens:${idx + 1}`,
    source: 'nl-lens',
    sourceLabel: 'NL Lens · Original Photography',
    title: `NL Lens Capture #0${idx + 1}`,
    artist: 'Nordine GB (NL)',
    dateDisplay: '2025–2026',
    mediumDisplay: 'Digital Photography · Raw Lens',
    imageUrl: url,
    highResUrl: url,
    dominantHex: '#12b6a4',
  }));
}

export async function fetchPicsumPhotography(
  page = 1,
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://picsum.photos/v2/list?page=${Math.max(1, page)}&limit=18`,
      { signal: signal ?? AbortSignal.timeout(6500) },
    );
    if (!res.ok) return [];
    const list: Array<{
      id: string;
      author: string;
      width: number;
      height: number;
      url: string;
      download_url: string;
    }> = await res.json();

    if (!Array.isArray(list)) return [];

    return list.map((item): ArtMuseumPiece => ({
      id: `picsum:${item.id}`,
      source: 'picsum',
      sourceLabel: 'Picsum Fine Photography',
      title: `Fine Art Frame #${item.id} by ${item.author}`,
      artist: item.author,
      dateDisplay: `${item.width} × ${item.height} px`,
      mediumDisplay: 'High-Resolution Photography',
      imageUrl: `https://picsum.photos/id/${item.id}/800/600`,
      highResUrl: item.download_url,
      dominantHex: '#0ea5e9',
      dimensions: `${item.width} × ${item.height}`,
      externalUrl: item.url,
    }));
  } catch {
    return [];
  }
}

export function buildCustomPicsumUrl(params: {
  picsumId: string;
  width?: number;
  height?: number;
  blur?: number;
  grayscale?: boolean;
}): string {
  const cleanId = params.picsumId.replace(/^picsum:/, '');
  const w = Math.max(200, Math.min(2400, params.width || 1200));
  const h = Math.max(200, Math.min(2400, params.height || 800));
  const query = new URLSearchParams();
  if (params.grayscale) {
    query.set('grayscale', '1');
  }
  if (params.blur && params.blur > 0) {
    query.set('blur', String(Math.min(10, Math.max(1, Math.round(params.blur)))));
  }
  const qs = query.toString();
  return `https://picsum.photos/id/${encodeURIComponent(cleanId)}/${w}/${h}${qs ? `?${qs}` : ''}`;
}
