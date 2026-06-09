import { useEffect, useRef, useState, useCallback } from 'react';
import { getHlsClass, getOrCreateHls } from '../audio/hlsPool';
import { audioManager } from '../audio/audioManager';

export interface UseIntroAudioOpts {
  src: string;
  enabled: boolean;
  volume?: number;
}

export const useIntroAudio = ({ src, volume = 0.6 }: UseIntroAudioOpts) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initialized.current) return;
    initialized.current = true;
    
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.volume = 0; // Starts at 0, audioManager handles fade
    audioRef.current = audio;

    audioManager.register('intro', audio, volume);

    const setupStream = async () => {
      try {
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
      } catch (err) {
        console.warn('[useIntroAudio] Setup failed:', err);
      }
    };
    
    setupStream();

    return () => {
      audioManager.stop('intro'); // Full stop, unregisters implicitly or safely
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src, volume]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      // Synchronous play to capture user gesture
      const playPromise = audioRef.current.play();
      // Delegate to audio manager for fade, state, and suppression
      audioManager.play('intro').catch(() => {});
      await playPromise;
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

  return { play, pause, fadeOut, isPlaying, isReady: true, audioRef };
};

