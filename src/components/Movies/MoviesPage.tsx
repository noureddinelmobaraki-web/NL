/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Volume2,
  VolumeX,
  ChevronLeft,
  Film,
  Tv,
  Bookmark,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { useMovieItems } from "../../features/account/useMovieItems";
import { useAuth } from "../../context/AuthContext";
import { useDeviceType } from "../../hooks/useDeviceType";
import { useMoviesMusic } from "./useMoviesMusic";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { usePreconnect } from "../../hooks/usePreconnect";
import { normLang } from "../../utils/lang";
import { PUBLIC_TMDB_KEY, PUBLIC_OMDB_KEY } from "../../config/publicKeys";
import "../../styles/components/cinema.css";
import {
  useResolvedImdbSources,
  type PlaySource,
} from "./MovieSourcesModal";
import type { ExtractedVideoStream } from "../../services/videoExtractor";
import { probeAllServersSpeed } from "../../services/serverSpeedMonitor";
import {
  removeProgress,
  useContinueWatching,
} from "../../features/cinema/progress/progressStore";
import {
  fetchWithCache,
  normalizeItem,
  getBackdropSrc_static,
  getPosterSrc_static,
  MOVIE_ROW_SCROLL_STYLE,
  type CastMember,
  type ActorDetails,
  type CinemaItem,
} from "./moviesDataClient";
import {
  NLLogo,
  MoviePosterCard,
  MovieRow,
} from "./MovieGridComponents";
import { ActorProfileModal } from "./ActorProfileModal";
import {
  useCinemaSubtitles,
  useCinemaCatalog,
  useHeroTrailer,
  useServerFailover,
  useStreamExtractor,
  usePlayerBridgeSync,
  useCinemaDetailSelection,
  useGalleryPlayerState,
  useSeasonEpisodesState,
  useCinemaResumeTarget,
  useSeekUnsupportedToast,
  useGalleryPlayerControls,
  useCinemaWatchlistPanel,
  useCinemaScrollHeader,
} from "./hooks";
import { CinemaHeroBanner } from "./components/CinemaHeroBanner";
import { CinemaDetailModal } from "./components/CinemaDetailModal";
import { CinemaHeaderDownloadButton } from "../../features/cinemaDownload";

export { fetchWithCache, normalizeItem };
export type { CastMember, ActorDetails, CinemaItem };

const CINEMA_PRECONNECT_ORIGINS = [
  "https://image.tmdb.org",
  "https://api.themoviedb.org",
  "https://movies-api.accel.li",
  "https://vidlink.pro",
];

