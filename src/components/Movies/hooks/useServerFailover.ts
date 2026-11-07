/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, type MutableRefObject } from "react";
import {
  buildSpeedSortedQueue,
  probeAllServersSpeed,
  recordServerFailure,
} from "../../../services/serverSpeedMonitor";
import { clockAnchor } from "../../../features/cinema/player/playbackClock";
import type { PlaySource } from "../MovieSourcesModal";
import type { ExtractedVideoStream } from "../../../services/videoExtractor";
import type { CastMember, CinemaItem } from "../moviesDataClient";

export function useServerFailover({
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
}: {
  detailPlaySources: PlaySource[];
  detailPlaySourcesRef: MutableRefObject<PlaySource[]>;
  detailItemStorageKey: string;
  resumeStartAtSec: number | undefined;
  detailedItem: CinemaItem | null;
  cleanupDirectVideoPlayer: () => void;
  setEmbedSeekStartAtSec: (v: number | null) => void;
  appliedInitialSeekRef: MutableRefObject<boolean>;
  checkedExtractionKeyRef: MutableRefObject<string>;
  failoverQueueRef: MutableRefObject<number[]>;
  failoverStepRef: MutableRefObject<number>;
  attemptTokenRef: MutableRefObject<number>;
  playAttemptStartedAtRef: MutableRefObject<number>;
  loadedCurrentAttemptRef: MutableRefObject<boolean>;
  gotTimeSinceLoadRef: MutableRefObject<boolean>;
  confirmedPlayingSinceLoadRef: MutableRefObject<boolean>;
  userPausedIframeRef: MutableRefObject<boolean>;
  setAllServersFailed: (v: boolean) => void;
  setIsPlayerLoading: (v: boolean) => void;
  activeGalleryServerIdx: number;
  setActiveGalleryServerIdx: (v: number) => void;
  setSelectedActor: (v: CastMember | null) => void;
  setShowHeroTrailer: (v: boolean) => void;
  setIsSubtitleMenuOpen: (v: boolean) => void;
  isWatchingInGallery: boolean;
  setIsWatchingInGallery: (v: boolean) => void;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  setPlayerRenderMode: React.Dispatch<
    React.SetStateAction<"extracting" | "direct" | "clean-embed" | "iframe">
  >;
  activeGallerySource: PlaySource | null;
  allServersFailed: boolean;
  activeExtractedIdx: number;
  setActiveExtractedIdx: (v: number) => void;
  extractedStreams: ExtractedVideoStream[];
  resolveServerIdForStream: (stream?: ExtractedVideoStream | null) => string;
}) {
  const startGalleryWatchSession = useCallback(
    (explicitServerIdx?: number) => {
      const speedOrdered = buildSpeedSortedQueue(
        detailPlaySources,
        detailItemStorageKey,
      );
      let ordered = speedOrdered.length > 0 ? speedOrdered : [0, 1, 2, 3, 4];

      if (typeof explicitServerIdx === "number" && explicitServerIdx >= 0) {
        const total = detailPlaySources.length || 5;
        const startIdx = explicitServerIdx % Math.max(1, total);
        ordered = [startIdx, ...ordered.filter((i) => i !== startIdx)];
      } else if (detailPlaySources.length > 0) {
        void probeAllServersSpeed(detailPlaySources, detailItemStorageKey).then(() => {
          const updatedQueue = buildSpeedSortedQueue(
            detailPlaySourcesRef.current,
            detailItemStorageKey,
          );
          if (updatedQueue.length > 0 && failoverStepRef.current === 0) {
            failoverQueueRef.current = updatedQueue;
          }
        });
      }

      const firstIdx = ordered[0] ?? 0;
      const targetSource = detailPlaySources[firstIdx] || detailPlaySources[0];
      const initialAnchorSec = targetSource?.capabilities?.startAt
        ? (resumeStartAtSec ?? 0)
        : 0;

      cleanupDirectVideoPlayer();
      clockAnchor(initialAnchorSec, {
        duration: (detailedItem?.runtime ?? 0) * 60,
        source: "manual",
        durationIsEstimated: true,
      });
      setEmbedSeekStartAtSec(null);
      appliedInitialSeekRef.current = false;
      checkedExtractionKeyRef.current = "";
      failoverQueueRef.current = ordered;
      failoverStepRef.current = 0;
      attemptTokenRef.current += 1;
      playAttemptStartedAtRef.current = performance.now();
      loadedCurrentAttemptRef.current = false;
      gotTimeSinceLoadRef.current = false;
      confirmedPlayingSinceLoadRef.current = false;
      userPausedIframeRef.current = false;
      setAllServersFailed(false);
      setIsPlayerLoading(true);
      setActiveGalleryServerIdx(firstIdx);
      setSelectedActor(null);
      setShowHeroTrailer(false);
      setIsSubtitleMenuOpen(false);
      setIsWatchingInGallery(true);
    },
    [
      detailPlaySources,
      detailPlaySourcesRef,
      detailItemStorageKey,
      cleanupDirectVideoPlayer,
      resumeStartAtSec,
      detailedItem?.runtime,
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
      setActiveGalleryServerIdx,
      setSelectedActor,
      setShowHeroTrailer,
      setIsSubtitleMenuOpen,
      setIsWatchingInGallery,
    ],
  );

  const advanceFailoverServer = useCallback(
    (reason: string) => {
      const currentSrc = detailPlaySources[activeGalleryServerIdx];
      if (currentSrc) {
        recordServerFailure(currentSrc.id);
      }

      const queue = failoverQueueRef.current;
      const nextStep = failoverStepRef.current + 1;
      if (!queue.length || nextStep >= queue.length) {
        setIsPlayerLoading(false);
        setAllServersFailed(true);
        console.warn(`[CinemaPlayer] All servers exhausted (${reason}).`);
        return;
      }

      const nextServerIdx = queue[nextStep];
      const nextSource = detailPlaySources[nextServerIdx];
      const nextAnchorSec = nextSource?.capabilities?.startAt
        ? (resumeStartAtSec ?? 0)
        : 0;

      clockAnchor(nextAnchorSec, {
        duration: (detailedItem?.runtime ?? 0) * 60,
        source: "manual",
        durationIsEstimated: true,
      });
      failoverStepRef.current = nextStep;
      attemptTokenRef.current += 1;
      playAttemptStartedAtRef.current = performance.now();
      loadedCurrentAttemptRef.current = false;
      gotTimeSinceLoadRef.current = false;
      confirmedPlayingSinceLoadRef.current = false;
      userPausedIframeRef.current = false;
      setIsPlayerLoading(true);
      setActiveGalleryServerIdx(nextServerIdx);
    },
    [
      detailPlaySources,
      activeGalleryServerIdx,
      resumeStartAtSec,
      detailedItem?.runtime,
      failoverQueueRef,
      failoverStepRef,
      attemptTokenRef,
      playAttemptStartedAtRef,
      loadedCurrentAttemptRef,
      gotTimeSinceLoadRef,
      confirmedPlayingSinceLoadRef,
      userPausedIframeRef,
      setIsPlayerLoading,
      setAllServersFailed,
      setActiveGalleryServerIdx,
    ],
  );

  // Monitor active iframe / clean-embed for CSP violations or stalled server timeouts
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      !activeGallerySource ||
      allServersFailed
    ) {
      return undefined;
    }

    const advanceFromCleanEmbedOrIframe = (reason: string) => {
      if (
        playerRenderMode === "clean-embed" &&
        activeExtractedIdx + 1 < extractedStreams.length
      ) {
        const currentStream = extractedStreams[activeExtractedIdx];
        recordServerFailure(resolveServerIdForStream(currentStream));
        const nextIdx = activeExtractedIdx + 1;
        const nextItem = extractedStreams[nextIdx];
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setActiveExtractedIdx(nextIdx);
        setPlayerRenderMode(
          nextItem?.type === "clean-embed" ? "clean-embed" : "direct",
        );
        return;
      }
      if (playerRenderMode === "clean-embed") {
        const currentStream = extractedStreams[activeExtractedIdx];
        recordServerFailure(resolveServerIdForStream(currentStream));
        playAttemptStartedAtRef.current = performance.now();
        setIsPlayerLoading(true);
        setPlayerRenderMode("iframe");
        return;
      }
      advanceFailoverServer(reason);
    };

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      const directive = String(e.effectiveDirective || e.violatedDirective || "");
      if (!directive.startsWith("frame-src") && !directive.startsWith("child-src")) {
        return;
      }
      const blocked = String(e.blockedURI || "");
      const matchesCurrent =
        blocked.includes(activeGallerySource.host) ||
        blocked.includes("2vcdn.skin") ||
        (activeGallerySource.origins || []).some((orig) => blocked.startsWith(orig));

      if (matchesCurrent) {
        advanceFromCleanEmbedOrIframe("csp-violation");
      }
    };
    document.addEventListener("securitypolicyviolation", onCspViolation);

    const timeoutMs = Math.max(8500, activeGallerySource.timeoutMs || 11000);
    const watchdog = setTimeout(() => {
      if (!loadedCurrentAttemptRef.current) {
        advanceFromCleanEmbedOrIframe("timeout");
      }
    }, timeoutMs);

    return () => {
      clearTimeout(watchdog);
      document.removeEventListener("securitypolicyviolation", onCspViolation);
    };
  }, [
    isWatchingInGallery,
    playerRenderMode,
    activeGallerySource,
    allServersFailed,
    activeExtractedIdx,
    extractedStreams,
    resolveServerIdForStream,
    advanceFailoverServer,
    playAttemptStartedAtRef,
    loadedCurrentAttemptRef,
    setIsPlayerLoading,
    setActiveExtractedIdx,
    setPlayerRenderMode,
  ]);

  return {
    startGalleryWatchSession,
    advanceFailoverServer,
  };
}
