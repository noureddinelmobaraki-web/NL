/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';
import type { BookItem } from './types';

const GutendexBookSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().optional(),
    authors: z
      .array(
        z.object({
          name: z.string().optional(),
          birth_year: z.number().nullable().optional(),
        }),
      )
      .optional(),
    formats: z.record(z.string(), z.string()).optional(),
    summaries: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    download_count: z.number().optional(),
  })
  .passthrough();

const GutendexResponseSchema = z
  .object({
    results: z.array(GutendexBookSchema).optional(),
  })
  .passthrough();

/**
 * Curated Standard Ebooks & Arabic Public Domain Classics (with direct EPUB/Embed support)
 */
export const STANDARD_EBOOKS_AND_ARABIC_CLASSICS: readonly BookItem[] = [
  {
    id: 'se_meditations_aurelius',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    year: 180,
    language: 'en',
    coverUrl: 'https://covers.openlibrary.org/b/id/8235116-L.jpg',
    gutenbergId: '2680',
    iaId: 'meditations00marc',
    ext: 'epub',
    source: 'Standard Ebooks',
    downloads: 94000,
    directReadFormats: {
      epub: 'https://www.gutenberg.org/ebooks/2680.epub3.images',
      html: 'https://www.gutenberg.org/ebooks/2680.html.images',
      embed: 'https://archive.org/embed/meditations00marc?ui=embed',
    },
  },
  {
    id: 'se_monte_cristo',
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    year: 1844,
    language: 'en',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231996-L.jpg',
    gutenbergId: '1184',
    ext: 'epub',
    source: 'Standard Ebooks',
    downloads: 112000,
    directReadFormats: {
      epub: 'https://www.gutenberg.org/ebooks/1184.epub3.images',
      html: 'https://www.gutenberg.org/ebooks/1184.html.images',
    },
  },
  {
    id: 'ar_muqaddimah_khaldun',
    title: 'مقدمة ابن خلدون — The Muqaddimah',
    author: 'ابن خلدون (Ibn Khaldun)',
    year: 1377,
    language: 'ar',
    coverUrl: 'https://covers.openlibrary.org/b/id/8319253-L.jpg',
    iaId: 'MuqaddimahIbnKhaldun',
    ext: 'pdf',
    source: 'التراث العربي الحر',
    downloads: 88000,
    directReadFormats: {
      embed: 'https://archive.org/embed/MuqaddimahIbnKhaldun?ui=embed',
    },
  },
  {
    id: 'ar_alf_layla_wa_layla',
    title: 'ألف ليلة وليلة — One Thousand and One Nights',
    author: 'التراث العربي الكلاسيكي',
    year: 1706,
    language: 'ar',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    iaId: 'alf-layla-wa-layla',
    ext: 'pdf',
    source: 'التراث العربي الحر',
    downloads: 92000,
    directReadFormats: {
      embed: 'https://archive.org/embed/alf-layla-wa-layla?ui=embed',
    },
  },
  {
    id: 'ar_kalila_wa_dimna',
    title: 'كليلة ودمنة — Kalila and Dimna',
    author: 'عبد الله بن المقفع (Ibn al-Muqaffa)',
    year: 750,
    language: 'ar',
    coverUrl: 'https://covers.openlibrary.org/b/id/8225631-L.jpg',
    iaId: 'kalilawadimna00bidp',
    ext: 'pdf',
    source: 'التراث العربي الحر',
    downloads: 67000,
    directReadFormats: {
      embed: 'https://archive.org/embed/kalilawadimna00bidp?ui=embed',
    },
  },
  {
    id: 'ar_risalat_al_ghufran',
    title: 'رسالة الغفران —The Epistle of Forgiveness',
    author: 'أبو العلاء المعري (Al-Ma’arri)',
    year: 1033,
    language: 'ar',
    coverUrl: 'https://covers.openlibrary.org/b/id/8244150-L.jpg',
    iaId: 'risalatalghufran00maar',
    ext: 'pdf',
    source: 'التراث العربي الحر',
    downloads: 54000,
    directReadFormats: {
      embed: 'https://archive.org/embed/risalatalghufran00maar?ui=embed',
    },
  },
];

export function getCuratedStandardAndArabicBooks(
  query: string,
  lang: string,
): BookItem[] {
  const q = query.trim().toLowerCase();
  return STANDARD_EBOOKS_AND_ARABIC_CLASSICS.filter((item) => {
    if (lang && lang !== 'all' && item.language !== lang.slice(0, 2).toLowerCase()) {
      return false;
    }
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q)
    );
  });
}

export async function directGutendexBooks(
  query: string,
  lang: string,
  topic: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://gutendex.com/books/');
  u.searchParams.set('sort', 'popular');
  if (page > 1) u.searchParams.set('page', String(page));
  if (query) u.searchParams.set('search', query);
  if (topic && topic !== 'all' && topic !== 'trending') u.searchParams.set('topic', topic);
  if (lang && lang !== 'all') u.searchParams.set('languages', lang.slice(0, 2).toLowerCase());

  const curated = page === 1 ? getCuratedStandardAndArabicBooks(query, lang) : [];

  try {
    const r = await fetch(u.toString(), { signal });
    if (!r.ok) return curated;
    const raw = await r.json();
    const parsed = GutendexResponseSchema.safeParse(raw);
    const results = parsed.success && parsed.data.results ? parsed.data.results : [];

    const mapped: BookItem[] = results.map((b) => {
      const formats = b.formats || {};
      const coverUrl = formats['image/jpeg'] || '';
      const epubUrl = formats['application/epub+zip'] || '';
      const htmlUrl = formats['text/html'] || formats['text/html; charset=utf-8'] || '';
      const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'] || '';
      const rawAuthors = b.authors || [];
      const authors = rawAuthors.map((a) => a.name).filter(Boolean).join(', ') || 'Classic Edition';
      const summaries = b.summaries || [];
      const langs = b.languages || [];
      return {
        id: `gut_${String(b.id)}`,
        title: String(b.title || 'Untitled'),
        author: authors,
        year: rawAuthors[0]?.birth_year ? String(rawAuthors[0].birth_year) : '',
        language: langs[0] || 'en',
        coverUrl,
        gutenbergId: String(b.id),
        description: summaries[0] || '',
        ext: epubUrl ? 'epub' : 'html',
        source: 'Gutenberg',
        downloads: Number(b.download_count) || 0,
        directReadFormats: {
          ...(epubUrl ? { epub: epubUrl } : {}),
          ...(htmlUrl ? { html: htmlUrl } : {}),
          ...(txtUrl ? { txt: txtUrl } : {}),
        },
      };
    });

    return [...curated, ...mapped];
  } catch {
    return curated;
  }
}
