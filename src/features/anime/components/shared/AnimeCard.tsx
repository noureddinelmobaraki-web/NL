/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState } from 'react';
import { Play, Star, Sparkles } from 'lucide-react';
import type { AnimeItem } from '../../types/anime.types';

interface AnimeCardProps {
  item: AnimeItem;
  onSelect: (item: AnimeItem) => void;
  onQuickPlay?: (item: AnimeItem) => void;
  compact?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  item,
  onSelect,
  onQuickPlay,
  compact = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const displayTitle = item.titleAr || item.title;

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
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/65 border border-white/10 hover:border-red-500/45 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        {!imgFailed && item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-red-950/40 to-slate-950">
            <Sparkles size={28} className="text-red-400/70 mb-2" />
            <span className="text-xs font-semibold text-white/80 line-clamp-2">
              {displayTitle}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

        {/* Hover Quick Play Button */}
        {onQuickPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickPlay(item);
            }}
            aria-label={`تشغيل ${displayTitle}`}
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg hover:bg-red-500"
          >
            <Play size={18} className="fill-current ml-0.5" />
          </button>
        )}

        {/* Bottom Scrim Info */}
        <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1">
          <h3
            className={`font-bold text-white leading-snug line-clamp-1 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {displayTitle}
          </h3>

          {/* Clean unboxed metadata with typographic separators */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300/90 tabular-nums whitespace-nowrap overflow-hidden">
            <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold">
              <Star size={11} className="fill-current" />
              {item.score.toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{item.year}</span>
            <span aria-hidden="true">·</span>
            <span>
              {item.format === 'MOVIE'
                ? 'فيلم'
                : `${item.episodesCount || 12} حلقة`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-red-300 font-medium">
              {item.hasArabicDub ? 'مترجم / مدبلج' : 'Sub / Dub'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
