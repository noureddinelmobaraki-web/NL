/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState } from 'react';
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

interface CartoonDesktopLayoutProps {
  onClose: () => void;
  planets: PlanetFilterInfo[];
  selectedPlanet: SpacetoonPlanetId;
  onSelectPlanet: (planet: SpacetoonPlanetId) => void;
  selectedStudio: DubbingStudioTag | 'all';
  onSelectStudio: (studio: DubbingStudioTag | 'all') => void;
  heroItems: CartoonSeriesItem[];
  filteredItems: CartoonSeriesItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearchingArchive: boolean;
  onSelectCartoon: (item: CartoonSeriesItem, episode?: number) => void;
}

export const CartoonDesktopLayout: React.FC<CartoonDesktopLayoutProps> = ({
  onClose,
  planets,
  selectedPlanet,
  onSelectPlanet,
  selectedStudio,
  onSelectStudio,
  heroItems,
  filteredItems,
  searchQuery,
  onSearchChange,
  isSearchingArchive,
  onSelectCartoon,
}) => {
  const [heroIdx, setHeroIdx] = useState(0);
  const currentHero = heroItems[heroIdx] || heroItems[0];

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-none px-6 lg:px-12 py-6 flex flex-col gap-7 max-w-[1600px] mx-auto">
      {/* 3-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 py-3 border-b border-white/10 sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl px-4 rounded-2xl">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowRight size={15} />
            <span>العودة</span>
          </button>
          <span className="text-xl font-black tracking-tight text-amber-400 whitespace-nowrap shrink-0">
            سبيستون & كرتون الطيبين
          </span>
        </div>

        {/* Zone 2: Quick Planet Links */}
        <nav className="hidden xl:flex items-center gap-2 overflow-x-auto scrollbar-none">
          {planets.slice(0, 6).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlanet(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedPlanet === p.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.labelAr}
            </button>
          ))}
        </nav>

        {/* Zone 3: Live Archive Search + Download Manager */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-72">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في سبيستون و Archive.org..."
              className="w-full pr-9 pl-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <CinemaHeaderDownloadButton currentLang="ar" />
        </div>
      </header>

      {/* Classic Spacetoon Hero Banner (User Confirmed Default) */}
      {!searchQuery.trim() && currentHero && (
        <section className="relative w-full h-[420px] lg:h-[460px] rounded-3xl overflow-hidden border border-white/12 bg-slate-950">
          <img
            src={currentHero.backdropUrl || currentHero.posterUrl}
            alt={currentHero.titleAr}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950/90 via-slate-950/45 to-transparent" />

          <div className="relative z-10 h-full flex flex-col justify-end p-8 sm:p-10 max-w-2xl gap-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-200 tabular-nums">
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Star size={13} className="fill-current" />
                {currentHero.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold">
                {currentHero.planetLabelAr}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentHero.studio}</span>
              <span aria-hidden="true">·</span>
              <span>{currentHero.episodesCount} حلقة MP4 مباشرة</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl font-black text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {currentHero.titleAr}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 line-clamp-3 leading-relaxed">
              {currentHero.synopsisAr}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onSelectCartoon(currentHero, 1)}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap shrink-0"
              >
                <Play size={16} className="fill-current" />
                <span>مشاهدة وتحميل الحلقات (MP4)</span>
              </button>
            </div>

            {heroItems.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
                {heroItems.map((it, idx) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setHeroIdx(idx)}
                    aria-label={it.titleAr}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === heroIdx
                        ? 'w-8 bg-amber-400'
                        : 'w-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 10 Spacetoon Planets & Studios Filter Bar */}
      <SpacetoonPlanetFilter
        planets={planets}
        selectedPlanet={selectedPlanet}
        onSelectPlanet={onSelectPlanet}
        selectedStudio={selectedStudio}
        onSelectStudio={onSelectStudio}
      />

      {/* Catalog Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {searchQuery.trim()
              ? `نتائج البحث في الأرشيف عن "${searchQuery}"`
              : planets.find((p) => p.id === selectedPlanet)?.taglineAr ||
                'مكتبة كرتون الطيبين وسبيستون'}
          </h2>
          {isSearchingArchive && (
            <span className="text-xs text-amber-300">
              جاري البحث المباشر في Archive.org...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <CartoonCard
              key={item.id}
              item={item}
              onSelect={(it) => onSelectCartoon(it, 1)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
