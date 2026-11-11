/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { ArrowRight, Play, Search, Star, X } from 'lucide-react';
import { CinemaHeaderDownloadButton } from '../../../cinemaDownload';
import { SpacetoonPlanetFilter } from '../shared/SpacetoonPlanetFilter';
import { CartoonCard } from '../shared/CartoonCard';
import type { PlanetFilterInfo } from '../../services/spacetoonArchiveRegistry';
import type {
  CartoonSeriesItem,
  DubbingStudioTag,
  SpacetoonPlanetId,
} from '../../types/cartoon.types';

interface CartoonMobileLayoutProps {
  onClose: () => void;
  planets: PlanetFilterInfo[];
  selectedPlanet: SpacetoonPlanetId;
  onSelectPlanet: (planet: SpacetoonPlanetId) => void;
  selectedStudio: DubbingStudioTag | 'all';
  onSelectStudio: (studio: DubbingStudioTag | 'all') => void;
  heroItem?: CartoonSeriesItem;
  items: CartoonSeriesItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCartoon: (item: CartoonSeriesItem, episode?: number) => void;
}

export const CartoonMobileLayout: React.FC<CartoonMobileLayoutProps> = ({
  onClose,
  planets,
  selectedPlanet,
  onSelectPlanet,
  selectedStudio,
  onSelectStudio,
  heroItem,
  items,
  searchQuery,
  onSearchChange,
  onSelectCartoon,
}) => {
  return (
    <div
      className="h-full w-full overflow-y-auto scrollbar-none flex flex-col gap-3"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
      }}
    >
      {/* Compact Sticky Mobile Top App Bar (<= 56px, respects 15% sticky cap) */}
      <header className="sticky top-0 z-30 h-14 px-3 bg-slate-950/85 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="العودة"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/10 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <ArrowRight size={16} />
          <span>رجوع</span>
        </button>

        <h1 className="text-base font-black text-amber-400 truncate">
          سبيستون & كرتون
        </h1>

        <div className="min-h-[44px] min-w-[44px] flex items-center justify-end">
          <CinemaHeaderDownloadButton currentLang="ar" />
        </div>
      </header>

      {/* Search + Swipeable Planets Filter */}
      <div className="px-3 flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في كرتون سبيستون و Archive.org..."
            className="w-full h-11 pr-9 pl-8 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <SpacetoonPlanetFilter
          planets={planets}
          selectedPlanet={selectedPlanet}
          onSelectPlanet={onSelectPlanet}
          selectedStudio={selectedStudio}
          onSelectStudio={onSelectStudio}
          compact
        />
      </div>

      {/* Featured Spacetoon Hero Card */}
      {!searchQuery.trim() && heroItem && (
        <div className="px-3">
          <div
            onClick={() => onSelectCartoon(heroItem, 1)}
            className="relative h-52 w-full rounded-2xl overflow-hidden border border-white/15 bg-slate-900"
          >
            <img
              src={heroItem.backdropUrl || heroItem.posterUrl}
              alt={heroItem.titleAr}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-200 tabular-nums">
                <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                  <Star size={11} className="fill-current" />
                  {heroItem.rating.toFixed(1)}
                </span>
                <span>·</span>
                <span className="text-amber-300 font-semibold">
                  {heroItem.planetLabelAr}
                </span>
                <span>·</span>
                <span>{heroItem.studio}</span>
              </div>
              <h2 className="text-base font-black text-white line-clamp-1">
                {heroItem.titleAr}
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCartoon(heroItem, 1);
                }}
                className="mt-1 min-h-[44px] px-4 rounded-xl bg-amber-500 text-slate-950 text-xs font-black inline-flex items-center justify-center gap-1.5 self-start"
              >
                <Play size={14} className="fill-current" />
                <span>مشاهدة الحلقات (MP4)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Thumb Grid */}
      <div className="px-3 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <CartoonCard
            key={item.id}
            item={item}
            onSelect={(it) => onSelectCartoon(it, 1)}
            compact
          />
        ))}
      </div>
    </div>
  );
};
