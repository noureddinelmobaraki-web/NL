/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useRef, useState } from "react";
import { useTvRecorder } from "../../../hooks/useTvRecorder";

export function useTvPlaybackState() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isVideoError, setIsVideoError] = useState(false);

  const videoRefElement = useRef<HTMLVideoElement | null>(null);
  const { isRecording, errorMsg: recordErr, startRecording, stopRecording } = useTvRecorder();

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (videoRefElement.current) {
      startRecording(videoRefElement.current);
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVideoRefReady = useCallback((video: HTMLVideoElement | null) => {
    videoRefElement.current = video;
  }, []);

  const handleVideoErrorState = useCallback((hasError: boolean) => {
    setIsVideoError(hasError);
    if (hasError) {
      setIsPlaying(false);
    }
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
    isVideoError,
    setIsVideoError,
    videoRefElement,
    isRecording,
    recordErr,
    handleToggleRecording,
    handleVideoRefReady,
    handleVideoErrorState,
  };
}

export type UseTvPlaybackStateResult = ReturnType<typeof useTvPlaybackState>;
