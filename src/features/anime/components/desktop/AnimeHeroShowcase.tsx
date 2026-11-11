/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState } from 'react';
import { Play, Info, Star, Film } from 'lucide-react';
import type { AnimeItem } from '../../types/anime.types';

interface AnimeHeroShowcaseProps {
  items: AnimeItem[];
  onWatchAnime: (item: AnimeItem) => void;
  onInspectAnime: (item: AnimeItem) => void;
}

export const AnimeHeroShowcase: React.FC<AnimeHeroShowcaseProps> = ({
  items,
  onWatchAnime,
  onInspectAnime,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);

  const current = items[activeIndex] || items[0];
  if (!current) return null;

  const displayTitle = current.titleAr || current.title;
  const displaySynopsis = current.synopsisAr || current.synopsis;

  return (
    <section className="relative w-full h-[460px] lg:h-[520px] rounded-3xl overflow-hidden border border-white/12 bg-slate-950">
      {/* Background Banner or YouTube Trailer */}
      {showTrailer && current.trailerYoutubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${current.trailerYoutubeId}?autoplay=1&mute=0&controls=1&rel=0`}
          title={displayTitle}
          className="absolute inset-0 w-full h-full object-cover border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <img
          src={current.bannerUrl || current.posterUrl}
          alt={displayTitle}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}

      {/* Measured Contrast Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-l from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none" />

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-10 max-w-2xl gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
            <Star size={13} className="fill-current" />
            MAL {current.score.toFixed(2)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{current.year}</span>
          <span aria-hidden="true">·</span>
          <span>
            {current.format === 'MOVIE'
              ? 'فيلم أنمي'
              : `${current.episodesCount} حلقة`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-red-300 font-semibold">
            مترجم عربي / مدبلج
          </span>
        </div>

        <h2
          className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
          style={{ textWrap: 'balance' }}
        >
          {displayTitle}
        </h2>

        <p className="text-xs sm:text-sm text-slate-200/90 line-clamp-3 leading-relaxed max-w-xl">
          {displaySynopsis}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onWatchAnime(current)}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap shrink-0"
          >
            <Play size={16} className="fill-current" />
            <span>مشاهدة الآن (مترجم / مدبلج)</span>
          </button>

          <button
            type="button"
            onClick={() => onInspectAnime(current)}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <Info size={16} />
            <span>الحلقات والتفاصيل</span>
          </button>

          {current.trailerYoutubeId && (
            <button
              type="button"
              onClick={() => setShowTrailer((v) => !v)}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Film size={15} />
              <span>{showTrailer ? 'إغلاق التريلر' : 'مشاهدة التريلر'}</span>
            </button>
          )}
        </div>

        {/* Slide Selector Dots */}
        {items.length > 1 && (
          <div className="flex items-center gap-2 pt-2">
            {items.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  setShowTrailer(false);
                  setActiveIndex(idx);
                }}
                aria-label={`الانتقال إلى ${it.titleAr || it.title}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'w-8 bg-red-500'
                    : 'w-2.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
