/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * useLauncherIntroDirector — The phase clock.
 * Schedules each cue with a timeout (state changes ~12 times total, never per frame),
 * exposes skip(), and guarantees a clean hand-off to the user at `done`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_ANCHORS,
  GRAPH_RESET,
  INTRO_CUES,
  INTRO_SKIP_SETTLE_MS,
  sameAnchors,
  type GraphScript,
  type IntroAnchors,
  type IntroPhase,
} from './launcherIntro.timeline';

export interface LauncherIntroDirector {
  active: boolean;
  phase: IntroPhase;
  graphScript: GraphScript | null;
  anchors: IntroAnchors;
  reportAnchors: (next: IntroAnchors) => void;
  skip: () => void;
}

export function useLauncherIntroDirector(enabled: boolean): LauncherIntroDirector {
  const [phase, setPhase] = useState<IntroPhase>(enabled ? 'boot' : 'done');
  const [graphScript, setGraphScript] = useState<GraphScript | null>(enabled ? GRAPH_RESET : null);
  const [anchors, setAnchors] = useState<IntroAnchors>(EMPTY_ANCHORS);

  const timersRef = useRef<number[]>([]);
  const settlingRef = useRef(false);
  const doneRef = useRef(!enabled);

  const active = phase !== 'done';

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    setPhase('done');
    setGraphScript(null);
  }, [clearTimers]);

  const skip = useCallback(() => {
    if (doneRef.current || settlingRef.current) return;
    settlingRef.current = true;
    clearTimers();
    setPhase('settle');
    setGraphScript(GRAPH_RESET);
    timersRef.current.push(window.setTimeout(finish, INTRO_SKIP_SETTLE_MS));
  }, [clearTimers, finish]);

  // Cue scheduler (StrictMode-safe: cleanup clears, re-run reschedules).
  useEffect(() => {
    if (!enabled) return undefined;
    doneRef.current = false;
    settlingRef.current = false;

    for (const cue of INTRO_CUES) {
      if (cue.at === 0) continue; // initial state already equals the first cue
      const id = window.setTimeout(() => {
        if (cue.phase === 'done') {
          finish();
          return;
        }
        if (cue.phase === 'settle') settlingRef.current = true;
        setPhase(cue.phase);
        if (cue.graph) setGraphScript(cue.graph);
      }, cue.at);
      timersRef.current.push(id);
    }

    return clearTimers;
  }, [enabled, clearTimers, finish]);

  // Global skip inputs while active.
  useEffect(() => {
    if (!active) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') skip();
    };
    const onWheel = () => skip();
    const onVisibility = () => {
      if (document.hidden) finish();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, skip, finish]);

  const reportAnchors = useCallback((next: IntroAnchors) => {
    setAnchors((prev) => (sameAnchors(prev, next) ? prev : next));
  }, []);

  return useMemo(
    () => ({ active, phase, graphScript, anchors, reportAnchors, skip }),
    [active, phase, graphScript, anchors, reportAnchors, skip],
  );
}
