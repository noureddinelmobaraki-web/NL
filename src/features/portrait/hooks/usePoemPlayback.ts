import { useCallback, useEffect, useRef, useState } from 'react';
import { audioManager } from '../../../audio/audioManager';
import { POEM_CONFIG, POEM_LINES } from '../poem';
import { PORTRAIT_POEM_SOURCE } from '../constants';

export type PoemLine = { id: number; words: string[]; shown: number };

/**
 * Drives the recital. One self-rescheduling timeout, never an interval:
 * word steps and line pauses have different durations, and an interval would
 * drift against them.
 */
export function usePoemPlayback(active: boolean) {
  const [lines, setLines] = useState<PoemLine[]>([]);
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active) {
      setLines([]);
      setFinished(false);
      return;
    }

    let cancelled = false;
    let timer = 0;
    let lineIdx = 0;
    let wordIdx = 0;
    let nextId = 0;

    const step = () => {
      if (cancelled) return;

      if (lineIdx >= POEM_LINES.length) {
        setFinished(true);
        return;
      }

      const words = POEM_LINES[lineIdx].split(/\s+/).filter(Boolean);

      if (wordIdx === 0) {
        const id = nextId++;
        setLines((prev) =>
          [...prev, { id, words, shown: 1 }].slice(-POEM_CONFIG.domLines),
        );
        wordIdx = 1;
      } else if (wordIdx < words.length) {
        wordIdx += 1;
        const shown = wordIdx;
        setLines((prev) =>
          prev.map((l, i) => (i === prev.length - 1 ? { ...l, shown } : l)),
        );
      } else {
        lineIdx += 1;
        wordIdx = 0;
        timer = window.setTimeout(step, POEM_CONFIG.lineHoldMs);
        return;
      }

      timer = window.setTimeout(step, POEM_CONFIG.msPerWord);
    };

    step();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active]);

  /**
   * Callback ref rather than an effect: it runs the moment React attaches the
   * node, so registration cannot depend on render order or on `active`.
   */
  const setAudio = useCallback((node: HTMLAudioElement | null) => {
    if (audioRef.current === node) return;
    if (audioRef.current) {
      audioManager.stop(PORTRAIT_POEM_SOURCE);
      try {
        audioManager.unregister(PORTRAIT_POEM_SOURCE);
      } catch {
        /* not registered */
      }
    }
    audioRef.current = node;
    if (node) audioManager.register(PORTRAIT_POEM_SOURCE, node, 0.85);
  }, []);

  useEffect(() => () => {
    audioManager.stop(PORTRAIT_POEM_SOURCE);
    try {
      audioManager.unregister(PORTRAIT_POEM_SOURCE);
    } catch {
      /* not registered */
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const el = audioRef.current;
    if (!el) return undefined;

    // The resource selection algorithm reads the preload *property*, so it has
    // to be raised before load() — with preload="none" or "metadata", load()
    // selects the resource, fires `suspend`, and fetches no media data at all.
    // readyState would stay 0, play() would park in pendingPlay, and `canplay`
    // would never fire. This one assignment is what starts the download.
    try {
      el.preload = 'auto';
      el.load();
    } catch {
      /* ignore */
    }

    // audioManager's own `canplay` catch-up is dead: register() captures the
    // entry generation and play() increments it, so its staleness check can
    // never pass after the first play(). Retry from our own listener, the way
    // RetroWorldPage.tsx:92 does.
    const tryPlay = () => {
      audioManager.requestExclusive(PORTRAIT_POEM_SOURCE, 'portrait_poem');
      void audioManager.play(PORTRAIT_POEM_SOURCE, { force: true });
    };
    el.addEventListener('canplay', tryPlay);

    // 'poem' is priority 7, above 'portrait' (6), 'video' (5) and 'bg' (1),
    // so requestExclusive pauses every other managed source and suppresses the
    // theme background. force: true covers the case where something with a
    // higher priority — 'profile' is 12 — is somehow still active.
    tryPlay();

    return () => {
      el.removeEventListener('canplay', tryPlay);
      audioManager.pause(PORTRAIT_POEM_SOURCE, 220);
      audioManager.releaseExclusive('portrait_poem');
      // Next switch-on must start from the first word, not from wherever the
      // recital was interrupted. The text always restarts, so the audio has to.
      try {
        el.currentTime = 0;
      } catch {
        /* seeking can throw before metadata is known */
      }
    };
  }, [active]);

  return { lines, finished, setAudio };
}
