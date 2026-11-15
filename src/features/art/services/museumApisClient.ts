import type { ArtMuseumPiece } from '../types/art.types';

/**
 * 1. Art Institute of Chicago API (IIIF Public Domain)
 */
export async function fetchChicagoArtworks(
  query = 'impressionism painting',
  limit = 32,
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
          sourceLabel: 'Art Institute of Chicago (AIC)',
          title: item.title || 'Untitled Masterpiece',
          artist: item.artist_title || 'Classical Master',
          dateDisplay: item.date_display || '',
          mediumDisplay: item.medium_display || 'Oil on canvas',
          thumbnailUrl: `${iiifBase}/${item.image_id}/full/400,/0/default.jpg`,
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
  limit = 32,
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
          sourceLabel: 'Cleveland Museum of Art (CMA)',
          title: item.title || 'Cleveland Open Access Masterpiece',
          artist:
            item.creators?.[0]?.description ||
            item.culture?.[0] ||
            'Classical Artist',
          dateDisplay: item.creation_date || '',
          mediumDisplay: item.technique || item.type || 'Fine Art',
          thumbnailUrl: item.images.web.url,
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
    const pageSize = 20;
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
          sourceLabel: 'The Metropolitan Museum of Art (The Met)',
          title: d.title || 'The Met Masterpiece',
          artist: d.artistDisplayName || d.culture || 'Classical Master',
          dateDisplay: d.objectDate || '',
          mediumDisplay: d.medium || d.classification || 'Museum Piece',
          thumbnailUrl: d.primaryImageSmall || d.primaryImage,
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
 * 4. Victoria and Albert Museum (V&A London) API v2
 */
export async function fetchVamMuseumArtworks(
  query = 'painting',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&images_exist=1&page_size=28&page=${page}`,
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
          sourceLabel: 'Victoria and Albert Museum (V&A)',
          title:
            r._primaryTitle ||
            r.objectType ||
            'V&A London Masterpiece',
          artist: r._primaryMaker?.name || 'V&A Collection Artist',
          dateDisplay: r._primaryDate || 'V&A Heritage',
          mediumDisplay: r.objectType || 'Fine Art & Design',
          thumbnailUrl: `https://framemark.vam.ac.uk/collections/${imgId}/full/!400,400/0/default.jpg`,
          imageUrl: `https://framemark.vam.ac.uk/collections/${imgId}/full/!800,800/0/default.jpg`,
          highResUrl: `https://framemark.vam.ac.uk/collections/${imgId}/full/!1686,1686/0/default.jpg`,
          externalUrl: `https://collections.vam.ac.uk/item/${r.systemNumber}`,
        };
      });
  } catch {
    return [];
  }
}

/**
 * 5. Internet Archive Metropolitan Museum of Art Gallery (`collection:metropolitanmuseumofart-gallery`)
 */
export async function fetchArchiveMetGalleryArtworks(
  query = '',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const base = 'collection:(metropolitanmuseumofart-gallery) AND mediatype:(image)';
    const qExpr = query.trim() ? `(${base}) AND (${query.trim()})` : base;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(qExpr)}&fl[]=identifier,title,creator,date,year,description&sort[]=downloads+desc&rows=24&page=${page}&output=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const docs: any[] = Array.isArray(json?.response?.docs) ? json.response.docs : [];
    return docs
      .filter((d) => Boolean(d?.identifier))
      .map((d): ArtMuseumPiece => {
        const id = String(d.identifier);
        const artist = Array.isArray(d.creator) ? d.creator[0] : d.creator;
        return {
          id: `ia-met-${id}`,
          source: 'ia-met',
          sourceLabel: 'Internet Archive Met Gallery',
          title: String(d.title || id),
          artist: String(artist || 'The Met Archival Collection'),
          dateDisplay: String(d.year || d.date || 'Classical Era'),
          mediumDisplay: 'Archival Museum Plate (CC0)',
          thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          imageUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          highResUrl: `https://iiif.archive.org/iiif/${encodeURIComponent(id)}/full/1686,/0/default.jpg`,
          externalUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
        };
      });
  } catch {
    return [];
  }
}

/**
 * 6. Library of Congress Prints & Photographs Free-to-Use API
 */
