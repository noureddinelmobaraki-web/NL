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
  const q = query.trim() || 'van gogh monet rembrandt';
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(searchUrl, {
      signal: signal ?? AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const searchJson = await res.json();
    const ids: number[] = Array.isArray(searchJson?.objectIDs)
      ? searchJson.objectIDs.slice(0, 18)
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

export async function fetchVamMuseumArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const q = query.trim() || 'painting portrait design';
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(q)}&images_exist=1&page_size=15`;

  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const records: Array<Record<string, any>> = Array.isArray(json?.records)
      ? json.records
      : [];

    return records
      .map((record): ArtMuseumPiece | null => {
        const baseUrl = String(record?._images?._iiif_image_base_url || '');
        if (!baseUrl) return null;
        const sysNum = String(record?.systemNumber || Math.random());
        const thumbUrl = `${baseUrl}full/!800,800/0/default.jpg`;
        const highResUrl = `${baseUrl}full/full/0/default.jpg`;

        return {
          id: `vam:${sysNum}`,
          source: 'vam',
          sourceLabel: 'Victoria and Albert Museum · London',
          title: String(
            record?._primaryTitle || record?.objectType || 'V&A Collection Piece',
          ),
          artist: String(
            record?._primaryMaker?.name || 'V&A Archive Artist',
          ),
          dateDisplay: String(record?._primaryDate || 'Historical'),
          mediumDisplay: String(record?.objectType || 'Decorative & Fine Art'),
          imageUrl: thumbUrl,
          highResUrl,
          dominantHex: '#ec4899',
          externalUrl: `https://collections.vam.ac.uk/item/${encodeURIComponent(sysNum)}`,
        };
      })
      .filter((x): x is ArtMuseumPiece => x !== null);
  } catch {
    return [];
  }
}

export async function fetchWikimediaCommonsArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const q = query.trim() || 'fine art painting masterpiece';
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(q)}&gsrlimit=15&prop=imageinfo&iiprop=url|dimensions|extmetadata&iiurlwidth=800&format=json&origin=*`;

  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pagesObj = data?.query?.pages;
    if (!pagesObj || typeof pagesObj !== 'object') return [];

    const pages = Object.values(pagesObj) as Array<Record<string, any>>;
    return pages
      .map((page): ArtMuseumPiece | null => {
        const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
        const fullUrl = String(info?.url || '');
        const thumbUrl = String(info?.thumburl || info?.thumbUrl || fullUrl);
        if (!thumbUrl) return null;

        const ext = info?.extmetadata || {};
        const rawTitle = String(page?.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
        const artistRaw = String(ext?.Artist?.value || 'Wikimedia Commons Contributor').replace(/<[^>]+>/g, '').trim();
        const dateRaw = String(ext?.DateTimeOriginal?.value || ext?.DateTime?.value || 'Archival').replace(/<[^>]+>/g, '').slice(0, 32);

        return {
          id: `wikimedia:${page?.pageid || rawTitle}`,
          source: 'wikimedia',
          sourceLabel: 'Wikimedia Commons · Open Fine Art',
          title: rawTitle || 'Wikimedia Fine Art',
          artist: artistRaw || 'Wikimedia Commons',
          dateDisplay: dateRaw || 'Archival',
          mediumDisplay: 'High-Resolution Digital Commons',
          imageUrl: thumbUrl,
          highResUrl: fullUrl || thumbUrl,
          dominantHex: '#10b981',
          dimensions:
            info?.width && info?.height
              ? `${info.width} × ${info.height}`
              : undefined,
          externalUrl: String(info?.descriptionurl || fullUrl),
        };
      })
      .filter((x): x is ArtMuseumPiece => x !== null);
  } catch {
    return [];
  }
}

export async function fetchOpenverseArtworks(
  query = '',
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const q = query.trim() || 'fine art photography architecture';
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=16`;

  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: Array<Record<string, any>> = Array.isArray(data?.results)
      ? data.results
      : [];

    return results
      .map((item): ArtMuseumPiece | null => {
        const fullUrl = String(item?.url || '');
        const thumbUrl = String(item?.thumbnail || fullUrl);
        if (!thumbUrl) return null;

        return {
          id: `openverse:${item?.id || Math.random()}`,
          source: 'openverse',
          sourceLabel: 'Openverse · Creative Commons',
          title: String(item?.title || 'Creative Commons Visual'),
          artist: String(item?.creator || 'Openverse Creator'),
          dateDisplay: String(item?.license ? `CC ${String(item.license).toUpperCase()}` : 'CC Open'),
          mediumDisplay: String(item?.source || 'Creative Commons Photography'),
          imageUrl: thumbUrl,
          highResUrl: fullUrl || thumbUrl,
          dominantHex: '#6366f1',
          dimensions:
            item?.width && item?.height
              ? `${item.width} × ${item.height}`
              : undefined,
          externalUrl: String(item?.foreign_landing_url || fullUrl),
        };
      })
      .filter((x): x is ArtMuseumPiece => x !== null);
  } catch {
    return [];
  }
}

export async function fetchConceptIllustrationArtworks(
  signal?: AbortSignal,
): Promise<ArtMuseumPiece[]> {
  const [nekosRes, waifuRes] = await Promise.allSettled([
    fetch('https://nekos.best/api/v2/husbando?amount=10', {
      signal: signal ?? AbortSignal.timeout(6500),
    }).then((r) => (r.ok ? r.json() : null)),
    fetch('https://api.waifu.pics/many/sfw/waifu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exclude: [] }),
      signal: signal ?? AbortSignal.timeout(6500),
    }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const pieces: ArtMuseumPiece[] = [];

  if (nekosRes.status === 'fulfilled' && Array.isArray(nekosRes.value?.results)) {
    nekosRes.value.results.forEach((item: any, idx: number) => {
      if (!item?.url) return;
      pieces.push({
        id: `nekos:${idx}:${item.url}`,
        source: 'concept-art',
        sourceLabel: 'Nekos.Best · Concept Illustration',
        title: String(item.anime_name || `Anime Character Concept #${idx + 1}`),
        artist: String(item.artist_name || 'Digital Concept Illustrator'),
        dateDisplay: 'Digital Art',
        mediumDisplay: 'Anime & Character Illustration',
        imageUrl: String(item.url),
        highResUrl: String(item.url),
        dominantHex: '#38bdf8',
        externalUrl: String(item.source_url || item.url),
      });
    });
  }

  if (waifuRes.status === 'fulfilled' && Array.isArray(waifuRes.value?.files)) {
    waifuRes.value.files.slice(0, 10).forEach((url: string, idx: number) => {
      if (!url) return;
      pieces.push({
        id: `waifu:${idx}:${url}`,
        source: 'concept-art',
        sourceLabel: 'Waifu.im / Waifu.pics · Digital Illustration',
        title: `Digital Illustration Study #${idx + 1}`,
        artist: 'Digital Studio Archive',
        dateDisplay: 'Contemporary Digital',
        mediumDisplay: 'SFW Anime & Digital Concept Art',
        imageUrl: String(url),
        highResUrl: String(url),
        dominantHex: '#f43f5e',
        externalUrl: String(url),
      });
    });
  }

  return pieces;
}
