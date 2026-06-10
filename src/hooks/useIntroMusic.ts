import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { audioManager } from '../audio/audioManager';
import { introAudioController } from '../audio/introAudioController';

/**
 * In-page "Intro Music" button hook. Delegates to the single
 * introAudioController so it shares ownership of the 'intro' source
 * with the welcome screen (no registration conflict).
 */
export function useIntroMusic(volume = 0.6) {
  const isIntroPlaying = useSyncExternalStore(
    (cb) => audioManager.subscribeState('intro', cb),
    () => audioManager.isSourceActive('intro'),
    () => false,
  );

  useEffect(() => {
    introAudioController.ensureSetup(volume);
  }, [volume]);

  const toggleIntro = useCallback(() => {
    if (audioManager.isSourceActive('intro')) {
      introAudioController.pause(); // keeps currentTime => resume next press
    } else {
      void introAudioController.play();
    }
  }, []);

  return { isIntroPlaying, toggleIntro };
}
