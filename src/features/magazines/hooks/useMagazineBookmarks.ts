/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { readStore, writeStore } from '../../../utils/storage';
import { type BookItem, BookItemSchema } from '../../liquid-glass/services/types';

const MAGAZINE_BOOKMARKS_KEY = 'nl_magazines_bookmarks_v1';
const MagazineBookmarkIdsSchema = z.array(z.string());
const MagazineBookmarkItemsSchema = z.array(BookItemSchema);

export function useMagazineBookmarks() {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const ids = readStore(MAGAZINE_BOOKMARKS_KEY, MagazineBookmarkIdsSchema, []);
    return new Set(ids);
  });

  const [savedMagazinesCache, setSavedMagazinesCache] = useState<BookItem[]>(() => {
    return readStore(`${MAGAZINE_BOOKMARKS_KEY}_items`, MagazineBookmarkItemsSchema, []);
  });

  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const toggleBookmark = useCallback((magazine: BookItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(magazine.id)) {
        next.delete(magazine.id);
      } else {
        next.add(magazine.id);
      }
      writeStore(MAGAZINE_BOOKMARKS_KEY, Array.from(next));
      return next;
    });

    setSavedMagazinesCache((prev) => {
      const exists = prev.some((m) => m.id === magazine.id);
      const next = exists ? prev.filter((m) => m.id !== magazine.id) : [magazine, ...prev];
      writeStore(`${MAGAZINE_BOOKMARKS_KEY}_items`, next.slice(0, 100));
      return next;
    });
  }, []);

  return {
    savedIds,
    savedMagazinesCache,
    showSavedOnly,
    setShowSavedOnly,
    toggleBookmark,
  };
}
