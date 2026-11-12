import type { ArtMuseumPiece } from '../types/art.types';

/**
 * 1. Art Institute of Chicago API (IIIF Public Domain)
 */
export async function fetchChicagoArtworks(
  query = 'impressionism painting',
  limit = 36,
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const fields =
      'id,title,artist_title,date_display,medium_display,image_id,dimensions';
    const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&limit=${limit}&page=${page}&fields=${fields}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const iiifBase =
      json?.config?.iiif_url || 'https://www.artic.edu/iiif/2';

    return (json?.data || [])
      .filter((item: any) => Boolean(item.image_id))
      .map(
        (item: any): ArtMuseumPiece => ({
          id: `chicago-${item.id}`,
          source: 'chicago',
          sourceLabel: 'معهد شيكاغو للفنون (AIC)',
          title: item.title || 'Untitled Masterpiece',
          artist: item.artist_title || 'فنان كلاسيكي',
          dateDisplay: item.date_display || '',
          mediumDisplay: item.medium_display || 'لوحة فنية',
          imageUrl: `${iiifBase}/${item.image_id}/full/843,/0/default.jpg`,
          highResUrl: `${iiifBase}/${item.image_id}/full/1686,/0/default.jpg`,
          dimensions: item.dimensions || undefined,
          externalUrl: `https://www.artic.edu/artworks/${item.id}`,
        }),
      );
  } catch {
    return [];
  }
}

/**
 * 2. Cleveland Museum of Art Open Access API
 */
export async function fetchClevelandArtworks(
  query = 'painting',
  limit = 36,
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const skip = Math.max(0, (page - 1) * limit);
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=${limit}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();

    return (json?.data || [])
      .filter((item: any) => Boolean(item?.images?.web?.url))
      .map(
        (item: any): ArtMuseumPiece => ({
          id: `cleveland-${item.id}`,
          source: 'cleveland',
          sourceLabel: 'متحف كليفلاند للفنون (CMA)',
          title: item.title || 'Cleveland Open Access Piece',
          artist:
            item.creators?.[0]?.description ||
            item.culture?.[0] ||
            'فنان عالمي',
          dateDisplay: item.creation_date || '',
          mediumDisplay: item.technique || item.type || '',
          imageUrl: item.images.web.url,
          highResUrl: item.images?.print?.url || item.images.web.url,
          dimensions: item.measurements || undefined,
          externalUrl:
            item.url || `https://www.clevelandart.org/art/${item.id}`,
        }),
      );
  } catch {
    return [];
  }
}

/**
 * 3. Metropolitan Museum of Art (The Met) API
 */
export async function fetchMetMuseumArtworks(
  query = 'Van Gogh Monet',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchJson = await searchRes.json();
    const pageSize = 24;
    const startIdx = Math.max(0, (page - 1) * pageSize);
    const ids: number[] = (searchJson?.objectIDs || []).slice(
      startIdx,
      startIdx + pageSize,
    );
    if (ids.length === 0) return [];

    const details = await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch(
            `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
          );
          if (!r.ok) return null;
          return await r.json();
        } catch {
          return null;
        }
      }),
    );

    return details
      .filter((d): d is any =>
        Boolean(d && (d.primaryImageSmall || d.primaryImage)),
      )
      .map(
        (d): ArtMuseumPiece => ({
          id: `met-${d.objectID}`,
          source: 'met',
          sourceLabel: 'متحف المتروبوليتان (The Met)',
          title: d.title || 'The Met Masterpiece',
          artist: d.artistDisplayName || d.culture || 'فنان كلاسيكي',
          dateDisplay: d.objectDate || '',
          mediumDisplay: d.medium || d.classification || '',
          imageUrl: d.primaryImageSmall || d.primaryImage,
          highResUrl: d.primaryImage || d.primaryImageSmall,
          dimensions: d.dimensions || undefined,
          externalUrl: d.objectURL || undefined,
        }),
      );
  } catch {
    return [];
  }
}

/**
 * 4. Victoria and Albert Museum (V&A London) API v2 — No Key Required
 */
export async function fetchVamMuseumArtworks(
  query = 'painting',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&images_exist=1&page_size=32&page=${page}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const records: any[] = json?.records ?? [];
    return records
      .filter((r) => Boolean(r?._primaryImageId))
      .map((r): ArtMuseumPiece => {
        const imgId = r._primaryImageId;
        return {
          id: `vam-${r.systemNumber}`,
          source: 'vam',
          sourceLabel: 'متحف فيكتوريا وألبرت لندن (V&A)',
          title:
            r._primaryTitle ||
            r.objectType ||
            'تحفة متحف فيكتوريا وألبرت',
          artist: r._primaryMaker?.name || 'فنان V&A لندن',
          dateDisplay: r._primaryDate || 'تراث V&A',
          mediumDisplay: r.objectType || 'تحفة فنية وتصميم',
          imageUrl: `https://framemark.vam.ac.uk/collections/${imgId}/full/!800,800/0/default.jpg`,
          highResUrl: `https://framemark.vam.ac.uk/collections/${imgId}/full/!1600,1600/0/default.jpg`,
          externalUrl: `https://collections.vam.ac.uk/item/${r.systemNumber}`,
        };
      });
  } catch {
    return [];
  }
}

