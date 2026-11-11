/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * MangaDex API & MangaDex@Home Chapter Page Server Client
 * - Searches translated manga (Arabic & English) with high-res cover art
 * - Fetches ordered chapter feeds
 * - Resolves MangaDex@Home page image URLs (`data-saver` & `data`)
 */

import type { BookItem } from './types';

export interface MangaChapterItem {
  id: string;
  chapter: string;
  title: string;
  volume: string;
  translatedLanguage: string;
  pages: number;
  publishAt: string;
}

export interface MangaChapterPagesBundle {
  chapterId: string;
  baseUrl: string;
  hash: string;
  pageUrls: string[];
  dataSaverUrls: string[];
}

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    name?: string;
  };
}

interface MangaDexMangaEntry {
  id: string;
  attributes?: {
    title?: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    year?: number;
    status?: string;
  };
  relationships?: MangaDexRelationship[];
}

export async function searchMangaDexCatalog(
  query = '',
  lang = 'all',
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const u = new URL('https://api.mangadex.org/manga');
  if (query.trim()) {
    u.searchParams.set('title', query.trim());
  } else {
    u.searchParams.set('order[followedCount]', 'desc');
  }
  if (lang === 'ar') {
    u.searchParams.append('availableTranslatedLanguage[]', 'ar');
  } else {
    u.searchParams.append('availableTranslatedLanguage[]', 'ar');
    u.searchParams.append('availableTranslatedLanguage[]', 'en');
  }
  u.searchParams.append('includes[]', 'cover_art');
  u.searchParams.append('includes[]', 'author');
  u.searchParams.append('contentRating[]', 'safe');
  u.searchParams.append('contentRating[]', 'suggestive');
  u.searchParams.set('limit', '24');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(7500),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: MangaDexMangaEntry[] };
    const entries = Array.isArray(json?.data) ? json.data : [];

    return entries.map((entry): BookItem => {
      const attrs = entry.attributes || {};
      const titleMap = attrs.title || {};
      const altTitles = Array.isArray(attrs.altTitles) ? attrs.altTitles : [];
      const arAlt = altTitles.find((t) => t.ar)?.ar;
      const enAlt = altTitles.find((t) => t.en)?.en;

      const title =
        arAlt ||
        titleMap.en ||
        titleMap.ar ||
        enAlt ||
        Object.values(titleMap)[0] ||
        'Manga Series';

      const descMap = attrs.description || {};
      const description = (
        descMap.ar ||
        descMap.en ||
        Object.values(descMap)[0] ||
        ''
      ).slice(0, 320);

      const rels = Array.isArray(entry.relationships)
        ? entry.relationships
        : [];
      const coverRel = rels.find((r) => r.type === 'cover_art');
      const authorRel = rels.find((r) => r.type === 'author');
      const coverFileName = coverRel?.attributes?.fileName;

      const coverUrl = coverFileName
        ? `https://uploads.mangadex.org/covers/${entry.id}/${coverFileName}.512.jpg`
        : undefined;

      return {
        id: `mangadex:${entry.id}`,
        title,
        author: authorRel?.attributes?.name || 'MangaDex Creator',
        year: attrs.year || 2024,
        language: arAlt ? 'ar' : 'en',
        coverUrl,
        description,
        ext: 'manga',
        source: 'MangaDex@Home',
        sources: ['MangaDex'],
        directReadFormats: {
          preview: `mangadex://${entry.id}`,
        },
      };
    });
  } catch {
    return [];
  }
}

export async function fetchMangaDexChapters(
  mangaIdRaw: string,
  signal?: AbortSignal,
): Promise<MangaChapterItem[]> {
  const cleanId = mangaIdRaw.replace(/^mangadex:/, '').trim();
  const u = new URL(`https://api.mangadex.org/manga/${encodeURIComponent(cleanId)}/feed`);
  u.searchParams.append('translatedLanguage[]', 'ar');
  u.searchParams.append('translatedLanguage[]', 'en');
  u.searchParams.set('order[chapter]', 'asc');
  u.searchParams.set('limit', '96');
  u.searchParams.set('includeEmptyPages', '0');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(7500),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list: Array<{
      id: string;
      attributes?: {
        chapter?: string;
        title?: string;
        volume?: string;
        translatedLanguage?: string;
        pages?: number;
        publishAt?: string;
      };
    }> = Array.isArray(json?.data) ? json.data : [];

    return list
      .filter((ch) => (ch.attributes?.pages || 0) > 0)
      .map((ch) => ({
        id: ch.id,
        chapter: String(ch.attributes?.chapter || '1'),
        title: String(
          ch.attributes?.title || `Chapter ${ch.attributes?.chapter || '1'}`,
        ),
        volume: String(ch.attributes?.volume || ''),
        translatedLanguage: String(ch.attributes?.translatedLanguage || 'en'),
        pages: Number(ch.attributes?.pages) || 1,
        publishAt: String(ch.attributes?.publishAt || ''),
      }));
  } catch {
    return [];
  }
}

export async function fetchMangaDexChapterPages(
  chapterId: string,
  signal?: AbortSignal,
): Promise<MangaChapterPagesBundle | null> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/at-home/server/${encodeURIComponent(chapterId)}`,
      { signal: signal ?? AbortSignal.timeout(7500) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const baseUrl = String(json?.baseUrl || '').replace(/\/+$/, '');
    const hash = String(json?.chapter?.hash || '');
    const dataFiles: string[] = Array.isArray(json?.chapter?.data)
      ? json.chapter.data
      : [];
    const saverFiles: string[] = Array.isArray(json?.chapter?.dataSaver)
      ? json.chapter.dataSaver
      : dataFiles;

    if (!baseUrl || !hash || dataFiles.length === 0) return null;

    return {
      chapterId,
      baseUrl,
      hash,
      pageUrls: dataFiles.map((f) => `${baseUrl}/data/${hash}/${f}`),
      dataSaverUrls: saverFiles.map((f) => `${baseUrl}/data-saver/${hash}/${f}`),
    };
  } catch {
    return null;
  }
}
