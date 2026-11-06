/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { BookOpen, Bookmark } from 'lucide-react';
import type { BookItem } from '../../../services/types';
import { GlassPoster } from '../../../shared/GlassPoster';
import { DualActionPill } from '../../../shared/DualActionPill';

export interface BookCardProps {
  book: BookItem;
  index: number;
  isSaved: boolean;
  hasAudioVersion: boolean;
  canSwitchToAudiobook: boolean;
  onOpenReader: (book: BookItem) => void;
  onToggleBookmark: (book: BookItem, e: React.MouseEvent) => void;
  onSwitchToAudiobook: (book: BookItem, e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  index,
  isSaved,
  hasAudioVersion,
  canSwitchToAudiobook,
  onOpenReader,
  onToggleBookmark,
  onSwitchToAudiobook,
}) => {
  return (
    <article
      role="listitem"
      className="lg-book-unit"
      style={{ '--card-idx': index % 24 } as React.CSSProperties}
    >
      <GlassPoster
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        fallbackIcon={BookOpen}
        frameClassName="lg-book-poster-frame"
        imgClassName="lg-book-poster-img"
        fallbackClassName="lg-book-poster-fallback"
        onActivate={() => onOpenReader(book)}
        ariaLabel={`Read ${book.title}`}
      >
        <button
          type="button"
          onClick={(e) => onToggleBookmark(book, e)}
          className={`lg-glass-pill lg-poster-float-badge ${
            isSaved ? 'lg-poster-float-badge--saved' : ''
          }`}
          aria-label={isSaved ? 'Remove bookmark' : 'Save book'}
        >
          <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </GlassPoster>

      <div
        className="lg-track-tube lg-book-info-capsule"
        onClick={() => onOpenReader(book)}
      >
        <span className="lg-orb-capsule-caustic" aria-hidden="true" />
        <span className="lg-orb-capsule-sheen" aria-hidden="true" />

        <h3 className="lg-book-capsule-title" title={book.title}>
          {book.title}
        </h3>
        <p className="lg-book-capsule-author" title={book.author}>
          {book.author}
          {book.year ? ` · ${book.year}` : ''}
        </p>

        <div className="lg-book-capsule-actions">
          <DualActionPill
            primaryMode="read"
            hasCounterpart={hasAudioVersion && canSwitchToAudiobook}
            onRead={(e) => {
              e.stopPropagation();
              onOpenReader(book);
            }}
            onListen={(e) => onSwitchToAudiobook(book, e)}
          />
        </div>
      </div>
    </article>
  );
};
