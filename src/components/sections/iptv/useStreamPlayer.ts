import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { StreamItem, StreamErrorType } from './types';

function classifyStreamError(
  error: unknown,
  hlsErrorType?: string
): StreamErrorType {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (!navigator.onLine) return 'NETWORK_OFFLINE';
    if (msg.includes('failed to fetch') ||
        msg.includes('network error') ||
        msg.includes('load failed')) {
      return 'CORS_BLOCKED';
    }
  }
  if (hlsErrorType === 'NETWORK_CORS_TIMEOUT') return 'CORS_BLOCKED';
  if (hlsErrorType === 'PROBE_TIMEOUT_5S') return 'TIMEOUT';
  if (hlsErrorType === 'MEDIA_FILE_INVALID') return 'MEDIA_DECODE';
  if (hlsErrorType === 'STREAM_DEFEATED') return 'STREAM_DEAD';
  return 'UNKNOWN';
}

export function useStreamPlayer(options?: {
  onSuccess?: (stream: StreamItem) => void;
  onNextStream?: () => void;
}) {
  const { onSuccess, onNextStream } = options || {};
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStream, setCurrentStream] = useState<StreamItem | null>(null);

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = localStorage.getItem('retro_tv_volume');
      const n = v ? parseFloat(v) : 0.8;
      return isNaN(n) ? 0.8 : Math.min(1, Math.max(0, n));
    } catch {
      return 0.8;
    }
  });

  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('retro_tv_muted') === 'true';
    } catch {
      return true;
    }
  });

  const backupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const probeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStream = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = '';
    }
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
      backupTimeoutRef.current = null;
    }
    if (probeTimeoutRef.current) {
      clearTimeout(probeTimeoutRef.current);
      probeTimeoutRef.current = null;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setError(null);
  }, []);

  const startStream = useCallback((item: StreamItem) => {
    stopStream();
    setCurrentStream(item);

    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(true);
    setError(null);
    setIsPlaying(false);

    const activeQual = item.qualities[item.currentQualityIndex];
    if (!activeQual || !activeQual.url) {
      setError('No usable Stream Link!');
      setIsBuffering(false);
      return;
    }

    const streamUrl = activeQual.url.trim();
    const isHlsFormat = 
      streamUrl.toLowerCase().includes('.m3u8') ||
      streamUrl.toLowerCase().includes('manifest') ||
      streamUrl.toLowerCase().includes('/chunklist') ||
      streamUrl.toLowerCase().includes('smil:');

    const handleSuccess = () => {
      if (probeTimeoutRef.current) {
        clearTimeout(probeTimeoutRef.current);
        probeTimeoutRef.current = null;
      }
      setIsBuffering(false);
      setError(null);
      setIsPlaying(true);
      if (onSuccess) {
        onSuccess(item);
      }
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = isMuted;
        videoRef.current.play().catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMutedState(true);
            try {
              localStorage.setItem('retro_tv_muted', 'true');
            } catch {}
            videoRef.current.play().catch(() => {});
          }
        });
      }
    };

    const handleFailure = (errCol: string) => {
      if (probeTimeoutRef.current) {
        clearTimeout(probeTimeoutRef.current);
        probeTimeoutRef.current = null;
      }
      setIsBuffering(false);
      setIsPlaying(false);

      const classifiedType = classifyStreamError(null, errCol);
      if (classifiedType === 'CORS_BLOCKED') {
        setError('CORS_BLOCKED');
        return;
      }

      const hasNextQuality = item.qualities.length > 1 && item.currentQualityIndex < item.qualities.length - 1;
      
      if (hasNextQuality) {
        const nextIdx = item.currentQualityIndex + 1;
        setError(`Signal Low — Retrying backup stream link ${nextIdx + 1}/${item.qualities.length}...`);
        
        backupTimeoutRef.current = setTimeout(() => {
          const updated = {
            ...item,
            currentQualityIndex: nextIdx,
          };
          startStream(updated);
        }, 2200);
      } else {
        setError('📡 انقطع البث — الانتقال للقناة التالية...');
        backupTimeoutRef.current = setTimeout(() => {
          if (onNextStream) {
            onNextStream();
          }
        }, 2000);
      }
    };

    probeTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      handleFailure('PROBE_TIMEOUT_5S');
    }, 5000);

    if (isHlsFormat) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        const onCanPlay = () => {
          handleSuccess();
          video.removeEventListener('canplay', onCanPlay);
        };
        const onErr = () => {
          handleFailure('NATIVE_HLS_ERR');
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onErr);
        video.load();
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 15,
          manifestLoadingTimeOut: 6000,
          levelLoadingTimeOut: 6000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          handleSuccess();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              handleFailure('NETWORK_CORS_TIMEOUT');
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              handleFailure('STREAM_DEFEATED');
            }
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else {
        handleFailure('HLS_NOT_SUPPORTED_BROWSER');
      }
    } else {
      video.src = streamUrl;
      const onCanPlay = () => {
        handleSuccess();
        video.removeEventListener('canplay', onCanPlay);
      };
      const onErr = () => {
        handleFailure('MEDIA_FILE_INVALID');
        video.removeEventListener('error', onErr);
      };
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onErr);
      video.load();
    }
  }, [volume, isMuted, onSuccess, onNextStream, stopStream]);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    try {
      localStorage.setItem('retro_tv_volume', String(val));
    } catch {}
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0) {
        setIsMutedState(false);
        try {
          localStorage.setItem('retro_tv_muted', 'false');
        } catch {}
        videoRef.current.muted = false;
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const nextMute = !prev;
      if (videoRef.current) videoRef.current.muted = nextMute;
      try {
        localStorage.setItem('retro_tv_muted', String(nextMute));
      } catch {}
      return nextMute;
    });
  }, []);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const switchQuality = useCallback((index: number) => {
    if (currentStream) {
      const updated = {
        ...currentStream,
        currentQualityIndex: index
      };
      startStream(updated);
    }
  }, [currentStream, startStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    isPlaying,
    volume,
    isMuted,
    currentStream,
    error,
    isBuffering,
    startStream,
    stopStream,
    toggleMute,
    setVolume,
    switchQuality,
    onTogglePlayback: togglePlayback
  };
}
