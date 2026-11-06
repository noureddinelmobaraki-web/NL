/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import type { AudiobookItem, BookItem } from '../../../services/types';
import { getInstantAudiobookMatchForBook } from '../../../booksAudioService';
import { BookCard } from './BookCard';

export interface BooksGridProps {
  books: BookItem[];
  loading: boolean;
  loadingMore: boolean;
  showSavedOnly: boolean;
  savedIds: Set<string>;
  probedAudioMap: Record<string, AudiobookItem>;
  canSwitchToAudiobook: boolean;
  onOpenReader: (book: BookItem) => void;
  onToggleBookmark: (book: BookItem, e: React.MouseEvent) => void;
  onSwitchToAudiobook: (book: BookItem, e: React.MouseEvent) => void;
  onLoadMore: () => void;
  onResetFilters: () => void;
}

export const BooksGrid: React.FC<BooksGridProps> = ({
  books,
  loading,
  loadingMore,
  showSavedOnly,
  savedIds,
  probedAudioMap,
  canSwitchToAudiobook,
  onOpenReader,
  onToggleBookmark,
  onSwitchToAudiobook,
  onLoadMore,
  onResetFilters,
}) => {
  if (loading) {
    return (
      <div className="lg-books-grid">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="lg-book-unit lg-book-unit--skeleton">
            <div className="lg-book-poster-frame lg-book-poster-frame--skeleton">
              <span className="lg-main-glass__caustic" aria-hidden="true" />
              <span className="lg-main-glass__rim" aria-hidden="true" />
            </div>
            <div className="lg-track-tube lg-book-info-capsule lg-book-info-capsule--skeleton">
              <span className="lg-orb-capsule-caustic" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="lg-empty-glass-state">
        <div className="lg-track-tube lg-empty-glass-capsule">
          <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          <span className="lg-orb-capsule-sheen" aria-hidden="true" />
          <BookOpen size={30} className="lg-empty-glass-icon" />
          <p className="lg-empty-glass-title">
            {showSavedOnly ? 'No saved books yet' : 'No matching books found'}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="lg-glass-pill lg-filter-pill lg-filter-pill--active"
          >
            <RefreshCw size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg-books-grid" role="list">
        {books.map((book, idx) => {
          const instantAudio = getInstantAudiobookMatchForBook(book);
          const matchedAudio = probedAudioMap[book.id] || instantAudio.matchedAudiobook;
          const hasAudioVersion = Boolean(matchedAudio || instantAudio.hasAudio);

          return (
            <BookCard
              key={book.id}
              book={book}
              index={idx}
              isSaved={savedIds.has(book.id)}
              hasAudioVersion={hasAudioVersion}
              canSwitchToAudiobook={canSwitchToAudiobook}
              onOpenReader={onOpenReader}
              onToggleBookmark={onToggleBookmark}
              onSwitchToAudiobook={onSwitchToAudiobook}
            />
          );
        })}
      </div>

      {!showSavedOnly && books.length >= 12 && (
        <div className="lg-load-more-row">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="lg-glass-pill lg-load-more-pill"
          >
            <RefreshCw size={15} className={loadingMore ? 'lg-spin' : ''} />
            <span>{loadingMore ? 'Loading...' : 'Load More Books'}</span>
          </button>
        </div>
      )}
    </>
  );
};
