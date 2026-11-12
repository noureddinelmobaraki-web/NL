/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * CartoonPage — Spacetoon & Classic Arabic Cartoon Universe
 * - Unified LiquidGlassBooksBackdrop matching the Books stage background
 * - 3D Rotating Celestial Planet Orbs inside Liquid Glass Bubbles (OrbsStage architecture)
 * - Unified Liquid Glass Cinema Experience (CinemaHeroBanner, MovieRow, MoviePosterCard, CinemaDetailModal, CinemaPlayerStage)
 * - Dedicated Spacetoon OST Stage with Square Hover-to-Play Video Previews & Fullscreen Modal
 */

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Sparkles, Music } from 'lucide-react';
import '../../styles/components/cinema.css';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import { CinemaHeaderDownloadButton } from '../cinemaDownload';
import { GlassVectorIcon } from '../../components/shared/icons';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';

import { SpacetoonPlanetOrbsBar } from './components/planets/SpacetoonPlanetOrbsBar';
import { SpacetoonOstGlassStage } from './components/ost/SpacetoonOstGlassStage';
import {
  useCartoonFilters,
  useSpacetoonPlanetCounts,
  useCartoonCatalogView,
  useCartoonCinemaBridge,
  useCartoonPlanetRows,
} from './hooks';

export interface CartoonPageProps {
  onClose?: () => void;
}

export const CartoonPage: React.FC<CartoonPageProps> = ({ onClose }) => {
  const { activePlanet, setActivePlanet, searchQuery, setSearchQuery } = useCartoonFilters();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { planetCounts } = useSpacetoonPlanetCounts();
  const { filteredCatalog, seriesByNumericId, cinemaItems } = useCartoonCatalogView(
    activePlanet,
    searchQuery,
  );
  const { controller, activeHeroItem } = useCartoonCinemaBridge(
    seriesByNumericId,
    cinemaItems,
  );
  const { actionAndAdventureRow, zomorodaAndComedyRow } = useCartoonPlanetRows(
    cinemaItems,
    filteredCatalog,
  );

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
        {/* Top Floating Liquid Glass Header */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-slate-950/45 backdrop-blur-2xl border-b border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GlassVectorIcon icon={Sparkles} theme="cosmic" size={18} active />
            <div>
              <h1 className="text-sm sm:text-base font-black text-white drop-shadow">
                مجرة سبيستون وكرتون الزمن الجميل
              </h1>
              <p className="text-[11px] text-slate-200 hidden sm:block">
                كواكب سبيستون ثلاثية الأبعاد · دبلجة مركز الزهرة الأصلي · شارات رشا رزق وطارق العربي طرقان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
            <button
              type="button"
              onClick={() => setActivePlanet(activePlanet === 'songs' ? 'all' : 'songs')}
              className={`px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border transition cursor-pointer backdrop-blur-md ${
                activePlanet === 'songs'
                  ? 'bg-teal-400 text-slate-950 border-teal-200 shadow-lg'
                  : 'bg-white/12 text-teal-200 border-white/25 hover:bg-white/20'
              }`}
            >
              <Music size={14} />
              <span>شارات وأغاني سبيستون</span>
            </button>

            <div className="relative w-44 sm:w-64">
              <Search
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث (كونان، القناص، ريمي، ماجد)..."
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

            <CinemaHeaderDownloadButton currentLang="ar" />

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
          <div className="px-4 sm:px-10 pt-4">
            <SpacetoonOstGlassStage />
          </div>
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
                <h2 className="text-lg sm:text-xl font-black text-white mb-4 px-2 drop-shadow">
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

            {activePlanet === 'all' && !searchQuery && (
              <div className="px-4 sm:px-10 pt-8">
                <SpacetoonOstGlassStage />
              </div>
            )}
          </>
        )}
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
