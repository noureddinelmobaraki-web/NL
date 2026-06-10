import { useCallback, useEffect, useState } from 'react';
import { introAudioController } from '../audio/introAudioController';

export interface UseIntroAudioOpts {
  src: string;
  enabled: boolean;
  volume?: number;
}

/**
 * Thin wrapper around the single introAudioController.
 * Kept signature-compatible with LoadingScreen (play / pause / fadeOut).
 */
export const useIntroAudio = ({ volume = 0.6 }: UseIntroAudioOpts) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    introAudioController.ensureSetup(volume);
  }, [volume]);

  const play = useCallback(async () => {
    await introAudioController.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    introAudioController.pause();
    setIsPlaying(false);
  }, []);

  const fadeOut = useCallback((ms = 800) => {
    introAudioController.fadeOut(ms);
    setIsPlaying(false);
  }, []);

  return { play, pause, fadeOut, isPlaying, isReady: true };
};
