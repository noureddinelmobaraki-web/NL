import { useCallback } from 'react';
import {
  type HomeMotionCapability,
  type HomeMotionMode,
} from './homeMotion.types';

/**
 * Permanently locked to 'a777' mode per user specification.
 */
export function useHomeMotionMode() {
  const mode: HomeMotionMode = 'a777';

  const setMode = useCallback((_next: HomeMotionMode) => {
    // Locked to 'a777'
  }, []);

  const toggleMode = useCallback(() => {
    // Locked to 'a777'
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

