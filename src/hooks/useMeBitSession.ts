import { useEffect, useRef } from 'react';
import { audioManager } from '../audio/audioManager';

/**
 * Owns the MeBit "session" lifecycle. Exactly one suppress/release pair
 * per open event, with a safety belt on unmount.
 */
export function useMeBitSession(isOpen: boolean) {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1) open new session with a unique reason key
    const sessionId = `mebit-session:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    sessionIdRef.current = sessionId;
    audioManager.suppressBg(sessionId);

    // 2) symmetric release on close OR unmount
    return () => {
      if (sessionIdRef.current) {
        audioManager.releaseBg(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      // belt-and-suspenders: drop anything that might have leaked
      audioManager.forceReleaseBgPrefix('mebit-session');
    };
  }, [isOpen]);
}
