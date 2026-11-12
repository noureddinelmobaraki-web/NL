/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useRef, useState } from "react";
import type HlsType from "hls.js";
import type { ExtractedVideoStream } from "../../../services/videoExtractor";
import { useClockState } from "../../../features/cinema/player/playbackClock";

export function useGalleryPlayerState() {
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

  return {
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
  };
}

export type UseGalleryPlayerStateResult = ReturnType<typeof useGalleryPlayerState>;
