/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * AnimePage — Unified Liquid Glass Cinema Experience
 * - Clean English UI (dir="ltr")
 * - 14 Orthogonal Virtualized Shelves powered by AniList GraphQL v2, Jikan v4 & Early Japanese Animation Archive
 * - Zero top-bar icon clutter or duplicate bottom catalog grid
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Languages, X } from 'lucide-react';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import {
  MOVIE_ROW_SCROLL_STYLE,
  type CinemaItem,
} from '../../components/Movies/moviesDataClient';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import {
  removeProgress,
  useContinueWatching,
} from '../cinema/progress/progressStore';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';
import { useVirtualizedShelves } from '../../hooks/useVirtualizedShelves';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';

import { ANIME_TABS } from './constants/animeTabs';
import type { AnimeItem } from './types/anime.types';
import {
  useAnimeBrowseState,
  useAnimeCategoryFeed,
  useAnimeCinemaBridge,
} from './hooks';
import { createAnimeOrthogonalShelves } from './catalog/animeShelvesConfig';

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

  const extraAnimeMapRef = useRef<Map<number, AnimeItem>>(new Map());
  const registerAnimeItem = useCallback((numId: number, item: AnimeItem) => {
    extraAnimeMapRef.current.set(numId, item);
  }, []);

  const shelfDefs = useMemo(
    () => createAnimeOrthogonalShelves(registerAnimeItem),
    [registerAnimeItem],
  );

  const {
    visibleShelves,
    hasMoreShelves,
    sentinelRef,
    fetchNextShelfPage,
  } = useVirtualizedShelves<CinemaItem>({
    shelves: shelfDefs,
    getItemKey: (it) =>
      String(it.anilistId || it.malId || it.archiveIds?.[0] || it.id),
    initialShelfCount: 4,
    batchShelfCount: 3,
  });

  const extraCinemaItems = useMemo(
    () => visibleShelves.flatMap((s) => s.items),
    [visibleShelves],
  );

  const { animeList, loading } = useAnimeCategoryFeed(activeTab, debouncedQuery);
  const { controller, cinemaItems, activeHeroItem } = useAnimeCinemaBridge(
    animeList,
    audioMode,
    setAudioMode,
    extraAnimeMapRef,
    extraCinemaItems,
  );

  const continueWatchingAnime = useContinueWatching('anime');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useOverlayPageFrame({
    onClose,
    isInnerLayerOpen: () =>
      controller.selectedItemId !== null || controller.selectedActor !== null,
  });

  const showShelvesView = !debouncedQuery && activeTab === 'trending';

  const content = (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-transparent"
      dir="ltr"
    >
      <LiquidGlassBooksBackdrop dimmerOpacity={0.52} />

      <div
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pb-24 max-md:pb-32 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Clean Top Floating Liquid Glass Navigation Bar — Text Pills Only */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-slate-950/45 backdrop-blur-2xl border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
            {ANIME_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white/20 text-white border border-white/45 shadow-lg'
                      : 'bg-white/8 text-slate-200 hover:bg-white/15 border border-white/15'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end w-full sm:w-auto">
            <div className="inline-flex items-center rounded-2xl bg-white/10 border border-white/25 p-1 backdrop-blur-md shrink-0">
              <button
                type="button"
                data-compact-touch="true"
                onClick={() => setAudioMode('sub')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                  audioMode === 'sub'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Languages size={12} />
                <span>SUB</span>
              </button>
              <button
                type="button"
                data-compact-touch="true"
                onClick={() => setAudioMode('dub')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                  audioMode === 'dub'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <span>DUB</span>
              </button>
            </div>

            <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime (One Piece, Attack on Titan)..."
                className="w-full pl-9 pr-7 py-2 rounded-2xl bg-white/12 border border-white/25 text-xs text-white placeholder:text-slate-300 focus:outline-none focus:border-sky-400 backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  type="button"
                  data-compact-touch="true"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-2xl bg-white/12 hover:bg-white/22 border border-white/25 text-slate-200 hover:text-white transition cursor-pointer shrink-0 backdrop-blur-md"
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
            currentLang="en"
            localizedHeroTitle={activeHeroItem.title}
            heroServersOpen={controller.heroTrailer.heroServersOpen}
            setHeroServersOpen={controller.heroTrailer.setHeroServersOpen}
            slideshowSlides={controller.slideshowSlides}
            setSelectedItemId={controller.setSelectedItemId}
            handleQuickWatch={controller.handleQuickWatch}
            t={controller.t}
          />
        )}

        <div className="relative z-20 px-4 sm:px-10 pt-6 space-y-6">
          {!debouncedQuery && continueWatchingAnime.length > 0 && (
            <div className="relative z-20 flex flex-col gap-1.5 py-2.5">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight drop-shadow">
                  Continue Watching
                </h2>
              </div>
              <div
                className="nl-cinema-row flex gap-4 overflow-x-auto select-none px-3 scroll-smooth scrollbar-none snap-x snap-mandatory"
                style={MOVIE_ROW_SCROLL_STYLE}
              >
                {continueWatchingAnime.map((entry) => {
                  const cwItem: CinemaItem =
                    cinemaItems.find((it) => it.id === entry.id) || {
                      id: entry.id,
                      hub: 'anime',
                      mediaType: entry.mediaType,
                      title: entry.title,
                      overview: '',
                      posterPath: entry.posterPath || '',
                      backdropPath: entry.backdropPath || '',
                      year: '',
                      rating: 0,
                      genreIds: [16],
                      genreNames: ['Anime'],
                      trailerKey: '',
                      cast: [],
                      similar: [],
                    };
                  const ratio =
                    entry.duration > 0 ? entry.time / entry.duration : 0;
                  const epBadge =
                    entry.mediaType === 'tv' && entry.season && entry.episode
                      ? `S${entry.season}:E${entry.episode}`
                      : undefined;
                  return (
                    <div key={entry.key} className="flex-shrink-0 snap-start">
                      <MoviePosterCard
                        item={cwItem}
                        isTouch={controller.isTouch}
                        activeHoverId={controller.activeHoverId}
                        setActiveHoverId={controller.setActiveHoverId}
                        hoverTimer={hoverTimerRef}
                        setSelectedItemId={controller.setSelectedItemId}
                        onQuickWatch={controller.handleQuickWatch}
                        t={controller.t}
                        progressRatio={ratio}
                        episodeBadge={epBadge}
                        onRemoveProgress={() =>
                          removeProgress(entry.mediaType, entry.id, 'anime')
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showShelvesView ? (
            <>
              {visibleShelves.map((shelf) => (
                <MovieRow
                  key={shelf.id}
                  title={shelf.title}
                  items={shelf.items}
                  onReachEnd={() => void fetchNextShelfPage(shelf.id)}
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
              ))}
              {hasMoreShelves && (
                <div
                  ref={sentinelRef}
                  className="w-full h-16 flex items-center justify-center text-xs text-slate-400 font-semibold"
                >
                  Loading more anime shelves...
                </div>
              )}
            </>
          ) : (
            <section className="pt-2">
              <h2 className="text-lg sm:text-xl font-black text-white mb-4 px-2 drop-shadow">
                {debouncedQuery
                  ? `Search Results for "${debouncedQuery}"`
                  : ANIME_TABS.find((t) => t.id === activeTab)?.label || 'Anime Catalog'}
              </h2>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-[2/3] rounded-2xl bg-white/10 border border-white/15 animate-pulse backdrop-blur-md"
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
          )}
        </div>
      </div>

      {/* Mobile-Only Crunchyroll-Style Liquid Glass Bottom Tab Bar */}
      {controller.selectedItemId === null && (
        <nav
          aria-label="Anime categories"
          data-mobile-bottom-bar="true"
          className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-full bg-slate-950/75 backdrop-blur-2xl border border-white/20 px-1.5 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-[0_14px_38px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.22)]"
          style={{
            bottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          }}
        >
          {ANIME_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const shortLabel =
              tab.id === 'trending'
                ? 'Trending'
                : tab.id === 'seasonal'
                  ? 'Seasonal'
                  : tab.id === 'top_rated'
                    ? 'Top Rated'
                    : tab.id === 'arabic_dub'
                      ? 'Dubs'
                      : 'Movies';
            return (
              <button
                key={`mobile-tab-${tab.id}`}
                type="button"
                data-compact-touch="true"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (searchQuery) setSearchQuery('');
                }}
                className={`flex-1 min-w-fit px-3 py-2 rounded-full text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-white/22 text-white border border-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.16)]'
                    : 'text-slate-300 hover:text-white border border-transparent'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </nav>
      )}

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
        currentLang="en"
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
        currentLang="en"
        onClose={() => controller.setSelectedActor(null)}
        onSelectWork={(id, mediaType) => controller.setSelectedItemId(id, mediaType)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default AnimePage;
