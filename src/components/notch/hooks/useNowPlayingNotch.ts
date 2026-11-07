import { useEffect, useMemo, useRef, useState } from "react";
import {
  SOURCE_ACCENTS,
  nowPlayingBus,
  useNowPlayingState,
  type NowPlayingState,
} from "../../../audio/nowPlayingBus";
import type { NotchTransport } from "../notch.types";

const STICKY_PAUSED_MS = 25_000;

/**
 * Universal Audio Sensor for NotchIsland:
 * - Senses ANY active publisher on `nowPlayingBus` (songs, albums, audiobooks, profile theme songs, etc.).
 * - Supports a 25-second sticky-paused window when playback transitions from playing -> paused
 *   so the user can resume directly from the Dynamic Island pill.
 * - Collapses immediately to `orb` when `onStop` is clicked or `nowPlayingBus.clear()` is called.
 */
export function useNowPlayingNotch(): NotchTransport | null {
  const np = useNowPlayingState();
  const [stickyPaused, setStickyPaused] = useState<NowPlayingState | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (!np) {
      wasPlayingRef.current = false;
      setStickyPaused(null);
      return undefined;
    }

    if (np.isPlaying) {
      wasPlayingRef.current = true;
      setStickyPaused(null);
      return undefined;
    }

    // Transitioned from playing -> paused while still on the bus
    if (wasPlayingRef.current) {
      setStickyPaused(np);
      const timer = window.setTimeout(() => {
        setStickyPaused(null);
        wasPlayingRef.current = false;
      }, STICKY_PAUSED_MS);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [np]);

  const activeState = np?.isPlaying ? np : stickyPaused && np ? np : null;

  return useMemo<NotchTransport | null>(() => {
    if (!activeState) return null;
    const c = activeState.controls;
    const hasControls = !!c;
    const source = activeState.source;
    return {
      title: activeState.title?.trim() || "Untitled",
      subtitle: activeState.subtitle,
      artworkUrl: activeState.artworkUrl,
      source,
      accent: activeState.accent ?? SOURCE_ACCENTS[source] ?? "#7fd0ff",
      isPlaying: activeState.isPlaying,
      canPrev: activeState.canPrev !== false && !!c?.prev,
      canNext: activeState.canNext !== false && !!c?.next,
      onToggle: () => c?.toggle?.(),
      onNext: () => c?.next?.(),
      onPrev: () => c?.prev?.(),
      onStop: () => {
        wasPlayingRef.current = false;
        setStickyPaused(null);
        if (c?.stop) {
          c.stop();
        } else {
          c?.toggle?.();
          nowPlayingBus.clear(source);
        }
      },
      hasControls,
    };
  }, [activeState]);
}
