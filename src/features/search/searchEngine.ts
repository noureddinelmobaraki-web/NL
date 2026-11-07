/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type MiniSearch from 'minisearch';
import { normalize } from '../music/utils/search';

export type SearchRecord = {
  id: string;
  t: 'song' | 'library' | 'video' | 'game';
  title: string;
  artist: string;
  link: string;
  cover: string;
};

let miniPromise: Promise<MiniSearch<SearchRecord>> | null = null;

const processTerm = (term: string): string | null => {
  const n = normalize(term);
  return n && n.length ? n : null;
};

async function build(): Promise<MiniSearch<SearchRecord>> {
  const base = import.meta.env.BASE_URL || '/';
  const [{ default: MiniSearchCtor }, res] = await Promise.all([
    import('minisearch'),
    fetch(base + 'data/search-index.json', { cache: 'force-cache' }),
  ]);
  const records: SearchRecord[] = await res.json();
  const mini = new MiniSearchCtor<SearchRecord>({
    idField: 'id',
    fields: ['title', 'artist'],
    storeFields: ['title', 'artist', 'link', 'cover', 't'],
    processTerm,
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 }, combineWith: 'AND' },
  });
  mini.addAll(records);
  return mini;
}

export function ensureIndex(): Promise<MiniSearch<SearchRecord>> {
  if (!miniPromise) miniPromise = build();
  return miniPromise;
}

export async function runSearch(query: string, limit = 40): Promise<SearchRecord[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const mini = await ensureIndex();
  return mini
    .search(q)
    .slice(0, limit)
    .map((r) => ({
      id: String(r.id),
      t: (r as any).t,
      title: (r as any).title,
      artist: (r as any).artist,
      link: (r as any).link,
      cover: (r as any).cover,
    }));
}
