/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { readStore, writeStore } from '../../../../../utils/storage';
import { type BookItem, BookItemSchema } from '../../../services/types';

const BOOKMARKS_KEY = 'nl_liquid_glass_saved_books_v3';
const BookmarkIdsSchema = z.array(z.string());
const BookmarkItemsSchema = z.array(BookItemSchema);

export function useBookmarks() {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const ids = readStore(BOOKMARKS_KEY, BookmarkIdsSchema, []);
    return new Set(ids);
  });

  const [savedBooksCache, setSavedBooksCache] = useState<BookItem[]>(() => {
    return readStore(`${BOOKMARKS_KEY}_items`, BookmarkItemsSchema, []);
  });

  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const toggleBookmark = useCallback((book: BookItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(book.id)) {
        next.delete(book.id);
      } else {
        next.add(book.id);
      }
      writeStore(BOOKMARKS_KEY, Array.from(next));
      return next;
    });

    setSavedBooksCache((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      const next = exists ? prev.filter((b) => b.id !== book.id) : [book, ...prev];
      writeStore(`${BOOKMARKS_KEY}_items`, next.slice(0, 100));
      return next;
    });
  }, []);

  return {
    savedIds,
    savedBooksCache,
    showSavedOnly,
    setShowSavedOnly,
    toggleBookmark,
  };
}
