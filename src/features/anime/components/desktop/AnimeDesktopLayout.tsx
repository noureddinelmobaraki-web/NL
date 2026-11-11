/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useRef } from 'react';
import {
  Search,
  Image as ImageIcon,
  X,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { CinemaHeaderDownloadButton } from '../../../cinemaDownload';
import { AnimeHeroShowcase } from './AnimeHeroShowcase';
import { AnimeCard } from '../shared/AnimeCard';
import type {
  AnimeCategoryFilter,
  AnimeItem,
  TraceMoeMatch,
} from '../../types/anime.types';

interface AnimeDesktopLayoutProps {
  onClose: () => void;
  activeCategory: AnimeCategoryFilter;
  onSelectCategory: (cat: AnimeCategoryFilter) => void;
  heroItems: AnimeItem[];
  trendingList: AnimeItem[];
  seasonalList: AnimeItem[];
  topRatedList: AnimeItem[];
  moviesList: AnimeItem[];
  arabicDubList: AnimeItem[];
  filteredItems: AnimeItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearching: boolean;
  sceneMatches: TraceMoeMatch[];
  isSearchingScene: boolean;
  onSceneUpload: (file: File) => void;
  onClearSceneMatches: () => void;
  onSelectAnime: (item: AnimeItem, episode?: number) => void;
}

const CATEGORIES: Array<{ id: AnimeCategoryFilter; label: string }> = [
  { id: 'all', label: 'الرئيسية' },
  { id: 'trending', label: 'الرائج الآن' },
  { id: 'seasonal', label: 'أنميات الموسم' },
  { id: 'arabic_dub', label: 'مترجم ومدبلج عربي' },
  { id: 'top_rated', label: 'الأعلى تقييماً' },
  { id: 'movies', label: 'أفلام الأنمي' },
];

function HorizontalAnimeShelf({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: AnimeItem[];
  onSelect: (item: AnimeItem) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  if (items.length === 0) return null;

  const scrollByOffset = (dir: number) => {
    rowRef.current?.scrollBy({ left: dir * 640, behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByOffset(1)}
            aria-label="السابق"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollByOffset(-1)}
            aria-label="التالي"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="grid grid-flow-col auto-cols-[185px] sm:auto-cols-[205px] gap-4 overflow-x-auto scrollbar-none pb-2"
      >
        {items.map((item) => (
          <AnimeCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onQuickPlay={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export const AnimeDesktopLayout: React.FC<AnimeDesktopLayoutProps> = ({
  onClose,
  activeCategory,
  onSelectCategory,
  heroItems,
  trendingList,
  seasonalList,
  topRatedList,
  moviesList,
  arabicDubList,
  filteredItems,
  searchQuery,
  onSearchChange,
  isSearching,
  sceneMatches,
  isSearchingScene,
  onSceneUpload,
  onClearSceneMatches,
  onSelectAnime,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-none px-6 lg:px-12 py-6 flex flex-col gap-8 max-w-[1600px] mx-auto">
      {/* 3-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 py-3 border-b border-white/10 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl px-4 rounded-2xl">
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
          <span className="text-xl font-black tracking-tight text-white whitespace-nowrap shrink-0">
            NL ANIME
          </span>
        </div>

        {/* Zone 2: Single-line Category Navigation */}
        <nav className="hidden lg:flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Search + trace.moe Scene Recognition + Download Studio */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-64">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن أنمي (عربي / English)..."
              className="w-full pr-9 pl-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500"
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSceneUpload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="ابحث عن اسم الأنمي ورقم الحلقة من صورة مشهد (trace.moe)"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ImageIcon size={14} className="text-red-400" />
            <span>{isSearchingScene ? 'جاري فحص المشهد...' : 'بحث بالصورة'}</span>
          </button>

          <CinemaHeaderDownloadButton currentLang="ar" />
        </div>
      </header>

      {/* trace.moe Image Recognition Results Banner */}
      {sceneMatches.length > 0 && (
        <section className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              نتائج التعرف على المشهد عبر trace.moe
            </h3>
            <button
              type="button"
              onClick={onClearSceneMatches}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              إغلاق النتائج
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sceneMatches.slice(0, 3).map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  onSelectAnime(
                    {
                      id: `al-${m.anilistId}`,
                      anilistId: m.anilistId,
                      malId: m.malId,
                      title: m.title,
                      synopsis: 'تم التعرف على الأنمي عبر صورة المشهد.',
                      posterUrl: m.imagePreviewUrl || '',
                      bannerUrl: m.imagePreviewUrl || '',
                      score: 8.5,
                      episodesCount: Math.max(12, m.episode || 12),
                      status: 'FINISHED',
                      format: 'TV',
                      year: 2024,
                      studios: [],
                      genres: [],
                      hasSub: true,
                      hasDub: true,
                    },
                    m.episode || 1,
                  )
                }
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-right cursor-pointer"
              >
                {m.imagePreviewUrl && (
                  <img
                    src={m.imagePreviewUrl}
                    alt={m.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-white truncate">
                    {m.title}
                  </span>
                  <span className="text-[11px] text-slate-300 tabular-nums">
                    الحلقة {m.episode || 1} · تطابق{' '}
                    {(m.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      {searchQuery.trim() !== '' || activeCategory !== 'all' ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white">
            {searchQuery.trim()
              ? `نتائج البحث عن "${searchQuery}"`
              : CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </h2>
          {isSearching ? (
            <div className="py-16 text-center text-sm text-slate-400">
              جاري البحث في Jikan و AniList و Kitsu...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredItems.map((item) => (
                <AnimeCard
                  key={item.id}
                  item={item}
                  onSelect={(it) => onSelectAnime(it, 1)}
                  onQuickPlay={(it) => onSelectAnime(it, 1)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <AnimeHeroShowcase
            items={heroItems}
            onWatchAnime={(it) => onSelectAnime(it, 1)}
            onInspectAnime={(it) => onSelectAnime(it, 1)}
          />

          <HorizontalAnimeShelf
            title="مختارات الأنمي المدبلج والمترجم للعربية"
            items={arabicDubList}
            onSelect={(it) => onSelectAnime(it, 1)}
          />

          <HorizontalAnimeShelf
            title="الأنميات الأكثر رواجاً الآن (Trending)"
            items={trendingList}
            onSelect={(it) => onSelectAnime(it, 1)}
          />

          <HorizontalAnimeShelf
            title="يعرض حالياً في هذا الموسم"
            items={seasonalList}
            onSelect={(it) => onSelectAnime(it, 1)}
          />

          <HorizontalAnimeShelf
            title="الأعلى تقييماً في التاريخ (Top MAL)"
            items={topRatedList}
            onSelect={(it) => onSelectAnime(it, 1)}
          />

          <HorizontalAnimeShelf
            title="روائع أفلام الأنمي السينمائية"
            items={moviesList}
            onSelect={(it) => onSelectAnime(it, 1)}
          />
        </>
      )}
    </div>
  );
};
