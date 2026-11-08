/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
import type HlsType from "hls.js";
import { useAppContext } from "../../context/AppContext";
import { useMovieItems } from "../../features/account/useMovieItems";
import { useAuth } from "../../context/AuthContext";
import { useDeviceType } from "../../hooks/useDeviceType";
import { useMoviesMusic } from "./useMoviesMusic";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { usePreconnect } from "../../hooks/usePreconnect";
import { FALLBACK_MOVIES } from "./CuratedFallback";
import { FALLBACK_SERIES } from "../Series/CuratedFallback";
import { normLang, tmdbLang } from "../../utils/lang";
import { PUBLIC_TMDB_KEY, PUBLIC_OMDB_KEY } from "../../config/publicKeys";
import "../../styles/components/cinema.css";
import {
  useResolvedImdbSources,
  type PlaySource,
} from "./MovieSourcesModal";
import type { ExtractedVideoStream } from "../../services/videoExtractor";
import { probeAllServersSpeed } from "../../services/serverSpeedMonitor";
import { logPlay } from "../../features/music/data/playTracking";
import {
  bindVideoElementToClock,
  clockReset,
  useClockState,
} from "../../features/cinema/player/playbackClock";
import {
  getProgress,
  removeProgress,
  useContinueWatching,
} from "../../features/cinema/progress/progressStore";
import {
  TMDB_BASE_URL,
  fetchWithCache,
  fetchOmdbMeta,
  normalizeItem,
  getBackdropSrc_static,
  getPosterSrc_static,
  MOVIE_ROW_SCROLL_STYLE,
  type Media,
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
import { useCinemaSubtitles } from "./hooks/useCinemaSubtitles";
import { useCinemaDeepLink } from "./hooks/useCinemaDeepLink";
import { useCinemaCatalog } from "./hooks/useCinemaCatalog";
import { useHeroTrailer } from "./hooks/useHeroTrailer";
import { useServerFailover } from "./hooks/useServerFailover";
import { useStreamExtractor } from "./hooks/useStreamExtractor";
import { usePlayerBridgeSync } from "./hooks/usePlayerBridgeSync";
import { CinemaHeroBanner } from "./components/CinemaHeroBanner";
import { CinemaDetailModal } from "./components/CinemaDetailModal";
import { CinemaHeaderDownloadButton } from "../../features/cinemaDownload";

export { fetchWithCache, normalizeItem };
export type { CastMember, ActorDetails, CinemaItem };

const CINEMA_PRECONNECT_ORIGINS = [
  "https://image.tmdb.org",
  "https://api.themoviedb.org",
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

  const [detailServersOpen, setDetailServersOpen] = useState(false);
  const [selectedItemId, setSelectedItemIdState] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<Media | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const setSelectedItemId = useCallback(
    (id: number | null, mediaType?: Media) => {
      if (id === null) {
        setSelectedMediaType(null);
        setSelectedItemIdState(null);
        return;
      }
      const effType: Media = mediaType ?? (activeTab === "series" ? "tv" : "movie");
      void probeAllServersSpeed(undefined, `${effType}_${id}`);
      setSelectedMediaType(effType);
      setSelectedItemIdState(id);
      const preloaded = findPreloadedCinemaItem(id, effType);
      if (preloaded) {
        setDetailedItem((prev) =>
          prev && prev.id === id && prev.mediaType === effType ? prev : preloaded,
        );
        setIsLoadingDetails(false);
      } else {
        setDetailedItem((prev) =>
          prev && prev.id === id && prev.mediaType === effType ? prev : null,
        );
        setIsLoadingDetails(true);
      }
    },
    [activeTab, findPreloadedCinemaItem],
  );

  const [isWatchingInGallery, setIsWatchingInGallery] = useState(false);
  const [activeGalleryServerIdx, setActiveGalleryServerIdx] = useState(0);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [allServersFailed, setAllServersFailed] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [extractedStreams, setExtractedStreams] = useState<ExtractedVideoStream[]>([]);
  const [activeExtractedIdx, setActiveExtractedIdx] = useState(0);
  const [useDirectUrlFallback, setUseDirectUrlFallback] = useState(false);
  const [playerRenderMode, setPlayerRenderMode] = useState<
    "extracting" | "direct" | "clean-embed" | "iframe"
  >("extracting");
  const clockState = useClockState();
  const isVideoPaused = clockState.paused;
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isFullSeasonEmbed, setIsFullSeasonEmbed] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Array<{ episode_number: number; name: string }>
  >([]);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);
  const galleryStageRef = useRef<HTMLDivElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<HlsType | null>(null);
  const attemptTokenRef = useRef(0);
  const playAttemptStartedAtRef = useRef<number>(0);
  const failoverQueueRef = useRef<number[]>([]);
  const failoverStepRef = useRef(0);
  const loadedCurrentAttemptRef = useRef(false);
  const autoStartWatchRef = useRef(false);
  const appliedInitialSeekRef = useRef(false);
  const deepLinkSeRef = useRef<{ itemId: number; s?: number; e?: number } | null>(null);
  const preselectedProgressItemIdRef = useRef<number | null>(null);
  const continueWatchingItems = useContinueWatching();
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  const resumeStartAtSec = useMemo(() => {
    if (!detailedItem) return undefined;
    const saved = getProgress(detailedItem.mediaType, detailedItem.id);
    if (!saved) return undefined;
    if (
      detailedItem.mediaType === "tv" &&
      ((saved.season && saved.season !== selectedSeason) ||
        (saved.episode && saved.episode !== selectedEpisode))
    ) {
      return undefined;
    }
    return saved.time > 5 ? saved.time : undefined;
  }, [detailedItem?.id, detailedItem?.mediaType, selectedSeason, selectedEpisode]);

  const detailWatchTarget = useMemo(() => {
    if (!detailedItem) return null;
    return {
      id: detailedItem.id,
      mediaType: detailedItem.mediaType,
      title: detailedItem.title,
      imdbId: detailedItem.imdbId,
      backdropPath: detailedItem.backdropPath,
      posterPath: detailedItem.posterPath,
      season: selectedSeason,
      episode: selectedEpisode,
      fullSeason: isFullSeasonEmbed,
      startAt: resumeStartAtSec,
    };
  }, [detailedItem, selectedSeason, selectedEpisode, isFullSeasonEmbed, resumeStartAtSec]);

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
  const [embedSeekStartAtSec, setEmbedSeekStartAtSec] = useState<number | null>(null);
  const [workerBridgeRevision, setWorkerBridgeRevision] = useState(0);
  const [seekUnsupportedToast, setSeekUnsupportedToast] = useState(false);
  const seekUnsupportedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSeekUnsupportedToast = useCallback(() => {
    setSeekUnsupportedToast(true);
    if (seekUnsupportedToastTimerRef.current) {
      clearTimeout(seekUnsupportedToastTimerRef.current);
    }
    seekUnsupportedToastTimerRef.current = setTimeout(() => {
      setSeekUnsupportedToast(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (seekUnsupportedToastTimerRef.current) {
        clearTimeout(seekUnsupportedToastTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (!isWatchingInGallery && !showHeroTrailer) {
      cleanupDirectVideoPlayer();
      if (playerIframeRef.current) {
        try {
          playerIframeRef.current.src = "about:blank";
        } catch {}
      }
    }
    if (!isWatchingInGallery) {
      clearExternalSubtitleBlobs();
    }
  }, [isWatchingInGallery, showHeroTrailer, cleanupDirectVideoPlayer, clearExternalSubtitleBlobs]);

  useEffect(() => {
    const v = videoElementRef.current;
    if (!isWatchingInGallery || playerRenderMode !== "direct" || !v) return undefined;
    return bindVideoElementToClock(v);
  }, [isWatchingInGallery, playerRenderMode, extractedStreams, activeExtractedIdx]);

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || null;
      setIsNativeFullscreen(Boolean(fsEl));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const isAnyFullscreen = isCssFullscreen || isNativeFullscreen;

  const bumpControlsVisibility = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    const shouldAutoHide =
      isWatchingInGallery &&
      !isSubtitleMenuOpen &&
      (playerRenderMode !== "direct" || !isVideoPaused);
    if (shouldAutoHide) {
      controlsHideTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused]);

  useEffect(() => {
    if (!isWatchingInGallery || isSubtitleMenuOpen) {
      setIsControlsVisible(true);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
      return undefined;
    }
    bumpControlsVisibility();
    const onGlobalActivity = () => bumpControlsVisibility();
    window.addEventListener("mousemove", onGlobalActivity, { passive: true });
    window.addEventListener("touchstart", onGlobalActivity, { passive: true });
    window.addEventListener("keydown", onGlobalActivity);
    return () => {
      window.removeEventListener("mousemove", onGlobalActivity);
      window.removeEventListener("touchstart", onGlobalActivity);
      window.removeEventListener("keydown", onGlobalActivity);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    };
  }, [isWatchingInGallery, isSubtitleMenuOpen, playerRenderMode, isVideoPaused, bumpControlsVisibility]);

  const handleToggleVideoPlay = useCallback(() => {
    const video = videoElementRef.current;
    if (video && playerRenderMode === "direct") {
      if (video.paused) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
    bumpControlsVisibility();
  }, [playerRenderMode, bumpControlsVisibility]);

  useEffect(() => {
    const onProgressiveTorrentStream = (e: Event) => {
      const custom = e as CustomEvent<{
        infoHash: string;
        media: { id: number; mediaType: Media; season?: number; episode?: number };
        streamUrl: string;
      }>;
      const detail = custom.detail;
      if (!detail || !detail.streamUrl || !detail.media) return;

      const s = detail.media.season || 1;
      const ep = detail.media.episode || 1;
      const storageKey = `${detail.media.mediaType}_${detail.media.id}`;

      if (selectedItemId !== detail.media.id) {
        deepLinkSeRef.current = { itemId: detail.media.id, s, e: ep };
        setSelectedItemId(detail.media.id, detail.media.mediaType);
      } else {
        setSelectedSeason(s);
        setSelectedEpisode(ep);
      }

      setTimeout(() => {
        checkedExtractionKeyRef.current = `${storageKey}_s${s}_e${ep}`;
        setAllServersFailed(false);
        setShowHeroTrailer(false);
        setUseDirectUrlFallback(false);
        setExtractedStreams([
          {
            type: "mp4",
            directUrl: detail.streamUrl,
            proxiedUrl: detail.streamUrl,
            sourcePage: detail.streamUrl,
          },
        ]);
        setActiveExtractedIdx(0);
        setIsWatchingInGallery(true);
        setIsPlayerLoading(false);
        setPlayerRenderMode("direct");
      }, 60);
    };

    window.addEventListener(
      "nl:cinema-progressive-torrent-stream",
      onProgressiveTorrentStream,
    );
    return () =>
      window.removeEventListener(
        "nl:cinema-progressive-torrent-stream",
        onProgressiveTorrentStream,
      );
  }, [selectedItemId, setSelectedItemId]);

  const handleToggleVideoMute = useCallback(() => {
    const video = videoElementRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsVideoMuted(video.muted);
    bumpControlsVisibility();
  }, [bumpControlsVisibility]);

  const handleChangeVideoVolume = useCallback(
    (nextVolume: number) => {
      const video = videoElementRef.current;
      const clamped = Math.max(0, Math.min(1, nextVolume));
      setVideoVolume(clamped);
      if (!video) return;
      video.volume = clamped;
      video.muted = clamped === 0;
      setIsVideoMuted(video.muted);
      bumpControlsVisibility();
    },
    [bumpControlsVisibility],
  );

  const handleToggleGalleryFullscreen = useCallback(() => {
    const el = galleryStageRef.current as any;
    if (!el) return;

    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }

    const doc = document as any;
    const fullscreenEl =
      doc.fullscreenElement || doc.webkitFullscreenElement || null;

    if (fullscreenEl) {
      try {
        const exitFn = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exitFn) {
          void Promise.resolve(exitFn.call(doc)).catch(() => {
            setIsCssFullscreen(false);
          });
          return;
        }
      } catch {}
      setIsCssFullscreen(false);
      return;
    }

    try {
      const reqFn =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.webkitEnterFullscreen;
      if (reqFn) {
        void Promise.resolve(reqFn.call(el)).catch(() => {
          setIsCssFullscreen((v) => !v);
        });
        return;
      }
    } catch {}

    setIsCssFullscreen((v) => !v);
  }, [isCssFullscreen]);

  useEffect(() => {
    if (playerIframeRef.current) {
      try {
        playerIframeRef.current.src = "about:blank";
      } catch {}
    }
    clearExternalSubtitleBlobs();
    clockReset("manual");
    setEmbedSeekStartAtSec(null);
    appliedInitialSeekRef.current = false;
    attemptTokenRef.current += 1;
    setShowHeroTrailer(false);
    setTrailerFallbackToYoutube(false);
    setResolvedTrailer(null);
    setImdbTrailerLoaded(false);
    const shouldAutoStart = autoStartWatchRef.current && selectedItemId !== null;
    setIsWatchingInGallery(shouldAutoStart);
    setIsPlayerLoading(shouldAutoStart);
    setAllServersFailed(false);
    setIsCssFullscreen(false);
    setIsSubtitleMenuOpen(false);
    setSubtitleOffsetSec(0);
    setActiveTrackCues([]);
    setLoadingSubtitleIdx(null);
    setActiveGalleryServerIdx(0);
    const dl = deepLinkSeRef.current;
    if (dl && selectedItemId !== null && dl.itemId === selectedItemId) {
      setSelectedSeason(dl.s && dl.s > 0 ? dl.s : 1);
      setSelectedEpisode(dl.e && dl.e > 0 ? dl.e : 1);
      deepLinkSeRef.current = null;
    } else {
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
    setIsFullSeasonEmbed(false);
    setSeasonEpisodes([]);
    setDetailServersOpen(shouldAutoStart);
    setSelectedActor(null);
    if (selectedItemId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCssFullscreen) {
          setIsCssFullscreen(false);
        } else if (selectedActor) {
          setSelectedActor(null);
        } else {
          persistCurrentProgress();
          setSelectedItemId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItemId]);

  useEffect(() => {
    if (!detailedItem || detailedItem.mediaType !== "tv") {
      setSeasonEpisodes([]);
      return;
    }
    let cancelled = false;
    const loadSeasonEps = async () => {
      setLoadingSeasonEpisodes(true);
      const fallbackCount = Math.max(
        1,
        Math.min(
          30,
          detailedItem.episodes && detailedItem.seasons
            ? Math.ceil(detailedItem.episodes / Math.max(1, detailedItem.seasons))
            : 12,
        ),
      );
      try {
        if (tmdbKey) {
          const langParam = `&language=${tmdbLang(currentLang)}`;
          const seasonData = await fetchWithCache(
            `${TMDB_BASE_URL}/tv/${detailedItem.id}/season/${selectedSeason}?api_key=${tmdbKey}${langParam}`,
          );
          if (
            !cancelled &&
            Array.isArray(seasonData?.episodes) &&
            seasonData.episodes.length > 0
          ) {
            setSeasonEpisodes(
              seasonData.episodes.map((ep: any, idx: number) => ({
                episode_number: Number(ep.episode_number) || idx + 1,
                name:
                  ep.name ||
                  (currentLang === "ar" ? `الحلقة ${idx + 1}` : `Episode ${idx + 1}`),
              })),
            );
            setLoadingSeasonEpisodes(false);
            return;
          }
        }
      } catch {
        // Fallback below
      }
      if (!cancelled) {
        setSeasonEpisodes(
          Array.from({ length: fallbackCount }, (_, idx) => ({
            episode_number: idx + 1,
            name: currentLang === "ar" ? `الحلقة ${idx + 1}` : `Episode ${idx + 1}`,
          })),
        );
        setLoadingSeasonEpisodes(false);
      }
    };
    void loadSeasonEps();
    return () => {
      cancelled = true;
    };
  }, [detailedItem, selectedSeason, tmdbKey, currentLang]);

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
    [setSelectedItemId, selectedItemId, detailedItem?.id, startGalleryWatchSession, setShowHeroTrailer],
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
    [isTouch, activeHoverId, setActiveHoverId, hoverTimer, setSelectedItemId, handleQuickWatch, t, has],
  );

  const watchlistItems = useMemo(
    () => movieItems.filter((i) => i.status === "watchlist"),
    [movieItems],
  );

  const openWatchlistItem = useCallback(
    (rec: { tmdb_id: number; media_type: "movie" | "tv" }) => {
      setActiveTab(rec.media_type === "tv" ? "series" : "movies");
      setShowWatchlist(false);
      setSelectedItemId(rec.tmdb_id, rec.media_type);
    },
    [setActiveTab, setShowWatchlist, setSelectedItemId],
  );

  const isOpenForAudio = Boolean(detailedItem || selectedItemId);
  const { isMuted, toggleMute } = useMoviesMusic(isOpenForAudio);

  const [scrolled, setScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollTop > 40);
  }, []);

  useEffect(() => {
    setMovieActive(Boolean(detailedItem));
    registerMovieBack(() => {
      persistCurrentProgress();
      setDetailedItem(null);
      setSelectedItemId(null);
    });
  }, [detailedItem, setMovieActive, registerMovieBack, persistCurrentProgress, setSelectedItemId]);

  useEffect(() => {
    return () => {
      setMovieActive(false);
    };
  }, [setMovieActive]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("nl-cinema-active");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("nl-cinema-active");
    };
  }, []);

  useCinemaDeepLink({
    selectedItemId,
    selectedMediaType,
    detailedItem,
    activeTab,
    setActiveTab,
    selectedSeason,
    selectedEpisode,
    setSelectedItemId,
    deepLinkSeRef,
  });

  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) return;
    prevActiveTabRef.current = activeTab;
    setSelectedGenreId(null);
    setSearchQuery("");
    setDetailedItem(null);
    setSelectedItemId(null);
    setHeroIndex(0);
  }, [activeTab, setSelectedGenreId, setSearchQuery, setSelectedItemId, setHeroIndex]);

  const lastHeaderHeightRef = useRef<number>(0);
  useEffect(() => {
    const header = document.querySelector(".nl-cinema-header") as HTMLElement | null;
    if (!header) return;
    const ro = new ResizeObserver(() => {
      const h = header.offsetHeight;
      if (h !== lastHeaderHeightRef.current) {
        lastHeaderHeightRef.current = h;
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--cinema-header-h", `${h}px`);
        });
      }
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Details Modal Loader
  useEffect(() => {
    if (selectedItemId === null) return;
    let cancelled = false;

    const mediaType: Media = selectedMediaType ?? (activeTab === "series" ? "tv" : "movie");
    const isTv = mediaType === "tv";

    if (!detailedItem || detailedItem.id !== selectedItemId) {
      const seeded = findPreloadedCinemaItem(selectedItemId, mediaType);
      if (seeded) {
        setDetailedItem(seeded);
        setIsLoadingDetails(false);
      } else {
        setIsLoadingDetails(true);
      }
    }

    if (!tmdbKey) {
      const list = isTv ? FALLBACK_SERIES : FALLBACK_MOVIES;
      const match = list.find((m) => m.id === selectedItemId);
      if (!cancelled && match) {
        const normalized = normalizeItem(match, mediaType, currentLang);
        setDetailedItem(normalized);
        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress("tv", normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === "tv" ? "series" : "movie",
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);
      }
      return;
    }

    const loadDetails = async () => {
      try {
        const langParam = `&language=${tmdbLang(currentLang)}`;
        const detailType = isTv ? "tv" : "movie";
        const detailsAppend = isTv
          ? "videos,credits,similar,external_ids"
          : "videos,credits,similar,release_dates";

        const detail = await fetchWithCache(
          `${TMDB_BASE_URL}/${detailType}/${selectedItemId}?api_key=${tmdbKey}${langParam}&include_video_language=${currentLang},en,null&append_to_response=${detailsAppend}`,
        );

        if (cancelled) return;

        const normalized = normalizeItem(detail, mediaType, currentLang);
        setDetailedItem((prev) => {
          if (prev && prev.id === normalized.id) {
            return {
              ...normalized,
              rating: prev.rating || normalized.rating,
              certification: normalized.certification || prev.certification,
              rottenTomatoes: prev.rottenTomatoes || normalized.rottenTomatoes,
              metascore: prev.metascore || normalized.metascore,
              awards: prev.awards || normalized.awards,
              boxOffice: prev.boxOffice || normalized.boxOffice,
            };
          }
          return normalized;
        });

        if (isTv && preselectedProgressItemIdRef.current !== normalized.id) {
          preselectedProgressItemIdRef.current = normalized.id;
          const saved = getProgress("tv", normalized.id);
          if (saved?.season && saved.season > 0) setSelectedSeason(saved.season);
          if (saved?.episode && saved.episode > 0) setSelectedEpisode(saved.episode);
        }
        logPlay({
          item_type: normalized.mediaType === "tv" ? "series" : "movie",
          item_id: String(normalized.id),
          media_type: normalized.mediaType,
          title: normalized.title || null,
        });
        setIsLoadingDetails(false);

        const imdbId = isTv ? detail.external_ids?.imdb_id : detail.imdb_id;
        if (imdbId && omdbKey) {
          fetchOmdbMeta(imdbId, omdbKey)
            .then((omdb) => {
              if (cancelled || !omdb) return;
              const parsedImdbRating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : NaN;
              setDetailedItem((prev) => {
                if (!prev || prev.id !== normalized.id) return prev;
                return {
                  ...prev,
                  rating:
                    Number.isFinite(parsedImdbRating) && parsedImdbRating > 0
                      ? parsedImdbRating
                      : prev.rating,
                  certification: prev.certification || omdb.rated,
                  rottenTomatoes: omdb.rottenTomatoes || prev.rottenTomatoes,
                  metascore: omdb.metascore || prev.metascore,
                  awards: omdb.awards || prev.awards,
                  boxOffice: omdb.boxOffice || prev.boxOffice,
                };
              });
            })
            .catch((err) => {
              console.debug("Non-blocking OMDb enrichment failed:", err);
            });
        }
      } catch (err) {
        console.error("Failed loading exact item details:", err);
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedItemId, selectedMediaType, activeTab, tmdbKey, currentLang, omdbKey, findPreloadedCinemaItem]);

  useEffect(() => {
    if (
      detailedItem &&
      selectedItemId !== null &&
      detailedItem.id === selectedItemId &&
      autoStartWatchRef.current &&
      detailPlaySources.length > 0
    ) {
      autoStartWatchRef.current = false;
      setDetailServersOpen(true);
      startGalleryWatchSession();
    }
  }, [detailedItem, selectedItemId, detailPlaySources, startGalleryWatchSession]);

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
