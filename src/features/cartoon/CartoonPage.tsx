/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * CartoonPage — Spacetoon, Space Power, MBC 3, Jeem/Baraem, CN/Nick & Classic Arabic Cartoon Universe
 * - Clean Arabic RTL Header (Only Search Input & Close Button)
 * - 8 Lazy-Loaded Virtualized Shelves across 6 modular catalog chunks
 * - Direct MP4 & .Torrent download support per episode
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import '../../styles/components/cinema.css';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import type { CinemaItem } from '../../components/Movies/moviesDataClient';
import { useContinueWatching } from '../cinema/progress/progressStore';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';
import { useVirtualizedShelves } from '../../hooks/useVirtualizedShelves';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';

import type { CartoonSeriesItem } from './types/cartoon.types';
import {
  useCartoonCatalogView,
  useCartoonCinemaBridge,
} from './hooks';
import { createCartoonLazyShelves } from './services/cartoonCatalogLoader';
import { searchOpenArchiveCartoons } from './services/archiveOrgStreamResolver';
import {
  adaptCartoonToCinemaItem,
  getCartoonNumericId,
} from './adapters/cartoonToCinemaAdapter';

export interface CartoonPageProps {
  onClose?: () => void;
}

export const CartoonPage: React.FC<CartoonPageProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [liveArchiveHits, setLiveArchiveHits] = useState<CartoonSeriesItem[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dynamicSeriesMapRef = useRef<Map<number, CartoonSeriesItem>>(new Map());

  const registerSeries = useCallback((numId: number, item: CartoonSeriesItem) => {
    dynamicSeriesMapRef.current.set(numId, item);
  }, []);

  const shelfDefs = useMemo(
    () => createCartoonLazyShelves(registerSeries),
    [registerSeries],
  );

  const {
    visibleShelves,
    hasMoreShelves,
    sentinelRef,
    fetchNextShelfPage,
  } = useVirtualizedShelves<CinemaItem>({
    shelves: shelfDefs,
    getItemKey: (it) => it.archiveIds?.[0] || `cartoon:${it.id}`,
    initialShelfCount: 4,
    batchShelfCount: 3,
  });

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setLiveArchiveHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchOpenArchiveCartoons(q).then((hits) => {
        if (!cancelled) setLiveArchiveHits(hits);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const { seriesByNumericId: baseSeriesMap, cinemaItems: baseCinemaItems } =
    useCartoonCatalogView('all', searchQuery);

  const mergedSeriesAndItems = useMemo(() => {
    const map = new Map<number, CartoonSeriesItem>(dynamicSeriesMapRef.current);
    baseSeriesMap.forEach((v, k) => map.set(k, v));

    const itemMap = new Map<number, CinemaItem>();
    for (const it of baseCinemaItems) itemMap.set(it.id, it);
    for (const s of visibleShelves) {
      for (const it of s.items) {
        if (!itemMap.has(it.id)) itemMap.set(it.id, it);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      for (const [numId, series] of dynamicSeriesMapRef.current.entries()) {
        if (
          series.titleAr.toLowerCase().includes(q) ||
          series.titleEn.toLowerCase().includes(q) ||
          series.synopsisAr.toLowerCase().includes(q) ||
          series.studio.toLowerCase().includes(q)
        ) {
          if (!itemMap.has(numId)) {
            itemMap.set(numId, adaptCartoonToCinemaItem(series, numId % 1000));
          }
        }
      }
      liveArchiveHits.forEach((hit, idx) => {
        const numId = getCartoonNumericId(hit, 900 + idx);
        map.set(numId, hit);
        if (!itemMap.has(numId)) {
          itemMap.set(numId, adaptCartoonToCinemaItem(hit, 900 + idx));
        }
      });
    }

    return {
      seriesByNumericId: map,
      allCinemaItems: Array.from(itemMap.values()),
    };
  }, [baseSeriesMap, baseCinemaItems, visibleShelves, searchQuery, liveArchiveHits]);

  const { controller, activeHeroItem } = useCartoonCinemaBridge(
    mergedSeriesAndItems.seriesByNumericId,
    mergedSeriesAndItems.allCinemaItems,
  );

  const continueWatchingProgress = useContinueWatching('cartoon');

  const continueWatchingItems = useMemo<CinemaItem[]>(() => {
    const byId = new Map(
      mergedSeriesAndItems.allCinemaItems.map((i) => [i.id, i]),
    );
    return continueWatchingProgress.map((p) => {
      const existing = byId.get(p.id);
      if (existing) return existing;
      return {
        id: p.id,
        hub: 'cartoon',
        mediaType: p.mediaType,
        title: p.title,
        overview: '',
        posterPath: p.posterPath || '',
        backdropPath: p.backdropPath || p.posterPath || '',
        rating: 9.2,
        year: '',
        genreIds: [16],
        genreNames: ['سبيستون'],
        seasons: 1,
        episodes: 26,
        trailerKey: '',
        productionCompanies: [],
        cast: [],
        similar: [],
      };
    });
  }, [mergedSeriesAndItems.allCinemaItems, continueWatchingProgress]);

  const searchDisplayItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return mergedSeriesAndItems.allCinemaItems.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.overview.toLowerCase().includes(q) ||
        it.genreNames.some((g) => g.toLowerCase().includes(q)),
    );
  }, [searchQuery, mergedSeriesAndItems.allCinemaItems]);

  useOverlayPageFrame({
    onClose,
    isInnerLayerOpen: () =>
      controller.selectedItemId !== null || controller.selectedActor !== null,
  });

  const content = (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-white select-none overflow-hidden pointer-events-auto bg-transparent"
      dir="rtl"
    >
      <LiquidGlassBooksBackdrop dimmerOpacity={0.52} />

      <div
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pb-24 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Clean Top Floating Liquid Glass Header — Only Search Input & Close Button */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-slate-950/45 backdrop-blur-2xl border-b border-white/15 flex items-center justify-end gap-2.5">
          <div className="relative w-56 sm:w-80">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث (كونان، القناص، يوغي يو، سبونج بوب، افتح يا سمسم)..."
              className="w-full pr-9 pl-7 py-2 rounded-2xl bg-white/12 border border-white/25 text-xs text-white placeholder:text-slate-300 focus:outline-none focus:border-sky-400 backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="p-2 rounded-2xl bg-white/12 hover:bg-white/22 border border-white/25 text-slate-200 hover:text-white transition cursor-pointer shrink-0 backdrop-blur-md"
            >
              <X size={16} />
            </button>
          )}
        </header>

        {activeHeroItem && !searchQuery && (
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

        <div className="relative z-20 px-4 sm:px-10 pt-6 space-y-6">
          {!searchQuery && continueWatchingItems.length > 0 && (
            <MovieRow
              title="متابعة المشاهدة"
              items={continueWatchingItems}
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

          {!searchQuery ? (
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
                  className="w-full h-16 flex items-center justify-center text-xs text-slate-300/60 font-semibold"
                >
                  جاري تحميل المزيد من الرفوف الكرتونية...
                </div>
              )}
            </>
          ) : (
            <section className="pt-2">
              <h2 className="text-lg sm:text-xl font-black text-white mb-4 px-2 drop-shadow">
                {`نتائج البحث عن "${searchQuery}"`}
              </h2>
              <div className="flex flex-wrap gap-4 px-2">
                {searchDisplayItems.map((item) => (
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
            </section>
          )}
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

export default CartoonPage;
