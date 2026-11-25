/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * NoirCinemaPage — Classic Film Noir & Black-and-White Silver-Screen Hub
 * - Monochrome Silver-Screen Liquid Glass aesthetic inside the Nostalgia launcher category
 * - 10 Orthogonal shelves across Film Noir, Silent Era, Prelinger, Ephemera, Newsreels & LOC
 * - Strictly isolated under hub: 'noir' (30_000_000+ ID range)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

import { CinemaHeroBanner } from '../../components/Movies/components/CinemaHeroBanner';
import { CinemaDetailModal } from '../../components/Movies/components/CinemaDetailModal';
import { MovieRow, MoviePosterCard } from '../../components/Movies/MovieGridComponents';
import { ActorProfileModal } from '../../components/Movies/ActorProfileModal';
import type { CinemaItem } from '../../components/Movies/moviesDataClient';
import { useStandaloneCinemaController } from '../../components/Movies/hooks/useStandaloneCinemaController';
import { useContinueWatching } from '../cinema/progress/progressStore';
import { useOverlayPageFrame } from '../../hooks/useOverlayPageFrame';
import { useVirtualizedShelves } from '../../hooks/useVirtualizedShelves';
import { LiquidGlassBooksBackdrop } from '../liquid-glass/shared/LiquidGlassBooksBackdrop';

import type { NoirCategoryId, NoirFilmItem, NoirResolvedStream } from './types/noir.types';
import { NOIR_ARCHIVE_REGISTRY, NOIR_CATEGORIES } from './services/noirArchiveRegistry';
import {
  adaptNoirFilmToCinemaItem,
  buildNoirPlaySourcesSync,
  enrichNoirCatalogPosters,
  getNoirNumericId,
  resolveNoirArchiveStreams,
  searchNoirPublicDomainArchives,
} from './services/noirStreamResolver';
import { createNoirOrthogonalShelves } from './catalog/noirShelvesConfig';

export interface NoirCinemaPageProps {
  onClose?: () => void;
}

