import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type HlsType from "hls.js";
import { useAuth } from "../../../context/AuthContext";
import { useMovieItems } from "../../../features/account/useMovieItems";
import { useDeviceType } from "../../../hooks/useDeviceType";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { normLang } from "../../../utils/lang";
import { PUBLIC_TMDB_KEY } from "../../../config/publicKeys";
import {
  useResolvedImdbSources,
  type PlaySource,
} from "../MovieSourcesModal";
import type { ExtractedVideoStream } from "../../../services/videoExtractor";
import {
  bindVideoElementToClock,
  useClockState,
} from "../../../features/cinema/player/playbackClock";
import { getProgress } from "../../../features/cinema/progress/progressStore";
import type { Media, CastMember, CinemaItem } from "../moviesDataClient";
import { useCinemaSubtitles } from "./useCinemaSubtitles";
import { useHeroTrailer } from "./useHeroTrailer";
import { useServerFailover } from "./useServerFailover";
import { useStreamExtractor } from "./useStreamExtractor";
import { usePlayerBridgeSync } from "./usePlayerBridgeSync";

export interface UseStandaloneCinemaControllerOptions {
  items: CinemaItem[];
  customSourcesBuilder?: (
    item: CinemaItem,
    season: number,
    episode: number
  ) => PlaySource[];
  customEpisodesBuilder?: (
    item: CinemaItem,
    season: number
  ) => Promise<Array<{ episode_number: number; name: string }>> | Array<{ episode_number: number; name: string }>;
}

