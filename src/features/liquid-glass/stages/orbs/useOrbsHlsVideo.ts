import React, { useCallback, useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { LIQUID_GLASS_ALL_HLS_VIDEOS } from '../../albumsData';
import { GLASS_CONFIG } from './portalShaders';
import type { LiquidGlassMode } from './useQuadLensWebGL';

export const LIQUID_GLASS_HLS_VIDEOS: readonly string[] = LIQUID_GLASS_ALL_HLS_VIDEOS;

interface UseOrbsHlsVideoParams {
  mode: LiquidGlassMode;
  effectiveMuted: boolean;
  currentVideoIndex: number | null;
  onTriggerRandomVideo: () => void;
  onVideoAspectChange: (aspect: number) => void;
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  onVideoElementMount?: (mediaEl: HTMLMediaElement | null) => void;
}

export function useOrbsHlsVideo({
  mode,
  effectiveMuted,
  currentVideoIndex,
  onTriggerRandomVideo,
  onVideoAspectChange,
  onVideoAudioActiveChange,
  onVideoElementMount,
}: UseOrbsHlsVideoParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const seekTrackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (mode !== 'video') {
      setIsPlaying(false);
      onVideoElementMount?.(null);
      return undefined;
    }
    const el = videoRef.current;
    onVideoElementMount?.(el);
    return () => {
      onVideoElementMount?.(null);
    };
  }, [mode, onVideoElementMount]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = effectiveMuted;
    }
  }, [effectiveMuted, currentVideoIndex]);

  useEffect(() => {
    if (mode !== 'video' || currentVideoIndex === null) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    const streamUrl = LIQUID_GLASS_HLS_VIDEOS[currentVideoIndex];
    let cancelled = false;

    const destroyCurrentHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
    };

    destroyCurrentHls();
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    video.muted = effectiveMuted;

    const onLoadedMetadata = () => {
      if (cancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const ratio = Math.min(Math.max(video.videoWidth / video.videoHeight, 0.45), 2.4);
        onVideoAspectChange(ratio);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      setIsBuffering(false);
    };

    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(video.currentTime || 0);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onVideoAudioActiveChange?.(true);
    };

    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    const onEnded = () => {
      setIsPlaying(false);
      if (GLASS_CONFIG.autoAdvanceOnEnded) {
        onTriggerRandomVideo();
      } else {
        onVideoAudioActiveChange?.(false);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    const startPlayback = () => {
      if (cancelled) return;
      video.play().catch(() => setIsPlaying(false));
    };

    void (async () => {
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          startPosition: 0,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          backBufferLength: 15,
        });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, startPlayback);
        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            destroyCurrentHls();
            setIsBuffering(false);
          }
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', startPlayback, { once: true });
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      destroyCurrentHls();
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
    };
  }, [
    mode,
    currentVideoIndex,
    effectiveMuted,
    onVideoAspectChange,
    onVideoAudioActiveChange,
    onTriggerRandomVideo,
  ]);

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const bar = seekTrackRef.current;
      const v = videoRef.current;
      if (!bar || !v || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      const nextTime = ratio * duration;
      v.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration],
  );

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const handleSeekPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    videoRef,
    seekTrackRef,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlayPause,
    handleSeekPointerDown,
    handleSeekPointerMove,
    handleSeekPointerUp,
  };
}