export const NoirCinemaPage: React.FC<NoirCinemaPageProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<NoirCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilms, setCatalogFilms] = useState<NoirFilmItem[]>(NOIR_ARCHIVE_REGISTRY);
  const [searchResults, setSearchResults] = useState<NoirFilmItem[] | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [resolvedStreamsByFilmId, setResolvedStreamsByFilmId] = useState<
    Record<string, NoirResolvedStream[]>
  >({});
  const resolvedStreamsRef = useRef<Record<string, NoirResolvedStream[]>>({});
  const dynamicFilmsByNumIdRef = useRef<Map<number, NoirFilmItem>>(new Map());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void enrichNoirCatalogPosters(NOIR_ARCHIVE_REGISTRY).then((enriched) => {
      if (!cancelled) setCatalogFilms(enriched);
    });

    const vaults = NOIR_ARCHIVE_REGISTRY.filter((f) => f.isVaultCollection);
    vaults.forEach((vault) => {
      void resolveNoirArchiveStreams(
        vault.archiveId,
        vault.title,
        vault.secondaryArchiveIds,
      ).then((streams) => {
        if (!cancelled && streams.length > 0) {
          resolvedStreamsRef.current[vault.id] = streams;
          setResolvedStreamsByFilmId((prev) => ({ ...prev, [vault.id]: streams }));
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setIsSearchingLive(false);
      return;
    }

    let cancelled = false;
    setIsSearchingLive(true);
    const timer = setTimeout(() => {
      void searchNoirPublicDomainArchives(q).then((remote) => {
        if (cancelled) return;
        setSearchResults(remote);
        setIsSearchingLive(false);
      });
    }, 340);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const registerDynamicFilm = useCallback((numId: number, film: NoirFilmItem) => {
    dynamicFilmsByNumIdRef.current.set(numId, film);
  }, []);

  const shelfDefs = useMemo(
    () => createNoirOrthogonalShelves(catalogFilms, registerDynamicFilm),
    [catalogFilms, registerDynamicFilm],
  );

  const {
    visibleShelves,
    hasMoreShelves,
    sentinelRef,
    fetchNextShelfPage,
  } = useVirtualizedShelves<CinemaItem>({
    shelves: shelfDefs,
    getItemKey: (it) => it.archiveIds?.[0] || `noir:${it.id}`,
    initialShelfCount: 4,
    batchShelfCount: 3,
  });

  const activeFilms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const localFiltered = catalogFilms.filter((film) => {
      const catOk = activeCategory === 'all' || film.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        film.title.toLowerCase().includes(q) ||
        film.director.toLowerCase().includes(q) ||
        film.synopsis.toLowerCase().includes(q) ||
        String(film.year).includes(q)
      );
    });

    if (!q || !searchResults || searchResults.length === 0) {
      return localFiltered;
    }

    const seenArchiveIds = new Set(localFiltered.map((f) => f.archiveId));
    const remoteAdditions = searchResults.filter(
      (r) => !seenArchiveIds.has(r.archiveId),
    );
    return [...localFiltered, ...remoteAdditions];
  }, [activeCategory, catalogFilms, searchQuery, searchResults]);

  const { filmsByNumericId, cinemaItems } = useMemo(() => {
    const map = new Map<number, NoirFilmItem>(dynamicFilmsByNumIdRef.current);
    const items: CinemaItem[] = activeFilms.map((film, fallbackIdx) => {
      const stableIdx = catalogFilms.indexOf(film);
      const idx = stableIdx >= 0 ? stableIdx : 100 + fallbackIdx;
      const numId = getNoirNumericId(film, idx);
      map.set(numId, film);
      const streams = resolvedStreamsByFilmId[film.id];
      return adaptNoirFilmToCinemaItem(film, idx, streams?.length, streams?.[0]);
    });
    return { filmsByNumericId: map, cinemaItems: items };
  }, [activeFilms, catalogFilms, resolvedStreamsByFilmId]);

  const allKnownCinemaItems = useMemo(() => {
    const byId = new Map<number, CinemaItem>();
    for (const item of cinemaItems) byId.set(item.id, item);
    for (const s of visibleShelves) {
      for (const item of s.items) {
        if (!byId.has(item.id)) byId.set(item.id, item);
      }
    }
    return Array.from(byId.values());
  }, [cinemaItems, visibleShelves]);

  const getFilmByNumericId = useCallback(
    (id: number): NoirFilmItem | undefined =>
      filmsByNumericId.get(id) || dynamicFilmsByNumIdRef.current.get(id),
    [filmsByNumericId],
  );

  const ensureFilmStreamsResolved = useCallback(
    async (item: { id: number }) => {
      const film = getFilmByNumericId(item.id);
      if (!film) return;
      if (resolvedStreamsRef.current[film.id]) return;
      const streams = await resolveNoirArchiveStreams(
        film.archiveId,
        film.title,
        film.secondaryArchiveIds,
      );
      if (streams.length > 0) {
        resolvedStreamsRef.current[film.id] = streams;
        setResolvedStreamsByFilmId((prev) =>
          prev[film.id] ? prev : { ...prev, [film.id]: streams },
        );
      }
    },
    [getFilmByNumericId],
  );

  const customSourcesBuilder = useCallback(
    (item: { id: number }, _season: number, episode: number) => {
      const film = getFilmByNumericId(item.id);
      const streams = film
        ? resolvedStreamsRef.current[film.id] || resolvedStreamsByFilmId[film.id]
        : undefined;
      return buildNoirPlaySourcesSync(film, episode, streams);
    },
    [getFilmByNumericId, resolvedStreamsByFilmId],
  );

  const customEpisodesBuilder = useCallback(
    async (item: { id: number }) => {
      const film = getFilmByNumericId(item.id);
      if (!film) return [{ episode_number: 1, name: 'Full Theatrical Feature' }];
      await ensureFilmStreamsResolved(item);
      const streams = resolvedStreamsRef.current[film.id] || [];
      if (streams.length > 0) {
        return streams.map((s) => ({
          episode_number: s.partNumber,
          name: s.title,
        }));
      }
      return [{ episode_number: 1, name: `${film.title} (${film.year})` }];
    },
    [getFilmByNumericId, ensureFilmStreamsResolved],
  );

  const controller = useStandaloneCinemaController({
    hub: 'noir',
    items: allKnownCinemaItems,
    customSourcesBuilder,
    customEpisodesBuilder,
    onBeforeStartWatchSession: ensureFilmStreamsResolved,
  });

  useEffect(() => {
    const selectedId = controller.selectedItemId;
    if (selectedId === null) return;
    void ensureFilmStreamsResolved({ id: selectedId });
  }, [controller.selectedItemId, ensureFilmStreamsResolved]);

  const continueWatchingProgress = useContinueWatching('noir');

  const continueWatchingItems = useMemo<CinemaItem[]>(() => {
    const byId = new Map(allKnownCinemaItems.map((i) => [i.id, i]));
    return continueWatchingProgress.map((p) => {
      const existing = byId.get(p.id);
      if (existing) return existing;
      return {
        id: p.id,
        hub: 'noir',
        mediaType: p.mediaType,
        title: p.title,
        overview: '',
        posterPath: p.posterPath || '',
        backdropPath: p.backdropPath || p.posterPath || '',
        rating: 8.0,
        year: '1945',
        genreIds: [80, 9648],
        genreNames: ['Classic Film Noir'],
        seasons: 1,
        episodes: 1,
        trailerKey: '',
        productionCompanies: [],
        cast: [],
        similar: [],
      };
    });
  }, [allKnownCinemaItems, continueWatchingProgress]);

  const activeHeroItem =
    controller.slideshowSlides[controller.heroTrailer.heroIndex] ||
    cinemaItems[0] ||
    null;

  useOverlayPageFrame({
    onClose,
    isInnerLayerOpen: () =>
      controller.selectedItemId !== null || controller.selectedActor !== null,
  });

  const content = (
    <div
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-zinc-100 select-none overflow-hidden pointer-events-auto bg-transparent"
      dir="ltr"
    >
      <div className="absolute inset-0 pointer-events-none grayscale contrast-125">
        <LiquidGlassBooksBackdrop dimmerOpacity={0.68} />
      </div>

      <div
        className="nl-cinema-scroll absolute inset-0 z-20 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pb-24 pointer-events-auto"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Clean Top Floating Header — Only Category Filter Pills, Search Input & Close Button */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-zinc-950/65 backdrop-blur-2xl border-b border-zinc-300/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
            {NOIR_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer border backdrop-blur-md ${
                    active
                      ? 'bg-zinc-100 text-zinc-950 border-white shadow-[0_0_20px_rgba(228,228,231,0.35)]'
                      : 'bg-zinc-900/55 text-zinc-200 border-zinc-400/25 hover:bg-zinc-800/70 hover:border-zinc-300/40'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end w-full sm:w-auto">
            <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Noir, Hitchcock, Prelinger, LOC..."
                className="w-full pl-9 pr-7 py-2 rounded-2xl bg-zinc-900/70 border border-zinc-300/25 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-200 backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  type="button"
                  data-compact-touch="true"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Classic Noir Hub"
                className="p-2 rounded-2xl bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-300/25 text-zinc-200 hover:text-white transition cursor-pointer shrink-0 backdrop-blur-md"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {activeHeroItem && !searchQuery && (
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
            mobileVariant="editorial16x9"
            editorialSubline={getFilmByNumericId(activeHeroItem.id)?.director}
          />
        )}

        <div className="relative z-20 px-4 sm:px-10 pt-6 space-y-6">
          {!searchQuery && continueWatchingItems.length > 0 && (
            <MovieRow
              title="Continue Watching (Classic Noir)"
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

          {!searchQuery && activeCategory === 'all' ? (
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
                  className="w-full h-16 flex items-center justify-center text-xs text-zinc-400 font-semibold"
                >
                  Loading more archival shelves...
                </div>
              )}
            </>
          ) : (
            <section className="pt-2">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg sm:text-xl font-black text-zinc-100 drop-shadow">
                  {searchQuery
                    ? `Public Domain Archive Results for "${searchQuery}"`
                    : NOIR_CATEGORIES.find((c) => c.id === activeCategory)?.label ||
                      'Filtered Classics'}
                </h2>
                {isSearchingLive && (
                  <span className="text-xs font-semibold text-zinc-300 animate-pulse">
                    Searching Archive.org, Wikimedia &amp; Library of Congress...
                  </span>
                )}
              </div>

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

export default NoirCinemaPage;
