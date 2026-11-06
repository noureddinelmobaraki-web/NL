/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import {
  type AudiobookItem,
  type BookItem,
  type BookMirrorBranch,
  type BookResolveResult,
  type DirectReadFormats,
  normalizeBookKey,
} from './types';
import {
  getSuperCacheAsync,
  getSuperCacheSync,
  setSuperCache,
  warmCoverImagesCache,
} from './cache';
import { directInternetArchiveAudiobooks } from './internetArchive';
import { directItunesAudiobooks, directLocAudio } from './librivox';
import {
  getCachedAudiobookByNormTitle,
  getCachedBookByNormTitle,
  normalizeTitleOnly,
  probedAudioForBookCache,
  probedBookForAudioCache,
  registerAudiobooksInCrossCache,
  registerBooksInCrossCache,
} from './crossMatch';
import { searchAllBooks } from '../booksAudioService';

export async function resolveBookDetails(
  book: BookItem,
  _signal?: AbortSignal,
): Promise<BookResolveResult> {
  const cacheKey = `resolve:${book.id || normalizeBookKey(book.title, book.author)}`;
  const cached = await getSuperCacheAsync<BookResolveResult>(cacheKey);
  if (cached?.value) return cached.value;

  const md5 = (book.md5 || '').trim().toLowerCase();
  const iaId = (book.iaId || '').trim();
  const isbn = (book.isbn || '').trim();
  const doi = (book.doi || '').trim().replace(/^https?:\/\/doi\.org\//i, '');
  const gutenbergId = (book.gutenbergId || '').trim();

  const directReadFormats: DirectReadFormats = { ...(book.directReadFormats || {}) };
  const mirrors: BookMirrorBranch[] = [];

  if (iaId) {
    directReadFormats.embed = `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`;
    mirrors.push({
      id: 'ia-embed',
      label: 'Direct Digital Reader',
      host: 'archive.org',
      url: `https://archive.org/details/${encodeURIComponent(iaId)}`,
      badge: 'Direct Read',
    });
  }

  if (gutenbergId) {
    if (!directReadFormats.html) {
      directReadFormats.html = `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}.html.images`;
    }
    if (!directReadFormats.epub) {
      directReadFormats.epub = `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}.epub3.images`;
    }
    mirrors.push({
      id: 'gutenberg-main',
      label: 'EPUB & Web Edition',
      host: 'gutenberg.org',
      url: `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}`,
      badge: 'Full Edition',
    });
  }

  const queryStr =
    isbn || `${book.title} ${book.author !== 'Unknown Author' ? book.author : ''}`.trim();
  mirrors.push({
    id: 'openlibrary-link',
    label: 'Digital Edition Gateway',
    host: 'openlibrary.org',
    url: `https://openlibrary.org/search?q=${encodeURIComponent(queryStr)}`,
    badge: 'Full Text',
  });

  const result: BookResolveResult = {
    md5,
    iaId,
    isbn,
    doi,
    gutenbergId,
    downloads: book.downloads || 0,
    directReadFormats,
    mirrors,
  };
  void setSuperCache(cacheKey, result, true);
  return result;
}

export function getCachedAudiobooksCatalogSync(params: {
  q?: string;
  genre?: string;
  lang?: string;
  page?: number;
}): AudiobookItem[] | null {
  const q = (params.q || '').trim().toLowerCase();
  const genre = (params.genre || 'popular').trim();
  const lang = (params.lang || 'all').trim();
  const page = params.page || 1;
  return getSuperCacheSync<AudiobookItem[]>(`audiobooks:catalog:${q}:${genre}:${lang}:${page}`);
}

export async function fetchAudiobooksCatalog(params: {
  q?: string;
  genre?: string;
  lang?: string;
  page?: number;
  signal?: AbortSignal;
}): Promise<AudiobookItem[]> {
  const q = (params.q || '').trim();
  const genre = (params.genre || 'popular').trim();
  const lang = (params.lang || 'all').trim();
  const page = params.page || 1;

  const cacheKey = `audiobooks:catalog:${q.toLowerCase()}:${genre}:${lang}:${page}`;
  const cached = await getSuperCacheAsync<AudiobookItem[]>(cacheKey);
  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    registerAudiobooksInCrossCache(cached.value);
    warmCoverImagesCache(cached.value.map((a) => a.coverUrl));
    if (Date.now() - cached.updatedAt < 45 * 60 * 1000) return cached.value;
  }

  const settled = await Promise.allSettled([
    directInternetArchiveAudiobooks(q, genre, lang, page, params.signal),
    directItunesAudiobooks(q, genre, params.signal),
    directLocAudio(q, genre, params.signal),
  ]);

  const [iaRes, itunesRes, locRes] = settled.map((s) =>
    s.status === 'fulfilled' ? s.value : [],
  );
  const combined: AudiobookItem[] = [];
  const seen = new Set<string>();
  for (const item of [...iaRes, ...itunesRes, ...locRes]) {
    if (!item || !item.title) continue;
    const key = item.iaId ? `ia:${item.iaId}` : normalizeBookKey(item.title, item.author);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  if (combined.length > 0) {
    registerAudiobooksInCrossCache(combined);
    warmCoverImagesCache(combined.map((a) => a.coverUrl));
    void setSuperCache(cacheKey, combined);
  }
  return combined;
}

export async function probeAudiobookForBook(
  book: BookItem,
  signal?: AbortSignal,
): Promise<AudiobookItem | null> {
  const norm = normalizeTitleOnly(book.title);
  if (!norm) return null;
  const cached = getCachedAudiobookByNormTitle(norm);
  if (cached) return cached;
  if (probedAudioForBookCache.has(norm)) return probedAudioForBookCache.get(norm) ?? null;

  try {
    const cleanTitle = book.title.replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
    const results = await fetchAudiobooksCatalog({ q: cleanTitle, page: 1, signal });
    registerAudiobooksInCrossCache(results);
    const match = results[0] || null;
    probedAudioForBookCache.set(norm, match);
    return match;
  } catch {
    return null;
  }
}

export async function probeWrittenBookForAudiobook(
  audio: AudiobookItem,
  signal?: AbortSignal,
): Promise<BookItem | null> {
  const norm = normalizeTitleOnly(audio.title);
  if (!norm) return null;
  const cached = getCachedBookByNormTitle(norm);
  if (cached) return cached;
  if (probedBookForAudioCache.has(norm)) return probedBookForAudioCache.get(norm) ?? null;

  try {
    const cleanTitle = audio.title
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .trim();
    const results = await searchAllBooks({ q: cleanTitle, page: 1, signal });
    registerBooksInCrossCache(results);
    const match = results[0] || null;
    probedBookForAudioCache.set(norm, match);
    return match;
  } catch {
    return null;
  }
}
