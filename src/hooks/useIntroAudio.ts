import { useEffect, useRef, useState, useCallback } from 'react';
import { getHlsClass, getOrCreateHls } from '../audio/hlsPool';

export interface UseIntroAudioOpts {
  src: string;
  enabled: boolean;
  volume?: number;
}

export const useIntroAudio = ({ src, enabled, volume = 0.6 }: UseIntroAudioOpts) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!enabled || audioRef.current) return;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const attach = async () => {
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src;
        audio.load();
      } else {
        const Hls = await getHlsClass();
        if (Hls.isSupported()) {
          const hls = await getOrCreateHls(src);
          hls.attachMedia(audio);
        }
      }
      setIsReady(true);
      // Auto-play when ready if enabled
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('[useIntroAudio] auto-play blocked:', err);
      }
    };
    attach();
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [enabled, src, volume]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[useIntroAudio] play blocked:', err);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const fadeOut = useCallback((ms: number = 800) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const startVol = audio.volume;
    const startTime = performance.now();
    const tick = (now: number) => {
      let progress = (now - startTime) / ms;
      if (progress >= 1) progress = 1;
      audio.volume = Math.max(0, startVol * (1 - progress));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  return { play, pause, fadeOut, isPlaying, isReady, audioRef };
};
