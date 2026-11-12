/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef, useMemo, useCallback, type MutableRefObject } from "react";
import {
  WORKER_ENDPOINT,
  buildWorkerProxyUrl,
  guessLangFromLabelOrUrl,
  type ExtractedSubtitleTrack,
  type ExtractedVideoStream,
} from "../../../services/videoExtractor";
import { mergeStreamFirst } from "../../../features/cinema/subtitles/streamSubtitles";
import { recordServerSuccess } from "../../../services/serverSpeedMonitor";
import {
  ALL_SERVER_FRAME_ORIGINS,
  toWorkerEmbedUrl,
  type CinemaServerConfig,
} from "../../../config/servers";
import {
  clockAnchor,
  clockGetState,
  clockNow,
  clockReport,
  clockReportedNow,
  clockSync,
} from "../../../features/cinema/player/playbackClock";
import {
  sendIframePlayerCommand,
  useIframePlayerBridge,
} from "../../../features/cinema/player/iframeBridge";
import {
  createSyncController,
  type SyncController,
} from "../../../features/cinema/player/syncController";
import type { PlayerControlMode } from "../../../features/cinema/player/CinemaTimeline";
import { saveProgress } from "../../../features/cinema/progress/progressStore";
import type { PlaySource } from "../MovieSourcesModal";
import type { CinemaItem } from "../moviesDataClient";

