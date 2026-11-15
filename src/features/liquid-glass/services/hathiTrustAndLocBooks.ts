import { type BookItem, stripHtml } from './types';
import { searchArchiveCatalog } from '../../../services/archive/archiveMasterEngine';
import {
  buildArchiveBookEmbedUrl,
  buildArchiveItemDetailsUrl,
  buildArchiveThumbnailUrl,
} from '../../../services/archive/archiveUrlBuilder';

export async function fetchHathiTrustAndLocBooks(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const [iaOpenRes, locRes] = await Promise.allSettled([
    fetchArchiveOpenCollectionsBooks(query, page),
    fetchLocOpenBooks(query, page, signal),
  ]);

  const combined: BookItem[] = [];
  if (iaOpenRes.status === 'fulfilled') {
    combined.push(...iaOpenRes.value);
  }
  if (locRes.status === 'fulfilled') {
    combined.push(...locRes.value);
  }
  return combined;
}

async function fetchArchiveOpenCollectionsBooks(
  query: string,
  page: number,
): Promise<BookItem[]> {
  const base =
    'collection:(americana OR gutenberg OR folkscanomy) AND mediatype:texts';
  const lucene = query.trim() ? `(${base}) AND (${query.trim()})` : base;

  try {
    const res = await searchArchiveCatalog({
      query: lucene,
      page,
      rows: 16,
      sort: 'downloads desc',
      excludeBorrowLocked: true,
    });

    return res.docs
      .filter((d) => Boolean(d.identifier))
      .map((doc): BookItem => {
        const iaId = doc.identifier;
        const author = Array.isArray(doc.creator)
          ? doc.creator.join(', ')
          : doc.creator || 'Open Heritage Press';
        const desc = Array.isArray(doc.description)
          ? doc.description.join(' ')
          : String(doc.description || '');
        return {
          id: `ia-open-${iaId}`,
          iaId,
          title: stripHtml(doc.title || iaId),
          author: stripHtml(String(author)),
          year: doc.year ? String(doc.year) : '',
          language: Array.isArray(doc.language)
            ? String(doc.language[0]).slice(0, 3).toLowerCase()
            : String(doc.language || 'en').slice(0, 3).toLowerCase(),
          coverUrl: buildArchiveThumbnailUrl(iaId),
          description:
            stripHtml(desc).slice(0, 500) ||
            'Full-view digitized public domain book from Americana, Folkscanomy, and Gutenberg collections.',
          ext: 'pdf',
          source: 'Americana / Folkscanomy',
          downloads: Number(doc.downloads) || 0,
          directReadFormats: {
            embed: buildArchiveBookEmbedUrl(iaId),
            preview: buildArchiveItemDetailsUrl(iaId),
          },
        };
      });
  } catch {
    return [];
  }
}

async function fetchLocOpenBooks(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  try {
    const qParam = query.trim()
      ? `&q=${encodeURIComponent(query.trim())}`
      : '';
    const url = `https://www.loc.gov/books/?fo=json&c=12&sp=${Math.max(1, page)}${qParam}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];

    return results
      .filter((r) => Boolean(r?.title && r?.id))
      .map((r, idx): BookItem => {
        const imgArr: string[] = Array.isArray(r.image_url) ? r.image_url : [];
        const cover = imgArr[imgArr.length - 1] || '';
        const contributors: string[] = Array.isArray(r.contributor)
          ? r.contributor
          : [];
        const itemUrl = String(r.url || r.id || 'https://www.loc.gov/books/');
        return {
          id: `loc-book-${page}-${idx}`,
          title: stripHtml(String(r.title)),
          author: contributors[0]
            ? stripHtml(String(contributors[0]))
            : 'Library of Congress Rare Book Division',
          year: r.date ? String(r.date).slice(0, 4) : '',
          language: 'en',
          coverUrl: cover,
          description: Array.isArray(r.description)
            ? stripHtml(String(r.description[0])).slice(0, 500)
            : 'Digitized open-access volume from the Library of Congress.',
          ext: 'pdf',
          source: 'Library of Congress',
          downloads: 1200 - idx * 25,
          directReadFormats: {
            preview: itemUrl,
          },
        };
      });
  } catch {
    return [];
  }
}