export function MoviesPage({
  onClose,
  initialTab = "movies",
}: {
  onClose: () => void;
  initialTab?: "movies" | "series";
}) {
  usePreconnect(CINEMA_PRECONNECT_ORIGINS);

  const { t, i18n } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const { setMovieActive, registerMovieBack } = useAppContext();
  const isTouch = isMobile || isTablet;
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  const omdbKey = import.meta.env.VITE_OMDB_API_KEY || PUBLIC_OMDB_KEY;

  const { user } = useAuth();
  const { has, toggle, items: movieItems, watchlistCount } = useMovieItems();

  const {
    topMovies,
    topSeries,
    activeTab,
    setActiveTab,
    moviesLoading,
    seriesLoading,
    globalError,
    trendingMovies,
    topRatedMovies,
    popularMovies,
    actionMovies,
    horrorMovies,
    dramaMovies,
    sciFiMovies,
    trendingSeries,
    topRatedSeries,
    popularSeries,
    actionSeries,
    mysterySeries,
    dramaSeries,
    animationSeries,
    selectedGenreId,
    setSelectedGenreId,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchOpen,
    setSearchOpen,
    showWatchlist,
    setShowWatchlist,
    findPreloadedCinemaItem,
    activeGenres,
    slideshowSlides,
    filteredList,
  } = useCinemaCatalog({ initialTab, tmdbKey, currentLang });

  useDocumentMeta("movies.title", "movies.description");

  const {
    detailServersOpen,
    setDetailServersOpen,
    selectedItemId,
    selectedMediaType,
    detailedItem,
    setDetailedItem,
    isLoadingDetails,
    setIsLoadingDetails,
    setSelectedItemId,
  } = useCinemaDetailSelection({ activeTab, findPreloadedCinemaItem });

  const {
    isWatchingInGallery,
    setIsWatchingInGallery,
    activeGalleryServerIdx,
    setActiveGalleryServerIdx,
    isPlayerLoading,
    setIsPlayerLoading,
    allServersFailed,
    setAllServersFailed,
    isCssFullscreen,
    setIsCssFullscreen,
    isNativeFullscreen,
    setIsNativeFullscreen,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    setActiveExtractedIdx,
    useDirectUrlFallback,
    setUseDirectUrlFallback,
    playerRenderMode,
    setPlayerRenderMode,
    clockState,
    isVideoPaused,
    videoVolume,
    setVideoVolume,
    isVideoMuted,
    setIsVideoMuted,
    isControlsVisible,
    setIsControlsVisible,
    controlsHideTimerRef,
    galleryStageRef,
    playerIframeRef,
    videoElementRef,
    hlsInstanceRef,
    attemptTokenRef,
    playAttemptStartedAtRef,
    failoverQueueRef,
    failoverStepRef,
    loadedCurrentAttemptRef,
    autoStartWatchRef,
    appliedInitialSeekRef,
    deepLinkSeRef,
    preselectedProgressItemIdRef,
  } = useGalleryPlayerState();

  const {
    selectedSeason,
    setSelectedSeason,
    selectedEpisode,
    setSelectedEpisode,
    isFullSeasonEmbed,
    setIsFullSeasonEmbed,
    seasonEpisodes,
    setSeasonEpisodes,
    loadingSeasonEpisodes,
    setLoadingSeasonEpisodes,
  } = useSeasonEpisodesState();

  const continueWatchingItems = useContinueWatching();
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  const { resumeStartAtSec, detailWatchTarget } = useCinemaResumeTarget({
    detailedItem,
    selectedSeason,
    selectedEpisode,
    isFullSeasonEmbed,
  });

  const { sources: detailPlaySources, resolvedImdbId } = useResolvedImdbSources(
    detailWatchTarget,
    Boolean(detailedItem),
  );
  const activeImdbId = resolvedImdbId || detailedItem?.imdbId || "";

  const {
    heroIndex,
    setHeroIndex,
    heroServersOpen,
    setHeroServersOpen,
    showHeroTrailer,
    setShowHeroTrailer,
    trailerFallbackToYoutube,
    setTrailerFallbackToYoutube,
    resolvedTrailer,
    setResolvedTrailer,
    setImdbTrailerLoaded,
  } = useHeroTrailer({
    activeTab,
    slideshowSlidesLength: slideshowSlides.length,
    selectedItemId,
    isWatchingInGallery,
    detailedItem,
    activeImdbId,
  });

  const {
    setExternalSubtitles,
    externalSubtitlesRef,
    setWorkerBridgeSubtitles,
    isLoadingSubtitles,
    loadingSubtitleIdx,
    setLoadingSubtitleIdx,
    subtitleOffsetSec,
    setSubtitleOffsetSec,
    activeTrackCues,
    setActiveTrackCues,
    activeSubtitleIdx,
    setActiveSubtitleIdx,
    isSubtitleMenuOpen,
    setIsSubtitleMenuOpen,
    activeSubtitlesList,
    clearExternalSubtitleBlobs,
    handleRefreshSubtitlesForLanguages,
    handleUploadLocalSubtitle,
    syncVideoTextTracks,
  } = useCinemaSubtitles({
    isWatchingInGallery,
    detailedItem,
    activeImdbId,
    selectedSeason,
    selectedEpisode,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    playerRenderMode,
    playerIframeRef,
    videoElementRef,
    attemptTokenRef,
    clockState,
  });

  const activeGallerySource =
    detailPlaySources[activeGalleryServerIdx] || detailPlaySources[0] || null;

  const {
    embedSeekStartAtSec,
    setEmbedSeekStartAtSec,
    workerBridgeRevision,
    setWorkerBridgeRevision,
    seekUnsupportedToast,
    showSeekUnsupportedToast,
  } = useSeekUnsupportedToast();

  const detailItemStorageKey = detailedItem
    ? `${detailedItem.mediaType}_${detailedItem.id}`
    : "";

  const resolveServerIdForStream = useCallback(
    (stream?: ExtractedVideoStream | null): string => {
      if (stream?.sourcePage) {
        const matched = detailPlaySources.find(
          (s) =>
            s.url === stream.sourcePage ||
            stream.sourcePage.includes(s.host),
        );
        if (matched) return matched.id;
      }
      return activeGallerySource?.id || detailPlaySources[0]?.id || "server-7";
    },
    [detailPlaySources, activeGallerySource],
  );

  const checkedExtractionKeyRef = useRef<string>("");
  const detailPlaySourcesRef = useRef<PlaySource[]>(detailPlaySources);
  detailPlaySourcesRef.current = detailPlaySources;
  const gotTimeSinceLoadRef = useRef(false);
  const confirmedPlayingSinceLoadRef = useRef(false);
  const userPausedIframeRef = useRef(false);
  const [iframeLoadStamp, setIframeLoadStamp] = useState(0);

  const { cleanupDirectVideoPlayer } = useStreamExtractor({
    isWatchingInGallery,
    activeGallerySource,
    allServersFailed,
    detailItemStorageKey,
    selectedSeason,
    selectedEpisode,
    playAttemptStartedAtRef,
    loadedCurrentAttemptRef,
    setIsPlayerLoading,
    useDirectUrlFallback,
    setUseDirectUrlFallback,
    playerRenderMode,
    setPlayerRenderMode,
    checkedExtractionKeyRef,
    attemptTokenRef,
    detailPlaySourcesRef,
    setWorkerBridgeSubtitles,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    setActiveExtractedIdx,
    hlsInstanceRef,
    videoElementRef,
    setExternalSubtitles,
    externalSubtitlesRef,
    setIsVideoMuted,
    resolveServerIdForStream,
  });

  const { startGalleryWatchSession } = useServerFailover({
    detailPlaySources,
    detailPlaySourcesRef,
    detailItemStorageKey,
    resumeStartAtSec,
    detailedItem,
    cleanupDirectVideoPlayer,
    setEmbedSeekStartAtSec,
    appliedInitialSeekRef,
    checkedExtractionKeyRef,
    failoverQueueRef,
    failoverStepRef,
    attemptTokenRef,
    playAttemptStartedAtRef,
    loadedCurrentAttemptRef,
    gotTimeSinceLoadRef,
    confirmedPlayingSinceLoadRef,
    userPausedIframeRef,
    setAllServersFailed,
    setIsPlayerLoading,
    activeGalleryServerIdx,
    setActiveGalleryServerIdx,
    setSelectedActor,
    setShowHeroTrailer,
    setIsSubtitleMenuOpen,
    isWatchingInGallery,
    setIsWatchingInGallery,
    playerRenderMode,
    setPlayerRenderMode,
    activeGallerySource,
    allServersFailed,
    activeExtractedIdx,
    setActiveExtractedIdx,
    extractedStreams,
    resolveServerIdForStream,
  });

  const {
    activeIframeUrl,
    persistCurrentProgress,
    controlMode,
    handleUserSeek,
    handleUserTogglePlay,
  } = usePlayerBridgeSync({
    isWatchingInGallery,
    playerRenderMode,
    setPlayerRenderMode,
    activeGallerySource,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    setActiveExtractedIdx,
    setUseDirectUrlFallback,
    embedSeekStartAtSec,
    setEmbedSeekStartAtSec,
    workerBridgeRevision,
    setWorkerBridgeRevision,
    detailedItem,
    selectedSeason,
    selectedEpisode,
    detailItemStorageKey,
    playerIframeRef,
    playAttemptStartedAtRef,
    gotTimeSinceLoadRef,
    confirmedPlayingSinceLoadRef,
    userPausedIframeRef,
    iframeLoadStamp,
    setWorkerBridgeSubtitles,
    showSeekUnsupportedToast,
  });

  const {
    isAnyFullscreen,
    bumpControlsVisibility,
    handleToggleVideoPlay,
    handleToggleVideoMute,
    handleChangeVideoVolume,
    handleToggleGalleryFullscreen,
  } = useGalleryPlayerControls({
    isWatchingInGallery,
    setIsWatchingInGallery,
    showHeroTrailer,
    setShowHeroTrailer,
    setTrailerFallbackToYoutube,
    setResolvedTrailer,
    setImdbTrailerLoaded,
    cleanupDirectVideoPlayer,
    clearExternalSubtitleBlobs,
    playerIframeRef,
    videoElementRef,
    galleryStageRef,
    playerRenderMode,
    setPlayerRenderMode,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    setActiveExtractedIdx,
    isCssFullscreen,
    setIsCssFullscreen,
    isNativeFullscreen,
    setIsNativeFullscreen,
    isSubtitleMenuOpen,
    setIsSubtitleMenuOpen,
    isVideoPaused,
    setIsControlsVisible,
    controlsHideTimerRef,
    selectedItemId,
    setSelectedItemId,
    deepLinkSeRef,
    selectedSeason,
    setSelectedSeason,
    setSelectedEpisode,
    checkedExtractionKeyRef,
    setAllServersFailed,
    setUseDirectUrlFallback,
    setIsPlayerLoading,
    setVideoVolume,
    setIsVideoMuted,
    setEmbedSeekStartAtSec,
    appliedInitialSeekRef,
    attemptTokenRef,
    autoStartWatchRef,
    setSubtitleOffsetSec,
    setActiveTrackCues,
    setLoadingSubtitleIdx,
    setActiveGalleryServerIdx,
    setIsFullSeasonEmbed,
    setSeasonEpisodes,
    setLoadingSeasonEpisodes,
    setDetailServersOpen,
    selectedActor,
    setSelectedActor,
    persistCurrentProgress,
    detailedItem,
    tmdbKey,
    currentLang,
  });

  const handleSelectActor = useCallback((actor: CastMember) => {
    setSelectedActor(actor);
  }, []);

  const handleQuickWatch = useCallback(
    (item: CinemaItem) => {
      void probeAllServersSpeed(undefined, `${item.mediaType}_${item.id}`);
      autoStartWatchRef.current = true;
      setDetailServersOpen(true);
      setShowHeroTrailer(false);
      setIsWatchingInGallery(true);
      setIsPlayerLoading(true);
      setSelectedItemId(item.id, item.mediaType);
      if (selectedItemId === item.id && detailedItem?.id === item.id) {
        autoStartWatchRef.current = false;
        startGalleryWatchSession();
      }
    },
    [
      autoStartWatchRef,
      setDetailServersOpen,
      setShowHeroTrailer,
      setIsWatchingInGallery,
      setIsPlayerLoading,
      setSelectedItemId,
      selectedItemId,
      detailedItem?.id,
      startGalleryWatchSession,
    ],
  );

  const rowProps = useMemo(
    () => ({
      isTouch,
      activeHoverId,
      setActiveHoverId,
      hoverTimer,
      setSelectedItemId,
      onQuickWatch: handleQuickWatch,
      t,
      isFavoriteFn: (id: number, mediaType: "movie" | "tv") =>
        has(id, mediaType, "favorite"),
    }),
    [
      isTouch,
      activeHoverId,
      setActiveHoverId,
      hoverTimer,
      setSelectedItemId,
      handleQuickWatch,
      t,
      has,
    ],
  );

  const { watchlistItems, openWatchlistItem } = useCinemaWatchlistPanel({
    movieItems,
    setActiveTab,
    setShowWatchlist,
    setSelectedItemId,
  });

  const isOpenForAudio = Boolean(detailedItem || selectedItemId);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const { scrolled, mainScrollRef, handleScrollEvent } = useCinemaScrollHeader({
    detailedItem,
    setDetailedItem,
    selectedItemId,
    selectedMediaType,
    setSelectedItemId,
    setIsLoadingDetails,
    setMovieActive,
    registerMovieBack,
    persistCurrentProgress,
    activeTab,
    setActiveTab,
    selectedSeason,
    setSelectedSeason,
    selectedEpisode,
    setSelectedEpisode,
    deepLinkSeRef,
    preselectedProgressItemIdRef,
    autoStartWatchRef,
    setSelectedGenreId,
    setSearchQuery,
    setHeroIndex,
    tmdbKey,
    omdbKey,
    currentLang,
    findPreloadedCinemaItem,
    detailPlaySources,
    setDetailServersOpen,
    startGalleryWatchSession,
  });

  const activeHeroItem = slideshowSlides[heroIndex];
  const localizedHeroTitle = activeHeroItem ? activeHeroItem.title : "";
  const ambientBackdropItem = detailedItem || activeHeroItem;
  const ambientBackdropUrl = ambientBackdropItem
    ? getBackdropSrc_static(
        ambientBackdropItem.backdropPath,
        ambientBackdropItem.trailerKey,
        ambientBackdropItem.posterPath,
      )
    : "";

  const isCinemaFocusActive =
    isWatchingInGallery && selectedItemId !== null && Boolean(detailedItem);

  return createPortal(
    <div
      dir={currentLang === "ar" ? "rtl" : "ltr"}
      className="nl-cinema-root fixed inset-0 z-[10050] w-full h-[100dvh] text-zinc-100 font-sans overflow-hidden select-none pointer-events-auto bg-black"
    >
      {!isCinemaFocusActive && selectedItemId === null && ambientBackdropUrl && (
        <div
          className="lg-cinema-ambient-bg"
          style={{ backgroundImage: `url(${ambientBackdropUrl})` }}
          aria-hidden="true"
        />
      )}
      {!isCinemaFocusActive && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 15%, rgba(16, 24, 42, 0.32) 0%, rgba(6, 9, 17, 0.86) 68%, rgba(5, 7, 14, 0.96) 100%)",
          }}
        />
      )}

      {!isCinemaFocusActive && (
        <div
          ref={mainScrollRef}
          onScroll={handleScrollEvent}
          className="nl-cinema-scroll absolute inset-0 z-20 overflow-y-auto h-full w-full scrollbar-none"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <header
            className={`nl-cinema-header fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-3 sm:px-8 py-3 transition-all duration-300 ${
              scrolled
                ? "nl-cinema-header--scrolled"
                : "bg-gradient-to-b from-black/75 via-black/30 to-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-5 min-w-0">
              {(selectedItemId !== null ||
                showWatchlist ||
                searchQuery.trim() !== "" ||
                selectedGenreId !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItemId !== null) setSelectedItemId(null);
                    else if (showWatchlist) setShowWatchlist(false);
                    else if (searchQuery.trim() !== "" || selectedGenreId !== null) {
                      setSearchQuery("");
                      setSelectedGenreId(null);
                    }
                  }}
                  className="lg-cinema-icon-pill flex-shrink-0"
                  aria-label={currentLang === "ar" ? "رجوع" : "Back"}
                  title={currentLang === "ar" ? "رجوع" : "Back"}
                >
                  <ChevronLeft size={17} className={currentLang === "ar" ? "rotate-180" : ""} />
                </button>
              )}

              <h1 className="text-base sm:text-2xl font-black tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(229,9,20,0.55)] select-none flex-shrink-0">
                <NLLogo />
              </h1>

              <div className="lg-cinema-pill-group scale-95 sm:scale-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("movies")}
                  className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "movies"
                      ? "lg-cinema-pill-btn--active"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  <Film size={12} />
                  <span>{currentLang === "ar" ? "أفلام" : "Movies"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("series")}
                  className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "series"
                      ? "lg-cinema-pill-btn--active"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  <Tv size={12} />
                  <span>{currentLang === "ar" ? "مسلسلات" : "Series"}</span>
                </button>
              </div>

              {!isMobile && (
                <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedGenreId(null)}
                    className={`text-[11px] font-bold px-3.5 py-1 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                      selectedGenreId === null
                        ? "text-white bg-white/20 border-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.14)]"
                        : "text-white/70 bg-white/6 border-white/14 hover:text-white hover:bg-white/12"
                    }`}
                  >
                    {t("movies.all") || (currentLang === "ar" ? "الكل" : "All")}
                  </button>
                  {activeGenres.slice(0, 6).map((g) => (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setSelectedGenreId(g.id)}
                      className={`text-[11px] font-bold px-3.5 py-1 rounded-full transition-all cursor-pointer border whitespace-nowrap backdrop-blur-md ${
                        selectedGenreId === g.id
                          ? "text-white bg-white/20 border-white/40 shadow-[0_4px_14px_rgba(255,255,255,0.14)]"
                          : "text-white/70 bg-white/6 border-white/14 hover:text-white hover:bg-white/12"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              <div className="relative flex items-center">
                {isTouch ? (
                  <div className="flex items-center">
                    <m.div
                      animate={{
                        width: searchOpen ? (isMobile ? "135px" : "190px") : "0px",
                        opacity: searchOpen ? 1 : 0,
                      }}
                      transition={{ ease: "easeOut", duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="search"
                        placeholder={
                          activeTab === "movies"
                            ? t("movies.search") || "Search..."
                            : t("series.search") || "Search..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        dir="auto"
                        className="w-full px-3 py-1.5 bg-white/10 border border-white/20 text-white placeholder-white/45 rounded-full text-xs focus:outline-none focus:border-white/45 backdrop-blur-md me-1.5"
                      />
                    </m.div>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(!searchOpen)}
                      className={`lg-cinema-icon-pill ${
                        searchOpen || searchQuery ? "border-white/40 bg-white/15" : ""
                      }`}
                      aria-label={currentLang === "ar" ? "بحث" : "Search"}
                    >
                      <Search size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <m.div
                      animate={{
                        width: searchOpen ? "210px" : "0px",
                        opacity: searchOpen ? 1 : 0,
                      }}
                      transition={{ ease: "easeOut", duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="search"
                        placeholder={
                          activeTab === "movies"
                            ? t("movies.search") || "Search..."
                            : t("series.search") || "Search..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3.5 py-1.5 bg-white/10 border border-white/25 text-white placeholder-white/50 rounded-full text-xs outline-none focus:border-white/50 backdrop-blur-md tracking-tight"
                      />
                    </m.div>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(!searchOpen)}
                      className={`lg-cinema-icon-pill ${
                        searchOpen || searchQuery ? "border-white/40 bg-white/15" : ""
                      }`}
                      aria-label={currentLang === "ar" ? "بحث" : "Search"}
                    >
                      <Search size={15} />
                    </button>
                  </div>
                )}
              </div>

              {user && (
                <button
                  type="button"
                  onClick={() => setShowWatchlist((v) => !v)}
                  aria-pressed={showWatchlist}
                  aria-label={currentLang === "ar" ? "قائمتي" : "Watchlist"}
                  title={currentLang === "ar" ? "قائمتي" : "Watchlist"}
                  className={`lg-cinema-icon-pill relative ${
                    showWatchlist ? "!bg-amber-500/35 !border-amber-300/60 text-amber-200" : ""
                  }`}
                >
                  <Bookmark size={15} fill={showWatchlist ? "currentColor" : "none"} />
                  {watchlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 border border-white/40 text-white text-[9px] font-black flex items-center justify-center shadow">
                      {watchlistCount}
                    </span>
                  )}
                </button>
              )}

              <CinemaHeaderDownloadButton currentLang={currentLang} />

              <button
                type="button"
                onClick={toggleMute}
                className="lg-cinema-icon-pill"
                aria-label={
                  isMuted
                    ? currentLang === "ar"
                      ? "تشغيل الصوت"
                      : "Unmute"
                    : currentLang === "ar"
                      ? "كتم الصوت"
                      : "Mute"
                }
                title={
                  isMuted
                    ? currentLang === "ar"
                      ? "تشغيل الصوت"
                      : "Unmute"
                    : currentLang === "ar"
                      ? "كتم الصوت"
                      : "Mute"
                }
              >
                {isMuted ? (
                  <VolumeX size={15} className="text-white/65" />
                ) : (
                  <Volume2 size={15} className="text-emerald-300" />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="lg-cinema-icon-pill hover:!bg-rose-600/40 hover:!border-rose-400/60"
                aria-label={currentLang === "ar" ? "إغلاق" : "Close"}
                title={currentLang === "ar" ? "إغلاق" : "Close"}
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {isMobile && activeGenres.length > 0 && (
            <div
              className="px-4 overflow-x-auto select-none overflow-y-hidden flex gap-2 scrollbar-none py-1.5 relative z-30"
              style={{
                marginTop:
                  "calc(var(--cinema-header-h, 64px) + env(safe-area-inset-top) + 6px)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedGenreId(null)}
                className={`text-[11px] font-bold px-3.5 py-1 flex-shrink-0 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                  selectedGenreId === null
                    ? "text-white bg-white/20 border-white/40 shadow-[0_4px_12px_rgba(255,255,255,0.12)]"
                    : "text-white/70 bg-white/6 border-white/12"
                }`}
              >
                {t("movies.all") || (currentLang === "ar" ? "الكل" : "All")}
              </button>
              {activeGenres.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setSelectedGenreId(g.id)}
                  className={`text-[11px] font-bold px-3.5 py-1 flex-shrink-0 rounded-full transition-all cursor-pointer border backdrop-blur-md ${
                    selectedGenreId === g.id
                      ? "text-white bg-white/20 border-white/40 shadow-[0_4px_12px_rgba(255,255,255,0.12)]"
                      : "text-white/70 bg-white/6 border-white/12"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {showWatchlist ? (
            <main className="pt-24 px-4 sm:px-10 pb-24 relative z-20">
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setShowWatchlist(false)}
                  className="lg-cinema-action-pill px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>{t("movies.back") || (currentLang === "ar" ? "رجوع" : "Back")}</span>
                </button>
                <div className="text-base sm:text-xl font-black flex items-center gap-2">
                  <Bookmark size={18} className="text-amber-400 fill-current" />
                  <span>{currentLang === "ar" ? "قائمتي للمشاهدة" : "My Watchlist"}</span>
                </div>
              </div>

              {watchlistItems.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-3 text-center text-white/50 lg-cinema-glass-modal rounded-3xl p-10 max-w-md mx-auto">
                  <Bookmark size={32} className="text-amber-300/70" />
                  <span className="font-semibold text-sm">
                    {currentLang === "ar"
                      ? "لا توجد عناصر في قائمتك حتى الآن."
                      : "Your watchlist is empty."}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {watchlistItems.map((rec) => (
                    <div
                      key={`${rec.tmdb_id}-${rec.media_type}`}
                      className="relative group flex justify-center"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={rec.title}
                        onClick={() => openWatchlistItem(rec)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openWatchlistItem(rec);
                          }
                        }}
                        className="nl-poster relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] cursor-pointer select-none flex-shrink-0"
                      >
                        <div className="nl-poster__sheen" />
                        {rec.poster_path ? (
                          <img
                            src={getPosterSrc_static(rec.poster_path)}
                            alt={rec.title}
                            loading="lazy"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/40">
                            <Film size={28} />
                          </div>
                        )}
                        <span className="absolute top-2 inset-inline-start-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-black/65 border border-white/20 backdrop-blur-md text-white">
                          {rec.media_type === "tv"
                            ? currentLang === "ar"
                              ? "مسلسل"
                              : "Series"
                            : currentLang === "ar"
                              ? "فيلم"
                              : "Movie"}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                          <p className="text-[11px] font-bold text-white truncate">{rec.title}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(
                            rec.tmdb_id,
                            rec.media_type,
                            "watchlist",
                            rec.title,
                            rec.poster_path,
                          );
                        }}
                        aria-label={
                          currentLang === "ar"
                            ? "إزالة من القائمة"
                            : "Remove from watchlist"
                        }
                        className="absolute top-2 inset-inline-end-4 w-7 h-7 grid place-items-center rounded-full bg-black/75 border border-white/25 text-white opacity-0 group-hover:opacity-100 transition hover:bg-rose-600 cursor-pointer z-20"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </main>
          ) : searchQuery.trim() !== "" || selectedGenreId !== null ? (
            <main className="pt-24 px-4 sm:px-10 pb-24 relative z-20">
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedGenreId(null);
                  }}
                  className="lg-cinema-action-pill px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>{t("movies.back") || (currentLang === "ar" ? "رجوع" : "Back")}</span>
                </button>
                <div className="text-base sm:text-xl font-black text-white">
                  {selectedGenreId
                    ? `${
                        t("movies.genres") || (currentLang === "ar" ? "التصنيف" : "Category")
                      }: ${activeGenres.find((g) => g.id === selectedGenreId)?.name || ""}`
                    : `${
                        t("movies.search") || (currentLang === "ar" ? "نتائج البحث" : "Search results")
                      }: "${searchQuery}"`}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {(searchQuery ? searchResults : filteredList).map((item) => (
                  <div key={item.id} className="flex justify-center py-2">
                    <MoviePosterCard
                      item={item}
                      {...rowProps}
                      isFavorite={rowProps.isFavoriteFn?.(item.id, item.mediaType)}
                    />
                  </div>
                ))}
              </div>

              {(searchQuery ? searchResults : filteredList).length === 0 && !isSearching && (
                <div className="w-full py-20 text-center text-white/55 font-medium lg-cinema-glass-modal rounded-3xl max-w-md mx-auto">
                  {t("movies.noResults") ||
                    (currentLang === "ar"
                      ? "لا توجد نتائج مطابقة."
                      : "No matching titles found.")}
                </div>
              )}
            </main>
          ) : (
            <>
              {activeHeroItem && (
                <CinemaHeroBanner
                  activeHeroItem={activeHeroItem}
                  isMobile={isMobile}
                  heroIndex={heroIndex}
                  setHeroIndex={setHeroIndex}
                  currentLang={currentLang}
                  localizedHeroTitle={localizedHeroTitle}
                  heroServersOpen={heroServersOpen}
                  setHeroServersOpen={setHeroServersOpen}
                  slideshowSlides={slideshowSlides}
                  setSelectedItemId={setSelectedItemId}
                  handleQuickWatch={handleQuickWatch}
                  t={t}
                />
              )}

              {continueWatchingItems.length > 0 && (
                <div className="relative z-20 flex flex-col gap-1.5 py-2.5 px-4 sm:px-10 -mt-2">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-tight drop-shadow">
                      {t("movies.rows.continueWatching", "Continue watching")}
                    </h2>
                  </div>
                  <div
                    className="nl-cinema-row flex gap-4 overflow-x-auto select-none px-3 scroll-smooth scrollbar-none snap-x snap-mandatory"
                    style={MOVIE_ROW_SCROLL_STYLE}
                  >
                    {continueWatchingItems.map((entry) => {
                      const cwItem: CinemaItem = {
                        id: entry.id,
                        mediaType: entry.mediaType,
                        title: entry.title,
                        overview: "",
                        posterPath: entry.posterPath || "",
                        backdropPath: entry.backdropPath || "",
                        year: "",
                        rating: 0,
                        genreIds: [],
                        genreNames: [],
                        trailerKey: "",
                        cast: [],
                        similar: [],
                      };
                      const ratio =
                        entry.duration > 0 ? entry.time / entry.duration : 0;
                      const epBadge =
                        entry.mediaType === "tv" && entry.season && entry.episode
                          ? `S${entry.season}:E${entry.episode}`
                          : undefined;
                      return (
                        <div key={entry.key} className="flex-shrink-0 snap-start">
                          <MoviePosterCard
                            item={cwItem}
                            isTouch={isTouch}
                            activeHoverId={activeHoverId}
                            setActiveHoverId={setActiveHoverId}
                            hoverTimer={hoverTimer}
                            setSelectedItemId={(id, mt) => {
                              if (id !== null && entry.mediaType === "tv") {
                                deepLinkSeRef.current = {
                                  itemId: id,
                                  s: entry.season || 1,
                                  e: entry.episode || 1,
                                };
                              }
                              setSelectedItemId(id, mt);
                            }}
                            onQuickWatch={(it) => {
                              if (entry.mediaType === "tv") {
                                deepLinkSeRef.current = {
                                  itemId: it.id,
                                  s: entry.season || 1,
                                  e: entry.episode || 1,
                                };
                              }
                              handleQuickWatch(it);
                            }}
                            t={t}
                            progressRatio={ratio}
                            episodeBadge={epBadge}
                            onRemoveProgress={() =>
                              removeProgress(entry.mediaType, entry.id)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "movies" ? (
                globalError && trendingMovies.length === 0 ? (
                  <div className="w-full py-20 flex flex-col items-center gap-4 text-center relative z-20">
                    <p className="text-white/60 font-medium">{t("movies.meta.errorLoad")}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="lg-cinema-action-pill px-5 py-2 text-white font-bold text-sm cursor-pointer"
                    >
                      ↻
                    </button>
                  </div>
                ) : moviesLoading ? (
                  <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                    {[1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden"
                      >
                        <div className="h-5 w-36 bg-white/10 animate-pulse rounded-full px-2" />
                        <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                          {[1, 2, 3, 4, 5, 6].map((idx2) => (
                            <div
                              key={idx2}
                              className="relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse flex-shrink-0 nl-skeleton-card"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                    {topMovies.length > 0 && (
                      <MovieRow
                        title={currentLang === "ar" ? "الأكثر مشاهدة" : "Top Movies"}
                        items={topMovies}
                        {...rowProps}
                      />
                    )}
                    <MovieRow title={t("movies.rows.trending")} items={trendingMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.topRated")} items={topRatedMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.action")} items={actionMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.horror")} items={horrorMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.popular")} items={popularMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.drama")} items={dramaMovies} {...rowProps} />
                    <MovieRow title={t("movies.rows.scifi")} items={sciFiMovies} {...rowProps} />
                  </div>
                )
              ) : globalError && trendingSeries.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center gap-4 text-center relative z-20">
                  <p className="text-white/60 font-medium">{t("movies.meta.errorLoad")}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="lg-cinema-action-pill px-5 py-2 text-white font-bold text-sm cursor-pointer"
                  >
                    ↻
                  </button>
                </div>
              ) : seriesLoading ? (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="relative z-10 flex flex-col gap-2 py-3 px-4 sm:px-10 overflow-hidden"
                    >
                      <div className="h-5 w-36 bg-white/10 animate-pulse rounded-full px-2" />
                      <div className="flex gap-4 overflow-x-hidden py-4 px-2">
                        {[1, 2, 3, 4, 5, 6].map((idx2) => (
                          <div
                            key={idx2}
                            className="relative w-[135px] sm:w-[160px] md:w-[175px] aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse flex-shrink-0 nl-skeleton-card"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative z-20 pb-24 -mt-4 sm:-mt-6">
                  {topSeries.length > 0 && (
                    <MovieRow
                      title={currentLang === "ar" ? "الأكثر مشاهدة" : "Top Series"}
                      items={topSeries}
                      {...rowProps}
                    />
                  )}
                  <MovieRow title={t("movies.rows.trending")} items={trendingSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.topRated")} items={topRatedSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.popular")} items={popularSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.adventure")} items={actionSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.mystery")} items={mysterySeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.drama")} items={dramaSeries} {...rowProps} />
                  <MovieRow title={t("movies.rows.animation")} items={animationSeries} {...rowProps} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <CinemaDetailModal
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        isWatchingInGallery={isWatchingInGallery}
        setIsWatchingInGallery={setIsWatchingInGallery}
        isLoadingDetails={isLoadingDetails}
        detailedItem={detailedItem}
        detailDialogRef={detailDialogRef}
        detailWatchTarget={detailWatchTarget}
        detailServersOpen={detailServersOpen}
        setDetailServersOpen={setDetailServersOpen}
        startGalleryWatchSession={startGalleryWatchSession}
        activeImdbId={activeImdbId}
        showHeroTrailer={showHeroTrailer}
        setShowHeroTrailer={setShowHeroTrailer}
        setTrailerFallbackToYoutube={setTrailerFallbackToYoutube}
        persistCurrentProgress={persistCurrentProgress}
        currentLang={currentLang}
        t={t}
        user={user}
        has={has}
        toggle={toggle}
        handleSelectActor={handleSelectActor}
        playerStageProps={{
          isWatchingInGallery,
          setIsWatchingInGallery,
          activeGallerySource,
          detailPlaySources,
          activeGalleryServerIdx,
          showHeroTrailer,
          setShowHeroTrailer,
          trailerFallbackToYoutube,
          setTrailerFallbackToYoutube,
          resolvedTrailer,
          setImdbTrailerLoaded,
          activeImdbId,
          bumpControlsVisibility,
          isControlsVisible,
          currentLang,
          t,
          persistCurrentProgress,
          setDetailServersOpen,
          startGalleryWatchSession,
          isFullSeasonEmbed,
          setIsFullSeasonEmbed,
          selectedSeason,
          setSelectedSeason,
          selectedEpisode,
          setSelectedEpisode,
          loadingSeasonEpisodes,
          seasonEpisodes,
          setWorkerBridgeSubtitles,
          playerIframeRef,
          videoElementRef,
          galleryStageRef,
          isCssFullscreen,
          setIsCssFullscreen,
          isAnyFullscreen,
          handleToggleGalleryFullscreen,
          setSelectedItemId,
          allServersFailed,
          playerRenderMode,
          setPlayerRenderMode,
          handleToggleVideoPlay,
          appliedInitialSeekRef,
          detailWatchTarget,
          syncVideoTextTracks,
          activeSubtitleIdx,
          setActiveSubtitleIdx,
          videoVolume,
          setVideoVolume,
          isVideoMuted,
          setIsVideoMuted,
          loadedCurrentAttemptRef,
          extractedStreams,
          activeExtractedIdx,
          setActiveExtractedIdx,
          playAttemptStartedAtRef,
          resolveServerIdForStream,
          detailItemStorageKey,
          isPlayerLoading,
          setIsPlayerLoading,
          useDirectUrlFallback,
          setUseDirectUrlFallback,
          cleanupDirectVideoPlayer,
          activeSubtitlesList,
          activeIframeUrl,
          gotTimeSinceLoadRef,
          confirmedPlayingSinceLoadRef,
          userPausedIframeRef,
          setIframeLoadStamp,
          seekUnsupportedToast,
          controlMode,
          activeTrackCues,
          subtitleOffsetSec,
          setSubtitleOffsetSec,
          handleUserSeek,
          handleUserTogglePlay,
          handleToggleVideoMute,
          handleChangeVideoVolume,
          isSubtitleMenuOpen,
          setIsSubtitleMenuOpen,
          isLoadingSubtitles,
          loadingSubtitleIdx,
          handleUploadLocalSubtitle,
          handleRefreshSubtitlesForLanguages,
        }}
      />

      <ActorProfileModal
        selectedActor={selectedActor}
        isWatchingInGallery={isWatchingInGallery}
        tmdbKey={tmdbKey}
        currentLang={currentLang}
        onClose={() => setSelectedActor(null)}
        onSelectWork={(workId, mediaType) => {
          setSelectedActor(null);
          setActiveTab(mediaType === "tv" ? "series" : "movies");
          setSelectedItemId(workId, mediaType);
        }}
      />
    </div>,
    document.body,
  );
}