export async function fetchLocPrintsAndPhotographs(
  query = 'fine art print architecture',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const url = `https://www.loc.gov/pictures/search/?q=${encodeURIComponent(query)}&fo=json&c=24&sp=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = Array.isArray(json?.results) ? json.results : [];
    return results
      .filter((r) => Boolean(r?.image?.full || r?.image?.thumb))
      .map((r, idx): ArtMuseumPiece => {
        const thumb = String(r.image?.thumb || r.image?.full || '').replace(/^\/\//, 'https://');
        const full = String(r.image?.full || thumb).replace(/^\/\//, 'https://');
        return {
          id: `loc-print-${page}-${idx}-${r.pk || idx}`,
          source: 'loc',
          sourceLabel: 'Library of Congress Prints & Photographs',
          title: String(r.title || 'Library of Congress Archival Print'),
          artist: String(r.creator || 'Library of Congress Division'),
          dateDisplay: String(r.created_published_date || 'Archival Print'),
          mediumDisplay: 'Library of Congress Public Domain Print',
          thumbnailUrl: thumb,
          imageUrl: full,
          highResUrl: full,
          externalUrl: String(r.links?.item || 'https://www.loc.gov/pictures/'),
        };
      });
  } catch {
    return [];
  }
}

/**
 * 7. Smithsonian & National Gallery of Art CC0 via Openverse
 */
export async function fetchSmithsonianNgaOpenverse(
  query = 'painting portrait landscape',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=24&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = json?.results ?? [];
    return results
      .filter((r) => Boolean(r?.url))
      .map(
        (r): ArtMuseumPiece => ({
          id: `smithsonian-${r.id}`,
          source: 'smithsonian',
          sourceLabel: 'Smithsonian & National Gallery (CC0)',
          title: r.title || 'Smithsonian Open Access Masterpiece',
          artist: r.creator || r.source || 'Smithsonian Institution',
          dateDisplay: 'Open Access CC0',
          mediumDisplay: `CC0 Museum Collection (${r.source || 'Smithsonian'})`,
          dimensions:
            r.width && r.height ? `${r.width} × ${r.height} px` : undefined,
          thumbnailUrl: r.thumbnail || r.url,
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
 * 8. Wikimedia Commons Featured Art & Photography MediaWiki API
 */
export async function fetchWikimediaCommonsArtworks(
  query = 'Featured pictures of paintings',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const limit = 28;
    const offset = Math.max(0, (page - 1) * limit);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(query)}&gsrlimit=${limit}&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*`;
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
          'Wikimedia Featured Artwork'
        )
          .replace(/<[^>]+>/g, '')
          .slice(0, 90);
        const artist = (meta.Artist?.value || 'Wikimedia Commons')
          .replace(/<[^>]+>/g, '')
          .slice(0, 60);
        const dateStr = (meta.DateTimeOriginal?.value || 'Archival')
          .replace(/<[^>]+>/g, '')
          .slice(0, 30);
        return {
          id: `wiki-${p.pageid}`,
          source: 'wikimedia',
          sourceLabel: 'Wikimedia Commons Featured',
          title: cleanTitle,
          artist,
          dateDisplay: dateStr,
          mediumDisplay: 'Wikimedia Commons High-Res Plate',
          thumbnailUrl: info.thumburl,
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
 * 9. Openverse Global Commons
 */
export async function fetchOpenverseArtworks(
  query = 'fine art oil painting',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial,modification&page_size=28&page=${page}`,
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
          sourceLabel: 'Openverse Global Commons',
          title: r.title || 'Open Access Artwork',
          artist: r.creator || r.source || 'Openverse Global Archive',
          dateDisplay: 'Public Domain / CC',
          mediumDisplay: `Openverse (${r.source || 'Museum'})`,
          dimensions:
            r.width && r.height ? `${r.width} × ${r.height} px` : undefined,
          thumbnailUrl: r.thumbnail || r.url,
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
 * 10. Concept Art & Anime Digital Illustrations
 */
export async function fetchConceptIllustrationArtworks(
  page = 1,
): Promise<ArtMuseumPiece[]> {
  const results: ArtMuseumPiece[] = [];
  try {
    const [nekosRes, kitsuneRes] = await Promise.allSettled([
      fetch('https://nekos.best/api/v2/husbando?amount=16'),
      fetch('https://nekos.best/api/v2/kitsune?amount=16'),
    ]);

    if (nekosRes.status === 'fulfilled' && nekosRes.value.ok) {
      const json = await nekosRes.value.json();
      (json?.results ?? []).forEach((item: any, idx: number) => {
        if (item?.url) {
          results.push({
            id: `nekos-husbando-${page}-${idx}-${item.url.slice(-10)}`,
            source: 'concept-art',
            sourceLabel: 'Digital Concept & Anime Studio',
            title: `Character Concept Illustration #${(page - 1) * 16 + idx + 1}`,
            artist: item.artist_name || 'Digital Concept Artist',
            dateDisplay: 'Contemporary',
            mediumDisplay: 'Digital Concept Illustration',
            thumbnailUrl: item.url,
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
            sourceLabel: 'Digital Concept & Anime Studio',
            title: `Fantasy Concept Artwork #${(page - 1) * 16 + idx + 1}`,
            artist: item.artist_name || 'Digital Art Studio',
            dateDisplay: 'Contemporary',
            mediumDisplay: 'Digital Art / Concept Plate',
            thumbnailUrl: item.url,
            imageUrl: item.url,
            highResUrl: item.url,
            externalUrl: item.source_url || item.url,
          });
        }
      });
    }
  } catch {
    // ignore network errors
  }
  return results;
}

/**
 * 11. Picsum High-Resolution Photography Feed
 */
export async function fetchPicsumGalleryPieces(
  page = 1,
  limit = 28,
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
        sourceLabel: 'High-Resolution Lens Archive',
        title: `Fine Art Photography Plate #${item.id}`,
        artist: item.author || 'Contemporary Photographer',
        dateDisplay: 'Contemporary Lens',
        mediumDisplay: `High-Resolution Photography (${item.width}×${item.height})`,
        thumbnailUrl: `https://picsum.photos/id/${item.id}/420/300`,
        imageUrl: `https://picsum.photos/id/${item.id}/840/600`,
        highResUrl: item.download_url,
        dimensions: `${item.width} × ${item.height} px`,
        externalUrl: item.url,
      }),
    );
  } catch {
    return [];
  }
}
