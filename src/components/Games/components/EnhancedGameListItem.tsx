/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Enhanced Game List Item
 * Preserves the exact original .nl-game-item, .nl-game-thumb, and .nl-game-name classes
 * while adding a clean unboxed platform/genre subtitle and favorite star button.
 */

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { UnifiedGameItem } from '../types/games.types';

export interface EnhancedGameListItemProps {
  game: UnifiedGameItem;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

const FALLBACK_POSTER =
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ico/Games.png';

export function EnhancedGameListItem({
  game,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: EnhancedGameListItemProps) {
  const [imgSrc, setImgSrc] = useState(game.posterUrl || FALLBACK_POSTER);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`nl-game-item${isSelected ? ' is-selected' : ''}`}
        aria-current={isSelected ? 'true' : undefined}
        onClick={() => onSelect(game.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(game.id);
          }
        }}
      >
        <img
          className="nl-game-thumb"
          src={imgSrc}
          onError={() => {
            if (imgSrc !== FALLBACK_POSTER) setImgSrc(FALLBACK_POSTER);
          }}
          width={320}
          height={180}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
        />
        <div className="nl-game-info">
          <span className="nl-game-name">{game.title}</span>
          <span className="nl-game-meta">
            {game.platformBadge}
            {game.subGenre ? ` · ${game.subGenre}` : ''}
          </span>
        </div>
        <button
          type="button"
          className={`nl-game-fav${isFavorite ? ' is-fav' : ''}`}
          onClick={(e) => onToggleFavorite(game.id, e)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Saved' : 'Save game'}
        >
          <Star
            size={13}
            fill={isFavorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      </div>
    </li>
  );
}
