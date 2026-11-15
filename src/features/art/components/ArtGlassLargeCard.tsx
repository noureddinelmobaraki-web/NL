import React, { useEffect, useRef, useState } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';

export interface ArtGlassLargeCardProps {
  item: ArtMuseumPiece;
  onSelect: (item: ArtMuseumPiece) => void;
}

/**
 * Displays ONLY the lightweight 400px thumbnail and the title below it.
 * Uses an IntersectionObserver (`rootMargin: '800px 0px'`) to unmount offscreen
 * `<img />` elements and prevent RAM bloat during deep gallery browsing.
 */
export const ArtGlassLargeCard: React.FC<ArtGlassLargeCardProps> = ({
  item,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(true);
  const cardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsNearViewport(entry.isIntersecting);
        }
      },
      { rootMargin: '800px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (imgError) return null;

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(item)}
      className="art-glass-large-card group"
      aria-label={item.title}
    >
      <div className="art-glass-large-card__frame min-h-[260px]">
        {isNearViewport ? (
          <img
            src={item.thumbnailUrl || item.imageUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="art-glass-large-card__img"
          />
        ) : (
          <div className="w-full h-[260px] bg-white/[0.03]" aria-hidden="true" />
        )}
        <span className="lg-main-glass__sheen pointer-events-none" />
      </div>

      <div className="art-glass-large-card__caption">
        <h3 className="art-glass-large-card__title">{item.title}</h3>
      </div>
    </button>
  );
};
