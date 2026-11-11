import React, { useState } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';

export interface ArtGlassLargeCardProps {
  item: ArtMuseumPiece;
  onSelect: (item: ArtMuseumPiece) => void;
}

/**
 * Displays ONLY the large HD artwork and the title below it.
 * All detailed metadata (artist, date, medium, dimensions, museum, download)
 * is shown strictly inside the Lightbox modal upon clicking.
 */
export const ArtGlassLargeCard: React.FC<ArtGlassLargeCardProps> = ({ item, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) return null;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="art-glass-large-card group"
      aria-label={item.title}
    >
      <div className="art-glass-large-card__frame">
        <img
          src={item.imageUrl}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="art-glass-large-card__img"
        />
        <span className="lg-main-glass__sheen pointer-events-none" />
      </div>

      <div className="art-glass-large-card__caption">
        <h3 className="art-glass-large-card__title">{item.title}</h3>
      </div>
    </button>
  );
};
