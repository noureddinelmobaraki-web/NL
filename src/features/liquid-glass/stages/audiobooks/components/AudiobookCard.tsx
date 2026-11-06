/**
 * src/features/liquid-glass/stages/audiobooks/components/AudiobookCard.tsx
 *
 * Single audiobook poster card + floating Liquid Glass capsule + DualActionPill.
 */

import React from 'react';
import { Headphones, Play } from 'lucide-react';
import { getBookArtisticPalette, type AudiobookItem } from '../../../booksAudioService';
import { DualActionPill } from '../../../shared/DualActionPill';
import type { AudiobookProgressRecord } from '../hooks/useListeningProgress';

export interface AudiobookCardProps {
  item: AudiobookItem;
  index: number;
  savedRec?: AudiobookProgressRecord;
  hasBookVersion: boolean;
  onOpen: (item: AudiobookItem, autoResume?: boolean) => void;
  onReadBook?: (item: AudiobookItem, e?: React.MouseEvent) => void;
}

export const AudiobookCard: React.FC<AudiobookCardProps> = ({
  item,
  index,
  savedRec,
  hasBookVersion,
  onOpen,
  onReadBook,
}) => {
  const [c1, c2, c3] = getBookArtisticPalette(item.title + item.author);

  return (
    <article
      role="listitem"
      className="lg-audiobook-unit"
      style={{ '--card-idx': index % 24 } as React.CSSProperties}
    >
      <div
        className="lg-audiobook-poster-frame"
        onClick={() => onOpen(item, true)}
        role="button"
        tabIndex={0}
        aria-label={`Listen to ${item.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(item, true);
          }
        }}
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="lg-audiobook-poster-img"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (item.fallbackCoverUrl && img.src !== item.fallbackCoverUrl) {
                img.src = item.fallbackCoverUrl;
              } else {
                img.style.display = 'none';
              }
            }}
          />
        ) : null}

        <div
          className="lg-audiobook-poster-fallback"
          style={{
            background: `linear-gradient(145deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
          }}
        >
          <Headphones size={28} className="lg-audiobook-poster-fallback__icon" />
          <span className="lg-audiobook-poster-fallback__title">{item.title}</span>
          <span className="lg-audiobook-poster-fallback__author">{item.author}</span>
        </div>

        <span className="lg-main-glass__caustic" aria-hidden="true" />
        <span className="lg-main-glass__rim" aria-hidden="true" />
        <span className="lg-main-glass__sheen" aria-hidden="true" />

        <span className="lg-glass-pill lg-poster-play-badge" aria-hidden="true">
          <Play size={14} fill="currentColor" />
        </span>

        {savedRec && (
          <span className="lg-glass-pill lg-poster-resume-badge">
            Ch. {savedRec.chapterIndex + 1}
          </span>
        )}
      </div>

      <div
        className="lg-track-tube lg-audiobook-info-capsule"
        onClick={() => onOpen(item, true)}
      >
        <span className="lg-orb-capsule-caustic" aria-hidden="true" />
        <span className="lg-orb-capsule-sheen" aria-hidden="true" />

        <h3 className="lg-audiobook-capsule-title" title={item.title}>
          {item.title}
        </h3>
        <p className="lg-audiobook-capsule-author" title={item.author}>
          {item.author}
          {item.runtime ? ` · ${item.runtime}` : ''}
        </p>

        <div className="lg-audiobook-capsule-actions">
          <DualActionPill
            primaryMode="listen"
            hasCounterpart={Boolean(hasBookVersion && onReadBook)}
            onListen={(e) => {
              e.stopPropagation();
              onOpen(item, true);
            }}
            onRead={(e) => {
              e.stopPropagation();
              onReadBook?.(item, e);
            }}
          />
        </div>
      </div>
    </article>
  );
};
