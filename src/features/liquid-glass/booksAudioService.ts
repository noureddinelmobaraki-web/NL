/**
 * src/features/liquid-glass/booksAudioService.ts
 *
 * Hybrid Open-Source Harvester, Bidirectional Cross-Linker & Multi-Tier Browser Super Cache
 * for NL Books & Audio Books:
 *  - Tier 0: Synchronous In-Memory LRU Map (0ms instant read)
 *  - Tier 1: Persistent Boot Cache in localStorage (`nl_supercache_boot_v2`) for instant first-frame render
 *  - Tier 2: Persistent IndexedDB (`nl_liquid_supercache_v2`) for catalogs, search queries, resolved reader
 *            manifests, audiobook chapter lists, and bidirectional book <-> audiobook cross-links
 *  - Tier 3: Browser CacheStorage (`nl-books-covers-v1`) warm-caching for book & audiobook cover art
 *  - Network Layer: Queries Cloudflare Worker routes first, with automatic parallel fallback across
 *    Open Library, Project Gutenberg (Gutendex), Internet Archive, Google Books, OpenAlex, LibriVox,
 *    Apple Books / iTunes, and Library of Congress.
 */

import { WORKER_ENDPOINT } from '../../services/videoExtractor';

export interface DirectReadFormats {
  embed?: string;
  pdf?: string;
  epub?: string;
  html?: string;
  txt?: string;
  preview?: string;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  year?: string | number;
  language?: string;
  coverUrl?: string;
  isbn?: string;
  md5?: string;
  iaId?: string;
  gutenbergId?: string;
  doi?: string;
  description?: string;
  rating?: string;
  pages?: number;
  filesize?: string;
  ext?: string;
  source?: string;
  sources?: string[];
  downloads?: number;
  directReadFormats?: DirectReadFormats;
}

export interface BookMirrorBranch {
  id: string;
  label: string;
  host: string;
  url: string;
  badge: string;
  latencyMs?: number;
  status?: 'checking' | 'online' | 'ready';
}

export interface BookResolveResult {
  md5?: string;
  iaId?: string;
  isbn?: string;
  doi?: string;
  gutenbergId?: string;
  downloads?: number;
  directReadFormats: DirectReadFormats;
  mirrors: BookMirrorBranch[];
}

export interface AudiobookItem {
  id: string;
  librivoxId?: string;
  iaId?: string;
  title: string;
  author: string;
  description?: string;
  language?: string;
  runtime?: string;
  year?: string | number;
  coverUrl?: string;
  fallbackCoverUrl?: string;
  source: string;
  downloads?: number;
  chapterCount?: number;
  rssUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
}

export interface AudiobookChapter {
  index: number;
  title: string;
  url: string;
  duration: number;
  size?: number;
  format?: string;
}

const WORKER_BASE = WORKER_ENDPOINT.replace(/\/+$/, '');

// ============================================================================
// Multi-Tier Browser Super Cache Engine (Memory + localStorage + IndexedDB + CacheStorage)
// ============================================================================
const IDB_NAME = 'nl_liquid_supercache_v2';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_entries';
const BOOT_STORAGE_KEY = 'nl_supercache_boot_v2';
const COVER_CACHE_NAME = 'nl-books-covers-v1';

interface SuperCacheEntry<T> {
  key: string;
  value: T;
  updatedAt: number;
  immutable?: boolean;
}

const memorySuperCache = new Map<string, SuperCacheEntry<unknown>>();
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openSuperCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

function hydrateBootSuperCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(BOOT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, SuperCacheEntry<unknown>>;
    for (const [k, entry] of Object.entries(parsed)) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        memorySuperCache.set(k, entry);
      }
    }
  } catch {
    /* ignore */
  }
}

hydrateBootSuperCache();

