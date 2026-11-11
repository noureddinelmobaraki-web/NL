/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Open Access World Museums API Client:
 * - Art Institute of Chicago (IIIF Deep Zoom API)
 * - The Metropolitan Museum of Art
 * - The Cleveland Museum of Art Open Access API
 */

import type { ArtMuseumPiece } from '../types/art.types';

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function fetchChicagoArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const u = new URL('https://api.artic.edu/api/v1/artworks/search');
  u.searchParams.set('q', query.trim() || 'impressionism landscape portrait');
  u.searchParams.set('query[term][is_public_domain]', 'true');
  u.searchParams.set(
    'fields',
    'id,title,artist_display,date_display,medium_display,image_id,color,dimensions',
  );
  u.searchParams.set('limit', '16');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list: Array<Record<string, unknown>> = Array.isArray(json?.data)
      ? json.data
      : [];

    return list
      .filter((item) => Boolean(item.image_id))
      .map((item): ArtMuseumPiece => {
        const imageId = String(item.image_id);
        const colorObj = item.color as
          | { h?: number; s?: number; l?: number }
          | undefined;
        const dominantHex =
          colorObj && typeof colorObj.h === 'number'
            ? hslToHex(colorObj.h, colorObj.s ?? 50, colorObj.l ?? 45)
            : '#38bdf8';

        return {
          id: `chicago:${item.id}`,
          source: 'chicago',
          sourceLabel: 'Art Institute of Chicago · IIIF',
          title: String(item.title || 'Untitled Masterpiece'),
          artist: String(item.artist_display || 'Unknown Master'),
          dateDisplay: String(item.date_display || 'Classic Era'),
          mediumDisplay: String(item.medium_display || 'Oil on canvas'),
          imageUrl: `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`,
          highResUrl: `https://www.artic.edu/iiif/2/${imageId}/full/1686,/0/default.jpg`,
          dominantHex,
          dimensions: item.dimensions ? String(item.dimensions) : undefined,
          externalUrl: `https://www.artic.edu/artworks/${item.id}`,
        };
      });
  } catch {
    return [];
  }
}

export async function fetchClevelandArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const u = new URL('https://openaccess-api.clevelandart.org/api/artworks/');
  u.searchParams.set('q', query.trim() || 'painting');
  u.searchParams.set('has_image', '1');
  u.searchParams.set('limit', '16');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list: Array<Record<string, unknown>> = Array.isArray(json?.data)
      ? json.data
      : [];

    return list
      .map((item): ArtMuseumPiece | null => {
        const images = item.images as
          | {
              web?: { url?: string };
              print?: { url?: string };
            }
          | undefined;
        const webUrl = images?.web?.url;
        if (!webUrl) return null;

        const creators = Array.isArray(item.creators)
          ? (item.creators as Array<{ description?: string }>)
          : [];

        return {
          id: `cleveland:${item.id}`,
          source: 'cleveland',
          sourceLabel: 'Cleveland Museum of Art',
          title: String(item.title || 'Untitled Artwork'),
          artist: String(creators[0]?.description || 'Classical Artist'),
          dateDisplay: String(item.creation_date || 'Historical'),
          mediumDisplay: String(item.technique || 'Fine Art'),
          imageUrl: webUrl,
          highResUrl: images?.print?.url || webUrl,
          dominantHex: '#f59e0b',
          externalUrl: String(item.url || 'https://www.clevelandart.org'),
        };
      })
      .filter(Boolean) as ArtMuseumPiece[];
  } catch {
    return [];
  }
}

export async function fetchMetMuseumArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const searchUrl = new URL(
    'https://collectionapi.metmuseum.org/public/collection/v1/search',
  );
  searchUrl.searchParams.set('hasImages', 'true');
  searchUrl.searchParams.set('q', query.trim() || 'van gogh monet rembrandt');

  try {
    const res = await fetch(searchUrl.toString(), {
      signal: signal ?? AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const searchJson = await res.json();
    const ids: number[] = Array.isArray(searchJson?.objectIDs)
      ? searchJson.objectIDs.slice(0, 8)
      : [];

    const settled = await Promise.allSettled(
      ids.map(async (objectId) => {
        const objRes = await fetch(
          `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
          { signal: signal ?? AbortSignal.timeout(5500) },
        );
        if (!objRes.ok) return null;
        return (await objRes.json()) as Record<string, unknown>;
      }),
    );

    const pieces: ArtMuseumPiece[] = [];
    for (const outcome of settled) {
      if (outcome.status !== 'fulfilled' || !outcome.value) continue;
      const obj = outcome.value;
      const smallImg = String(obj.primaryImageSmall || obj.primaryImage || '');
      const fullImg = String(obj.primaryImage || obj.primaryImageSmall || '');
      if (!smallImg) continue;

      pieces.push({
        id: `met:${obj.objectID}`,
        source: 'met',
        sourceLabel: 'The Met Museum · NYC',
        title: String(obj.title || 'Met Collection Piece'),
        artist: String(
          obj.artistDisplayName || obj.culture || 'Metropolitan Collection',
        ),
        dateDisplay: String(obj.objectDate || 'Classical'),
        mediumDisplay: String(obj.medium || 'Fine Art'),
        imageUrl: smallImg,
        highResUrl: fullImg,
        dominantHex: '#a855f7',
        dimensions: obj.dimensions ? String(obj.dimensions) : undefined,
        externalUrl: String(obj.objectURL || 'https://www.metmuseum.org'),
      });
    }

    return pieces;
  } catch {
    return [];
  }
}
