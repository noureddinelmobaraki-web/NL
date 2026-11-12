/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, type MutableRefObject } from "react";
import type HlsType from "hls.js";
import type {
  ExtractedSubtitleTrack,
  ExtractedVideoStream,
} from "../../../services/videoExtractor";
import type { PlaySource } from "../MovieSourcesModal";

export interface UseStreamExtractorOptions {
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
}

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
}: UseStreamExtractorOptions) {
  void detailItemStorageKey;
  void playAttemptStartedAtRef;
  void useDirectUrlFallback;
  void checkedExtractionKeyRef;
  void attemptTokenRef;
  void detailPlaySourcesRef;
  void setWorkerBridgeSubtitles;
  void extractedStreams;
  void activeExtractedIdx;
  void setExternalSubtitles;
  void externalSubtitlesRef;
  void setIsVideoMuted;
  void resolveServerIdForStream;

  const cleanupDirectVideoPlayer = useCallback(() => {
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
      } catch {
        // ignore
      }
      hlsInstanceRef.current = null;
    }
    const v = videoElementRef.current;
    if (v) {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        // ignore
      }
    }
  }, [hlsInstanceRef, videoElementRef]);

  useEffect(() => {
    if (!isWatchingInGallery || !activeGallerySource || allServersFailed) {
      return undefined;
    }

    const url = activeGallerySource.url || "";
    const isDirectMediaFile = /\.(ia\.mp4|mp4|webm|ogg)(\?|$)/i.test(url);

    if (isDirectMediaFile) {
      setExtractedStreams([
        {
          directUrl: url,
          proxiedUrl: url,
          type: "mp4",
          sourcePage: url,
          subtitles: [],
        },
      ]);
      setActiveExtractedIdx(0);
      setUseDirectUrlFallback(true);
      setPlayerRenderMode("direct");
      const v = videoElementRef.current;
      if (v && v.src !== url) {
        v.src = url;
        void v.play().catch(() => {});
      }
      const directTimer = window.setTimeout(() => {
        loadedCurrentAttemptRef.current = true;
        setIsPlayerLoading(false);
      }, 1500);
      return () => window.clearTimeout(directTimer);
    }

    // Keep interactive embed servers (VidLink, VidPlus, VidSrc, Videasy, 2Embed, Archive.org, YouTube)
    // mounted directly in iframe mode so the iframe never unmounts mid-load.
    if (playerRenderMode !== "iframe") {
      setPlayerRenderMode("iframe");
    }

    const safetyTimer = window.setTimeout(() => {
      loadedCurrentAttemptRef.current = true;
      setIsPlayerLoading(false);
    }, 2400);

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, [
    isWatchingInGallery,
    activeGallerySource,
    allServersFailed,
    selectedSeason,
    selectedEpisode,
    playerRenderMode,
    setPlayerRenderMode,
    setExtractedStreams,
    setActiveExtractedIdx,
    setUseDirectUrlFallback,
    videoElementRef,
    loadedCurrentAttemptRef,
    setIsPlayerLoading,
  ]);

  return {
    cleanupDirectVideoPlayer,
  };
}
