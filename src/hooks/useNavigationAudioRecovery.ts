import { useEffect, useRef } from 'react';
import { audioManager } from '../audio/audioManager';
import { useAppContext } from '../context/AppContext';

/**
 * Listens to currentPage changes. After a 250ms debounce, calls
 * audioManager.recoverAudio() to drop stale nav-scoped suppressors
 * and resume bg if appropriate.
 *
 * Mount once at the App root (after providers).
 *
 * Fixes:
 *   - #1 "MySongs → Home → bg never returns" (stale active_song suppressor
 *        is now flushed on nav).
 *   - #3 "MusicMood entry leaves bg dead" (recoverAudio is called when
 *        currentPage transitions into 'mood'; combined with P10.10's
 *        explicit unpauseBg this seals the bug).
 *
 * Debounce reason: page transitions sometimes fire 2 setCurrentPage calls
 * back-to-back (scroll + click). We only want one recovery attempt.
 */
export function useNavigationAudioRecovery(debounceMs = 250): void {
  const { currentPage } = useAppContext();
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the very first mount: bg startup is owned by useAudioController,
    // we don't want to race it.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      audioManager.recoverAudio();
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [currentPage, debounceMs]);
}
