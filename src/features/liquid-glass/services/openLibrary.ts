/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';
import { type BookItem, stripHtml } from './types';

const OpenLibraryWorkSchema = z
  .object({
    key: z.string().optional(),
    title: z.string().optional(),
    cover_i: z.number().optional(),
    cover_id: z.number().optional(),
    ia: z.union([z.array(z.string()), z.string()]).optional(),
    author_name: z.array(z.string()).optional(),
    authors: z.array(z.object({ name: z.string().optional() })).optional(),
    first_publish_year: z.union([z.number(), z.string()]).optional(),
    language: z.array(z.string()).optional(),
    isbn: z.array(z.string()).optional(),
    edition_count: z.number().optional(),
    ratings_average: z.number().optional(),
    number_of_pages_median: z.number().optional(),
  })
  .passthrough();

const OpenLibraryTrendingResponseSchema = z
  .object({
    works: z.array(OpenLibraryWorkSchema).optional(),
  })
  .passthrough();

const OpenLibrarySearchResponseSchema = z
  .object({
    docs: z.array(OpenLibraryWorkSchema).optional(),
  })
  .passthrough();

export async function directOpenLibraryTrending(
  period: string,
  subject: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const fallbackSearch = () =>
    directOpenLibrarySearch(
      subject && subject !== 'trending' && subject !== 'all'
        ? subject
        : 'bestseller classic fiction',
      lang,
      page,
      signal,
    );

  const offset = (Math.max(1, page) - 1) * 24;
  const url =
    subject && subject !== 'all' && subject !== 'trending'
      ? `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=28&offset=${offset}`
      : `https://openlibrary.org/trending/${['daily', 'weekly', 'monthly'].includes(period) ? period : 'weekly'}.json?limit=28&page=${page}`;

  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return await fallbackSearch();
    const raw = await r.json();
    const parsed = OpenLibraryTrendingResponseSchema.safeParse(raw);
    const works = parsed.success && parsed.data.works ? parsed.data.works : [];
    if (works.length === 0) return await fallbackSearch();
    const out: BookItem[] = [];

    for (const w of works) {
      const coverId = w.cover_i || w.cover_id;
      const iaList = Array.isArray(w.ia) ? w.ia : w.ia ? [w.ia] : [];
      const iaId = iaList[0] || '';
      const authors = Array.isArray(w.author_name)
        ? w.author_name.join(', ')
        : Array.isArray(w.authors)
          ? w.authors.map((a) => a.name).filter(Boolean).join(', ')
          : 'Unknown Author';
      const langCode = Array.isArray(w.language) ? String(w.language[0] || '') : '';
      if (lang && lang !== 'all' && langCode && !langCode.toLowerCase().startsWith(lang.slice(0, 2))) {
        continue;
      }
      out.push({
        id: `ol_${String(w.key || '').replace('/works/', '') || Math.random().toString(36).slice(2)}`,
        title: w.title || 'Untitled',
        author: authors,
        year: w.first_publish_year || '',
        language: langCode || 'en',
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
        isbn: Array.isArray(w.isbn) ? w.isbn[0] : '',
        iaId,
        ext: iaId ? 'epub' : 'pdf',
        source: 'Open Library',
        downloads: w.edition_count ? Number(w.edition_count) * 120 : 100,
        directReadFormats: iaId
          ? { embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed` }
          : {},
      });
    }
    return out.length > 0 ? out : await fallbackSearch();
  } catch {
    return fallbackSearch();
  }
}

export async function directOpenLibrarySearch(
  q: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://openlibrary.org/search.json');
  u.searchParams.set('q', q);
  u.searchParams.set(
    'fields',
    'key,title,author_name,first_publish_year,isbn,cover_i,ia,ratings_average,edition_count,language,publisher,number_of_pages_median',
  );
  u.searchParams.set('limit', '24');
  if (page > 1) u.searchParams.set('page', String(page));

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const raw = await r.json();
  const parsed = OpenLibrarySearchResponseSchema.safeParse(raw);
  const docs = parsed.success && parsed.data.docs ? parsed.data.docs : [];
  const out: BookItem[] = [];

  for (const d of docs) {
    const iaList = Array.isArray(d.ia) ? d.ia : d.ia ? [d.ia] : [];
    const iaId = iaList[0] ? String(iaList[0]) : '';
    const isbn = Array.isArray(d.isbn) && d.isbn.length > 0 ? String(d.isbn[0]) : '';
    const langCode = Array.isArray(d.language) && d.language[0] ? String(d.language[0]) : 'en';
    if (lang && lang !== 'all' && !langCode.toLowerCase().startsWith(lang.slice(0, 2))) {
      continue;
    }
    out.push({
      id: `ol_${String(d.key || '').replace('/works/', '')}`,
      title: d.title || 'Untitled',
      author: Array.isArray(d.author_name) ? d.author_name.join(', ') : 'Unknown Author',
      year: d.first_publish_year || '',
      language: langCode,
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
      isbn,
      iaId,
      rating: d.ratings_average ? Number(d.ratings_average).toFixed(1) : '',
      pages: Number(d.number_of_pages_median) || 0,
      ext: iaId ? 'epub' : 'pdf',
      source: 'Open Library',
      downloads: (Number(d.edition_count) || 1) * 95,
      directReadFormats: iaId
        ? { embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed` }
        : {},
    });
  }
  return out;
}