function persistBootEntry<T>(key: string, entry: SuperCacheEntry<T>): void {
  if (typeof window === 'undefined') return;
  // Keep essential boot keys in localStorage for 0ms synchronous startup
  if (
    !key.startsWith('books:trending:') &&
    !key.startsWith('audiobooks:catalog::') &&
    !key.startsWith('resolve:') &&
    !key.startsWith('chapters:')
  ) {
    return;
  }
  try {
    const raw = window.localStorage.getItem(BOOT_STORAGE_KEY);
    const map: Record<string, SuperCacheEntry<unknown>> = raw ? JSON.parse(raw) : {};
    map[key] = entry;
    const keys = Object.keys(map);
    if (keys.length > 28) {
      keys
        .sort((a, b) => (map[a]?.updatedAt || 0) - (map[b]?.updatedAt || 0))
        .slice(0, keys.length - 28)
        .forEach((oldKey) => delete map[oldKey]);
    }
    window.localStorage.setItem(BOOT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function getSuperCacheSync<T>(key: string): T | null {
  const hit = memorySuperCache.get(key) as SuperCacheEntry<T> | undefined;
  return hit ? hit.value : null;
}

async function getSuperCacheAsync<T>(key: string): Promise<SuperCacheEntry<T> | null> {
  const mem = memorySuperCache.get(key) as SuperCacheEntry<T> | undefined;
  if (mem) return mem;

  const db = await openSuperCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result as SuperCacheEntry<T> | undefined;
        if (res) {
          memorySuperCache.set(key, res);
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setSuperCache<T>(key: string, value: T, immutable = false): Promise<void> {
  const entry: SuperCacheEntry<T> = {
    key,
    value,
    updatedAt: Date.now(),
    immutable,
  };
  memorySuperCache.set(key, entry);
  persistBootEntry(key, entry);

  const db = await openSuperCacheDB();
  if (!db) return;

  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry);
  } catch {
    /* ignore */
  }
}

const warmedCoverUrls = new Set<string>();
export function warmCoverImagesCache(urls: Array<string | undefined>): void {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const valid = urls
    .filter((u): u is string => Boolean(u && u.startsWith('https://')))
    .filter((u) => !warmedCoverUrls.has(u))
    .slice(0, 18);

  if (valid.length === 0) return;
  valid.forEach((u) => warmedCoverUrls.add(u));

  void window.caches
    .open(COVER_CACHE_NAME)
    .then(async (cache) => {
      for (const url of valid) {
        try {
          const match = await cache.match(url);
          if (!match) {
            const req = new Request(url, { mode: 'no-cors' });
            const res = await fetch(req);
            await cache.put(req, res);
          }
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
}

// ============================================================================
// String & Metadata Normalization Helpers
// ============================================================================
function stripHtml(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBookKey(title?: string, author?: string): string {
  const t = String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 48);
  const a = String(author || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 24);
  return `${t}__${a}`;
}

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
        if (!existing.year && item.year) existing.year = item.year;
        if (!existing.language && item.language) existing.language = item.language;
        if (!existing.rating && item.rating) existing.rating = item.rating;
        if (!existing.pages && item.pages) existing.pages = item.pages;
        if (!existing.filesize && item.filesize) existing.filesize = item.filesize;
        if ((!existing.ext || existing.ext === 'book') && item.ext) existing.ext = item.ext;
        if (item.downloads && (!existing.downloads || item.downloads > existing.downloads)) {
          existing.downloads = item.downloads;
        }
        if (item.directReadFormats) {
          existing.directReadFormats = {
            ...item.directReadFormats,
            ...existing.directReadFormats,
          };
        }
        if (item.source && existing.sources && !existing.sources.includes(item.source)) {
          existing.sources.push(item.source);
        }
      }
    }
  }

  return Array.from(byKey.values());
}

// ============================================================================
// Direct Open-Source Client Harvesters (Seamless Fallback + Instant Live Data)
// ============================================================================
async function directOpenLibraryTrending(
  period: string,
  subject: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const offset = (Math.max(1, page) - 1) * 24;
  const url =
    subject && subject !== 'all' && subject !== 'trending'
      ? `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=28&offset=${offset}`
      : `https://openlibrary.org/trending/${['daily', 'weekly', 'monthly'].includes(period) ? period : 'weekly'}.json?limit=28&page=${page}`;

  const r = await fetch(url, { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const works = Array.isArray(data.works) ? data.works : [];
  const out: BookItem[] = [];

  for (const w of works) {
    const coverId = w.cover_i || w.cover_id;
    const iaList = Array.isArray(w.ia) ? w.ia : w.ia ? [w.ia] : [];
    const iaId = iaList[0] || '';
    const authors = Array.isArray(w.author_name)
      ? w.author_name.join(', ')
      : Array.isArray(w.authors)
        ? w.authors.map((a: { name?: string }) => a.name).filter(Boolean).join(', ')
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
  return out;
}

async function directGutendexBooks(
  query: string,
  lang: string,
  topic: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://gutendex.com/books');
  u.searchParams.set('sort', 'popular');
  if (page > 1) u.searchParams.set('page', String(page));
  if (query) u.searchParams.set('search', query);
  if (topic && topic !== 'all' && topic !== 'trending') u.searchParams.set('topic', topic);
  if (lang && lang !== 'all') u.searchParams.set('languages', lang.slice(0, 2).toLowerCase());

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((b: Record<string, unknown>) => {
    const formats = (b.formats || {}) as Record<string, string>;
    const coverUrl = formats['image/jpeg'] || '';
    const epubUrl = formats['application/epub+zip'] || '';
    const htmlUrl = formats['text/html'] || formats['text/html; charset=utf-8'] || '';
    const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'] || '';
    const rawAuthors = Array.isArray(b.authors) ? (b.authors as Array<{ name?: string; birth_year?: number }>) : [];
    const authors = rawAuthors.map((a) => a.name).filter(Boolean).join(', ') || 'Classic Edition';
    const summaries = Array.isArray(b.summaries) ? (b.summaries as string[]) : [];
    const langs = Array.isArray(b.languages) ? (b.languages as string[]) : [];
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
}

async function directInternetArchiveTexts(
  query: string,
  subject: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const qParts = ['mediatype:texts', 'NOT collection:inlibrary'];
  if (query) qParts.push(`(${query})`);
  if (subject && subject !== 'all' && subject !== 'trending') qParts.push(`subject:(${subject})`);
  if (lang && lang !== 'all') {
    const langMap: Record<string, string> = {
      ar: 'Arabic OR ara',
      en: 'English OR eng',
      fr: 'French OR fre',
      es: 'Spanish OR spa',
      de: 'German OR ger',
      ja: 'Japanese OR jpn',
    };
    qParts.push(`language:(${langMap[lang] || lang})`);
  }
  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', qParts.join(' AND '));
  ['identifier', 'title', 'creator', 'downloads', 'year', 'language', 'description'].forEach((f) =>
    u.searchParams.append('fl[]', f),
  );
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '24');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  return docs.map((d: Record<string, unknown>) => {
    const iaId = String(d.identifier || '');
    const creator = Array.isArray(d.creator) ? d.creator.join(', ') : String(d.creator || 'Unknown Author');
    const desc = Array.isArray(d.description) ? d.description.join(' ') : String(d.description || '');
    const langVal = Array.isArray(d.language) ? d.language[0] : d.language || 'en';
    return {
      id: `ia_${iaId}`,
      title: String(d.title || iaId),
      author: creator,
      year: d.year ? String(d.year) : '',
      language: String(langVal).slice(0, 3).toLowerCase(),
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      iaId,
      description: stripHtml(desc).slice(0, 650),
      ext: 'pdf',
      source: 'Internet Archive',
      downloads: Number(d.downloads) || 0,
      directReadFormats: {
        embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`,
      },
    };
  });
}

async function directGoogleBooksSearch(q: string, lang: string, signal?: AbortSignal): Promise<BookItem[]> {
  const u = new URL('https://www.googleapis.com/books/v1/volumes');
  u.searchParams.set('q', q);
  u.searchParams.set('maxResults', '20');
  u.searchParams.set('printType', 'books');
  if (lang && lang !== 'all') u.searchParams.set('langRestrict', lang.slice(0, 2));

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const items = Array.isArray(data.items) ? data.items : [];
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
      imgLinks.extraLarge ||
      imgLinks.large ||
      imgLinks.medium ||
      imgLinks.thumbnail ||
      '';
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

async function directOpenLibrarySearch(
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
  const data = await r.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];
  const out: BookItem[] = [];
  for (const d of docs) {
    const iaId = Array.isArray(d.ia) && d.ia.length > 0 ? String(d.ia[0]) : '';
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

async function directOpenAlexSearch(q: string, page: number, signal?: AbortSignal): Promise<BookItem[]> {
  const u = new URL('https://api.openalex.org/works');
  u.searchParams.set('search', q);
  u.searchParams.set('per-page', '16');
  if (page > 1) u.searchParams.set('page', String(page));

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
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

// ============================================================================
// Public Books API with Super Cache (0ms Cache First + Background Refresh)
// ============================================================================
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
};

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
  const lang = params.lang || 'all';
  const ext = params.ext || 'all';
  const page = params.page || 1;

  const cacheKey = `books:trending:${period}:${category}:${lang}:${ext}:${page}`;
  const cached = await getSuperCacheAsync<BookItem[]>(cacheKey);
  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    registerBooksInCrossCache(cached.value);
    warmCoverImagesCache(cached.value.map((b) => b.coverUrl));
    // If cache is fresh (< 45 minutes), return immediately without network call
    if (Date.now() - cached.updatedAt < 45 * 60 * 1000) {
      return cached.value;
    }
  }

  const fetchFresh = async (): Promise<BookItem[]> => {
    // 1. Try Cloudflare Worker /books/trending
    try {
      const u = new URL(`${WORKER_BASE}/books/trending`);
      u.searchParams.set('period', period);
      if (subject) u.searchParams.set('subject', subject);
      if (lang !== 'all') u.searchParams.set('lang', lang);
      u.searchParams.set('page', String(page));

      const res = await fetch(u.toString(), { signal: params.signal });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.books) && json.books.length > 0) {
          const filtered = filterBooksByExt(json.books, ext);
          registerBooksInCrossCache(filtered);
          warmCoverImagesCache(filtered.map((b) => b.coverUrl));
          void setSuperCache(cacheKey, filtered);
          return filtered;
        }
      }
    } catch {
      // Fallback to direct parallel open-source fetch
    }

    // 2. Direct Parallel Fallback
    if (category === 'papers') {
      const papers = await directOpenAlexSearch('artificial intelligence physics philosophy', page, params.signal);
      const filtered = filterBooksByExt(papers, ext);
      registerBooksInCrossCache(filtered);
      void setSuperCache(cacheKey, filtered);
      return filtered;
    }

    const isManga = category === 'manga' || category === 'comics';
    const settled = await Promise.allSettled([
      directOpenLibraryTrending(period, subject, lang, page, params.signal),
      directGutendexBooks('', lang, subject, page, params.signal),
      directInternetArchiveTexts(isManga ? 'manga OR comic' : '', subject, lang, page, params.signal),
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
  if (!q) {
    return fetchTrendingBooks(params);
  }
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

  // 1. Try Cloudflare Worker /books/search
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
      if (Array.isArray(json.books) && json.books.length > 0) {
        const filtered = filterBooksByExt(json.books, ext);
        registerBooksInCrossCache(filtered);
        warmCoverImagesCache(filtered.map((b) => b.coverUrl));
        void setSuperCache(cacheKey, filtered);
        return filtered;
      }
    }
  } catch {
    // Fallback to direct parallel open-source search
  }

  // 2. Direct Parallel Search across Google Books, Open Library, Gutendex, Internet Archive, OpenAlex
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

export async function resolveBookDetails(
  book: BookItem,
  signal?: AbortSignal,
): Promise<BookResolveResult> {
  const cacheKey = `resolve:${book.id || normalizeBookKey(book.title, book.author)}`;
  const cached = await getSuperCacheAsync<BookResolveResult>(cacheKey);
  if (cached?.value) {
    return cached.value;
  }

  const md5 = (book.md5 || '').trim().toLowerCase();
  const iaId = (book.iaId || '').trim();
  const isbn = (book.isbn || '').trim();
  const doi = (book.doi || '').trim().replace(/^https?:\/\/doi\.org\//i, '');
  const gutenbergId = (book.gutenbergId || '').trim();

  // 1. Try Cloudflare Worker /books/resolve
  try {
    const u = new URL(`${WORKER_BASE}/books/resolve`);
    if (md5) u.searchParams.set('md5', md5);
    if (iaId) u.searchParams.set('iaId', iaId);
    if (isbn) u.searchParams.set('isbn', isbn);
    if (doi) u.searchParams.set('doi', doi);
    if (gutenbergId) u.searchParams.set('gutenbergId', gutenbergId);
    u.searchParams.set('title', book.title);

    const r = await fetch(u.toString(), { signal });
    if (r.ok) {
      const data = await r.json();
      if (data && Array.isArray(data.mirrors)) {
        const result: BookResolveResult = {
          ...data,
          directReadFormats: {
            ...(book.directReadFormats || {}),
            ...(data.directReadFormats || {}),
          },
        };
        void setSuperCache(cacheKey, result, true);
        return result;
      }
    }
  } catch {
    // Fallback to client-side resolution
  }

  const directReadFormats: DirectReadFormats = { ...(book.directReadFormats || {}) };
  const mirrors: BookMirrorBranch[] = [];

  if (iaId) {
    directReadFormats.embed = `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`;
    try {
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}`, { signal });
      if (r.ok) {
        const meta = await r.json();
        const files = Array.isArray(meta.files) ? meta.files : [];
        for (const f of files) {
          if (!f?.name) continue;
          const lower = String(f.name).toLowerCase();
          const dlUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(f.name)}`;
          if (!directReadFormats.pdf && lower.endsWith('.pdf')) {
            directReadFormats.pdf = dlUrl;
          } else if (!directReadFormats.epub && lower.endsWith('.epub')) {
            directReadFormats.epub = dlUrl;
          }
        }
      }
    } catch {
      /* ignore */
    }
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

  if (/^[a-f0-9]{32}$/.test(md5)) {
    mirrors.push(
      {
        id: 'aa-gl',
        label: 'Primary Mirror (.gl)',
        host: 'annas-archive.gl',
        url: `https://annas-archive.gl/md5/${md5}`,
        badge: 'Direct',
      },
      {
        id: 'libgen-lol',
        label: 'Cloud Mirror (.lol)',
        host: 'library.lol',
        url: `https://library.lol/main/${md5}`,
        badge: 'Fast Direct',
      },
    );
  } else {
    const queryStr = isbn || `${book.title} ${book.author !== 'Unknown Author' ? book.author : ''}`.trim();
    mirrors.push(
      {
        id: 'aa-search-gl',
        label: 'Direct Download Mirror',
        host: 'annas-archive.gl',
        url: isbn
          ? `https://annas-archive.gl/search?q=${encodeURIComponent(isbn)}`
          : `https://annas-archive.gl/search?q=${encodeURIComponent(queryStr)}`,
        badge: isbn ? `ISBN ${isbn}` : 'Direct',
      },
      {
        id: 'openlibrary-link',
        label: 'Digital Edition Gateway',
        host: 'openlibrary.org',
        url: `https://openlibrary.org/search?q=${encodeURIComponent(queryStr)}`,
        badge: 'Full Text',
      },
    );
  }

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

export async function probeMirrorLatency(url: string): Promise<number> {
  const t0 = performance.now();
  try {
    const u = new URL(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3800);
    await fetch(u.origin, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    return Math.max(18, Math.round(performance.now() - t0));
  } catch {
    return Math.round(performance.now() - t0);
  }
}

// ============================================================================
// Public Audiobooks API with Super Cache
// ============================================================================
async function directInternetArchiveAudiobooks(
  q: string,
  genre: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<AudiobookItem[]> {
  const parts = ['mediatype:audio', 'collection:(audio_bookspoetry OR opensource_audio)'];
  if (q) parts.unshift(`(${q})`);
  if (genre && genre !== 'all' && genre !== 'popular') parts.push(`subject:(${genre})`);
  if (lang && lang !== 'all') parts.push(`language:(${lang})`);

  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', parts.join(' AND '));
  ['identifier', 'title', 'creator', 'description', 'downloads', 'runtime', 'year', 'language'].forEach((f) =>
    u.searchParams.append('fl[]', f),
  );
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '24');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  return docs.map((d: Record<string, unknown>) => {
    const iaId = String(d.identifier || '');
    const creator = Array.isArray(d.creator) ? d.creator.join(', ') : String(d.creator || 'Classic Narrator');
    const desc = Array.isArray(d.description) ? d.description.join(' ') : String(d.description || '');
    return {
      id: `ia_audio_${iaId}`,
      iaId,
      title: String(d.title || iaId),
      author: creator,
      description: stripHtml(desc).slice(0, 600),
      language: Array.isArray(d.language) ? String(d.language[0]) : String(d.language || 'English'),
      runtime: d.runtime ? String(d.runtime) : '',
      year: d.year ? String(d.year) : '',
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      source: 'Audio Edition',
      downloads: Number(d.downloads) || 0,
    };
  });
}

async function directItunesAudiobooks(
  q: string,
  genre: string,
  signal?: AbortSignal,
): Promise<AudiobookItem[]> {
  const term = q || (genre && genre !== 'popular' && genre !== 'all' ? genre : 'classic literature audiobook');
  const u = new URL('https://itunes.apple.com/search');
  u.searchParams.set('term', term);
  u.searchParams.set('media', 'audiobook');
  u.searchParams.set('limit', '20');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((item: Record<string, unknown>) => {
    const hiResCover = String(item.artworkUrl100 || '').replace(/100x100bb/g, '600x600bb');
    return {
      id: `itunes_${String(item.collectionId || Math.random().toString(36).slice(2))}`,
      title: String(item.collectionName || item.trackName || 'Audiobook'),
      author: String(item.artistName || 'Narrator'),
      description: stripHtml(String(item.description || '')).slice(0, 600),
      language: 'English',
      runtime: item.trackTimeMillis ? `${Math.round(Number(item.trackTimeMillis) / 60000)} min` : '',
      year: item.releaseDate ? String(item.releaseDate).slice(0, 4) : '',
      coverUrl: hiResCover,
      source: 'Audio Edition',
      chapterCount: Number(item.trackCount) || 1,
      previewUrl: String(item.previewUrl || ''),
      externalUrl: String(item.collectionViewUrl || ''),
    };
  });
}

async function directLocAudio(q: string, genre: string, signal?: AbortSignal): Promise<AudiobookItem[]> {
  const term = q || (genre && genre !== 'popular' && genre !== 'all' ? genre : 'literature poetry');
  const u = new URL('https://www.loc.gov/audio/');
  u.searchParams.set('fo', 'json');
  u.searchParams.set('at', 'results,pagination');
  u.searchParams.set('c', '14');
  u.searchParams.set('q', term);

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((item: Record<string, unknown>, idx: number) => {
    const imgs = Array.isArray(item.image_url) ? (item.image_url as string[]) : [];
    const desc = Array.isArray(item.description) ? (item.description as string[]).join(' ') : '';
    const contrib = Array.isArray(item.contributor)
      ? (item.contributor as string[]).join(', ')
      : 'Archive Narrator';
    return {
      id: `loc_${idx}_${encodeURIComponent(String(item.id || item.title || idx)).slice(-20)}`,
      title: String(item.title || 'Historical Audio Recording'),
      author: contrib,
      description: stripHtml(desc).slice(0, 500),
      language: Array.isArray(item.language) ? String(item.language[0]) : 'English',
      year: item.date ? String(item.date).slice(0, 4) : '',
      coverUrl: imgs.length > 0 ? imgs[imgs.length - 1] : '',
      source: 'Audio Edition',
      chapterCount: 1,
      externalUrl: String(item.url || item.id || ''),
    };
  });
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
  const cacheKey = `audiobooks:catalog:${q}:${genre}:${lang}:${page}`;
  return getSuperCacheSync<AudiobookItem[]>(cacheKey);
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
    if (Date.now() - cached.updatedAt < 45 * 60 * 1000) {
      return cached.value;
    }
  }

  const fetchFresh = async (): Promise<AudiobookItem[]> => {
    // 1. Try Cloudflare Worker /audiobooks/catalog
    try {
      const u = new URL(`${WORKER_BASE}/audiobooks/catalog`);
      if (q) u.searchParams.set('q', q);
      if (genre) u.searchParams.set('genre', genre);
      if (lang !== 'all') u.searchParams.set('lang', lang);
      u.searchParams.set('page', String(page));

      const res = await fetch(u.toString(), { signal: params.signal });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.audiobooks) && data.audiobooks.length > 0) {
          registerAudiobooksInCrossCache(data.audiobooks);
          warmCoverImagesCache(data.audiobooks.map((a: AudiobookItem) => a.coverUrl));
          void setSuperCache(cacheKey, data.audiobooks);
          return data.audiobooks;
        }
      }
    } catch {
      // Fallback to direct parallel open-source fetch
    }

    // 2. Direct Parallel Fetch
    const settled = await Promise.allSettled([
      directInternetArchiveAudiobooks(q, genre, lang, page, params.signal),
      directItunesAudiobooks(q, genre, params.signal),
      directLocAudio(q, genre, params.signal),
    ]);

    const [iaRes, itunesRes, locRes] = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
    const itunesCoverMap = new Map<string, string>();
    for (const it of itunesRes) {
      if (it.coverUrl && it.title) {
        itunesCoverMap.set(normalizeBookKey(it.title, ''), it.coverUrl);
      }
    }

    const combined: AudiobookItem[] = [];
    const seen = new Set<string>();
    for (const item of [...iaRes, ...itunesRes, ...locRes]) {
      if (!item || !item.title) continue;
      const key = item.iaId ? `ia:${item.iaId}` : normalizeBookKey(item.title, item.author);
      if (seen.has(key)) continue;
      seen.add(key);

      const tKey = normalizeBookKey(item.title, '');
      if ((!item.coverUrl || item.coverUrl.includes('/services/img/')) && itunesCoverMap.has(tKey)) {
        item.fallbackCoverUrl = item.coverUrl;
        item.coverUrl = itunesCoverMap.get(tKey);
      }
      combined.push(item);
    }

    if (combined.length > 0) {
      registerAudiobooksInCrossCache(combined);
      warmCoverImagesCache(combined.map((a) => a.coverUrl));
      void setSuperCache(cacheKey, combined);
    }
    return combined;
  };

  if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
    void fetchFresh().catch(() => {});
    return cached.value;
  }

  return fetchFresh();
}

export async function fetchAudiobookChapters(
  item: AudiobookItem,
  signal?: AbortSignal,
): Promise<{ coverUrl?: string; tracks: AudiobookChapter[] }> {
  const cacheKey = `chapters:${item.iaId || item.librivoxId || item.id}`;
  const cached = await getSuperCacheAsync<{ coverUrl?: string; tracks: AudiobookChapter[] }>(cacheKey);
  if (cached?.value && Array.isArray(cached.value.tracks) && cached.value.tracks.length > 0) {
    return cached.value;
  }

  // 1. Try Cloudflare Worker /audiobooks/tracks if iaId or librivoxId exists
  if (item.iaId || item.librivoxId) {
    try {
      const u = new URL(`${WORKER_BASE}/audiobooks/tracks`);
      if (item.iaId) u.searchParams.set('iaId', item.iaId);
      if (item.librivoxId) u.searchParams.set('librivoxId', item.librivoxId);

      const r = await fetch(u.toString(), { signal });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          const result = { coverUrl: data.coverUrl || item.coverUrl, tracks: data.tracks };
          void setSuperCache(cacheKey, result, true);
          return result;
        }
      }
    } catch {
      // Fallback to direct Internet Archive metadata fetch
    }
  }

  // 2. Direct Internet Archive metadata fetch
  if (item.iaId) {
    try {
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(item.iaId)}`, { signal });
      if (r.ok) {
        const data = await r.json();
        const files = Array.isArray(data.files) ? data.files : [];
        let coverUrl = item.coverUrl || `https://archive.org/services/img/${encodeURIComponent(item.iaId)}`;

        for (const f of files) {
          if (f?.name && /\.(jpg|jpeg|png)$/i.test(f.name) && !String(f.name).includes('_thumb')) {
            coverUrl = `https://archive.org/download/${encodeURIComponent(item.iaId)}/${encodeURIComponent(f.name)}`;
            break;
          }
        }

        const mp3Files = files.filter(
          (f: { name?: string }) =>
            f &&
            typeof f.name === 'string' &&
            /\.(mp3|m4a|ogg)$/i.test(f.name) &&
            !/_64kb\.mp3$/i.test(f.name) &&
            !/\.ogg$/i.test(f.name),
        );
        const candidateFiles =
          mp3Files.length > 0
            ? mp3Files
            : files.filter((f: { name?: string }) => f && typeof f.name === 'string' && /\.(mp3|m4a|ogg)$/i.test(f.name));

        const seenBase = new Set<string>();
        const tracks: AudiobookChapter[] = [];
        for (const f of candidateFiles) {
          const base = String(f.name)
            .replace(/_(?:64kb|128kb|vbr)\.[^.]+$/i, '')
            .replace(/\.[^.]+$/, '');
          if (seenBase.has(base)) continue;
          seenBase.add(base);

          const trackNum = parseInt(String(f.track || '').split('/')[0], 10) || tracks.length + 1;
          let durationSec = 0;
          if (f.length) {
            if (/^\d+(\.\d+)?$/.test(String(f.length))) {
              durationSec = Math.round(parseFloat(String(f.length)));
            } else {
              const parts = String(f.length).split(':').map(Number);
              if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
              else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
            }
          }

          tracks.push({
            index: trackNum,
            title: String(f.title || base.replace(/[_-]+/g, ' ').trim() || `Chapter ${tracks.length + 1}`),
            url: `https://archive.org/download/${encodeURIComponent(item.iaId)}/${encodeURIComponent(f.name)}`,
            duration: durationSec,
            size: f.size ? Number(f.size) : 0,
            format: (String(f.name).split('.').pop() || 'mp3').toLowerCase(),
          });
        }

        tracks.sort((a, b) => a.index - b.index);
        tracks.forEach((t, idx) => {
          t.index = idx + 1;
        });

        if (tracks.length > 0) {
          const result = { coverUrl, tracks };
          void setSuperCache(cacheKey, result, true);
          return result;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Fallback to Apple Books / iTunes preview track if available
  if (item.previewUrl) {
    const result = {
      coverUrl: item.coverUrl,
      tracks: [
        {
          index: 1,
          title: `${item.title} — Audio Preview`,
          url: item.previewUrl,
          duration: 90,
          format: 'm4a',
        },
      ],
    };
    void setSuperCache(cacheKey, result, true);
    return result;
  }

  // 4. Search Internet Archive Audio by title to resolve full playable chapters automatically
  try {
    const cleanTitle = item.title.replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
    const matches = await directInternetArchiveAudiobooks(cleanTitle, 'all', 'all', 1, signal);
    if (matches.length > 0 && matches[0].iaId) {
      const resolved = await fetchAudiobookChapters({ ...item, iaId: matches[0].iaId }, signal);
      if (resolved.tracks.length > 0) {
        void setSuperCache(cacheKey, resolved, true);
      }
      return resolved;
    }
  } catch {
    /* ignore */
  }

  return { coverUrl: item.coverUrl, tracks: [] };
}

// ============================================================================
// Deterministic Artistic Cover Palette for Books without Covers
// ============================================================================
const ARTISTIC_COVER_GRADIENTS = [
  ['#0f172a', '#1e3a8a', '#38bdf8'],
  ['#064e3b', '#047857', '#34d399'],
  ['#31102f', '#701a75', '#f472b6'],
  ['#1e1b4b', '#4338ca', '#a78bfa'],
  ['#3b0764', '#6d28d9', '#c084fc'],
  ['#451a03', '#b45309', '#fbbf24'],
  ['#082f49', '#0369a1', '#22d3ee'],
] as const;

export function getBookArtisticPalette(seed: string): readonly [string, string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return ARTISTIC_COVER_GRADIENTS[Math.abs(h) % ARTISTIC_COVER_GRADIENTS.length];
}

// ============================================================================
// Bidirectional Cross-Linking Engine (Written Books <-> Audio Books)
// ============================================================================
const cachedAudiobooksByNormTitle = new Map<string, AudiobookItem>();
const cachedBooksByNormTitle = new Map<string, BookItem>();
const probedAudioForBookCache = new Map<string, AudiobookItem | null>();
const probedBookForAudioCache = new Map<string, BookItem | null>();

function normalizeTitleOnly(raw?: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(audiobook|audio|unabridged|abridged|librivox|edition|volume|vol|book)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 42);
}

export function registerBooksInCrossCache(books: BookItem[]): void {
  for (const b of books) {
    if (!b?.title) continue;
    const key = normalizeTitleOnly(b.title);
    if (key.length >= 3 && !cachedBooksByNormTitle.has(key)) {
      cachedBooksByNormTitle.set(key, b);
    }
  }
}

export function registerAudiobooksInCrossCache(audiobooks: AudiobookItem[]): void {
  for (const a of audiobooks) {
    if (!a?.title) continue;
    const key = normalizeTitleOnly(a.title);
    if (key.length >= 3 && !cachedAudiobooksByNormTitle.has(key)) {
      cachedAudiobooksByNormTitle.set(key, a);
    }
  }
}

const KNOWN_AUDIO_ELIGIBLE_KEYWORDS = [
  'pride', 'prejudice', 'sherlock', 'holmes', 'frankenstein', 'dracula', 'gatsby',
  'odyssey', 'iliad', 'republic', 'plato', 'aristotle', 'nietzsche', 'dostoevsky',
  'crime', 'punishment', 'karamazov', 'tolstoy', 'war and peace', 'anna karenina',
  'alice', 'wonderland', 'moby', 'dick', 'jane eyre', 'wuthering', 'dickens',
  'expectations', 'twain', 'huckleberry', 'tom sawyer', 'dorian gray', 'oscar wilde',
  'metamorphosis', 'kafka', 'divine comedy', 'dante', 'hamlet', 'macbeth', 'shakespeare',
  'romeo', 'juliet', 'beowulf', 'meditations', 'marcus aurelius', 'sun tzu', 'art of war',
  'prince', 'machiavelli', 'utopia', 'time machine', 'war of the worlds', 'wells',
  'verne', 'twenty thousand', 'treasure island', 'jekyll', 'hyde', 'little women',
  'monte cristo', 'three musketeers', 'les miserables', 'hugo', 'don quixote',
  'arabian nights', 'الف ليلة', 'ابن خلدون', 'المقدمة', 'جبران', 'النبي', 'طه حسين',
  'الأيام', 'نجيب محفوظ', 'العقاد', 'المنفلوطي', 'كليلة ودمنة', 'رسالة الغفران',
];

export function getInstantAudiobookMatchForBook(book: BookItem): {
  hasAudio: boolean;
  matchedAudiobook?: AudiobookItem;
  searchQuery: string;
} {
  const norm = normalizeTitleOnly(book.title);
  const exact = cachedAudiobooksByNormTitle.get(norm);
  if (exact) {
    return { hasAudio: true, matchedAudiobook: exact, searchQuery: exact.title };
  }
  for (const [k, val] of cachedAudiobooksByNormTitle.entries()) {
    if (norm.length >= 5 && k.length >= 5 && (k.includes(norm) || norm.includes(k))) {
      return { hasAudio: true, matchedAudiobook: val, searchQuery: val.title };
    }
  }
  const probed = probedAudioForBookCache.get(norm);
  if (probed) {
    return { hasAudio: true, matchedAudiobook: probed, searchQuery: probed.title };
  }
  const hay = `${book.title} ${book.author}`.toLowerCase();
  const isClassicOrGutenberg =
    Boolean(book.gutenbergId) ||
    book.source === 'Gutenberg' ||
    KNOWN_AUDIO_ELIGIBLE_KEYWORDS.some((kw) => hay.includes(kw));

  const cleanAuthor =
    book.author && book.author !== 'Unknown Author' && book.author !== 'Classic Edition'
      ? book.author.split(',')[0].trim()
      : '';
  const searchQuery = `${book.title} ${cleanAuthor}`.trim();
  return {
    hasAudio: isClassicOrGutenberg,
    searchQuery,
  };
}

export function getInstantBookMatchForAudiobook(audio: AudiobookItem): {
  hasBook: boolean;
  matchedBook?: BookItem;
  searchQuery: string;
} {
  const norm = normalizeTitleOnly(audio.title);
  const exact = cachedBooksByNormTitle.get(norm);
  if (exact) {
    return { hasBook: true, matchedBook: exact, searchQuery: exact.title };
  }
  for (const [k, val] of cachedBooksByNormTitle.entries()) {
    if (norm.length >= 5 && k.length >= 5 && (k.includes(norm) || norm.includes(k))) {
      return { hasBook: true, matchedBook: val, searchQuery: val.title };
    }
  }
  const probed = probedBookForAudioCache.get(norm);
  if (probed) {
    return { hasBook: true, matchedBook: probed, searchQuery: probed.title };
  }
  const cleanTitle = audio.title
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(audiobook|unabridged|librivox)\b/gi, '')
    .trim();
  return {
    hasBook: true,
    searchQuery: cleanTitle || audio.title,
  };
}

export async function probeAudiobookForBook(
  book: BookItem,
  signal?: AbortSignal,
): Promise<AudiobookItem | null> {
  const norm = normalizeTitleOnly(book.title);
  if (!norm) return null;
  if (cachedAudiobooksByNormTitle.has(norm)) {
    return cachedAudiobooksByNormTitle.get(norm)!;
  }
  if (probedAudioForBookCache.has(norm)) {
    return probedAudioForBookCache.get(norm) ?? null;
  }
  try {
    const cleanTitle = book.title.replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
    const results = await fetchAudiobooksCatalog({ q: cleanTitle, page: 1, signal });
    registerAudiobooksInCrossCache(results);
    const match =
      results.find((a) => {
        const ak = normalizeTitleOnly(a.title);
        return ak === norm || (ak.length >= 4 && norm.length >= 4 && (ak.includes(norm) || norm.includes(ak)));
      }) || results[0] || null;
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
  if (cachedBooksByNormTitle.has(norm)) {
    return cachedBooksByNormTitle.get(norm)!;
  }
  if (probedBookForAudioCache.has(norm)) {
    return probedBookForAudioCache.get(norm) ?? null;
  }
  try {
    const cleanTitle = audio.title
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .trim();
    const results = await searchAllBooks({ q: cleanTitle, page: 1, signal });
    registerBooksInCrossCache(results);
    const match =
      results.find((b) => {
        const bk = normalizeTitleOnly(b.title);
        return bk === norm || (bk.length >= 4 && norm.length >= 4 && (bk.includes(norm) || norm.includes(bk)));
      }) || results[0] || null;
    probedBookForAudioCache.set(norm, match);
    return match;
  } catch {
    return null;
  }
}
