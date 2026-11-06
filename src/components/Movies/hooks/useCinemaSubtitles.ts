import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendIframePlayerCommand } from "../../../features/cinema/player/iframeBridge";
import type { ClockState } from "../../../features/cinema/player/playbackClock";
import {
  autoRetimeCues,
  mergeStreamFirst,
} from "../../../features/cinema/subtitles/streamSubtitles";
import {
  createLocalSubtitleTrack,
  ensureTrackLoaded,
  fetchExternalSubtitles,
  revokeSubtitleBlobUrls,
} from "../../../services/subtitleService";
import type {
  ExtractedSubtitleTrack,
  ExtractedVideoStream,
  SubtitleCue,
} from "../../../services/videoExtractor";
import type { CinemaItem } from "../moviesDataClient";

export interface UseCinemaSubtitlesArgs {
  isWatchingInGallery: boolean;
  detailedItem: CinemaItem | null;
  activeImdbId: string;
  selectedSeason: number;
  selectedEpisode: number;
  extractedStreams: ExtractedVideoStream[];
  setExtractedStreams: React.Dispatch<React.SetStateAction<ExtractedVideoStream[]>>;
  activeExtractedIdx: number;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  playerIframeRef: React.RefObject<HTMLIFrameElement | null>;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  attemptTokenRef: React.MutableRefObject<number>;
  clockState: ClockState;
}

