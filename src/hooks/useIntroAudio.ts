import { useEffect, useRef, useState, useCallback } from 'react';
import { getHlsClass, getOrCreateHls } from '../audio/hlsPool';
import { audioManager } from '../audio/audioManager';

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
    audioRef.current = audio;

    // Register with AudioManager
    audioManager.register('intro', audio, volume);

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
        await audioManager.play('intro');
        setIsPlaying(true);
      } catch (err) {
        console.warn('[useIntroAudio] auto-play blocked:', err);
      }
    };
    attach();
    return () => {
      audioManager.unregister('intro');
      audio.src = '';
      audioRef.current = null;
    };
  }, [enabled, src, volume]);

  const play = useCallback(async () => {
    try {
      await audioManager.play('intro');
      setIsPlaying(true);
    } catch (err) {
      console.warn('[useIntroAudio] play blocked:', err);
    }
  }, []);

  const pause = useCallback(() => {
    audioManager.pause('intro');
    setIsPlaying(false);
  }, []);

  const fadeOut = useCallback((ms: number = 800) => {
    audioManager.pause('intro', ms);
    setIsPlaying(false);
  }, []);

  return { play, pause, fadeOut, isPlaying, isReady, audioRef };
};