/**
 * 5. Wikimedia Commons Featured Art & Photography MediaWiki API
 */
export async function fetchWikimediaCommonsArtworks(
  query = 'Featured pictures of paintings',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const limit = 32;
    const offset = Math.max(0, (page - 1) * limit);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(query)}&gsrlimit=${limit}&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const pages = Object.values(json?.query?.pages ?? {}) as any[];
    return pages
      .filter((p) => Boolean(p?.imageinfo?.[0]?.thumburl))
      .map((p): ArtMuseumPiece => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const cleanTitle = (
          meta.ObjectName?.value ||
          p.title?.replace(/^File:/i, '').replace(/\.[a-z]+$/i, '') ||
          'عمل فني'
        )
          .replace(/<[^>]+>/g, '')
          .slice(0, 90);
        const artist = (meta.Artist?.value || 'ويكيميديا كومنز')
          .replace(/<[^>]+>/g, '')
          .slice(0, 60);
        const dateStr = (meta.DateTimeOriginal?.value || 'تراث مصور')
          .replace(/<[^>]+>/g, '')
          .slice(0, 30);
        return {
          id: `wiki-${p.pageid}`,
          source: 'wikimedia',
          sourceLabel: 'ويكيميديا كومنز التراثية',
          title: cleanTitle,
          artist,
          dateDisplay: dateStr,
          mediumDisplay: 'أرشيف ويكيميديا كومنز',
          imageUrl: info.thumburl,
          highResUrl: info.url || info.thumburl,
          externalUrl:
            info.descriptionurl ||
            `https://commons.wikimedia.org/?curid=${p.pageid}`,
        };
      });
  } catch {
    return [];
  }
}

/**
 * 6. Openverse (Creative Commons / Smithsonian / Brooklyn Museum)
 */
export async function fetchOpenverseArtworks(
  query = 'fine art oil painting',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial,modification&page_size=32&page=${page}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = json?.results ?? [];
    return results
      .filter((r) => Boolean(r?.url))
      .map(
        (r): ArtMuseumPiece => ({
          id: `openverse-${r.id}`,
          source: 'openverse',
          sourceLabel: 'مؤسسة سميثسونيان و Openverse',
          title: r.title || 'لوحة فنية مفتوحة',
          artist: r.creator || r.source || 'Openverse Global Archive',
          dateDisplay: 'تراث عالمي',
          mediumDisplay: `Openverse (${r.source || 'Museum'})`,
          dimensions:
            r.width && r.height ? `${r.width} × ${r.height} px` : undefined,
          imageUrl: r.thumbnail || r.url,
          highResUrl: r.url,
          externalUrl: r.foreign_landing_url || r.url,
        }),
      );
  } catch {
    return [];
  }
}

/**
 * 7. Concept Art & Anime Digital Illustrations (Nekos.best + Waifu.pics SFW)
 */
