/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useCallback, type MutableRefObject } from "react";
import type HlsType from "hls.js";
import {
  fetchExtractedVideos,
  type ExtractedSubtitleTrack,
  type ExtractedVideoStream,
} from "../../../services/videoExtractor";
import {
  hlsTracksToSubtitleTracks,
  mergeStreamFirst,
} from "../../../features/cinema/subtitles/streamSubtitles";
import {
  recordServerFailure,
  recordServerSuccess,
} from "../../../services/serverSpeedMonitor";
import { clockNow } from "../../../features/cinema/player/playbackClock";
import type { PlaySource } from "../MovieSourcesModal";

export function useStreamExtractor({
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
}: {
  isWatchingInGallery: boolean;
  activeGallerySource: PlaySource | null;
  allServersFailed: boolean;
  detailItemStorageKey: string;
  selectedSeason: number;
  selectedEpisode: number;
  playAttemptStartedAtRef: MutableRefObject<number>;
  loadedCurrentAttemptRef: MutableRefObject<boolean>;
  setIsPlayerLoading: (v: boolean) => void;
  useDirectUrlFallback: boolean;
  setUseDirectUrlFallback: (v: boolean) => void;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  setPlayerRenderMode: React.Dispatch<
    React.SetStateAction<"extracting" | "direct" | "clean-embed" | "iframe">
  >;
  checkedExtractionKeyRef: MutableRefObject<string>;
  attemptTokenRef: MutableRefObject<number>;
  detailPlaySourcesRef: MutableRefObject<PlaySource[]>;
  setWorkerBridgeSubtitles: React.Dispatch<
    React.SetStateAction<ExtractedSubtitleTrack[]>
  >;
  extractedStreams: ExtractedVideoStream[];
  setExtractedStreams: React.Dispatch<
    React.SetStateAction<ExtractedVideoStream[]>
  >;
  activeExtractedIdx: number;
  setActiveExtractedIdx: (v: number) => void;
  hlsInstanceRef: MutableRefObject<HlsType | null>;
  videoElementRef: MutableRefObject<HTMLVideoElement | null>;
  setExternalSubtitles: React.Dispatch<
    React.SetStateAction<ExtractedSubtitleTrack[]>
  >;
  externalSubtitlesRef: MutableRefObject<ExtractedSubtitleTrack[]>;
  setIsVideoMuted: (v: boolean) => void;
  resolveServerIdForStream: (stream?: ExtractedVideoStream | null) => string;
}) {
  const cleanupDirectVideoPlayer = useCallback(() => {
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
      } catch {}
      hlsInstanceRef.current = null;
    }
    if (videoElementRef.current) {
      try {
        videoElementRef.current.pause();
        videoElementRef.current.removeAttribute("src");
        videoElementRef.current.load();
      } catch {}
    }
  }, [hlsInstanceRef, videoElementRef]);

  // Tier 1 Parallel Direct Stream Extraction (.m3u8 / .mp4) with Hot-Upgrade -> Never blocks mounting the iframe
  useEffect(() => {
    if (!isWatchingInGallery || !activeGallerySource || allServersFailed) {
      return undefined;
    }

    if (
      activeGallerySource.host === "archive.org" &&
      /\.mp4(\?|$)/i.test(activeGallerySource.url)
    ) {
      setExtractedStreams([
        {
          sourcePage: activeGallerySource.url,
          type: "mp4",
          directUrl: activeGallerySource.url,
          proxiedUrl: activeGallerySource.url,
          subtitles: [],
        },
      ]);
      setActiveExtractedIdx(0);
      setUseDirectUrlFallback(true);
      setIsPlayerLoading(false);
      setPlayerRenderMode("direct");
      return undefined;
    }

    if (
      activeGallerySource.host === "archive.org" &&
      activeGallerySource.url.includes("archive.org/embed/")
    ) {
      setExtractedStreams([]);
      setIsPlayerLoading(false);
      setPlayerRenderMode("iframe");
      return undefined;
    }

    const extractionSessionKey = `${detailItemStorageKey}_s${selectedSeason}_e${selectedEpisode}`;
    playAttemptStartedAtRef.current = performance.now();
    loadedCurrentAttemptRef.current = false;
    setIsPlayerLoading(true);
    setUseDirectUrlFallback(false);

    setPlayerRenderMode((prev) => (prev === "direct" ? "direct" : "iframe"));

    if (checkedExtractionKeyRef.current === extractionSessionKey) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const currentToken = ++attemptTokenRef.current;

    const orderedSources: PlaySource[] = [
      activeGallerySource,
      ...detailPlaySourcesRef.current.filter((s) => s.id !== activeGallerySource.id),
    ].filter((s): s is PlaySource => Boolean(s && s.url));
    const generatedTargetUrl = orderedSources.map((s) => s.url);

    async function loadAndHotUpgradeVideo() {
      checkedExtractionKeyRef.current = extractionSessionKey;
      if (generatedTargetUrl.length === 0) return;

      try {
        const videos = await fetchExtractedVideos(
          generatedTargetUrl,
          abortController.signal,
        ).catch(() => [] as ExtractedVideoStream[]);

        if (cancelled || attemptTokenRef.current !== currentToken) {
          return;
        }

        const companionSubs = videos.flatMap((v) => v.subtitles || []).map((s, i) => ({
          ...s,
          id: s.id || `worker:${i}:${s.lang}`,
          provider: s.provider || ("worker" as const),
          remoteUrl: s.proxiedUrl || s.url,
          loaded: false,
          label: s.label.includes("·") ? s.label : `${s.label} · Source`,
        }));
        if (companionSubs.length > 0) {
          setWorkerBridgeSubtitles((prev) => mergeStreamFirst(companionSubs, prev));
        }

        const directStreams = videos.filter(
          (v) => v.type === "hls" || v.type === "mp4",
        );

        if (directStreams.length === 0) {
          return;
        }

        const elapsedSinceStart = performance.now() - playAttemptStartedAtRef.current;
        if (elapsedSinceStart <= 12_000 && clockNow() < 60) {
          setExtractedStreams(directStreams);
          setActiveExtractedIdx(0);
          setUseDirectUrlFallback(false);
          playAttemptStartedAtRef.current = performance.now();
          setPlayerRenderMode("direct");
        }
      } catch {
        // Stay on active iframe smoothly
      }
    }

    void loadAndHotUpgradeVideo();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    activeGallerySource?.id,
    activeGallerySource?.url,
    allServersFailed,
    detailItemStorageKey,
    selectedSeason,
    selectedEpisode,
    playAttemptStartedAtRef,
    loadedCurrentAttemptRef,
    setIsPlayerLoading,
    setUseDirectUrlFallback,
    setPlayerRenderMode,
    checkedExtractionKeyRef,
    attemptTokenRef,
    detailPlaySourcesRef,
    setWorkerBridgeSubtitles,
    setExtractedStreams,
    setActiveExtractedIdx,
  ]);

  // Attach HLS.js (via dynamic import) or direct MP4 stream to <video> when playerRenderMode === "direct"
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      playerRenderMode !== "direct" ||
      extractedStreams.length === 0
    ) {
      cleanupDirectVideoPlayer();
      return undefined;
    }

    const selectedVideo =
      extractedStreams[activeExtractedIdx] || extractedStreams[0];
    if (!selectedVideo) return undefined;

    if (selectedVideo.type === "clean-embed") {
      cleanupDirectVideoPlayer();
      playAttemptStartedAtRef.current = performance.now();
      setPlayerRenderMode("clean-embed");
      return undefined;
    }

    const videoElement = videoElementRef.current;
    if (!videoElement) return undefined;

    cleanupDirectVideoPlayer();

    const streamUrlToPlay =
      useDirectUrlFallback && selectedVideo.directUrl
        ? selectedVideo.directUrl
        : selectedVideo.proxiedUrl || selectedVideo.directUrl;

    if (!streamUrlToPlay) {
      setPlayerRenderMode("iframe");
      return undefined;
    }

    let cancelled = false;

    const handleStreamErrorFallback = () => {
      if (cancelled) return;
      if (
        !useDirectUrlFallback &&
        selectedVideo.directUrl &&
        selectedVideo.directUrl !== selectedVideo.proxiedUrl
      ) {
        setUseDirectUrlFallback(true);
      } else if (activeExtractedIdx + 1 < extractedStreams.length) {
        recordServerFailure(resolveServerIdForStream(selectedVideo));
        const nextIdx = activeExtractedIdx + 1;
        const nextItem = extractedStreams[nextIdx];
        setUseDirectUrlFallback(false);
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setActiveExtractedIdx(nextIdx);
        if (nextItem?.type === "clean-embed") {
          cleanupDirectVideoPlayer();
          setPlayerRenderMode("clean-embed");
        }
      } else {
        recordServerFailure(resolveServerIdForStream(selectedVideo));
        cleanupDirectVideoPlayer();
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setPlayerRenderMode("iframe");
      }
    };

    const attemptImmediateVideoPlay = (targetVideo: HTMLVideoElement) => {
      try {
        const playPromise = targetVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            try {
              targetVideo.muted = true;
              setIsVideoMuted(true);
              void targetVideo.play().catch(() => {});
            } catch {}
          });
        }
      } catch {}
    };

    const playHlsStream = async (url: string) => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          backBufferLength: 30,
        });
        hlsInstanceRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.subtitleDisplay = false;
          hls.subtitleTrack = -1;
          const streamTracks = hlsTracksToSubtitleTracks(hls);
          if (streamTracks.length > 0) {
            setExternalSubtitles((prev) => {
              const next = mergeStreamFirst(streamTracks, prev);
              externalSubtitlesRef.current = next;
              return next;
            });
          }
          const elapsedMs = Math.max(
            120,
            performance.now() - playAttemptStartedAtRef.current,
          );
          recordServerSuccess(
            resolveServerIdForStream(selectedVideo),
            elapsedMs,
            detailItemStorageKey,
          );
          setIsPlayerLoading(false);
          const resumeSec = clockNow();
          if (resumeSec > 5) {
            try {
              videoElement.currentTime = resumeSec;
            } catch {}
          }
          attemptImmediateVideoPlay(videoElement);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                handleStreamErrorFallback();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                handleStreamErrorFallback();
                break;
            }
          }
        });
      } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        videoElement.src = url;
        attemptImmediateVideoPlay(videoElement);
      } else {
        handleStreamErrorFallback();
      }
    };

    const playDirectVideo = (url: string) => {
      videoElement.src = url;
      attemptImmediateVideoPlay(videoElement);
    };

    if (
      selectedVideo.type === "hls" ||
      streamUrlToPlay.toLowerCase().includes(".m3u8")
    ) {
      void playHlsStream(streamUrlToPlay);
    } else {
      playDirectVideo(streamUrlToPlay);
    }

    return () => {
      cancelled = true;
      cleanupDirectVideoPlayer();
    };
  }, [
    isWatchingInGallery,
    playerRenderMode,
    extractedStreams,
    activeExtractedIdx,
    useDirectUrlFallback,
    cleanupDirectVideoPlayer,
    resolveServerIdForStream,
    detailItemStorageKey,
    playAttemptStartedAtRef,
    setPlayerRenderMode,
    videoElementRef,
    setIsPlayerLoading,
    setActiveExtractedIdx,
    setUseDirectUrlFallback,
    setIsVideoMuted,
    hlsInstanceRef,
    setExternalSubtitles,
    externalSubtitlesRef,
  ]);

  return { cleanupDirectVideoPlayer };
}