export function useStandaloneCinemaController({
  items,
  customSourcesBuilder,
  customEpisodesBuilder,
}: UseStandaloneCinemaControllerOptions) {
  const { t, i18n } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const isTouch = isMobile || isTablet;
  const currentLang = normLang(i18n.resolvedLanguage || i18n.language);
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  const { user } = useAuth();
  const { has, toggle } = useMovieItems();

  const [detailServersOpen, setDetailServersOpen] = useState(false);
  const [selectedItemId, setSelectedItemIdState] = useState<number | null>(null);
  const [detailedItem, setDetailedItem] = useState<CinemaItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isWatchingInGallery, setIsWatchingInGallery] = useState(false);
  const [activeGalleryServerIdx, setActiveGalleryServerIdx] = useState(0);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [allServersFailed, setAllServersFailed] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [isNativeFullscreen] = useState(false);
  const [extractedStreams, setExtractedStreams] = useState<ExtractedVideoStream[]>([]);
  const [activeExtractedIdx, setActiveExtractedIdx] = useState(0);
  const [useDirectUrlFallback, setUseDirectUrlFallback] = useState(false);
  const [playerRenderMode, setPlayerRenderMode] = useState<
    "extracting" | "direct" | "clean-embed" | "iframe"
  >("extracting");

  const clockState = useClockState();
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isFullSeasonEmbed, setIsFullSeasonEmbed] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Array<{ episode_number: number; name: string }>
  >([]);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);

  const galleryStageRef = useRef<HTMLDivElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<HlsType | null>(null);
  const attemptTokenRef = useRef(0);
  const playAttemptStartedAtRef = useRef<number>(0);
  const failoverQueueRef = useRef<number[]>([]);
  const failoverStepRef = useRef(0);
  const loadedCurrentAttemptRef = useRef(false);
  const appliedInitialSeekRef = useRef(false);

  const detailDialogRef = useFocusTrap(selectedItemId !== null && !!detailedItem);

  const setSelectedItemId = useCallback(
    (id: number | null, _mediaType?: Media) => {
      if (id === null) {
        setSelectedItemIdState(null);
        setDetailedItem(null);
        setIsWatchingInGallery(false);
        return;
      }
      setSelectedItemIdState(id);
      const found = items.find((it) => it.id === id) || null;
      setDetailedItem(found);
      setIsLoadingDetails(false);
      setSelectedSeason(1);
      setSelectedEpisode(1);
    },
    [items]
  );

  useEffect(() => {
    if (!detailedItem) {
      setSeasonEpisodes([]);
      return;
    }
    let cancelled = false;
    if (customEpisodesBuilder) {
      setLoadingSeasonEpisodes(true);
      Promise.resolve(customEpisodesBuilder(detailedItem, selectedSeason))
        .then((eps) => {
          if (!cancelled) setSeasonEpisodes(eps);
        })
        .finally(() => {
          if (!cancelled) setLoadingSeasonEpisodes(false);
        });
    } else {
      const count = Math.max(1, Math.min(50, detailedItem.episodes || 12));
      setSeasonEpisodes(
        Array.from({ length: count }, (_, idx) => ({
          episode_number: idx + 1,
          name: `Episode ${idx + 1}`,
        }))
      );
    }
    return () => {
      cancelled = true;
    };
  }, [detailedItem, selectedSeason, customEpisodesBuilder]);

  const resumeStartAtSec = useMemo(() => {
    if (!detailedItem) return undefined;
    const saved = getProgress(detailedItem.mediaType, detailedItem.id);
    return saved && saved.time > 5 ? saved.time : undefined;
  }, [detailedItem]);

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

  const { sources: basePlaySources, resolvedImdbId } = useResolvedImdbSources(
    detailWatchTarget,
    Boolean(detailedItem) && !customSourcesBuilder,
  );

  const detailPlaySources = useMemo(() => {
    if (!detailedItem) return [];
    if (customSourcesBuilder) {
      return customSourcesBuilder(detailedItem, selectedSeason, selectedEpisode);
    }
    return basePlaySources;
  }, [
    detailedItem,
    selectedSeason,
    selectedEpisode,
    customSourcesBuilder,
    basePlaySources,
  ]);

  const activeImdbId = resolvedImdbId || detailedItem?.imdbId || "";
  const slideshowSlides = useMemo(() => items.slice(0, 8), [items]);

  const heroTrailer = useHeroTrailer({
    activeTab: "series",
    slideshowSlidesLength: slideshowSlides.length,
    selectedItemId,
    isWatchingInGallery,
    detailedItem,
    activeImdbId,
  });

  const subtitles = useCinemaSubtitles({
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

  const detailItemStorageKey = detailedItem
    ? `${detailedItem.mediaType}_${detailedItem.id}`
    : "";

  const resolveServerIdForStream = useCallback(
    (_stream?: ExtractedVideoStream | null): string =>
      activeGallerySource?.id || detailPlaySources[0]?.id || "server-1",
    [detailPlaySources, activeGallerySource]
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
    setWorkerBridgeSubtitles: subtitles.setWorkerBridgeSubtitles,
    extractedStreams,
    setExtractedStreams,
    activeExtractedIdx,
    setActiveExtractedIdx,
    hlsInstanceRef,
    videoElementRef,
    setExternalSubtitles: subtitles.setExternalSubtitles,
    externalSubtitlesRef: subtitles.externalSubtitlesRef,
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
    setShowHeroTrailer: heroTrailer.setShowHeroTrailer,
    setIsSubtitleMenuOpen: subtitles.setIsSubtitleMenuOpen,
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

  const bridge = usePlayerBridgeSync({
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
    setWorkerBridgeSubtitles: subtitles.setWorkerBridgeSubtitles,
    showSeekUnsupportedToast: () => setSeekUnsupportedToast(true),
  });

  useEffect(() => {
    const v = videoElementRef.current;
    if (!isWatchingInGallery || playerRenderMode !== "direct" || !v) return undefined;
    return bindVideoElementToClock(v);
  }, [isWatchingInGallery, playerRenderMode, extractedStreams, activeExtractedIdx]);

  const handleQuickWatch = useCallback(
    (item: CinemaItem) => {
      setSelectedItemId(item.id, item.mediaType);
      setTimeout(() => startGalleryWatchSession(0), 60);
    },
    [setSelectedItemId, startGalleryWatchSession]
  );

  const handleToggleGalleryFullscreen = useCallback(() => {
    setIsCssFullscreen((prev) => !prev);
  }, []);

  const bumpControlsVisibility = useCallback(() => {
    setIsControlsVisible(true);
  }, []);

  const handleToggleVideoPlay = useCallback(() => {
    const v = videoElementRef.current;
    if (v && playerRenderMode === "direct") {
      if (v.paused) void v.play().catch(() => {});
      else v.pause();
    }
  }, [playerRenderMode]);

  const handleToggleVideoMute = useCallback(() => {
    const v = videoElementRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsVideoMuted(v.muted);
  }, []);

  const handleChangeVideoVolume = useCallback((nextVolume: number) => {
    const v = videoElementRef.current;
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVideoVolume(clamped);
    if (v) {
      v.volume = clamped;
      v.muted = clamped === 0;
      setIsVideoMuted(v.muted);
    }
  }, []);

  return {
    t,
    currentLang,
    tmdbKey,
    isMobile,
    isTouch,
    user,
    has,
    toggle,
    slideshowSlides,
    heroTrailer,
    selectedItemId,
    setSelectedItemId,
    detailedItem,
    isLoadingDetails,
    detailDialogRef,
    detailWatchTarget,
    detailServersOpen,
    setDetailServersOpen,
    startGalleryWatchSession,
    activeImdbId,
    isWatchingInGallery,
    setIsWatchingInGallery,
    activeHoverId,
    setActiveHoverId,
    selectedActor,
    setSelectedActor,
    handleQuickWatch,
    persistCurrentProgress: bridge.persistCurrentProgress,
    playerStageProps: {
      isWatchingInGallery,
      setIsWatchingInGallery,
      activeGallerySource,
      detailPlaySources,
      activeGalleryServerIdx,
      showHeroTrailer: heroTrailer.showHeroTrailer,
      setShowHeroTrailer: heroTrailer.setShowHeroTrailer,
      trailerFallbackToYoutube: heroTrailer.trailerFallbackToYoutube,
      setTrailerFallbackToYoutube: heroTrailer.setTrailerFallbackToYoutube,
      resolvedTrailer: heroTrailer.resolvedTrailer,
      setImdbTrailerLoaded: heroTrailer.setImdbTrailerLoaded,
      activeImdbId,
      bumpControlsVisibility,
      isControlsVisible,
      currentLang,
      t,
      persistCurrentProgress: bridge.persistCurrentProgress,
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
      setWorkerBridgeSubtitles: subtitles.setWorkerBridgeSubtitles,
      playerIframeRef,
      videoElementRef,
      galleryStageRef,
      isCssFullscreen,
      setIsCssFullscreen,
      isAnyFullscreen: isCssFullscreen || isNativeFullscreen,
      handleToggleGalleryFullscreen,
      setSelectedItemId,
      allServersFailed,
      playerRenderMode,
      setPlayerRenderMode,
      handleToggleVideoPlay,
      appliedInitialSeekRef,
      detailWatchTarget,
      syncVideoTextTracks: subtitles.syncVideoTextTracks,
      activeSubtitleIdx: subtitles.activeSubtitleIdx,
      setActiveSubtitleIdx: subtitles.setActiveSubtitleIdx,
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
      activeSubtitlesList: subtitles.activeSubtitlesList,
      activeIframeUrl: bridge.activeIframeUrl,
      gotTimeSinceLoadRef,
      confirmedPlayingSinceLoadRef,
      userPausedIframeRef,
      setIframeLoadStamp,
      seekUnsupportedToast,
      controlMode: bridge.controlMode,
      activeTrackCues: subtitles.activeTrackCues,
      subtitleOffsetSec: subtitles.subtitleOffsetSec,
      setSubtitleOffsetSec: subtitles.setSubtitleOffsetSec,
      handleUserSeek: bridge.handleUserSeek,
      handleUserTogglePlay: bridge.handleUserTogglePlay,
      handleToggleVideoMute,
      handleChangeVideoVolume,
      isSubtitleMenuOpen: subtitles.isSubtitleMenuOpen,
      setIsSubtitleMenuOpen: subtitles.setIsSubtitleMenuOpen,
      isLoadingSubtitles: subtitles.isLoadingSubtitles,
      loadingSubtitleIdx: subtitles.loadingSubtitleIdx,
      handleUploadLocalSubtitle: subtitles.handleUploadLocalSubtitle,
      handleRefreshSubtitlesForLanguages: subtitles.handleRefreshSubtitlesForLanguages,
    },
  };
}
