/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Star,
  Film,
  Tv,
  Maximize2,
  Minimize2,
  Layers,
  RefreshCw,
  AlertTriangle,
  Subtitles,
  Award,
  Download,
  Server,
  SkipForward,
  ChevronDown,
} from "lucide-react";
import { GlassVectorIcon } from "../../shared/icons";
import { EyeLoader } from "../EyeLoader";
import {
  recordServerFailure,
  recordServerSuccess,
} from "../../../services/serverSpeedMonitor";
import { clockReset, useClockTime } from "../../../features/cinema/player/playbackClock";
import { sendIframePlayerCommand } from "../../../features/cinema/player/iframeBridge";
import {
  CinemaTimeline,
  type PlayerControlMode,
} from "../../../features/cinema/player/CinemaTimeline";
import { SubtitleOverlay } from "../../../features/cinema/subtitles/SubtitleOverlay";
import { SubtitleSettingsPanel } from "../../../features/cinema/subtitles/SubtitleSettingsPanel";
import type { TrailerSource } from "../../../services/trailerService";
import type {
  ExtractedSubtitleTrack,
  ExtractedVideoStream,
} from "../../../services/videoExtractor";
import type { PlaySource } from "../MovieSourcesModal";
import {
  getBackdropSrc_static,
  getPosterSrc_static,
  type Media,
  type CinemaItem,
} from "../moviesDataClient";
import { CinemaDownloadTriggerButton } from "../../../features/cinemaDownload";
import { buildArchiveTorrentUrl } from "../../../services/archive/archiveUrlBuilder";

interface CinemaPlayerStageProps {
  hub?: "movies" | "anime" | "cartoon" | "noir" | "commercials";
  detailedItem: CinemaItem;
  isWatchingInGallery: boolean;
  setIsWatchingInGallery: (v: boolean) => void;
  activeGallerySource: PlaySource | null;
  detailPlaySources: PlaySource[];
  activeGalleryServerIdx: number;
  showHeroTrailer: boolean;
  setShowHeroTrailer: (v: boolean) => void;
  trailerFallbackToYoutube: boolean;
  setTrailerFallbackToYoutube: (v: boolean) => void;
  resolvedTrailer: TrailerSource | null;
  setImdbTrailerLoaded: (v: boolean) => void;
  activeImdbId: string;
  bumpControlsVisibility: () => void;
  isControlsVisible: boolean;
  currentLang: string;
  t: any;
  persistCurrentProgress: () => void;
  setDetailServersOpen: (v: boolean) => void;
  startGalleryWatchSession: (idx?: number) => void;
  isFullSeasonEmbed: boolean;
  setIsFullSeasonEmbed: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSeason: number;
  setSelectedSeason: (s: number) => void;
  selectedEpisode: number;
  setSelectedEpisode: (e: number) => void;
  loadingSeasonEpisodes: boolean;
  seasonEpisodes: Array<{ episode_number: number; name: string }>;
  setWorkerBridgeSubtitles: React.Dispatch<
    React.SetStateAction<ExtractedSubtitleTrack[]>
  >;
  playerIframeRef: MutableRefObject<HTMLIFrameElement | null>;
  videoElementRef: MutableRefObject<HTMLVideoElement | null>;
  galleryStageRef: MutableRefObject<HTMLDivElement | null>;
  isCssFullscreen: boolean;
  setIsCssFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  isAnyFullscreen: boolean;
  handleToggleGalleryFullscreen: () => void;
  setSelectedItemId: (id: number | null, mediaType?: Media) => void;
  allServersFailed: boolean;
  playerRenderMode: "extracting" | "direct" | "clean-embed" | "iframe";
  setPlayerRenderMode: React.Dispatch<
    React.SetStateAction<"extracting" | "direct" | "clean-embed" | "iframe">
  >;
  handleToggleVideoPlay: () => void;
  appliedInitialSeekRef: MutableRefObject<boolean>;
  detailWatchTarget: any;
  syncVideoTextTracks: (idx: number | null) => void;
  activeSubtitleIdx: number | null;
  setActiveSubtitleIdx: (idx: number | null) => void;
  videoVolume: number;
  setVideoVolume: (v: number) => void;
  isVideoMuted: boolean;
  setIsVideoMuted: (v: boolean) => void;
  loadedCurrentAttemptRef: MutableRefObject<boolean>;
  extractedStreams: ExtractedVideoStream[];
  activeExtractedIdx: number;
  setActiveExtractedIdx: (idx: number) => void;
  playAttemptStartedAtRef: MutableRefObject<number>;
  resolveServerIdForStream: (stream?: ExtractedVideoStream | null) => string;
  detailItemStorageKey: string;
  isPlayerLoading: boolean;
  setIsPlayerLoading: (v: boolean) => void;
  useDirectUrlFallback: boolean;
  setUseDirectUrlFallback: (v: boolean) => void;
  cleanupDirectVideoPlayer: () => void;
  activeSubtitlesList: ExtractedSubtitleTrack[];
  activeIframeUrl: string;
  gotTimeSinceLoadRef: MutableRefObject<boolean>;
  confirmedPlayingSinceLoadRef: MutableRefObject<boolean>;
  userPausedIframeRef: MutableRefObject<boolean>;
  setIframeLoadStamp: (ts: number) => void;
  seekUnsupportedToast: boolean;
  controlMode: PlayerControlMode;
  activeTrackCues: any[];
  subtitleOffsetSec: number;
  setSubtitleOffsetSec: React.Dispatch<React.SetStateAction<number>>;
  handleUserSeek: (sec: number) => void;
  handleUserTogglePlay: () => void;
  handleToggleVideoMute: () => void;
  handleChangeVideoVolume: (v: number) => void;
  isSubtitleMenuOpen: boolean;
  setIsSubtitleMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingSubtitles: boolean;
  loadingSubtitleIdx: number | null;
  handleUploadLocalSubtitle: (file: File) => void;
  handleRefreshSubtitlesForLanguages: () => void;
  animeAudioMode?: "sub" | "dub";
  onChangeAnimeAudioMode?: (mode: "sub" | "dub") => void;
}

