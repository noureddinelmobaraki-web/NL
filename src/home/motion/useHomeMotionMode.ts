import { useCallback } from 'react';
import {
  type HomeMotionCapability,
  type HomeMotionMode,
} from './homeMotion.types';

/**
 * Permanently locked to static 'normal' mode on both desktop and mobile per user specification.
 */
export function useHomeMotionMode() {
  const mode: HomeMotionMode = 'normal';

  const setMode = useCallback((_next: HomeMotionMode) => {
    // Locked to 'normal'
  }, []);

  const toggleMode = useCallback(() => {
    // Locked to 'normal'
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

