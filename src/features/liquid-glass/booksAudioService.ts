/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Modularized Books & Audiobooks Orchestrator (delegating to ./services/*).
 */

import { WORKER_ENDPOINT } from '../../services/videoExtractor';
import {
  type AudiobookChapter,
  type AudiobookItem,
  type BookItem,
  type BookMirrorBranch,
  type BookResolveResult,
  type DirectReadFormats,
  getBookArtisticPalette,
  normalizeBookKey,
} from './services/types';
import {
  getSuperCacheAsync,
  getSuperCacheSync,
  setSuperCache,
  warmCoverImagesCache,
} from './services/cache';
import {
  directGoogleBooksSearch,
  directOpenAlexSearch,
  directOpenLibrarySearch,
  directOpenLibraryTrending,
} from './services/openLibrary';
import { directGutendexBooks } from './services/gutendex';
import { directInternetArchiveTexts } from './services/internetArchive';
import { fetchAudiobookChapters } from './services/librivox';
import {
  getInstantAudiobookMatchForBook,
  getInstantBookMatchForAudiobook,
  registerAudiobooksInCrossCache,
  registerBooksInCrossCache,
} from './services/crossMatch';

export {
  type AudiobookChapter,
  type AudiobookItem,
  type BookItem,
  type BookMirrorBranch,
  type BookResolveResult,
  type DirectReadFormats,
  fetchAudiobookChapters,
  getBookArtisticPalette,
  getInstantAudiobookMatchForBook,
  getInstantBookMatchForAudiobook,
  getSuperCacheSync,
  registerAudiobooksInCrossCache,
  registerBooksInCrossCache,
  warmCoverImagesCache,
};

const WORKER_BASE = WORKER_ENDPOINT.replace(/\/+$/, '');

export const SUBJECT_CATEGORY_MAP: Record<string, string> = {
  trending: '',
  all: '',
  literature: 'literature',
  manga: 'comic_books',
  comics: 'comic_books',
  history: 'history',
  scifi: 'science_fiction',
  philosophy: 'philosophy',
  mystery: 'mystery_and_detective_stories',
  science: 'science',
  fantasy: 'fantasy',
  biography: 'biography',
  computer_science: 'computer_science',
  papers: 'science',
  arabic: 'arabic_literature',
};

export function mergeAndEnrichBooks(lists: BookItem[][]): BookItem[] {
  const byKey = new Map<string, BookItem>();
  const byIsbn = new Map<string, BookItem>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.title) continue;
      const cleanIsbn = String(item.isbn || '').replace(/[^0-9Xx]/g, '');
      const normKey = normalizeBookKey(item.title, item.author);
      const existing = (cleanIsbn ? byIsbn.get(cleanIsbn) : undefined) || byKey.get(normKey);

      if (!existing) {
        const entry: BookItem = {
          ...item,
          isbn: cleanIsbn || item.isbn || '',
          sources: item.sources?.length
            ? [...item.sources]
            : item.source
              ? [item.source]
              : [],
          directReadFormats: { ...(item.directReadFormats || {}) },
        };
        byKey.set(normKey, entry);
        if (cleanIsbn) byIsbn.set(cleanIsbn, entry);
      } else {
        if (!existing.coverUrl && item.coverUrl) existing.coverUrl = item.coverUrl;
        if ((!existing.description || existing.description.length < 40) && item.description) {
          existing.description = item.description;
        }
        if (!existing.isbn && cleanIsbn) {
          existing.isbn = cleanIsbn;
          byIsbn.set(cleanIsbn, existing);
        }
        if (!existing.md5 && item.md5) existing.md5 = item.md5;
        if (!existing.iaId && item.iaId) existing.iaId = item.iaId;
        if (!existing.gutenbergId && item.gutenbergId) existing.gutenbergId = item.gutenbergId;
        if (!existing.doi && item.doi) existing.doi = item.doi;
        if (item.directReadFormats) {
          existing.directReadFormats = {
            ...item.directReadFormats,
            ...existing.directReadFormats,
          };
        }
      }
    }
  }

  return Array.from(byKey.values());
}

function filterBooksByExt(books: BookItem[], ext?: string): BookItem[] {
  if (!ext || ext === 'all') return books;
  if (ext === 'inapp') {
    return books.filter(
      (b) =>
        Boolean(b.iaId) ||
        Boolean(b.gutenbergId) ||
        Boolean(b.directReadFormats?.embed) ||
        Boolean(b.directReadFormats?.pdf) ||
        Boolean(b.directReadFormats?.epub) ||
        Boolean(b.directReadFormats?.html) ||
        Boolean(b.directReadFormats?.preview),
    );
  }
  return books.filter((b) => String(b.ext || '').toLowerCase() === ext.toLowerCase());
}

export function getCachedBooksCatalogSync(params: {
  q?: string;
  period?: string;
  category?: string;
  lang?: string;
  ext?: string;
  page?: number;
}): BookItem[] | null {
  const q = (params.q || '').trim().toLowerCase();
  const period = params.period || 'weekly';
  const category = params.category || 'trending';
  const lang = params.lang || 'all';
  const ext = params.ext || 'all';
  const page = params.page || 1;
  const cacheKey = q
    ? `books:search:${q}:${category}:${lang}:${ext}:${page}`
    : `books:trending:${period}:${category}:${lang}:${ext}:${page}`;
  return getSuperCacheSync<BookItem[]>(cacheKey);
}

