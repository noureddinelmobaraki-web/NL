/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Standard Ebooks Curated & Live OPDS/Archive Client
 * - Fetches finely typeset, public-domain literary editions from Standard Ebooks & Gutendex
 */

import { type BookItem, stripHtml } from './types';

const CURATED_STANDARD_EBOOKS: BookItem[] = [
  {
    id: 'se-monte-cristo',
    title: 'The Count of Monte Cristo (Standard Ebooks Deluxe)',
    author: 'Alexandre Dumas',
    year: 1844,
    language: 'en',
    coverUrl:
      'https://standardebooks.org/images/covers/alexandre-dumas_the-count-of-monte-cristo_william-robson-9614b9ef.jpg',
    description:
      'Carefully typeset edition of Edmond Dantès’s epic tale of betrayal, imprisonment in the Château d’If, and calculated vengeance.',
    ext: 'epub',
    source: 'Standard Ebooks',
    sources: ['Standard Ebooks'],
    gutenbergId: '1184',
    directReadFormats: {
      html: 'https://www.gutenberg.org/files/1184/1184-h/1184-h.htm',
      epub: 'https://www.gutenberg.org/ebooks/1184.epub.images',
    },
  },
  {
    id: 'se-crime-and-punishment',
    title: 'Crime and Punishment (Standard Ebooks Deluxe)',
    author: 'Fyodor Dostoevsky',
    year: 1866,
    language: 'en',
    coverUrl:
      'https://www.gutenberg.org/cache/epub/2554/pg2554.cover.medium.jpg',
    description:
      'Psychological masterwork following Rodion Raskolnikov through Saint Petersburg.',
    ext: 'epub',
    source: 'Standard Ebooks',
    sources: ['Standard Ebooks'],
    gutenbergId: '2554',
    directReadFormats: {
      html: 'https://www.gutenberg.org/files/2554/2554-h/2554-h.htm',
      epub: 'https://www.gutenberg.org/ebooks/2554.epub.images',
    },
  },
  {
    id: 'se-sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes (Standard Ebooks)',
    author: 'Arthur Conan Doyle',
    year: 1892,
    language: 'en',
    coverUrl:
      'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
    description:
      'Twelve classic cases of consulting detective Sherlock Holmes and Dr. John Watson.',
    ext: 'epub',
    source: 'Standard Ebooks',
    sources: ['Standard Ebooks'],
    gutenbergId: '1661',
    directReadFormats: {
      html: 'https://www.gutenberg.org/files/1661/1661-h/1661-h.htm',
      epub: 'https://www.gutenberg.org/ebooks/1661.epub.images',
    },
  },
];

export async function fetchStandardEbooksCatalog(
  query = '',
  page = 1,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const cleanQ = query.trim();
  const baseFilter =
    '(creator:("Standard Ebooks") OR collection:(standardebooks) OR subject:("Standard Ebooks")) AND mediatype:(texts)';
  const fullQuery = cleanQ ? `${baseFilter} AND (${cleanQ})` : baseFilter;

  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', fullQuery);
  for (const field of [
    'identifier',
    'title',
    'creator',
    'date',
    'description',
    'downloads',
  ]) {
    u.searchParams.append('fl[]', field);
  }
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '24');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return CURATED_STANDARD_EBOOKS;
    const json = await res.json();
    const docs: Record<string, unknown>[] = json?.response?.docs || [];

    const mapped: BookItem[] = docs
      .map((doc): BookItem | null => {
        const identifier = String(doc.identifier || '').trim();
        const title = String(doc.title || '').trim();
        if (!identifier || !title) return null;

        const creatorRaw = doc.creator;
        const author = Array.isArray(creatorRaw)
          ? String(creatorRaw[0] || 'Standard Ebooks')
          : String(creatorRaw || 'Standard Ebooks');

        return {
          id: `se-${identifier}`,
          iaId: identifier,
          title,
          author,
          year: doc.date ? String(doc.date).slice(0, 4) : undefined,
          language: 'en',
          coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
          description: stripHtml(
            Array.isArray(doc.description)
              ? String(doc.description[0] || '')
              : String(doc.description || ''),
          ).slice(0, 280),
          downloads: Number(doc.downloads) || 250,
          ext: 'epub',
          source: 'Standard Ebooks',
          sources: ['Standard Ebooks'],
          directReadFormats: {
            embed: `https://archive.org/embed/${encodeURIComponent(identifier)}?ui=embed`,
          },
        };
      })
      .filter(Boolean) as BookItem[];

    return page === 1 && !cleanQ
      ? [...CURATED_STANDARD_EBOOKS, ...mapped]
      : mapped.length > 0
        ? mapped
        : CURATED_STANDARD_EBOOKS;
  } catch {
    return CURATED_STANDARD_EBOOKS;
  }
}
