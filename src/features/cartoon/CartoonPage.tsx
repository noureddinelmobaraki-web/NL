/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * CartoonPage — Spacetoon & Classic Arabic Cartoon Universe
 * - 3D Rotating Celestial Planet Orbs inside Liquid Glass Bubbles (OrbsStage architecture)
 * - Unified Liquid Glass Cinema Experience (CinemaHeroBanner, MovieRow, MoviePosterCard, CinemaDetailModal, CinemaPlayerStage)
 * - Dedicated Spacetoon OST Stage with Poster Artwork & Audio-Only / Video Opening Mode Toggle
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
    searchQuery
  );
  const { controller, activeHeroItem } = useCartoonCinemaBridge(
    seriesByNumericId,
    cinemaItems
  );
  const { actionAndAdventureRow, zomorodaAndComedyRow } = useCartoonPlanetRows(
    cinemaItems,
    filteredCatalog
  );

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