export async function fetchTrendingBooks(params: {
  period?: 'daily' | 'weekly' | 'monthly';
  category?: string;
  lang?: string;
  ext?: string;
  page?: number;
  signal?: AbortSignal;
}): Promise<BookItem[]> {
  const period = params.period || 'weekly';
  const category = params.category || 'trending';
  const subject = SUBJECT_CATEGORY_MAP[category] || '';
  const lang = category === 'arabic' ? 'ar' : params.lang || 'all';
  const ext = params.ext || 'all';
  const page = params.page || 1;

  const cacheKey = `books:trending:${period}:${category}:${lang}:${ext}:${page}`;
  const cached = await getSuperCacheAsync<BookItem[]>(cacheKey);
  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    registerBooksInCrossCache(cached.value);
    warmCoverImagesCache(cached.value.map((b) => b.coverUrl));
    if (Date.now() - cached.updatedAt < 45 * 60 * 1000) {
      return cached.value;
    }
  }

  const fetchFresh = async (): Promise<BookItem[]> => {
    try {
      const u = new URL(`${WORKER_BASE}/books/trending`);
      u.searchParams.set('period', period);
      if (subject) u.searchParams.set('subject', subject);
      if (lang !== 'all') u.searchParams.set('lang', lang);
      u.searchParams.set('page', String(page));

      const res = await fetch(u.toString(), { signal: params.signal });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.books) && json.books.length > 0) {
          const filtered = filterBooksByExt(json.books, ext);
          registerBooksInCrossCache(filtered);
          warmCoverImagesCache(filtered.map((b) => b.coverUrl));
          void setSuperCache(cacheKey, filtered);
          return filtered;
        }
      }
    } catch {
      /* fallback */
    }

    if (category === 'papers') {
      const papers = await directOpenAlexSearch(
        'artificial intelligence physics philosophy',
        page,
        params.signal,
      );
      const filtered = filterBooksByExt(papers, ext);
      registerBooksInCrossCache(filtered);
      void setSuperCache(cacheKey, filtered);
      return filtered;
    }

    const isManga = category === 'manga' || category === 'comics';
    const settled = await Promise.allSettled([
      directOpenLibraryTrending(period, subject, lang, page, params.signal),
      directGutendexBooks('', lang, subject, page, params.signal),
      directInternetArchiveTexts(
        isManga ? 'manga OR comic' : '',
        subject,
        lang,
        page,
        params.signal,
      ),
      ...(isManga ? [directGoogleBooksSearch('manga graphic novel', lang, params.signal)] : []),
      ...(lang === 'ar'
        ? [directGoogleBooksSearch(subject || 'أدب روايات فلسفة تاريخ', 'ar', params.signal)]
        : []),
    ]);

    const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
    const merged = mergeAndEnrichBooks(lists);
    const filtered = filterBooksByExt(merged, ext);
    if (filtered.length > 0) {
      registerBooksInCrossCache(filtered);
      warmCoverImagesCache(filtered.map((b) => b.coverUrl));
      void setSuperCache(cacheKey, filtered);
    }
    return filtered;
  };

  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    void fetchFresh().catch(() => {});
    return cached.value;
  }

  return fetchFresh();
}

export async function searchAllBooks(params: {
  q: string;
  category?: string;
  ext?: string;
  lang?: string;
  sort?: string;
  page?: number;
  signal?: AbortSignal;
}): Promise<BookItem[]> {
  const q = params.q.trim();
  if (!q) return fetchTrendingBooks(params);
  const category = params.category || 'all';
  const ext = params.ext || 'all';
  const lang = params.lang || 'all';
  const sort = params.sort || 'popular';
  const page = params.page || 1;

  const cacheKey = `books:search:${q.toLowerCase()}:${category}:${lang}:${ext}:${page}`;
  const cached = await getSuperCacheAsync<BookItem[]>(cacheKey);
  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    registerBooksInCrossCache(cached.value);
    warmCoverImagesCache(cached.value.map((b) => b.coverUrl));
    if (Date.now() - cached.updatedAt < 60 * 60 * 1000) {
      return cached.value;
    }
  }

  try {
    const u = new URL(`${WORKER_BASE}/books/search`);
    u.searchParams.set('q', q);
    u.searchParams.set('category', category);
    u.searchParams.set('ext', ext);
    u.searchParams.set('lang', lang);
    u.searchParams.set('sort', sort);
    u.searchParams.set('page', String(page));

    const res = await fetch(u.toString(), { signal: params.signal });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.books) && json.books.length > 0) {
        const filtered = filterBooksByExt(json.books, ext);
        registerBooksInCrossCache(filtered);
        warmCoverImagesCache(filtered.map((b) => b.coverUrl));
        void setSuperCache(cacheKey, filtered);
        return filtered;
      }
    }
  } catch {
    /* fallback */
  }

  const settled = await Promise.allSettled([
    directGoogleBooksSearch(q, lang, params.signal),
    directOpenLibrarySearch(q, lang, page, params.signal),
    directGutendexBooks(q, lang, '', page, params.signal),
    directInternetArchiveTexts(q, '', lang, page, params.signal),
    directOpenAlexSearch(q, page, params.signal),
  ]);

  const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
  const merged = mergeAndEnrichBooks(lists);
  const filtered = filterBooksByExt(merged, ext);
  if (filtered.length > 0) {
    registerBooksInCrossCache(filtered);
    warmCoverImagesCache(filtered.map((b) => b.coverUrl));
    void setSuperCache(cacheKey, filtered);
  }
  return filtered;
}

export {
  fetchAudiobooksCatalog,
  getCachedAudiobooksCatalogSync,
  probeAudiobookForBook,
  probeWrittenBookForAudiobook,
  resolveBookDetails,
} from './services/audiobooksCatalog';

