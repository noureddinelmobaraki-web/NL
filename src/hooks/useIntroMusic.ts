import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { audioManager } from '../audio/audioManager';
import { introAudioController } from '../audio/introAudioController';

/**
 * In-page "Intro Music" button hook. Delegates to the single
 * introAudioController so it shares ownership of the 'intro' source
 * with the welcome screen (no registration conflict).
 *
 * The button state combines two signals:
 *  - `active`  : confirmed playback from audioManager (true only once the audio
 *                truly starts — which lags while a lazy stream buffers).
 *  - `desired` : an optimistic intent flag that flips the instant the user
 *                presses, so the button never looks "off" during buffering.
 * Using `desired || active` removes the old 1-to-3 press lag/race.
 */
export function useIntroMusic(volume = 0.6) {
  const active = useSyncExternalStore(
    (cb) => audioManager.subscribeState('intro', cb),
    () => audioManager.isSourceActive('intro'),
    () => false,
  );

  const desired = useSyncExternalStore(
    introAudioController.subscribeDesired,
    introAudioController.getDesired,
    () => false,
  );

  const isIntroPlaying = desired || active;

  useEffect(() => {
    introAudioController.ensureSetup(volume);
  }, [volume]);

  const toggleIntro = useCallback(() => {
    // Read LIVE state (not a stale render closure) so a not-yet-buffered stream
    // can never report "off" and cause a double/triple press.
    const on =
      introAudioController.getDesired() || audioManager.isSourceActive('intro');
    if (on) {
      introAudioController.pause(); // keeps currentTime => resume next press
    } else {
      void introAudioController.play();
    }
  }, []);

  return { isIntroPlaying, toggleIntro };
}