export function CinemaPlayerStage({
  hub = "movies",
  detailedItem,
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
  animeAudioMode,
  onChangeAnimeAudioMode,
}: CinemaPlayerStageProps) {
  const [episodeJumpInput, setEpisodeJumpInput] = useState("");
  const [episodeRangeStart, setEpisodeRangeStart] = useState(1);
  const [isServerPopoverOpen, setIsServerPopoverOpen] = useState(false);
  const [isEpisodesDrawerOpen, setIsEpisodesDrawerOpen] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<"-10s" | "+10s" | null>(null);
  const lastTapLeftRef = useRef(0);
  const lastTapRightRef = useRef(0);
  const liveClockTime = useClockTime(250);

  useEffect(() => {
    const bucketStart = Math.floor((Math.max(1, selectedEpisode) - 1) / 50) * 50 + 1;
    setEpisodeRangeStart(bucketStart);
  }, [selectedEpisode, selectedSeason]);

  useEffect(() => {
    if (!isControlsVisible && !isEpisodesDrawerOpen) {
      setIsServerPopoverOpen(false);
    }
  }, [isControlsVisible, isEpisodesDrawerOpen]);

  const hasNextEpisode =
    detailedItem.mediaType === "tv" &&
    !isFullSeasonEmbed &&
    seasonEpisodes.length > 0 &&
    selectedEpisode < seasonEpisodes.length;

  const handleNextEpisode = () => {
    if (!hasNextEpisode) return;
    setIsFullSeasonEmbed(false);
    setSelectedEpisode(selectedEpisode + 1);
    setDetailServersOpen(true);
    startGalleryWatchSession();
  };

  const handleZoneDoubleTap = (side: "left" | "right") => {
    if (playerRenderMode !== "direct" && controlMode !== "bridged") return;
    const now = Date.now();
    const ref = side === "left" ? lastTapLeftRef : lastTapRightRef;
    if (now - ref.current < 320) {
      const delta = side === "left" ? -10 : 10;
      const baseTime =
        playerRenderMode === "direct" && videoElementRef.current
          ? videoElementRef.current.currentTime
          : liveClockTime;
      handleUserSeek(Math.max(0, baseTime + delta));
      setDoubleTapFeedback(side === "left" ? "-10s" : "+10s");
      window.setTimeout(() => setDoubleTapFeedback(null), 650);
      ref.current = 0;
    } else {
      ref.current = now;
      bumpControlsVisibility();
    }
  };

  const renderDownloadButtons = () => (
    <>
      {(!hub || hub === "movies") && (
        <CinemaDownloadTriggerButton
          item={detailedItem}
          imdbId={activeImdbId}
          season={selectedSeason}
          episode={selectedEpisode}
          episodeTitle={
            seasonEpisodes.find((ep) => ep.episode_number === selectedEpisode)?.name
          }
          currentLang={currentLang}
          compact
        />
      )}

      {(hub === "cartoon" || hub === "noir" || hub === "commercials") &&
        (() => {
          const activeStream =
            extractedStreams[activeExtractedIdx] || extractedStreams[0];
          const archiveId = detailedItem.archiveIds?.[0];
          const directMp4Url =
            activeStream?.directUrl ||
            detailedItem.directDownloadUrl ||
            (archiveId
              ? `https://archive.org/details/${encodeURIComponent(archiveId)}`
              : "");
          const torrentUrl =
            detailedItem.torrentDownloadUrl ||
            (archiveId ? buildArchiveTorrentUrl(archiveId) : "");
          return (
            <>
              {directMp4Url && (
                <a
                  href={directMp4Url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nl-glass-download-capsule nl-glass-download-capsule--compact"
                >
                  <Download size={13} className="nl-glass-download-icon" />
                  <span>{currentLang === "ar" ? "تحميل MP4" : "MP4"}</span>
                </a>
              )}
              {torrentUrl && (
                <a
                  href={torrentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nl-glass-download-capsule nl-glass-download-capsule--compact"
                >
                  <Download size={12} className="nl-glass-download-icon" />
                  <span>.Torrent</span>
                </a>
              )}
            </>
          );
        })()}

      {hub === "anime" &&
        (() => {
          const activeStream =
            extractedStreams[activeExtractedIdx] || extractedStreams[0];
          const epUrl =
            activeStream?.directUrl ||
            detailedItem.directDownloadUrl ||
            activeGallerySource?.url ||
            "";
          if (!epUrl) return null;
          return (
            <a
              href={epUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="nl-glass-download-capsule nl-glass-download-capsule--compact"
            >
              <Download size={13} className="nl-glass-download-icon" />
              <span>
                S{selectedSeason}:E{selectedEpisode}
              </span>
            </a>
          );
        })()}
    </>
  );

  return (
    <div
      className={`flex-shrink-0 flex flex-col gap-2 ${
        isWatchingInGallery ? "p-0 sm:p-2" : "p-0 sm:p-3.5 pb-0"
      }`}
    >
      {/* Trailer Top Bar (Only when watching trailer, NOT during active movie/series playback) */}
      {!isWatchingInGallery &&
        showHeroTrailer &&
        Boolean(activeImdbId || detailedItem.trailerKey) && (
          <div
            onMouseMove={bumpControlsVisibility}
            onTouchStart={bumpControlsVisibility}
            className={`lg-cinema-gallery-top-bar flex items-center justify-between gap-2 overflow-x-auto no-scrollbar whitespace-nowrap px-3 py-1.5 rounded-none sm:rounded-2xl transition-all duration-300 ${
              isControlsVisible
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-3 pointer-events-none"
            }`}
            dir="ltr"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowHeroTrailer(false);
                  setTrailerFallbackToYoutube(false);
                }}
                className="lg-cinema-action-pill px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer !bg-rose-600/45 !border-rose-300/70 text-white"
              >
                <Film size={13} />
                <span>
                  {currentLang === "ar" ? "إغلاق التريلر" : "Hide Trailer"}
                </span>
              </button>

              {activeGallerySource && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailServersOpen(true);
                    startGalleryWatchSession();
                  }}
                  className="lg-cinema-primary-pill px-3.5 py-1.5 text-xs font-black text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={12} className="fill-current" />
                  <span>
                    {t("movies.meta.watchNow") ||
                      (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")}
                  </span>
                </button>
              )}

              {renderDownloadButtons()}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleGalleryFullscreen}
                className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px]"
                aria-label={
                  isAnyFullscreen
                    ? t("movies.player.exitFullscreen")
                    : t("movies.player.fullscreen")
                }
              >
                {isAnyFullscreen ? (
                  <Minimize2 size={15} />
                ) : (
                  <Maximize2 size={15} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] hover:!bg-rose-600/45 hover:!border-rose-300/60"
                aria-label={t("movies.close")}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

      <div
        ref={galleryStageRef}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={bumpControlsVisibility}
        onTouchStart={bumpControlsVisibility}
        className={`lg-cinema-gallery-stage relative aspect-video w-full bg-black ${
          isCssFullscreen ? "lg-cinema-gallery-stage--css-fullscreen" : ""
        }`}
      >
        {isWatchingInGallery && !isControlsVisible && (
          <>
            <div
              onMouseEnter={bumpControlsVisibility}
              onMouseMove={bumpControlsVisibility}
              onTouchStart={bumpControlsVisibility}
              className="absolute top-0 inset-x-0 h-6 z-30"
            />
            <div
              onMouseEnter={bumpControlsVisibility}
              onMouseMove={bumpControlsVisibility}
              onTouchStart={bumpControlsVisibility}
              className="absolute bottom-0 inset-x-0 h-5 z-30"
            />
          </>
        )}

        {isWatchingInGallery && activeGallerySource ? (
          <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Single-Layer Netflix/Crunchyroll Internal Top Floating Strip */}
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseMove={bumpControlsVisibility}
              className={`absolute top-0 inset-x-0 z-30 px-3 sm:px-5 py-2.5 sm:py-3.5 max-md:px-2 max-md:py-2 max-md:gap-1.5 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 via-black/45 to-transparent transition-all duration-300 ${
                isControlsVisible || isEpisodesDrawerOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-3 pointer-events-none"
              }`}
              dir="ltr"
            >
              {/* Left: Title + Season/Episode Badge */}
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[160px] sm:max-w-[320px] drop-shadow">
                  {detailedItem.title}
                </h4>
                {detailedItem.mediaType === "tv" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600/80 border border-rose-400/60 text-white whitespace-nowrap shrink-0">
                    {isFullSeasonEmbed
                      ? "Full Season"
                      : `S${selectedSeason}:E${selectedEpisode}`}
                  </span>
                )}
              </div>

              {/* Right: Servers Popover + Episodes Drawer Button + Download + Exit Player + Close */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-w-full overflow-x-auto no-scrollbar">
                {/* Compact Server Switcher Popover */}
                {detailPlaySources.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsServerPopoverOpen((prev) => !prev);
                        setIsEpisodesDrawerOpen(false);
                      }}
                      className="lg-cinema-action-pill px-3 py-1.5 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Server size={13} className="text-rose-400" />
                      <span className="hidden sm:inline">Servers ·</span>
                      <span className="text-rose-200">{activeGallerySource.label}</span>
                      <ChevronDown size={12} className="opacity-75" />
                    </button>

                    {isServerPopoverOpen && (
                      <div className="fixed inset-x-3 bottom-4 sm:bottom-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 max-h-[65dvh] sm:max-h-80 overflow-y-auto rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/20 p-2.5 shadow-2xl z-[10600] sm:z-50 flex flex-col gap-2">
                        {animeAudioMode && onChangeAnimeAudioMode && (
                          <div className="flex items-center justify-between gap-1 rounded-xl bg-white/5 border border-white/15 p-1">
                            <button
                              type="button"
                              onClick={() => onChangeAnimeAudioMode("sub")}
                              className={`flex-1 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                                animeAudioMode === "sub"
                                  ? "bg-sky-500 text-white shadow"
                                  : "text-white/75 hover:text-white"
                              }`}
                            >
                              SUB مترجم
                            </button>
                            <button
                              type="button"
                              onClick={() => onChangeAnimeAudioMode("dub")}
                              className={`flex-1 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                                animeAudioMode === "dub"
                                  ? "bg-amber-500 text-slate-950 shadow"
                                  : "text-white/75 hover:text-white"
                              }`}
                            >
                              DUB مدبلج
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col gap-1">
                          {detailPlaySources.map((srv, idx) => {
                            const isCurrent = idx === activeGalleryServerIdx;
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => {
                                  setIsServerPopoverOpen(false);
                                  if (idx !== activeGalleryServerIdx) {
                                    setWorkerBridgeSubtitles([]);
                                    startGalleryWatchSession(idx);
                                  }
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-extrabold text-start flex items-center justify-between transition cursor-pointer ${
                                  isCurrent
                                    ? "bg-rose-600/85 text-white border border-rose-400/60"
                                    : "bg-white/5 hover:bg-white/12 text-white/80 hover:text-white border border-transparent"
                                }`}
                              >
                                <span>{srv.label}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-rose-100">
                                    Active
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TV Episodes Slide-Over Trigger + Compact Episode Quick-Jump Input & Selector */}
                {detailedItem.mediaType === "tv" && (
                  <>
                    {!isFullSeasonEmbed && seasonEpisodes.length > 1 && (
                      <div className="lg-cinema-action-pill px-2 py-1 text-xs font-extrabold text-white flex items-center gap-1.5 whitespace-nowrap">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const num = parseInt(episodeJumpInput.trim(), 10);
                            if (!Number.isNaN(num) && num >= 1) {
                              const clamped = Math.min(
                                Math.max(1, num),
                                Math.max(seasonEpisodes.length, num),
                              );
                              setIsFullSeasonEmbed(false);
                              setSelectedEpisode(clamped);
                              setDetailServersOpen(true);
                              startGalleryWatchSession();
                              setEpisodeJumpInput("");
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1500, seasonEpisodes.length)}
                            value={episodeJumpInput}
                            onChange={(e) => setEpisodeJumpInput(e.target.value)}
                            placeholder={`E${selectedEpisode}`}
                            aria-label="Jump to Episode Number"
                            className="w-12 px-1.5 py-0.5 rounded-full bg-black/55 border border-white/25 text-[11px] font-bold text-white placeholder:text-white/60 text-center tabular-nums focus:outline-none focus:border-rose-400"
                          />
                        </form>
                        <select
                          value={selectedEpisode}
                          aria-label="Select Episode"
                          onChange={(e) => {
                            const nextEp = Number(e.target.value) || 1;
                            setIsFullSeasonEmbed(false);
                            setSelectedEpisode(nextEp);
                            setDetailServersOpen(true);
                            startGalleryWatchSession();
                          }}
                          className="bg-transparent text-[11px] font-extrabold text-rose-200 focus:outline-none cursor-pointer max-w-[96px] truncate tabular-nums"
                        >
                          {seasonEpisodes.map((ep) => (
                            <option
                              key={`top-ep-opt-${selectedSeason}-${ep.episode_number}`}
                              value={ep.episode_number}
                              className="bg-slate-950 text-white"
                            >
                              E{ep.episode_number}
                              {ep.name ? ` · ${ep.name}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsEpisodesDrawerOpen((prev) => !prev);
                        setIsServerPopoverOpen(false);
                      }}
                      className={`lg-cinema-action-pill px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isEpisodesDrawerOpen
                          ? "!bg-rose-600/65 !border-rose-300/70 text-white"
                          : "text-white"
                      }`}
                    >
                      <Tv size={13} className="text-sky-300" />
                      <span>{t("movies.meta.episodes", "Episodes")}</span>
                    </button>
                  </>
                )}

                {renderDownloadButtons()}

                <button
                  type="button"
                  onClick={() => {
                    persistCurrentProgress();
                    if (playerIframeRef.current) {
                      try {
                        playerIframeRef.current.src = "about:blank";
                      } catch {}
                    }
                    clockReset("manual");
                    setIsWatchingInGallery(false);
                    setShowHeroTrailer(false);
                    setTrailerFallbackToYoutube(false);
                    setIsCssFullscreen(false);
                    setIsSubtitleMenuOpen(false);
                    setIsServerPopoverOpen(false);
                    setIsEpisodesDrawerOpen(false);
                  }}
                  className="lg-cinema-action-pill hidden md:inline-flex px-3 py-1.5 text-xs font-bold text-white/90 hover:text-white items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title={t("movies.player.showBackdrop")}
                >
                  <span>{t("movies.player.showBackdrop")}</span>
                </button>

                <button
                  type="button"
                  data-compact-touch="true"
                  onClick={handleToggleGalleryFullscreen}
                  className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] cursor-pointer"
                  aria-label={
                    isAnyFullscreen
                      ? t("movies.player.exitFullscreen")
                      : t("movies.player.fullscreen")
                  }
                  title={
                    isAnyFullscreen
                      ? t("movies.player.exitFullscreen")
                      : t("movies.player.fullscreen")
                  }
                >
                  {isAnyFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                <button
                  type="button"
                  data-compact-touch="true"
                  onClick={() => {
                    persistCurrentProgress();
                    if (playerIframeRef.current) {
                      try {
                        playerIframeRef.current.src = "about:blank";
                      } catch {}
                    }
                    if (isAnyFullscreen) {
                      handleToggleGalleryFullscreen();
                    } else {
                      setSelectedItemId(null);
                    }
                  }}
                  className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] hover:!bg-rose-600/45 hover:!border-rose-300/60"
                  aria-label={t("movies.close")}
                  title={t("movies.close")}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Internal Right-Hand Slide-Over Episodes Drawer */}
            {detailedItem.mediaType === "tv" && isEpisodesDrawerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="fixed sm:absolute inset-y-0 right-0 z-[10600] sm:z-40 w-[86vw] max-w-xs sm:w-80 bg-slate-950/92 backdrop-blur-2xl border-l border-white/15 p-3.5 flex flex-col gap-3 shadow-2xl overflow-y-auto"
                dir="ltr"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Tv size={14} className="text-rose-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      {t("movies.meta.seasons")} & {t("movies.meta.episodes")}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-compact-touch="true"
                    onClick={() => setIsEpisodesDrawerOpen(false)}
                    className="lg-cinema-icon-pill !w-7 !h-7 !min-w-[28px] !min-h-[28px]"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Season Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from(
                    { length: Math.max(1, Math.min(30, detailedItem.seasons || 1)) },
                    (_, idx) => idx + 1,
                  ).map((seasonNum) => {
                    const isSeasonActive =
                      !isFullSeasonEmbed && selectedSeason === seasonNum;
                    return (
                      <button
                        key={`drawer-season-${seasonNum}`}
                        type="button"
                        onClick={() => {
                          setIsFullSeasonEmbed(false);
                          setSelectedSeason(seasonNum);
                          setSelectedEpisode(1);
                          setDetailServersOpen(true);
                          startGalleryWatchSession();
                        }}
                        className={`lg-cinema-tv-pill px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-all ${
                          isSeasonActive
                            ? "lg-cinema-tv-pill--active"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        S{seasonNum}
                      </button>
                    );
                  })}

                  {(detailedItem.hub || hub) === "movies" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullSeasonEmbed((prev) => !prev);
                        setDetailServersOpen(true);
                        startGalleryWatchSession();
                      }}
                      className={`lg-cinema-tv-pill px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer ${
                        isFullSeasonEmbed
                          ? "lg-cinema-tv-pill--active"
                          : "text-amber-200/90 hover:text-amber-100"
                      }`}
                    >
                      <Layers size={11} />
                      <span>Full</span>
                    </button>
                  )}
                </div>

                {/* Episode Jump Input (for all multi-episode series) + 50-Episode Range Pills */}
                {!isFullSeasonEmbed && seasonEpisodes.length > 1 && (
                  <div className="flex flex-col gap-2 border-y border-white/10 py-2">
                    {seasonEpisodes.length > 50 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {Array.from(
                          { length: Math.ceil(seasonEpisodes.length / 50) },
                          (_, chunkIdx) => {
                            const start = chunkIdx * 50 + 1;
                            const end = Math.min(
                              seasonEpisodes.length,
                              (chunkIdx + 1) * 50,
                            );
                            const isRangeActive = episodeRangeStart === start;
                            return (
                              <button
                                key={`drawer-range-${start}-${end}`}
                                type="button"
                                onClick={() => setEpisodeRangeStart(start)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer ${
                                  isRangeActive
                                    ? "bg-rose-600 text-white"
                                    : "bg-white/8 text-white/75 hover:bg-white/15"
                                }`}
                              >
                                {start}–{end}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const num = parseInt(episodeJumpInput.trim(), 10);
                        if (!Number.isNaN(num) && num >= 1) {
                          const clamped = Math.min(
                            Math.max(1, num),
                            Math.max(seasonEpisodes.length, num),
                          );
                          setIsFullSeasonEmbed(false);
                          setSelectedEpisode(clamped);
                          setDetailServersOpen(true);
                          startGalleryWatchSession();
                          setEpisodeJumpInput("");
                          setIsEpisodesDrawerOpen(false);
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1500, seasonEpisodes.length)}
                        value={episodeJumpInput}
                        onChange={(e) => setEpisodeJumpInput(e.target.value)}
                        placeholder={currentLang === "ar" ? "رقم الحلقة #" : "Jump to Ep #"}
                        className="flex-1 px-2.5 py-1 rounded-full bg-black/50 border border-white/25 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-rose-400 tabular-nums"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white cursor-pointer"
                      >
                        Go
                      </button>
                    </form>
                  </div>
                )}

                {/* Episode List */}
                {!isFullSeasonEmbed && (
                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
                    {loadingSeasonEpisodes && seasonEpisodes.length === 0 ? (
                      <span className="text-xs text-white/60 font-bold py-4 text-center">
                        {t("movies.meta.loading")}
                      </span>
                    ) : (
                      (seasonEpisodes.length > 50
                        ? seasonEpisodes.slice(
                            episodeRangeStart - 1,
                            episodeRangeStart - 1 + 50,
                          )
                        : seasonEpisodes
                      ).map((ep) => {
                        const isEpActive = selectedEpisode === ep.episode_number;
                        return (
                          <button
                            key={`drawer-ep-${selectedSeason}-${ep.episode_number}`}
                            type="button"
                            onClick={() => {
                              setIsFullSeasonEmbed(false);
                              setSelectedEpisode(ep.episode_number);
                              setDetailServersOpen(true);
                              startGalleryWatchSession();
                              setIsEpisodesDrawerOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold text-start transition cursor-pointer flex items-center justify-between gap-2 ${
                              isEpActive
                                ? "bg-rose-600/85 text-white border border-rose-400/60 shadow"
                                : "bg-white/5 hover:bg-white/12 text-white/80 hover:text-white border border-white/10"
                            }`}
                          >
                            <span className="truncate">
                              <strong className="me-1.5">E{ep.episode_number}</strong>
                              {ep.name}
                            </span>
                            {isEpActive && (
                              <Play size={11} className="fill-current shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Left/Right 30% Double-Tap ±10s Seek Zones (Direct / Bridged) */}
            {(playerRenderMode === "direct" || controlMode === "bridged") &&
              !allServersFailed && (
                <>
                  <div
                    onTouchEnd={() => handleZoneDoubleTap("left")}
                    className="sm:hidden absolute inset-y-16 left-0 w-[30%] z-20"
                  />
                  <div
                    onTouchEnd={() => handleZoneDoubleTap("right")}
                    className="sm:hidden absolute inset-y-16 right-0 w-[30%] z-20"
                  />
                  {doubleTapFeedback && (
                    <div className="
                      absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30
                      px-4 py-2 rounded-full bg-black/80 border border-white/25
                      text-white text-sm font-black shadow-2xl pointer-events-none
                    ">
                      {doubleTapFeedback}
                    </div>
                  )}
                </>
              )}

            {!allServersFailed && playerRenderMode === "direct" && (
              <video
                ref={videoElementRef}
                className="w-full h-full border-0 bg-black block object-contain cursor-pointer"
                autoPlay
                playsInline
                crossOrigin="anonymous"
                onClick={handleToggleVideoPlay}
                onDoubleClick={handleToggleGalleryFullscreen}
                onPause={() => persistCurrentProgress()}
                onLoadedMetadata={(e) => {
                  if (
                    !appliedInitialSeekRef.current &&
                    detailWatchTarget?.startAt &&
                    detailWatchTarget.startAt > 5
                  ) {
                    appliedInitialSeekRef.current = true;
                    try {
                      e.currentTarget.currentTime = detailWatchTarget.startAt;
                    } catch {}
                  }
                  syncVideoTextTracks(activeSubtitleIdx);
                }}
                onVolumeChange={(e) => {
                  setVideoVolume(e.currentTarget.volume);
                  setIsVideoMuted(e.currentTarget.muted);
                }}
                onLoadedData={() => {
                  loadedCurrentAttemptRef.current = true;
                  const currentStream =
                    extractedStreams[activeExtractedIdx] ||
                    extractedStreams[0];
                  const elapsedMs = Math.max(
                    120,
                    performance.now() - playAttemptStartedAtRef.current,
                  );
                  recordServerSuccess(
                    resolveServerIdForStream(currentStream),
                    elapsedMs,
                    detailItemStorageKey,
                  );
                  setIsPlayerLoading(false);
                  syncVideoTextTracks(activeSubtitleIdx);
                }}
                onError={() => {
                  const currentStream =
                    extractedStreams[activeExtractedIdx] ||
                    extractedStreams[0];
                  if (
                    !useDirectUrlFallback &&
                    currentStream?.directUrl &&
                    currentStream.directUrl !== currentStream.proxiedUrl
                  ) {
                    setUseDirectUrlFallback(true);
                  } else if (
                    activeExtractedIdx + 1 <
                    extractedStreams.length
                  ) {
                    recordServerFailure(
                      resolveServerIdForStream(currentStream),
                    );
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
                    recordServerFailure(
                      resolveServerIdForStream(currentStream),
                    );
                    cleanupDirectVideoPlayer();
                    playAttemptStartedAtRef.current = performance.now();
                    setIsPlayerLoading(true);
                    setPlayerRenderMode("iframe");
                  }
                }}
              >
                {activeSubtitlesList
                  .filter((sub) => sub.loaded !== false && Boolean(sub.proxiedUrl || sub.url))
                  .map((sub, subIdx) => (
                    <track
                      key={`${sub.lang}-${subIdx}-${sub.id || sub.url}`}
                      kind="subtitles"
                      src={sub.proxiedUrl || sub.url}
                      srcLang={sub.lang}
                      label={sub.label}
                    />
                  ))}
              </video>
            )}

            {!allServersFailed &&
              (playerRenderMode === "iframe" ||
                playerRenderMode === "clean-embed") && (
                <iframe
                  ref={playerIframeRef}
                  key={`${activeGallerySource.id}-${activeIframeUrl}`}
                  className="w-full h-full border-0 bg-black block"
                  src={activeIframeUrl}
                  title={`${detailedItem.title} - ${activeGallerySource.label}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  referrerPolicy="origin"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {
                    loadedCurrentAttemptRef.current = true;
                    const elapsedMs = Math.max(
                      120,
                      performance.now() - playAttemptStartedAtRef.current,
                    );
                    const currentStream =
                      extractedStreams[activeExtractedIdx] ||
                      extractedStreams[0];
                    const activeServerId =
                      playerRenderMode === "clean-embed"
                        ? resolveServerIdForStream(currentStream)
                        : activeGallerySource.id;
                    recordServerSuccess(
                      activeServerId,
                      elapsedMs,
                      detailItemStorageKey,
                    );
                    setIsPlayerLoading(false);
                    gotTimeSinceLoadRef.current = false;
                    confirmedPlayingSinceLoadRef.current = false;
                    userPausedIframeRef.current = false;
                    setIframeLoadStamp(Date.now());
                    sendIframePlayerCommand(playerIframeRef.current, {
                      type: "play",
                    });
                  }}
                />
              )}

            {seekUnsupportedToast && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-black/85 border border-amber-400/50 text-amber-200 text-xs font-bold shadow-lg pointer-events-none">
                {t(
                  "movies.player.seekUnsupported",
                  "This server doesn't support external seeking — use the player's own bar",
                )}
              </div>
            )}

            {!allServersFailed &&
              controlMode !== "none" &&
              activeSubtitleIdx !== null && (
                <SubtitleOverlay
                  cues={activeTrackCues}
                  offsetSec={subtitleOffsetSec}
                  liftPx={isControlsVisible ? 64 : 0}
                />
              )}

            {(isPlayerLoading || playerRenderMode === "extracting") && !allServersFailed && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 pointer-events-none">
                <EyeLoader />
              </div>
            )}

            {allServersFailed && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/95">
                <AlertTriangle size={32} className="text-amber-400" />
                <p className="text-xs sm:text-sm font-bold text-white/90 max-w-md leading-relaxed">
                  {t("movies.player.allFailed")}
                </p>
                <button
                  type="button"
                  onClick={() => startGalleryWatchSession(0)}
                  className="lg-cinema-primary-pill px-5 py-2 text-xs sm:text-sm font-black text-white flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>{t("movies.player.retry")}</span>
                </button>
              </div>
            )}

            {/* Single-Layer Bottom Auto-Hiding Floating Control Bar */}
            {(playerRenderMode === "direct" || controlMode === "bridged") &&
              !allServersFailed && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseMove={bumpControlsVisibility}
                  className={`lg-cinema-player-controls absolute bottom-3 inset-x-3 sm:inset-x-5 z-30 rounded-2xl px-3.5 py-2 transition-all duration-300 ${
                    isControlsVisible || isSubtitleMenuOpen
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 translate-y-3 pointer-events-none"
                  }`}
                  dir="ltr"
                >
                  <CinemaTimeline
                    mode={controlMode}
                    videoRef={videoElementRef}
                    fallbackDurationSec={(detailedItem?.runtime ?? 0) * 60}
                    hasSubtitles={activeTrackCues.length > 0}
                    onUserSeek={handleUserSeek}
                    onUserTogglePlay={handleUserTogglePlay}
                    rightSlot={
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {playerRenderMode === "direct" && (
                          <div className="flex items-center gap-1.5 group">
                            <button
                              type="button"
                              onClick={handleToggleVideoMute}
                              className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] cursor-pointer"
                              aria-label={isVideoMuted ? "Unmute" : "Mute"}
                            >
                              {isVideoMuted || videoVolume === 0 ? (
                                <VolumeX size={14} />
                              ) : (
                                <Volume2 size={14} />
                              )}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isVideoMuted ? 0 : videoVolume}
                              onChange={(e) =>
                                handleChangeVideoVolume(Number(e.target.value))
                              }
                              className="lg-cinema-seek-slider hidden md:block w-16"
                              aria-label="Volume"
                            />
                          </div>
                        )}

                        {hasNextEpisode && (
                          <button
                            type="button"
                            onClick={handleNextEpisode}
                            className="lg-cinema-action-pill h-8 px-2.5 text-[11px] font-extrabold text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="Next Episode"
                          >
                            <SkipForward size={13} className="text-sky-300" />
                            <span className="hidden sm:inline">
                              Next Ep
                            </span>
                          </button>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsSubtitleMenuOpen((prev) => !prev)}
                            className={`lg-cinema-action-pill h-8 px-2.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                              activeSubtitleIdx !== null &&
                              activeSubtitlesList[activeSubtitleIdx]
                                ? "!bg-rose-600/45 !border-rose-300/70 text-white"
                                : "text-white/85"
                            }`}
                            aria-label="Subtitles (CC)"
                            title="Subtitles (CC)"
                          >
                            <Subtitles size={13} />
                            <span>
                              {activeSubtitleIdx !== null &&
                              activeSubtitlesList[activeSubtitleIdx]
                                ? activeSubtitlesList[
                                    activeSubtitleIdx
                                  ].lang.toUpperCase()
                                : isLoadingSubtitles
                                  ? "CC..."
                                  : "CC"}
                            </span>
                          </button>

                          {isSubtitleMenuOpen && (
                            <div className="fixed inset-x-3 bottom-16 sm:absolute sm:inset-x-auto sm:bottom-full sm:right-0 sm:mb-2 z-[10600] sm:z-50 flex justify-center sm:block">
                              <SubtitleSettingsPanel
                                tracks={activeSubtitlesList}
                                activeIdx={activeSubtitleIdx}
                                loadingIdx={loadingSubtitleIdx}
                                isSearching={isLoadingSubtitles}
                                offsetSec={subtitleOffsetSec}
                                onSelect={(idx) => {
                                  setActiveSubtitleIdx(idx);
                                  syncVideoTextTracks(idx);
                                }}
                                onOffsetChange={setSubtitleOffsetSec}
                                onUploadFile={handleUploadLocalSubtitle}
                                onLanguagesChanged={handleRefreshSubtitlesForLanguages}
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          data-compact-touch="true"
                          onClick={handleToggleGalleryFullscreen}
                          className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] cursor-pointer"
                          aria-label={
                            isAnyFullscreen
                              ? t("movies.player.exitFullscreen")
                              : t("movies.player.fullscreen")
                          }
                          title={
                            isAnyFullscreen
                              ? t("movies.player.exitFullscreen")
                              : t("movies.player.fullscreen")
                          }
                        >
                          {isAnyFullscreen ? (
                            <Minimize2 size={14} />
                          ) : (
                            <Maximize2 size={14} />
                          )}
                        </button>
                      </div>
                    }
                  />
                </div>
              )}
          </div>
        ) : showHeroTrailer && (activeImdbId || detailedItem.trailerKey) ? (
          <div className="relative w-full h-full bg-black">
            {resolvedTrailer?.kind === "imdb" && !trailerFallbackToYoutube ? (
              <>
                <iframe
                  key={`imdb-trailer-${resolvedTrailer.videoId}`}
                  src={resolvedTrailer.embedUrl}
                  title={`${detailedItem.title} - IMDb Trailer`}
                  className="w-full h-full border-0 bg-black block"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  onLoad={() => setImdbTrailerLoaded(true)}
                />
                {detailedItem.trailerKey && (
                  <button
                    type="button"
                    onClick={() => setTrailerFallbackToYoutube(true)}
                    className="lg-cinema-action-pill absolute bottom-3 right-3 z-20 px-3 py-1 text-[11px] font-bold text-white/90 hover:text-white cursor-pointer"
                  >
                    YouTube
                  </button>
                )}
              </>
            ) : detailedItem.trailerKey ? (
              <iframe
                key={`yt-trailer-${detailedItem.trailerKey}`}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(detailedItem.trailerKey)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={`${detailedItem.title} - Official Trailer`}
                className="w-full h-full border-0 bg-black block"
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <EyeLoader />
              </div>
            )}
          </div>
        ) : (
          <>
            <img
              src={getBackdropSrc_static(
                detailedItem.backdropPath,
                detailedItem.trailerKey,
                detailedItem.posterPath,
              )}
              alt={detailedItem.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(8, 12, 22, 0.96) 0%, rgba(8, 12, 22, 0.42) 52%, rgba(8, 12, 22, 0.25) 100%)",
              }}
            />

            <button
              type="button"
              onClick={() => {
                setDetailServersOpen(true);
                startGalleryWatchSession();
              }}
              className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/18 hover:bg-white/28 border border-white/50 backdrop-blur-xl flex items-center justify-center text-white shadow-[0_12px_36px_rgba(0,0,0,0.68),inset_0_1.5px_1px_rgba(255,255,255,0.85)] transition-transform hover:scale-110 cursor-pointer group z-10"
              aria-label={
                t("movies.meta.watchNow") ||
                (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")
              }
              title={
                t("movies.meta.watchNow") ||
                (currentLang === "ar" ? "مشاهدة الآن" : "Watch Now")
              }
            >
              <Play
                size={28}
                className="fill-current ms-1 group-hover:scale-110 transition-transform"
              />
            </button>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4 z-10 pointer-events-none">
              <div className="flex items-end gap-3.5 min-w-0">
                <img
                  src={getPosterSrc_static(
                    detailedItem.posterPath,
                    detailedItem.trailerKey,
                    detailedItem.backdropPath,
                  )}
                  alt=""
                  className="hidden sm:block w-20 md:w-24 aspect-[2/3] object-cover rounded-2xl border border-white/35 shadow-2xl flex-shrink-0"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {detailedItem.rating > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 border border-amber-300/45 text-amber-300 backdrop-blur-md">
                        <Star size={11} className="fill-current" />
                        {detailedItem.rating.toFixed(1)}
                      </span>
                    )}
                    {detailedItem.rottenTomatoes && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 border border-rose-300/40 text-rose-200 backdrop-blur-md"
                        title={t("movies.meta.rottenTomatoes", "Rotten Tomatoes")}
                      >
                        <GlassVectorIcon icon={Award} theme="action" size={12} badge={false} />
                        <span>{detailedItem.rottenTomatoes}</span>
                      </span>
                    )}
                    {detailedItem.metascore && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-300/40 text-emerald-200 backdrop-blur-md"
                        title={t("movies.meta.metascore", "Metacritic")}
                      >
                        MC {detailedItem.metascore}
                      </span>
                    )}
                    {detailedItem.year && (
                      <span className="text-xs font-bold text-white/90">
                        {detailedItem.year}
                      </span>
                    )}
                    {detailedItem.certification && (
                      <span className="border border-white/30 bg-white/12 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/95 backdrop-blur-md">
                        {detailedItem.certification}
                      </span>
                    )}
                    {detailedItem.mediaType === "movie"
                      ? detailedItem.runtime ? (
                          <span className="text-xs text-white/80 font-medium">
                            {`${detailedItem.runtime}${t("movies.meta.minutes")}`}
                          </span>
                        ) : null
                      : detailedItem.seasons ? (
                          <span className="text-xs text-white/80 font-medium">
                            {`${detailedItem.seasons} ${t("movies.meta.seasons")}`}
                          </span>
                        ) : null}
                    {detailedItem.mediaType === "tv" &&
                      detailedItem.episodes && (
                        <span className="text-xs text-white/80 font-medium">
                          • {detailedItem.episodes}{" "}
                          {t("movies.meta.episodes")}
                        </span>
                      )}
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white select-text truncate drop-shadow-md">
                    {detailedItem.title}
                  </h3>
                  {detailedItem.tagline && (
                    <p className="text-[11px] sm:text-xs italic text-rose-200/90 truncate">
                      “{detailedItem.tagline}”
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute top-3.5 inset-x-4 flex items-center justify-between gap-2 z-20 pointer-events-none">
              <div className="pointer-events-auto">
                {(activeImdbId || detailedItem.trailerKey) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWatchingInGallery(false);
                      clockReset("manual");
                      setTrailerFallbackToYoutube(!activeImdbId);
                      setShowHeroTrailer(true);
                    }}
                    className="lg-cinema-action-pill px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Film size={13} />
                    <span>{t("movies.player.watchTrailer")}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleToggleGalleryFullscreen}
                  className="lg-cinema-icon-pill !w-9 !h-9 !min-w-[36px] !min-h-[36px] cursor-pointer"
                  aria-label={
                    isAnyFullscreen
                      ? t("movies.player.exitFullscreen")
                      : t("movies.player.fullscreen")
                  }
                  title={
                    isAnyFullscreen
                      ? t("movies.player.exitFullscreen")
                      : t("movies.player.fullscreen")
                  }
                >
                  {isAnyFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="lg-cinema-icon-pill hover:!bg-rose-600/45 hover:!border-rose-300/60"
                  aria-label={t("movies.close")}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pre-Playback Season & Episode Selector (Hidden during active theater playback since it lives in the internal Episodes Drawer) */}
      {!isWatchingInGallery && detailedItem.mediaType === "tv" && (
        <div
          className="lg-cinema-tv-selector-bar rounded-2xl p-3 flex flex-col gap-2.5"
          dir="ltr"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 max-w-full">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white/70 pe-1 shrink-0">
                <Tv size={12} className="text-rose-400" />
                <span>{t("movies.meta.seasons")}</span>
              </span>
              {Array.from(
                { length: Math.max(1, Math.min(30, detailedItem.seasons || 1)) },
                (_, idx) => idx + 1,
              ).map((seasonNum) => {
                const isSeasonActive =
                  !isFullSeasonEmbed && selectedSeason === seasonNum;
                return (
                  <button
                    key={`season-${seasonNum}`}
                    type="button"
                    onClick={() => {
                      setIsFullSeasonEmbed(false);
                      setSelectedSeason(seasonNum);
                      setSelectedEpisode(1);
                      setDetailServersOpen(true);
                      startGalleryWatchSession();
                    }}
                    className={`lg-cinema-tv-pill px-3 py-1 rounded-full text-xs font-extrabold shrink-0 cursor-pointer transition-all ${
                      isSeasonActive
                        ? "lg-cinema-tv-pill--active"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {t("movies.player.season", { num: seasonNum })}
                  </button>
                );
              })}
            </div>

            {(detailedItem.hub || hub) === "movies" && (
              <button
                type="button"
                onClick={() => {
                  setIsFullSeasonEmbed((prev) => !prev);
                  setDetailServersOpen(true);
                  startGalleryWatchSession();
                }}
                className={`lg-cinema-tv-pill px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                  isFullSeasonEmbed
                    ? "lg-cinema-tv-pill--active"
                    : "text-amber-200/90 hover:text-amber-100"
                }`}
                title="https://www.2embed.cc/embedtvfull/..."
              >
                <Layers size={12} />
                <span>{t("movies.player.fullSeason")}</span>
              </button>
            )}
          </div>

          {!isFullSeasonEmbed && (
            <div className="flex flex-col gap-2 pt-0.5">
              {seasonEpisodes.length > 1 && (
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-2">
                  {seasonEpisodes.length > 50 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/90 pe-1 shrink-0">
                        Range:
                      </span>
                      {Array.from(
                        { length: Math.ceil(seasonEpisodes.length / 50) },
                        (_, chunkIdx) => {
                          const start = chunkIdx * 50 + 1;
                          const end = Math.min(
                            seasonEpisodes.length,
                            (chunkIdx + 1) * 50,
                          );
                          const isRangeActive = episodeRangeStart === start;
                          return (
                            <button
                              key={`range-${start}-${end}`}
                              type="button"
                              onClick={() => setEpisodeRangeStart(start)}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 cursor-pointer transition-all ${
                                isRangeActive
                                  ? "bg-rose-600 text-white shadow"
                                  : "bg-white/8 text-white/75 hover:bg-white/15 hover:text-white"
                              }`}
                            >
                              {start}–{end}
                            </button>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/90 pe-1 shrink-0">
                      {currentLang === "ar" ? "انتقال سريع للحلقة:" : "Quick Episode Jump:"}
                    </span>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const num = parseInt(episodeJumpInput.trim(), 10);
                      if (!Number.isNaN(num) && num >= 1) {
                        const clamped = Math.min(
                          Math.max(1, num),
                          Math.max(seasonEpisodes.length, num),
                        );
                        setIsFullSeasonEmbed(false);
                        setSelectedEpisode(clamped);
                        setDetailServersOpen(true);
                        startGalleryWatchSession();
                        setEpisodeJumpInput("");
                      }
                    }}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1500, seasonEpisodes.length)}
                      value={episodeJumpInput}
                      onChange={(e) => setEpisodeJumpInput(e.target.value)}
                      placeholder={currentLang === "ar" ? "رقم الحلقة" : "Jump to Ep #"}
                      className="w-24 px-2.5 py-0.5 rounded-full bg-black/50 border border-white/25 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-rose-400 text-center tabular-nums"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-0.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-[11px] font-extrabold text-white cursor-pointer transition"
                    >
                      Go
                    </button>
                  </form>
                </div>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/65 pe-1 shrink-0">
                  {t("movies.meta.episodes")}
                </span>
                {loadingSeasonEpisodes && seasonEpisodes.length === 0 ? (
                  <span className="text-xs text-white/60 font-bold px-2">
                    {t("movies.meta.loading")}
                  </span>
                ) : (
                  (seasonEpisodes.length > 50
                    ? seasonEpisodes.slice(
                        episodeRangeStart - 1,
                        episodeRangeStart - 1 + 50,
                      )
                    : seasonEpisodes
                  ).map((ep) => {
                    const isEpActive =
                      selectedEpisode === ep.episode_number;
                    return (
                      <button
                        key={`ep-${selectedSeason}-${ep.episode_number}`}
                        type="button"
                        onClick={() => {
                          setIsFullSeasonEmbed(false);
                          setSelectedEpisode(ep.episode_number);
                          setDetailServersOpen(true);
                          startGalleryWatchSession();
                        }}
                        className={`lg-cinema-tv-ep-pill px-2.5 py-1 rounded-full text-xs font-bold shrink-0 cursor-pointer transition-all inline-flex items-center gap-1 ${
                          isEpActive
                            ? "lg-cinema-tv-ep-pill--active"
                            : "text-white/80 hover:text-white"
                        }`}
                        title={ep.name}
                      >
                        <span>E{ep.episode_number}</span>
                        {isEpActive && ep.name && (
                          <span className="max-w-[140px] truncate text-[11px] opacity-95 font-semibold ms-0.5">
                            • {ep.name}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
