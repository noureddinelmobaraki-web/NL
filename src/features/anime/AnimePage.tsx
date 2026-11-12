/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * AnimePage — Unified Liquid Glass Cinema Experience (100% matched with MoviesPage.tsx)
 * Uses CinemaHeroBanner, MovieRow, MoviePosterCard, CinemaDetailModal, CinemaPlayerStage,
 * and CinemaHeaderDownloadButton with Sub/Dub switching and multi-source AniList/Jikan/Kitsu data.
 */

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Languages, X } from 'lucide-react';
import '../../styles/components/cinema.css';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import { CinemaHeaderDownloadButton } from '../cinemaDownload';
import { GlassVectorIcon } from '../../components/shared/icons';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';

import { ANIME_TABS } from './constants/animeTabs';
import {
  useAnimeBrowseState,
  useAnimeCategoryFeed,
  useAnimeCinemaBridge,
  useAnimeGenreRows,
} from './hooks';

export interface AnimePageProps {
  onClose?: () => void;
}

export const AnimePage: React.FC<AnimePageProps> = ({ onClose }) => {
  const {
    activeTab,
    setActiveTab,
    audioMode,
    setAudioMode,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  } = useAnimeBrowseState();

  const { animeList, loading } = useAnimeCategoryFeed(activeTab, debouncedQuery);
  const { controller, cinemaItems, activeHeroItem } = useAnimeCinemaBridge(animeList, audioMode);
  const { shonenRow, seinenMysteryRow } = useAnimeGenreRows(cinemaItems);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useOverlayPageFrame({
    onClose,
    isInnerLayerOpen: () =>
      controller.selectedItemId !== null || controller.selectedActor !== null,
  });

  const content = (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-[#05070e]"
      dir="rtl"
    >
      <div
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pb-24 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Top Floating Liquid Glass Navigation Bar */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 bg-slate-950/70 backdrop-blur-2xl border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {ANIME_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white/20 text-white border border-white/45 shadow-lg'
                      : 'bg-white/5 text-slate-300 hover:bg-white/12 border border-white/10'
                  }`}
                >
                  <GlassVectorIcon
                    icon={tab.icon}
                    theme={tab.theme}
                    size={15}
                    active={active}
                    badge={false}
                  />
                  <span>{tab.labelAr}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
            <div className="inline-flex items-center rounded-2xl bg-white/8 border border-white/20 p-1">
              <button
                type="button"
                onClick={() => setAudioMode('sub')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                  audioMode === 'sub'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Languages size={12} />
                <span>SUB مترجم</span>
              </button>
              <button
                type="button"
                onClick={() => setAudioMode('dub')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                  audioMode === 'dub'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>DUB مدبلج</span>
              </button>
            </div>

            <div className="relative w-44 sm:w-64">
              <Search
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أنمي (One Piece, Attack)..."
                className="w-full pr-9 pl-7 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <CinemaHeaderDownloadButton currentLang="ar" />

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {activeHeroItem && !debouncedQuery && (
          <CinemaHeroBanner
            activeHeroItem={activeHeroItem}
            isMobile={controller.isMobile}
            heroIndex={controller.heroTrailer.heroIndex}
            setHeroIndex={controller.heroTrailer.setHeroIndex}
            currentLang="ar"
            localizedHeroTitle={activeHeroItem.title}
            heroServersOpen={controller.heroTrailer.heroServersOpen}
            setHeroServersOpen={controller.heroTrailer.setHeroServersOpen}
            slideshowSlides={controller.slideshowSlides}
            setSelectedItemId={controller.setSelectedItemId}
            handleQuickWatch={controller.handleQuickWatch}
            t={controller.t}
          />
        )}

        <div className="relative z-20 px-4 sm:px-10 pt-6 space-y-8">
          {!debouncedQuery && cinemaItems.length > 0 && (
            <>
              <MovieRow
                title="أقوى أنميات الموسم والرائج عالمياً"
                items={cinemaItems}
                setSelectedItemId={controller.setSelectedItemId}
                onQuickWatch={controller.handleQuickWatch}
                isTouch={controller.isTouch}
                activeHoverId={controller.activeHoverId}
                setActiveHoverId={controller.setActiveHoverId}
                hoverTimer={hoverTimerRef}
                t={controller.t}
                isFavoriteFn={(id: number, mediaType: 'movie' | 'tv') =>
                  controller.has(id, mediaType, 'favorite')
                }
              />

              {shonenRow.length > 0 && (
                <MovieRow
                  title="ملحمة الشونين والقتال الخارق"
                  items={shonenRow}
                  setSelectedItemId={controller.setSelectedItemId}
                  onQuickWatch={controller.handleQuickWatch}
                  isTouch={controller.isTouch}
                  activeHoverId={controller.activeHoverId}
                  setActiveHoverId={controller.setActiveHoverId}
                  hoverTimer={hoverTimerRef}
                  t={controller.t}
                  isFavoriteFn={(id: number, mediaType: 'movie' | 'tv') =>
                    controller.has(id, mediaType, 'favorite')
                  }
                />
              )}

              {seinenMysteryRow.length > 0 && (
                <MovieRow
                  title="الغموض والخيال العلمي والسينيين"
                  items={seinenMysteryRow}
                  setSelectedItemId={controller.setSelectedItemId}
                  onQuickWatch={controller.handleQuickWatch}
                  isTouch={controller.isTouch}
                  activeHoverId={controller.activeHoverId}
                  setActiveHoverId={controller.setActiveHoverId}
                  hoverTimer={hoverTimerRef}
                  t={controller.t}
                  isFavoriteFn={(id: number, mediaType: 'movie' | 'tv') =>
                    controller.has(id, mediaType, 'favorite')
                  }
                />
              )}
            </>
          )}

          <section className="pt-2">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4 px-2">
              {debouncedQuery
                ? `نتائج البحث عن "${debouncedQuery}"`
                : 'مكتبة الأنمي الكاملة'}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-[2/3] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 px-2">
                {cinemaItems.map((item) => (
                  <MoviePosterCard
                    key={item.id}
                    item={item}
                    setSelectedItemId={controller.setSelectedItemId}
                    onQuickWatch={controller.handleQuickWatch}
                    isTouch={controller.isTouch}
                    activeHoverId={controller.activeHoverId}
                    setActiveHoverId={controller.setActiveHoverId}
                    hoverTimer={hoverTimerRef}
                    t={controller.t}
                    isFavorite={controller.has(item.id, item.mediaType, 'favorite')}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <CinemaDetailModal
        selectedItemId={controller.selectedItemId}
        setSelectedItemId={controller.setSelectedItemId}
        isWatchingInGallery={controller.isWatchingInGallery}
        setIsWatchingInGallery={controller.setIsWatchingInGallery}
        isLoadingDetails={controller.isLoadingDetails}
        detailedItem={controller.detailedItem}
        detailDialogRef={controller.detailDialogRef}
        detailWatchTarget={controller.detailWatchTarget}
        detailServersOpen={controller.detailServersOpen}
        setDetailServersOpen={controller.setDetailServersOpen}
        startGalleryWatchSession={controller.startGalleryWatchSession}
        activeImdbId={controller.activeImdbId}
        showHeroTrailer={controller.heroTrailer.showHeroTrailer}
        setShowHeroTrailer={controller.heroTrailer.setShowHeroTrailer}
        setTrailerFallbackToYoutube={controller.heroTrailer.setTrailerFallbackToYoutube}
        persistCurrentProgress={controller.persistCurrentProgress}
        currentLang="ar"
        t={controller.t}
        user={controller.user}
        has={controller.has}
        toggle={controller.toggle}
        handleSelectActor={controller.setSelectedActor}
        playerStageProps={controller.playerStageProps}
      />

      <ActorProfileModal
        selectedActor={controller.selectedActor}
        isWatchingInGallery={controller.isWatchingInGallery}
        tmdbKey={controller.tmdbKey}
        currentLang="ar"
        onClose={() => controller.setSelectedActor(null)}
        onSelectWork={(id, mediaType) => controller.setSelectedItemId(id, mediaType)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default AnimePage;
