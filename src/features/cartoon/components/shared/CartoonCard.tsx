/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState } from 'react';
import { Play, Star, Tv } from 'lucide-react';
import type { CartoonSeriesItem } from '../../types/cartoon.types';

interface CartoonCardProps {
  item: CartoonSeriesItem;
  onSelect: (item: CartoonSeriesItem) => void;
  compact?: boolean;
}

export const CartoonCard: React.FC<CartoonCardProps> = ({
  item,
  onSelect,
  compact = false,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/65 border border-white/10 hover:border-amber-400/50 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        {!imgError && item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.titleAr}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-amber-950/35 to-slate-950">
            <Tv size={28} className="text-amber-400/75 mb-2" />
            <span className="text-xs font-bold text-white/90 line-clamp-2">
              {item.titleAr}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Hover Play Trigger */}
        <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-amber-500/95 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg">
          <Play size={18} className="fill-current ml-0.5" />
        </div>

        {/* Bottom Scrim Info */}
        <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1">
          <h3
            className={`font-bold text-white leading-snug line-clamp-2 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {item.titleAr}
          </h3>

          {/* Clean unboxed metadata with typographic separators */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300/90 tabular-nums whitespace-nowrap overflow-hidden">
            <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold">
              <Star size={11} className="fill-current" />
              {item.rating.toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-200 font-medium truncate">
              {item.studio}
            </span>
            <span aria-hidden="true">·</span>
            <span>{item.episodesCount} ح</span>
          </div>
        </div>
      </div>
    </div>
  );
};