export async function directGoogleBooksSearch(
  q: string,
  lang: string,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://www.googleapis.com/books/v1/volumes');
  u.searchParams.set('q', q);
  u.searchParams.set('maxResults', '20');
  u.searchParams.set('printType', 'books');
  if (lang && lang !== 'all') u.searchParams.set('langRestrict', lang.slice(0, 2));

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: Record<string, unknown>) => {
    const info = (item.volumeInfo || {}) as Record<string, unknown>;
    const accessInfo = (item.accessInfo || {}) as Record<string, unknown>;
    const identifiers = Array.isArray(info.industryIdentifiers)
      ? (info.industryIdentifiers as Array<{ type?: string; identifier?: string }>)
      : [];
    const isbn13 = identifiers.find((x) => x.type === 'ISBN_13')?.identifier;
    const isbn10 = identifiers.find((x) => x.type === 'ISBN_10')?.identifier;
    const imgLinks = (info.imageLinks || {}) as Record<string, string>;
    let cover =
      imgLinks.extraLarge || imgLinks.large || imgLinks.medium || imgLinks.thumbnail || '';
    if (cover) {
      cover = cover.replace(/^http:\/\//i, 'https://').replace(/&edge=curl/gi, '');
    }
    const webReader = String(accessInfo.webReaderLink || info.previewLink || '');
    return {
      id: `gb_${String(item.id)}`,
      title: String(info.title || 'Untitled'),
      author: Array.isArray(info.authors)
        ? (info.authors as string[]).join(', ')
        : String(info.publisher || 'Unknown Author'),
      year: info.publishedDate ? String(info.publishedDate).slice(0, 4) : '',
      language: String(info.language || 'en'),
      coverUrl: cover,
      isbn: isbn13 || isbn10 || '',
      description: stripHtml(String(info.description || '')).slice(0, 800),
      rating: info.averageRating ? String(info.averageRating) : '',
      pages: Number(info.pageCount) || 0,
      ext: 'pdf',
      source: 'Google Books',
      downloads: (Number(info.ratingsCount) || 1) * 55,
      directReadFormats: webReader ? { preview: webReader } : {},
    };
  });
}

export async function directOpenAlexSearch(
  q: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://api.openalex.org/works');
  u.searchParams.set('search', q);
  u.searchParams.set('per-page', '16');
  if (page > 1) u.searchParams.set('page', String(page));

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((w: Record<string, unknown>) => {
    const rawDoi = String(w.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
    const bestOa = (w.best_oa_location || {}) as Record<string, string>;
    const primLoc = (w.primary_location || {}) as Record<string, string>;
    const openAccess = (w.open_access || {}) as Record<string, string>;
    const pdfUrl = bestOa.pdf_url || primLoc.pdf_url || openAccess.oa_url || '';
    const authorships = Array.isArray(w.authorships)
      ? (w.authorships as Array<{ author?: { display_name?: string } }>)
      : [];
    const authors =
      authorships
        .slice(0, 4)
        .map((a) => a.author?.display_name)
        .filter(Boolean)
        .join(', ') || 'Academic Research';
    return {
      id: `oa_${String(w.id || '').replace('https://openalex.org/', '')}`,
      title: String(w.display_name || w.title || 'Research Paper'),
      author: authors,
      year: w.publication_year ? String(w.publication_year) : '',
      language: String(w.language || 'en'),
      doi: rawDoi,
      description: rawDoi
        ? `Academic work (${String(w.type || 'paper')}) · Cited by ${Number(w.cited_by_count) || 0} studies · DOI: ${rawDoi}`
        : `Academic work (${String(w.type || 'paper')}) · Cited by ${Number(w.cited_by_count) || 0} studies`,
      ext: 'pdf',
      source: 'OpenAlex',
      downloads: (Number(w.cited_by_count) || 0) * 10,
      directReadFormats: pdfUrl ? { pdf: pdfUrl } : {},
    };
  });
}
