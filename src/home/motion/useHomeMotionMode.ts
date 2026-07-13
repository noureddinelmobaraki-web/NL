import { useCallback, useState } from 'react';
import {
  HOME_MOTION_STORAGE_KEY,
  type HomeMotionCapability,
  type HomeMotionMode,
} from './homeMotion.types';

function readInitialMode(): HomeMotionMode {
  if (typeof window === 'undefined') return 'normal';
  try {
    return window.localStorage.getItem(HOME_MOTION_STORAGE_KEY) === 'a777'
      ? 'a777'
      : 'normal';
  } catch {
    return 'normal';
  }
}

/**
 * User choice is authoritative. A777 is available on every device.
 * Runtime frame health — not guessed hardware class — decides whether an
 * automatic safety fallback is necessary.
 */
export function useHomeMotionMode() {
  const [mode, setModeState] = useState<HomeMotionMode>(readInitialMode);

  const setMode = useCallback((next: HomeMotionMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(HOME_MOTION_STORAGE_KEY, next);
    } catch {
      // Restricted/private storage must not prevent the in-memory switch.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((previous) => {
      const next: HomeMotionMode = previous === 'normal' ? 'a777' : 'normal';
      try {
        window.localStorage.setItem(HOME_MOTION_STORAGE_KEY, next);
      } catch {
        // Keep the current-session choice.
      }
      return next;
    });
  }, []);

  const capability: HomeMotionCapability = {
    eligible: true,
    reason: null,
  };

  return {
    requestedMode: mode,
    effectiveMode: mode,
    capability,
    toggleMode,
    setMode,
  } as const;
}