export function useCinemaSubtitles({
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
}: UseCinemaSubtitlesArgs) {
  const [externalSubtitles, setExternalSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const externalSubtitlesRef = useRef<ExtractedSubtitleTrack[]>([]);
  const [workerBridgeSubtitles, setWorkerBridgeSubtitles] = useState<ExtractedSubtitleTrack[]>([]);
  const retimedTrackIdsRef = useRef<Set<string>>(new Set());
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [loadingSubtitleIdx, setLoadingSubtitleIdx] = useState<number | null>(null);
  const [subtitleOffsetSec, setSubtitleOffsetSec] = useState(0);
  const [activeTrackCues, setActiveTrackCues] = useState<SubtitleCue[]>([]);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState<number | null>(0);
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);

  const clearExternalSubtitleBlobs = useCallback(() => {
    if (externalSubtitlesRef.current.length > 0) {
      revokeSubtitleBlobUrls(externalSubtitlesRef.current);
      externalSubtitlesRef.current = [];
    }
    setExternalSubtitles([]);
    setWorkerBridgeSubtitles([]);
    retimedTrackIdsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      if (externalSubtitlesRef.current.length > 0) {
        revokeSubtitleBlobUrls(externalSubtitlesRef.current);
        externalSubtitlesRef.current = [];
      }
    };
  }, []);

  // Background External Subtitles Loader (Decoupled so subtitle APIs NEVER block video/iframe startup)
  useEffect(() => {
    if (!isWatchingInGallery || !detailedItem) {
      return undefined;
    }
    let cancelled = false;
    const abortController = new AbortController();
    setIsLoadingSubtitles(true);

    void fetchExternalSubtitles({
      tmdbId: detailedItem.id,
      imdbId: activeImdbId || undefined,
      mediaType: detailedItem.mediaType,
      season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
      episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      signal: abortController.signal,
    })
      .catch(() => [] as ExtractedSubtitleTrack[])
      .then((extSubs) => {
        if (cancelled) {
          revokeSubtitleBlobUrls(extSubs);
          return;
        }
        if (externalSubtitlesRef.current.length > 0) {
          revokeSubtitleBlobUrls(externalSubtitlesRef.current);
        }
        externalSubtitlesRef.current = extSubs;
        setExternalSubtitles(extSubs);
        setIsLoadingSubtitles(false);
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    isWatchingInGallery,
    detailedItem?.id,
    detailedItem?.mediaType,
    activeImdbId,
    selectedSeason,
    selectedEpisode,
  ]);

  // Unified subtitle list across ALL player modes (direct, clean-embed, iframe)
  // Wyzie (IMDb ID search) and local uploads are prioritized ahead of server-extracted tracks for accuracy & stability.
  const activeSubtitlesList = useMemo<ExtractedSubtitleTrack[]>(() => {
    if (!isWatchingInGallery) return [];
    const rawStreamSubs =
      extractedStreams[activeExtractedIdx]?.subtitles ||
      extractedStreams[0]?.subtitles ||
      [];
    const normalizedStreamSubs: ExtractedSubtitleTrack[] = rawStreamSubs.map((s, i) => ({
      ...s,
      id: s.id || `worker:stream:${i}:${s.lang}`,
      provider: s.provider || "worker",
      remoteUrl: s.remoteUrl || s.proxiedUrl || s.url,
      loaded: s.loaded ?? false,
      label: s.label.includes("·") ? s.label : `${s.label} · Source`,
    }));
    const sameSourceSubs = mergeStreamFirst(workerBridgeSubtitles, normalizedStreamSubs);
    const merged = mergeStreamFirst(externalSubtitles, sameSourceSubs).map((t) => ({
      ...t,
      default: false,
    }));
    const rankProvider = (p?: string): number => {
      if (p === "local") return 0;
      if (p === "wyzie") return 1;
      if (p === "opensubtitles") return 2;
      return 3; // stream / worker
    };
    merged.sort((a, b) => {
      if (a.lang === "ar" && b.lang !== "ar") return -1;
      if (b.lang === "ar" && a.lang !== "ar") return 1;
      return rankProvider(a.provider) - rankProvider(b.provider);
    });
    if (merged.length > 0) {
      const arWyzieIdx = merged.findIndex(
        (s) => s.lang === "ar" && (s.provider === "local" || s.provider === "wyzie"),
      );
      const arIdx = arWyzieIdx >= 0 ? arWyzieIdx : merged.findIndex((s) => s.lang === "ar");
      const defIdx = arIdx >= 0 ? arIdx : 0;
      merged[defIdx] = { ...merged[defIdx], default: true };
    }
    return merged;
  }, [
    isWatchingInGallery,
    workerBridgeSubtitles,
    extractedStreams,
    activeExtractedIdx,
    externalSubtitles,
  ]);

  // Select default subtitle track (Arabic prioritized) whenever available tracks change
  useEffect(() => {
    if (activeSubtitlesList.length === 0) {
      setActiveSubtitleIdx(null);
      setActiveTrackCues([]);
      setLoadingSubtitleIdx(null);
      return;
    }
    const defaultIdx = activeSubtitlesList.findIndex((s) => s.default);
    setActiveSubtitleIdx(defaultIdx >= 0 ? defaultIdx : 0);
  }, [activeSubtitlesList]);

  // Lazy-load parsed cues for the active subtitle track and hide native iframe subtitles when our overlay is active
  useEffect(() => {
    let cancelled = false;
    const tokenAtStart = attemptTokenRef.current;
    if (
      !isWatchingInGallery ||
      activeSubtitleIdx === null ||
      !activeSubtitlesList[activeSubtitleIdx]
    ) {
      setActiveTrackCues([]);
      setLoadingSubtitleIdx(null);
      return undefined;
    }
    if (playerRenderMode === "iframe" || playerRenderMode === "clean-embed") {
      sendIframePlayerCommand(playerIframeRef.current, { type: "hideNativeSubs" });
    }
    const track = activeSubtitlesList[activeSubtitleIdx];
    if (track.loaded && Array.isArray(track.cues) && track.cues.length > 0) {
      setActiveTrackCues(track.cues);
      setLoadingSubtitleIdx(null);
      return undefined;
    }
    setLoadingSubtitleIdx(activeSubtitleIdx);
    void ensureTrackLoaded(track)
      .then((loadedTrack) => {
        if (!cancelled && attemptTokenRef.current === tokenAtStart) {
          setActiveTrackCues(loadedTrack.cues || []);
          setLoadingSubtitleIdx(null);
          if (playerRenderMode === "iframe" || playerRenderMode === "clean-embed") {
            sendIframePlayerCommand(playerIframeRef.current, { type: "hideNativeSubs" });
          }
        }
      })
      .catch(() => {
        if (!cancelled && attemptTokenRef.current === tokenAtStart) {
          setActiveTrackCues([]);
          setLoadingSubtitleIdx(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    isWatchingInGallery,
    activeSubtitleIdx,
    activeSubtitlesList,
    playerRenderMode,
    attemptTokenRef,
    playerIframeRef,
  ]);

  // Automatic 25fps <-> 23.976fps subtitle retiming when cues overflow real media duration
  useEffect(() => {
    if (
      !isWatchingInGallery ||
      activeSubtitleIdx === null ||
      activeTrackCues.length === 0 ||
      clockState.duration <= 600 ||
      clockState.durationIsEstimated ||
      (clockState.source !== "video" && clockState.source !== "bridge")
    ) {
      return;
    }
    const activeTrack = activeSubtitlesList[activeSubtitleIdx];
    const trackKey = activeTrack?.id || activeTrack?.url || String(activeSubtitleIdx);
    if (retimedTrackIdsRef.current.has(trackKey)) return;
    const { cues: retimed, factor } = autoRetimeCues(activeTrackCues, clockState.duration);
    retimedTrackIdsRef.current.add(trackKey);
    if (factor !== 1) {
      setActiveTrackCues(retimed);
    }
  }, [
    isWatchingInGallery,
    activeSubtitleIdx,
    activeSubtitlesList,
    activeTrackCues,
    clockState.duration,
    clockState.durationIsEstimated,
    clockState.source,
  ]);

  const handleRefreshSubtitlesForLanguages = useCallback(async () => {
    if (!detailedItem || !isWatchingInGallery) return;
    const tokenAtStart = attemptTokenRef.current;
    setIsLoadingSubtitles(true);
    try {
      const extSubs = await fetchExternalSubtitles({
        tmdbId: detailedItem.id,
        imdbId: activeImdbId || undefined,
        mediaType: detailedItem.mediaType,
        season: detailedItem.mediaType === "tv" ? selectedSeason : undefined,
        episode: detailedItem.mediaType === "tv" ? selectedEpisode : undefined,
      });
      if (attemptTokenRef.current !== tokenAtStart) {
        revokeSubtitleBlobUrls(extSubs);
        return;
      }
      if (externalSubtitlesRef.current.length > 0) {
        revokeSubtitleBlobUrls(externalSubtitlesRef.current);
      }
      externalSubtitlesRef.current = extSubs;
      setExternalSubtitles(extSubs);
      setExtractedStreams((prev) =>
        prev.map((v) => ({
          ...v,
          subtitles: [
            ...(v.subtitles || []).filter(
              (s) => s.provider === "worker" || s.provider === "local",
            ),
            ...extSubs,
          ],
        })),
      );
    } catch {
      // ignore fetch error
    } finally {
      if (attemptTokenRef.current === tokenAtStart) {
        setIsLoadingSubtitles(false);
      }
    }
  }, [
    detailedItem,
    isWatchingInGallery,
    activeImdbId,
    selectedSeason,
    selectedEpisode,
    attemptTokenRef,
    setExtractedStreams,
  ]);

  const handleUploadLocalSubtitle = useCallback(
    async (file: File) => {
      const localTrack = await createLocalSubtitleTrack(file);
      if (!localTrack) return;
      externalSubtitlesRef.current = [localTrack, ...externalSubtitlesRef.current];
      setExternalSubtitles((prev) => [localTrack, ...prev]);
      setExtractedStreams((prev) =>
        prev.map((v) => ({
          ...v,
          subtitles: [localTrack, ...(v.subtitles || [])],
        })),
      );
      setActiveSubtitleIdx(0);
    },
    [setExtractedStreams],
  );

  // Synchronize HTML5 <video> TextTrackList mode with activeSubtitleIdx
  const syncVideoTextTracks = useCallback(
    (selectedIdx: number | null) => {
      const video = videoElementRef.current;
      if (!video || !video.textTracks) return;
      const isIosVideoFs = Boolean((video as any).webkitDisplayingFullscreen);
      const activeMode: TextTrackMode = isIosVideoFs ? "showing" : "hidden";
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i += 1) {
        tracks[i].mode = selectedIdx !== null && i === selectedIdx ? activeMode : "disabled";
      }
    },
    [videoElementRef],
  );

  useEffect(() => {
    syncVideoTextTracks(activeSubtitleIdx);
    const timer = setTimeout(() => syncVideoTextTracks(activeSubtitleIdx), 250);
    const video = videoElementRef.current;
    const onWebkitFs = () => syncVideoTextTracks(activeSubtitleIdx);
    video?.addEventListener("webkitbeginfullscreen", onWebkitFs);
    video?.addEventListener("webkitendfullscreen", onWebkitFs);
    return () => {
      clearTimeout(timer);
      video?.removeEventListener("webkitbeginfullscreen", onWebkitFs);
      video?.removeEventListener("webkitendfullscreen", onWebkitFs);
    };
  }, [activeSubtitleIdx, activeSubtitlesList, syncVideoTextTracks, videoElementRef]);

  return {
    externalSubtitles,
    setExternalSubtitles,
    externalSubtitlesRef,
    workerBridgeSubtitles,
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
  };
}
