/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, type MutableRefObject } from "react";
import type { ExtractedVideoStream } from "../../../services/videoExtractor";
import {
  bindVideoElementToClock,
  clockReset,
} from "../../../features/cinema/player/playbackClock";
import { tmdbLang } from "../../../utils/lang";
import {
  TMDB_BASE_URL,
  fetchWithCache,
  type CastMember,
  type CinemaItem,
  type Media,
} from "../moviesDataClient";

export interface UseGalleryPlayerControlsOptions {
  isWatchingInGallery: boolean;
  setIsWatchingInGallery: (v: boolean) => void;
  showHeroTrailer: boolean;
  setShowHeroTrailer: (v: boolean) => void;
  setTrailerFallbackToYoutube: (v: boolean) => void;
  setResolvedTrailer: (v: null) => void;
  setImdbTrailerLoaded: (v: boolean) => void;
  cleanupDirectVideoPlayer: () => void;
  clearExternalSubtitleBlobs: () => void;
  playerIframeRef: MutableRefObject<HTMLIFrameElement | null>;
  videoElementRef: MutableRefObject<HTMLVideoElement | null>;
  galleryStageRef: MutableRefObject<HTMLDivElement | null>;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  setPlayerRenderMode: (v: "extracting" | "direct" | "clean-embed" | "iframe") => void;
  extractedStreams: ExtractedVideoStream[];
  setExtractedStreams: (v: ExtractedVideoStream[]) => void;
  activeExtractedIdx: number;
  setActiveExtractedIdx: (v: number) => void;
  isCssFullscreen: boolean;
  setIsCssFullscreen: (v: boolean | ((prev: boolean) => boolean)) => void;
  isNativeFullscreen: boolean;
  setIsNativeFullscreen: (v: boolean) => void;
  isSubtitleMenuOpen: boolean;
  setIsSubtitleMenuOpen: (v: boolean) => void;
  isVideoPaused: boolean;
  setIsControlsVisible: (v: boolean) => void;
  controlsHideTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  selectedItemId: number | null;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  deepLinkSeRef: MutableRefObject<{ itemId: number; s?: number; e?: number } | null>;
  selectedSeason: number;
  setSelectedSeason: (v: number) => void;
  setSelectedEpisode: (v: number) => void;
  checkedExtractionKeyRef: MutableRefObject<string>;
  setAllServersFailed: (v: boolean) => void;
  setUseDirectUrlFallback: (v: boolean) => void;
  setIsPlayerLoading: (v: boolean) => void;
  setVideoVolume: (v: number) => void;
  setIsVideoMuted: (v: boolean) => void;
  setEmbedSeekStartAtSec: (v: number | null) => void;
  appliedInitialSeekRef: MutableRefObject<boolean>;
  attemptTokenRef: MutableRefObject<number>;
  autoStartWatchRef: MutableRefObject<boolean>;
  setSubtitleOffsetSec: (v: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setActiveTrackCues: (v: any[]) => void;
  setLoadingSubtitleIdx: (v: number | null) => void;
  setActiveGalleryServerIdx: (v: number) => void;
  setIsFullSeasonEmbed: (v: boolean) => void;
  setSeasonEpisodes: (v: Array<{ episode_number: number; name: string }>) => void;
  setLoadingSeasonEpisodes: (v: boolean) => void;
  setDetailServersOpen: (v: boolean) => void;
  selectedActor: CastMember | null;
  setSelectedActor: (v: CastMember | null) => void;
  persistCurrentProgress: () => void;
  detailedItem: CinemaItem | null;
  tmdbKey: string;
  currentLang: string;
}

export function useGalleryPlayerControls({
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
}: UseGalleryPlayerControlsOptions) {
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
  }, [
    isWatchingInGallery,
    showHeroTrailer,
    cleanupDirectVideoPlayer,
    clearExternalSubtitleBlobs,
    playerIframeRef,
  ]);

  useEffect(() => {
    const v = videoElementRef.current;
    if (!isWatchingInGallery || playerRenderMode !== "direct" || !v) return undefined;
    return bindVideoElementToClock(v);
  }, [
    isWatchingInGallery,
    playerRenderMode,
    extractedStreams,
    activeExtractedIdx,
    videoElementRef,
  ]);

  useEffect(() => {
    const onFsChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [setIsNativeFullscreen]);

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
  }, [
    isWatchingInGallery,
    isSubtitleMenuOpen,
    playerRenderMode,
    isVideoPaused,
    setIsControlsVisible,
    controlsHideTimerRef,
  ]);

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
  }, [
    isWatchingInGallery,
    isSubtitleMenuOpen,
    playerRenderMode,
    isVideoPaused,
    bumpControlsVisibility,
    setIsControlsVisible,
    controlsHideTimerRef,
  ]);

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
  }, [playerRenderMode, bumpControlsVisibility, videoElementRef]);

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
  }, [
    selectedItemId,
    setSelectedItemId,
    deepLinkSeRef,
    setSelectedSeason,
    setSelectedEpisode,
    checkedExtractionKeyRef,
    setAllServersFailed,
    setShowHeroTrailer,
    setUseDirectUrlFallback,
    setExtractedStreams,
    setActiveExtractedIdx,
    setIsWatchingInGallery,
    setIsPlayerLoading,
    setPlayerRenderMode,
  ]);

  const handleToggleVideoMute = useCallback(() => {
    const video = videoElementRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsVideoMuted(video.muted);
    bumpControlsVisibility();
  }, [bumpControlsVisibility, videoElementRef, setIsVideoMuted]);

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
    [bumpControlsVisibility, videoElementRef, setVideoVolume, setIsVideoMuted],
  );

  const handleToggleGalleryFullscreen = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = galleryStageRef.current as any;
    if (!el) return;

    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [isCssFullscreen, setIsCssFullscreen, galleryStageRef]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [
    detailedItem,
    selectedSeason,
    tmdbKey,
    currentLang,
    setSeasonEpisodes,
    setLoadingSeasonEpisodes,
  ]);

  return {
    isAnyFullscreen,
    bumpControlsVisibility,
    handleToggleVideoPlay,
    handleToggleVideoMute,
    handleChangeVideoVolume,
    handleToggleGalleryFullscreen,
  };
}

export type UseGalleryPlayerControlsResult = ReturnType<typeof useGalleryPlayerControls>;