export function usePlayerBridgeSync({
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
}: {
  isWatchingInGallery: boolean;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  setPlayerRenderMode: React.Dispatch<
    React.SetStateAction<"extracting" | "direct" | "clean-embed" | "iframe">
  >;
  activeGallerySource: PlaySource | null;
  extractedStreams: ExtractedVideoStream[];
  setExtractedStreams: React.Dispatch<
    React.SetStateAction<ExtractedVideoStream[]>
  >;
  activeExtractedIdx: number;
  setActiveExtractedIdx: (v: number) => void;
  setUseDirectUrlFallback: (v: boolean) => void;
  embedSeekStartAtSec: number | null;
  setEmbedSeekStartAtSec: (v: number | null) => void;
  workerBridgeRevision: number;
  setWorkerBridgeRevision: React.Dispatch<React.SetStateAction<number>>;
  detailedItem: CinemaItem | null;
  selectedSeason: number;
  selectedEpisode: number;
  detailItemStorageKey: string;
  playerIframeRef: MutableRefObject<HTMLIFrameElement | null>;
  playAttemptStartedAtRef: MutableRefObject<number>;
  gotTimeSinceLoadRef: MutableRefObject<boolean>;
  confirmedPlayingSinceLoadRef: MutableRefObject<boolean>;
  userPausedIframeRef: MutableRefObject<boolean>;
  iframeLoadStamp: number;
  setWorkerBridgeSubtitles: React.Dispatch<
    React.SetStateAction<ExtractedSubtitleTrack[]>
  >;
  showSeekUnsupportedToast: () => void;
}) {
  const activeIframeUrlBase = useMemo(() => {
    if (!activeGallerySource) return "";
    return playerRenderMode === "clean-embed"
      ? (extractedStreams[activeExtractedIdx] || extractedStreams[0])?.directUrl ||
          activeGallerySource.url
      : activeGallerySource.url;
  }, [activeGallerySource, playerRenderMode, extractedStreams, activeExtractedIdx]);

  const prevWatchingInGalleryRef = useRef(false);
  useEffect(() => {
    const wasWatching = prevWatchingInGalleryRef.current;
    prevWatchingInGalleryRef.current = isWatchingInGallery;
    if (!wasWatching && isWatchingInGallery) {
      try {
        const now = Date.now();
        const TTL_MS = 30 * 60 * 1000;
        const staleKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("nl_wb_fail_")) {
            const raw = sessionStorage.getItem(k);
            const ts = raw ? Number(raw) : NaN;
            if (raw === "1" || !Number.isFinite(ts) || now - ts > TTL_MS) {
              staleKeys.push(k);
            }
          }
        }
        staleKeys.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // ignore storage errors
      }
    }
  }, [isWatchingInGallery]);

  const activeIframeUrl = useMemo(() => {
    if (!activeGallerySource || !activeIframeUrlBase) return "";
    let rawUrl = activeIframeUrlBase;
    if (!(rawUrl.includes("&") && !rawUrl.includes("?"))) {
      try {
        const u = new URL(rawUrl);
        if (!u.searchParams.has("autoplay")) {
          u.searchParams.set("autoplay", "1");
        }
        if (
          embedSeekStartAtSec !== null &&
          embedSeekStartAtSec > 0 &&
          playerRenderMode === "iframe" &&
          activeGallerySource.capabilities?.startAt
        ) {
          u.searchParams.set("startAt", String(Math.floor(embedSeekStartAtSec)));
        }
        rawUrl = u.toString();
      } catch {
        // keep rawUrl
      }
    }
    const srvCaps = activeGallerySource.capabilities as CinemaServerConfig["capabilities"];
    if (
      playerRenderMode === "iframe" &&
      srvCaps?.workerBridge === true &&
      typeof window !== "undefined"
    ) {
      let wbFailed = false;
      try {
        const failKey = `nl_wb_fail_${activeGallerySource.id}`;
        const rawFail = sessionStorage.getItem(failKey);
        if (rawFail !== null) {
          const ts = Number(rawFail);
          if (rawFail === "1" || !Number.isFinite(ts) || Date.now() - ts > 30 * 60 * 1000) {
            sessionStorage.removeItem(failKey);
            wbFailed = false;
          } else {
            wbFailed = true;
          }
        }
      } catch {
        wbFailed = false;
      }
      if (!wbFailed) {
        return toWorkerEmbedUrl(rawUrl, WORKER_ENDPOINT, window.location.origin);
      }
    }
    return rawUrl;
  }, [
    activeGallerySource,
    activeIframeUrlBase,
    playerRenderMode,
    embedSeekStartAtSec,
    workerBridgeRevision,
  ]);

  const persistCurrentProgress = useCallback(() => {
    if (!detailedItem || !isWatchingInGallery) return;
    const st = clockGetState();
    if (st.source !== "video" && st.source !== "bridge") return;
    const curTime = st.source === "bridge" ? clockReportedNow() : clockNow();
    if (curTime === null) return;
    const durationSec =
      st.duration > 0
        ? st.duration
        : detailedItem.runtime && detailedItem.runtime > 0
          ? detailedItem.runtime * 60
          : 0;
    if (durationSec <= 0 || curTime <= 5) return;
    saveProgress({
      id: detailedItem.id,
      mediaType: detailedItem.mediaType,
      title: detailedItem.title,
      posterPath: detailedItem.posterPath,
      backdropPath: detailedItem.backdropPath,
      season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
      episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      time: curTime,
      duration: durationSec,
    });
  }, [detailedItem, isWatchingInGallery, selectedSeason, selectedEpisode]);

  const syncControllerRef = useRef<SyncController | null>(null);
  const canReloadStartAt = Boolean(
    playerRenderMode === "iframe" && activeGallerySource?.capabilities?.startAt,
  );

  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed")
    ) {
      syncControllerRef.current?.dispose();
      syncControllerRef.current = null;
      return undefined;
    }

    const ctrl = createSyncController({
      now: () => performance.now(),
      sendSeek: (target, id) => {
        sendIframePlayerCommand(
          playerIframeRef.current,
          { type: "seek", time: target },
          id,
        );
      },
      sendPlay: () => {
        sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
      },
      sendPause: () => {
        sendIframePlayerCommand(playerIframeRef.current, { type: "pause" });
      },
      reloadAt: canReloadStartAt
        ? (target) => {
            const rounded = Math.max(0, Math.floor(target));
            const cur = clockGetState();
            clockAnchor(rounded, {
              duration: cur.duration || (detailedItem?.runtime ?? 0) * 60,
              source: "manual",
              durationIsEstimated: cur.durationIsEstimated,
            });
            setEmbedSeekStartAtSec(rounded);
          }
        : undefined,
      onSeekUnsupported: () => {
        showSeekUnsupportedToast();
      },
    });
    syncControllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      if (syncControllerRef.current === ctrl) {
        syncControllerRef.current = null;
      }
    };
  }, [
    isWatchingInGallery,
    activeIframeUrlBase,
    playerRenderMode,
    canReloadStartAt,
    showSeekUnsupportedToast,
    playerIframeRef,
    detailedItem?.runtime,
    setEmbedSeekStartAtSec,
  ]);

  const bridgeAllowedOrigins = useMemo(() => {
    const set = new Set<string>(ALL_SERVER_FRAME_ORIGINS);
    set.add("https://vidlink.pro");
    set.add("https://player.vidlink.pro");
    set.add("https://cloud.vidlink.pro");
    set.add("https://*.vidlink.pro");
    if (activeIframeUrl) {
      try {
        set.add(new URL(activeIframeUrl).origin);
      } catch {
        // ignore invalid URL
      }
    }
    if (WORKER_ENDPOINT) {
      try {
        set.add(new URL(WORKER_ENDPOINT).origin);
      } catch {
        // ignore invalid URL
      }
    }
    return Array.from(set);
  }, [activeIframeUrl]);

  const bridge = useIframePlayerBridge({
    enabled:
      isWatchingInGallery &&
      (playerRenderMode === "iframe" || playerRenderMode === "clean-embed"),
    iframeRef: playerIframeRef,
    allowedOrigins: bridgeAllowedOrigins,
    sessionKey: `${activeGallerySource?.id ?? ""}:${activeIframeUrl}`,
    onReady: () => {
      if (!userPausedIframeRef.current && !confirmedPlayingSinceLoadRef.current) {
        sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
        setTimeout(() => {
          if (!userPausedIframeRef.current && !confirmedPlayingSinceLoadRef.current) {
            sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
          }
        }, 240);
      }
    },
    onEvent: (ev) => {
      if (typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime)) {
        if (!gotTimeSinceLoadRef.current) {
          gotTimeSinceLoadRef.current = true;
          if (activeGallerySource) {
            const syncElapsedMs = Math.max(
              150,
              performance.now() - playAttemptStartedAtRef.current,
            );
            recordServerSuccess(
              activeGallerySource.id,
              syncElapsedMs,
              detailItemStorageKey,
            );
          }
        }
        if (ev.currentTime > 0.25 && ev.paused === false) {
          confirmedPlayingSinceLoadRef.current = true;
        } else if (
          ev.currentTime < 0.5 &&
          (ev.paused === true || ev.kind === "pause") &&
          !confirmedPlayingSinceLoadRef.current &&
          !userPausedIframeRef.current
        ) {
          sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
        }
      } else if (ev.kind === "play") {
        confirmedPlayingSinceLoadRef.current = true;
      }
      const decision = syncControllerRef.current
        ? syncControllerRef.current.onReport(ev)
        : "accept";
      if (decision === "ignore") return;
      if (ev.currentTime !== undefined) {
        const paused =
          ev.paused !== undefined
            ? ev.paused
            : ev.kind === "pause" || ev.kind === "ended"
              ? true
              : ev.kind === "play" || ev.kind === "timeupdate" || ev.kind === "media"
                ? false
                : undefined;
        clockReport(
          ev.currentTime,
          {
            duration: ev.duration,
            paused,
            rate: ev.rate,
            source: "bridge",
          },
          ev.kind === "timeupdate" ? 0.35 : 0,
        );
      } else if (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended") {
        clockSync({ paused: ev.kind !== "play", source: "bridge" });
      }
    },
    onMediaData: () => {
      persistCurrentProgress();
    },
    onSubtitlesDiscovered: (discovered) => {
      setWorkerBridgeSubtitles((prev) => {
        const added: ExtractedSubtitleTrack[] = discovered
          .filter((d) => Boolean(d.url))
          .map((item, idx) => {
            const guessed = guessLangFromLabelOrUrl(item.label || item.lang || "", item.url);
            const proxied = buildWorkerProxyUrl(
              item.url,
              item.referer || activeGallerySource?.url,
            );
            return {
              id: `worker:live:${idx}:${guessed.lang}:${item.url}`,
              provider: "worker",
              url: item.url,
              proxiedUrl: proxied,
              remoteUrl: proxied,
              lang: guessed.lang,
              label: `${guessed.label} · Source`,
              loaded: false,
            };
          });
        return added.length > 0 ? mergeStreamFirst(added, prev) : prev;
      });
    },
    onStreamDiscovered: (discovered) => {
      if (!discovered?.streamUrl) return;
      const elapsedSinceStart = performance.now() - playAttemptStartedAtRef.current;
      if (elapsedSinceStart <= 12_000 && clockNow() < 60 && playerRenderMode !== "direct") {
        const proxied = buildWorkerProxyUrl(
          discovered.streamUrl,
          discovered.referer || activeGallerySource?.url,
        );
        const newStream: ExtractedVideoStream = {
          directUrl: discovered.streamUrl,
          proxiedUrl: proxied,
          type: discovered.streamType === "mp4" ? "mp4" : "hls",
          sourcePage: activeGallerySource?.url || "",
          subtitles: [],
        };
        setExtractedStreams((prev) => [newStream, ...prev]);
        setActiveExtractedIdx(0);
        setUseDirectUrlFallback(false);
        playAttemptStartedAtRef.current = performance.now();
        setPlayerRenderMode("direct");
      }
    },
  });

  const controlMode: PlayerControlMode =
    playerRenderMode === "direct"
      ? "direct"
      : bridge.active
        ? "bridged"
        : "none";

  // Automated multi-protocol postMessage play burst on iframe mount & load until playback advances
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      !activeIframeUrl
    ) {
      return undefined;
    }
    const delays = [60, 250, 600, 1200, 2200, 3500, 5000];
    const timers = delays.map((ms) =>
      setTimeout(() => {
        if (
          !confirmedPlayingSinceLoadRef.current &&
          !userPausedIframeRef.current &&
          playerIframeRef.current
        ) {
          sendIframePlayerCommand(playerIframeRef.current, { type: "play" });
        }
      }, ms),
    );
    return () => {
      timers.forEach((tId) => clearTimeout(tId));
    };
  }, [
    isWatchingInGallery,
    playerRenderMode,
    activeIframeUrl,
    iframeLoadStamp,
    confirmedPlayingSinceLoadRef,
    userPausedIframeRef,
    playerIframeRef,
  ]);

  // 8000ms post-load watchdog: fallback from Worker /embed to raw URL if no sync-capable event was received
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      (playerRenderMode !== "iframe" && playerRenderMode !== "clean-embed") ||
      iframeLoadStamp === 0
    ) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const srvCaps = activeGallerySource?.capabilities as
        | CinemaServerConfig["capabilities"]
        | undefined;
      if (
        playerRenderMode === "iframe" &&
        srvCaps?.workerBridge &&
        activeGallerySource &&
        !gotTimeSinceLoadRef.current
      ) {
        let alreadyFailed = false;
        try {
          const failKey = `nl_wb_fail_${activeGallerySource.id}`;
          const raw = sessionStorage.getItem(failKey);
          const ts = raw ? Number(raw) : NaN;
          alreadyFailed =
            raw !== null &&
            raw !== "1" &&
            Number.isFinite(ts) &&
            Date.now() - ts <= 30 * 60 * 1000;
          if (!alreadyFailed) {
            sessionStorage.setItem(failKey, String(Date.now()));
          }
        } catch {
          // ignore storage errors
        }
        if (!alreadyFailed) {
          setWorkerBridgeRevision((r) => r + 1);
          return;
        }
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [
    isWatchingInGallery,
    playerRenderMode,
    iframeLoadStamp,
    activeGallerySource,
    gotTimeSinceLoadRef,
    setWorkerBridgeRevision,
  ]);

  const handleUserSeek = useCallback((targetSec: number) => {
    syncControllerRef.current?.userSeek(targetSec);
  }, []);

  const handleUserTogglePlay = useCallback(() => {
    const st = clockGetState();
    userPausedIframeRef.current = !st.paused;
    syncControllerRef.current?.userTogglePlay();
  }, [userPausedIframeRef]);

  useEffect(() => {
    if (!isWatchingInGallery || !detailedItem) return undefined;
    const interval = setInterval(() => {
      persistCurrentProgress();
    }, 10_000);
    return () => clearInterval(interval);
  }, [isWatchingInGallery, detailedItem, persistCurrentProgress]);

  return {
    activeIframeUrl,
    persistCurrentProgress,
    controlMode,
    handleUserSeek,
    handleUserTogglePlay,
  };
}
