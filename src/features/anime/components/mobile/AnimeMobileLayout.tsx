/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { ArrowRight, Play, Star } from 'lucide-react';
import { CinemaHeaderDownloadButton } from '../../../cinemaDownload';
import { AnimeMobileFilterBar } from './AnimeMobileFilterBar';
import { AnimeCard } from '../shared/AnimeCard';
import type {
  AnimeCategoryFilter,
  AnimeItem,
} from '../../types/anime.types';

interface AnimeMobileLayoutProps {
  onClose: () => void;
  activeCategory: AnimeCategoryFilter;
  onSelectCategory: (cat: AnimeCategoryFilter) => void;
  heroItem?: AnimeItem;
  items: AnimeItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSceneUpload: (file: File) => void;
  isSearchingScene: boolean;
  onSelectAnime: (item: AnimeItem, episode?: number) => void;
}

export const AnimeMobileLayout: React.FC<AnimeMobileLayoutProps> = ({
  onClose,
  activeCategory,
  onSelectCategory,
  heroItem,
  items,
  searchQuery,
  onSearchChange,
  onSceneUpload,
  isSearchingScene,
  onSelectAnime,
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

        <h1 className="text-base font-black text-white truncate">NL ANIME</h1>

        <div className="min-h-[44px] min-w-[44px] flex items-center justify-end">
          <CinemaHeaderDownloadButton currentLang="ar" />
        </div>
      </header>

      {/* Filter & Scene Search Bar */}
      <AnimeMobileFilterBar
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSceneUpload={onSceneUpload}
        isSearchingScene={isSearchingScene}
      />

      {/* Featured Mobile Hero Card */}
      {!searchQuery.trim() && heroItem && (
        <div className="px-3">
          <div
            onClick={() => onSelectAnime(heroItem, 1)}
            className="relative h-52 w-full rounded-2xl overflow-hidden border border-white/15 bg-slate-900"
          >
            <img
              src={heroItem.bannerUrl || heroItem.posterUrl}
              alt={heroItem.titleAr || heroItem.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-200 tabular-nums">
                <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                  <Star size={11} className="fill-current" />
                  {heroItem.score.toFixed(1)}
                </span>
                <span>·</span>
                <span>{heroItem.year}</span>
                <span>·</span>
                <span className="text-red-300 font-semibold">مترجم / مدبلج</span>
              </div>
              <h2 className="text-lg font-black text-white line-clamp-1">
                {heroItem.titleAr || heroItem.title}
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnime(heroItem, 1);
                }}
                className="mt-1 min-h-[44px] px-4 rounded-xl bg-red-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 self-start"
              >
                <Play size={14} className="fill-current" />
                <span>مشاهدة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Ergonomic Thumb Grid */}
      <div className="px-3 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <AnimeCard
            key={item.id}
            item={item}
            onSelect={(it) => onSelectAnime(it, 1)}
            compact
          />
        ))}
      </div>
    </div>
  );
};