export async function fetchConceptIllustrationArtworks(
  page = 1,
): Promise<ArtMuseumPiece[]> {
  const results: ArtMuseumPiece[] = [];
  try {
    const [nekosRes, kitsuneRes, waifuRes] = await Promise.allSettled([
      fetch('https://nekos.best/api/v2/husbando?amount=20'),
      fetch('https://nekos.best/api/v2/kitsune?amount=16'),
      fetch('https://api.waifu.pics/many/sfw/waifu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude: [] }),
      }),
    ]);

    if (nekosRes.status === 'fulfilled' && nekosRes.value.ok) {
      const json = await nekosRes.value.json();
      (json?.results ?? []).forEach((item: any, idx: number) => {
        if (item?.url) {
          results.push({
            id: `nekos-husbando-${page}-${idx}-${item.url.slice(-10)}`,
            source: 'concept-art',
            sourceLabel: 'معرض رسوم الكونسبت والأنمي',
            title: `رسم كونسبت أنمي رقمي #${(page - 1) * 20 + idx + 1}`,
            artist: item.artist_name || 'فنان ديجيتال ياباني',
            dateDisplay: '2025',
            mediumDisplay: 'رسم رقمي (Concept Art)',
            imageUrl: item.url,
            highResUrl: item.url,
            externalUrl: item.source_url || item.url,
          });
        }
      });
    }

    if (kitsuneRes.status === 'fulfilled' && kitsuneRes.value.ok) {
      const json = await kitsuneRes.value.json();
      (json?.results ?? []).forEach((item: any, idx: number) => {
        if (item?.url) {
          results.push({
            id: `nekos-kitsune-${page}-${idx}-${item.url.slice(-10)}`,
            source: 'concept-art',
            sourceLabel: 'معرض رسوم الكونسبت والأنمي',
            title: `لوحة خيال رقمي ياباني #${(page - 1) * 16 + idx + 1}`,
            artist: item.artist_name || 'استوديو فن رقمي',
            dateDisplay: '2025',
            mediumDisplay: 'فن رقمي معاصر (Digital Art)',
            imageUrl: item.url,
            highResUrl: item.url,
            externalUrl: item.source_url || item.url,
          });
        }
      });
    }

    if (waifuRes.status === 'fulfilled' && waifuRes.value.ok) {
      const json = await waifuRes.value.json();
      (json?.files ?? []).slice(0, 20).forEach((url: string, idx: number) => {
        results.push({
          id: `waifu-concept-${page}-${idx}-${url.slice(-10)}`,
          source: 'concept-art',
          sourceLabel: 'معرض رسوم الكونسبت والأنمي',
          title: `لوحة شخصية أنمي رقمية #${(page - 1) * 20 + idx + 1}`,
          artist: 'استوديو الفن الرقمي',
          dateDisplay: '2025',
          mediumDisplay: 'Illustration / Anime Concept',
          imageUrl: url,
          highResUrl: url,
          externalUrl: url,
        });
      });
    }
  } catch {
    // ignore network errors
  }
  return results;
}

/**
 * 8. Picsum High-Resolution Photography Feed
 */
export async function fetchPicsumGalleryPieces(
  page = 1,
  limit = 30,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://picsum.photos/v2/list?page=${page}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(
      (item: any): ArtMuseumPiece => ({
        id: `picsum-${item.id}`,
        source: 'picsum',
        sourceLabel: 'أرشيف التصوير الفوتوغرافي العالمي',
        title: `عدسة فوتوغرافية عالمية #${item.id}`,
        artist: item.author || 'Photographer',
        dateDisplay: 'فوتوغرافيا معاصرة',
        mediumDisplay: `تصوير رقمي عالي الدقة (${item.width}×${item.height})`,
        imageUrl: `https://picsum.photos/id/${item.id}/900/650`,
        highResUrl: item.download_url,
        dimensions: `${item.width} × ${item.height} px`,
        externalUrl: item.url,
      }),
    );
  } catch {
    return [];
  }
}
