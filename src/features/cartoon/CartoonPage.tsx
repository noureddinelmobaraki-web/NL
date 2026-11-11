/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * CartoonPage — Spacetoon & Classic Arabic Cartoon Universe
 * - 3D Rotating Celestial Planet Orbs inside Liquid Glass Bubbles (OrbsStage architecture)
 * - Unified Liquid Glass Cinema Experience (CinemaHeroBanner, MovieRow, MoviePosterCard, CinemaDetailModal, CinemaPlayerStage)
 * - Dedicated Spacetoon OST Stage with Poster Artwork & Audio-Only / Video Opening Mode Toggle
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, X, Sparkles, Music } from 'lucide-react';
import '../../styles/components/cinema.css';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import { useStandaloneCinemaController } from '../../components/Movies/hooks/useStandaloneCinemaController';
import { CinemaHeaderDownloadButton } from '../cinemaDownload';
import { GlassVectorIcon } from '../../components/shared/icons';

import type { SpacetoonPlanetId, CartoonSeriesItem } from './types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from './services/spacetoonArchiveRegistry';
import { SpacetoonPlanetOrbsBar } from './components/planets/SpacetoonPlanetOrbsBar';
import { SpacetoonOstGlassStage, SPACETOON_OST_TRACKS } from './components/ost/SpacetoonOstGlassStage';
import {
  adaptCartoonToCinemaItem,
  buildCartoonEpisodesList,
  buildCartoonPlaySourcesSync,
  getCartoonNumericId,
} from './adapters/cartoonToCinemaAdapter';

export const CartoonPage: React.FC = () => {
  const [activePlanet, setActivePlanet] = useState<SpacetoonPlanetId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const planetCounts = useMemo(() => {
    const counts: Partial<Record<SpacetoonPlanetId, number>> = {
      all: SPACETOON_ARCHIVE_REGISTRY.length,
      songs: SPACETOON_OST_TRACKS.length,
    };
    SPACETOON_ARCHIVE_REGISTRY.forEach((item: CartoonSeriesItem) => {
      counts[item.planet] = (counts[item.planet] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPACETOON_ARCHIVE_REGISTRY.filter((item: CartoonSeriesItem) => {
      const matchesPlanet =
        activePlanet === 'all' ||
        activePlanet === 'songs' ||
        item.planet === activePlanet;
      if (!matchesPlanet) return false;
      if (!q) return true;
      return (
        item.titleAr.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.synopsisAr.toLowerCase().includes(q)
      );
    });
  }, [activePlanet, searchQuery]);

  const seriesByNumericId = useMemo(() => {
    const map = new Map<number, CartoonSeriesItem>();
    SPACETOON_ARCHIVE_REGISTRY.forEach((series: CartoonSeriesItem, idx: number) => {
      map.set(getCartoonNumericId(series, idx), series);
    });
    return map;
  }, []);

  const cinemaItems = useMemo(
    () =>
      filteredCatalog.map((series: CartoonSeriesItem) => {
        const masterIdx = SPACETOON_ARCHIVE_REGISTRY.indexOf(series);
        return adaptCartoonToCinemaItem(series, masterIdx >= 0 ? masterIdx : 0);
      }),
    [filteredCatalog]
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, _season: number, episode: number) => {
      const series = seriesByNumericId.get(item.id);
      return buildCartoonPlaySourcesSync(series, episode);
    },
    [seriesByNumericId]
  );

  const customEpisodesBuilder = useCallback(
    (item: { id: number }) => {
      const series = seriesByNumericId.get(item.id);
      return buildCartoonEpisodesList(series);
    },
    [seriesByNumericId]
  );

  const controller = useStandaloneCinemaController({
    items: cinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
  });

  const activeHeroItem =
    controller.slideshowSlides[controller.heroTrailer.heroIndex] ||
    cinemaItems[0] ||
    null;

  const actionAndAdventureRow = useMemo(
    () =>
      cinemaItems.filter((_, idx: number) => {
        const raw = filteredCatalog[idx];
        return raw && (raw.planet === 'action' || raw.planet === 'adventure');
      }),
    [cinemaItems, filteredCatalog]
  );

  const zomorodaAndComedyRow = useMemo(
    () =>
      cinemaItems.filter((_, idx: number) => {
        const raw = filteredCatalog[idx];
        return raw && (raw.planet === 'zomoroda' || raw.planet === 'comedy' || raw.planet === 'sports');
      }),
    [cinemaItems, filteredCatalog]
  );

  return (
    <div
      className="nl-cinema-root relative w-full min-h-screen text-white pb-24 select-none overflow-x-hidden"
      dir="rtl"
    >
      {/* Top Floating Liquid Glass Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-slate-950/75 backdrop-blur-2xl border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GlassVectorIcon icon={Sparkles} theme="cosmic" size={18} active />
          <div>
            <h1 className="text-sm sm:text-base font-black text-white">
              مجرة سبيستون وكرتون الزمن الجميل
            </h1>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              كواكب سبيستون ثلاثية الأبعاد · دبلجة مركز الزهرة الأصلي · شارات رشا رزق وطارق العربي طرقان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
          <button
            type="button"
            onClick={() => setActivePlanet(activePlanet === 'songs' ? 'all' : 'songs')}
            className={`px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border transition cursor-pointer ${
              activePlanet === 'songs'
                ? 'bg-teal-400 text-slate-950 border-teal-200 shadow-lg'
                : 'bg-white/10 text-teal-200 border-white/20 hover:bg-white/15'
            }`}
          >
            <Music size={14} />
            <span>شارات وأغاني سبيستون</span>
          </button>

          <div className="relative w-44 sm:w-64">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث (كونان، القناص، ريمي، ماجد)..."
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
        </div>
      </header>

      {/* 3D Rotating Spacetoon Planet Orbs Stage */}
      <div className="relative z-30 pt-3 px-2 sm:px-6">
        <SpacetoonPlanetOrbsBar
          activePlanet={activePlanet}
          onSelectPlanet={setActivePlanet}
          planetCounts={planetCounts}
        />
      </div>

      {activePlanet === 'songs' ? (
        <SpacetoonOstGlassStage />
      ) : (
        <>
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

          <div className="relative z-20 px-4 sm:px-10 pt-6 space-y-8">
            {!searchQuery && activePlanet === 'all' && (
              <>
                {actionAndAdventureRow.length > 0 && (
                  <MovieRow
                    title="روائع كوكب أكشن ومغامرات (دبلجة مركز الزهرة)"
                    items={actionAndAdventureRow}
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

                {zomorodaAndComedyRow.length > 0 && (
                  <MovieRow
                    title="روائع زمردة ورياضة وكوميديا"
                    items={zomorodaAndComedyRow}
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
                {searchQuery
                  ? `نتائج البحث عن "${searchQuery}"`
                  : 'جميع مسلسلات وأفلام الكرتون المدبلجة'}
              </h2>
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
            </section>
          </div>

          {activePlanet === 'all' && !searchQuery && <SpacetoonOstGlassStage />}
        </>
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
};

export default CartoonPage;
