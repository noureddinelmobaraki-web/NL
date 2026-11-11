/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Mobile & iOS Touch Layout Hook
 * - Implements Confirmed Decision 2: Touch controls are hidden by default when a game starts,
 *   and toggled manually via the Top Bar Gamepad button.
 * - Automatically selects the matching ControlProfile ('flash-pc' | 'console-pad' | 'direct-touch')
 *   for the current game, with manual profile cycling.
 * - Handles iOS Safari Pseudo-Fullscreen fallback when native requestFullscreen is unavailable.
 */

import { useState, useEffect, useCallback, type RefObject } from 'react';
import type { ControlProfile } from '../types/games.types';

export function useMobileTouchLayout(
  defaultProfile: ControlProfile,
  selectedGameId: string | null,
  screenRef: RefObject<HTMLDivElement | null>,
) {
  // Confirmed Decision 2: Hidden by default on game start, shown when user clicks Gamepad button
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [controlProfile, setControlProfile] =
    useState<ControlProfile>(defaultProfile);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  // Sync profile when switching games, while keeping touch controls hidden by default
  useEffect(() => {
    setControlProfile(defaultProfile);
    setShowTouchControls(false);
  }, [selectedGameId, defaultProfile]);

  const toggleTouchControls = useCallback(() => {
    setShowTouchControls((prev) => {
      const next = !prev;
      if (next && controlProfile === 'direct-touch') {
        setControlProfile('flash-pc');
      }
      return next;
    });
  }, [controlProfile]);

  const cycleControlProfile = useCallback(() => {
    setControlProfile((prev) =>
      prev === 'flash-pc' ? 'console-pad' : 'flash-pc',
    );
  }, []);

  const toggleSmartFullscreen = useCallback(() => {
    const el = screenRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      setIsPseudoFullscreen(false);
      return;
    }

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }

    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen()
        .then(() => {
          try {
            (
              screen.orientation as unknown as {
                lock?: (mode: string) => Promise<void>;
              }
            )?.lock?.('landscape');
          } catch {
            // ignore orientation lock restriction
          }
        })
        .catch(() => {
          // iOS Safari fallback
          setIsPseudoFullscreen(true);
        });
    } else {
      // iOS Safari where requestFullscreen is undefined on div
      setIsPseudoFullscreen(true);
    }
  }, [isPseudoFullscreen, screenRef]);

  return {
    showTouchControls,
    setShowTouchControls,
    toggleTouchControls,
    controlProfile,
    cycleControlProfile,
    isPseudoFullscreen,
    toggleSmartFullscreen,
  };
}
