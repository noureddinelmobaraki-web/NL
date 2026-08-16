import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  PORTRAIT_ASSETS,
  PORTRAIT_PREWARM,
  PORTRAIT_SOURCE_SIZE,
  SUBJECT_BOX,
  SUBJECT_CENTER,
  ERASE_POINTER,
  ERASE_TOUCH,
  ORBIT_POINTER,
  ORBIT_TOUCH,
  isCoarsePointer,
} from './constants';
import { useStageMetrics } from './hooks/useStageMetrics';
import { useEraseMask } from './hooks/useEraseMask';
import { useOrbitAnimation } from './hooks/useOrbitAnimation';
import { usePortraitAudio } from './hooks/usePortraitAudio';
import { usePoemPlayback } from './hooks/usePoemPlayback';
import { usePoemStage } from './hooks/usePoemStage';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { usePortraitHints } from './hooks/usePortraitHints';
import { HintArrows, HintToggleArrow } from './components/HintArrows';
import { LampHotspot } from './components/LampHotspot';
import { OrbitVideo } from './components/OrbitVideo';
import { PoemOverlay } from './components/PoemOverlay';
import { PoemToggle } from './components/PoemToggle';
import { isAutomatedEnv } from '../../utils/env';
import './portrait.css';

type VideoPhase = 'idle' | 'resting' | 'orbiting';

export default function PortraitPage() {
  const { closePortrait } = useAppContext();

  // Pointer class is read once: a device does not change its input type
  // mid-session, and re-reading it would churn the canvas allocation.
  const [isCoarse] = useState(isCoarsePointer);
  const eraseCfg = isCoarse ? ERASE_TOUCH : ERASE_POINTER;
  const videoCfg = isCoarse ? ORBIT_TOUCH : ORBIT_POINTER;
  const reducedMotion = usePrefersReducedMotion();

  const { ref: stageRef, metrics: stage } = useStageMetrics(eraseCfg.maxDpr);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<VideoPhase>('idle');
  const videoElRef = useRef<HTMLVideoElement>(null);

  const [poemOn, setPoemOn] = useState(false);
  const poem = usePoemPlayback(poemOn);
  const poemVars = usePoemStage(poemOn);
  const hints = usePortraitHints();

  const erase = useEraseMask({
    canvasRef,
    src: PORTRAIT_ASSETS.subject,
    size: stage.size,
    cfg: eraseCfg,
    enabled: phase === 'idle' && !poemOn,
  });

  const audio = usePortraitAudio(PORTRAIT_ASSETS.ambience);

  // Resting offset measured from the orbit centre, in CSS pixels.
  const restOffset = useMemo(
    () => ({
      x: (videoCfg.restCenter.x - SUBJECT_CENTER.x) * stage.size,
      y: (videoCfg.restCenter.y - SUBJECT_CENTER.y) * stage.size,
    }),
    [videoCfg.restCenter.x, videoCfg.restCenter.y, stage.size],
  );

  const orbit = useOrbitAnimation({
    config: videoCfg,
    size: stage.size,
    restOffset,
    reducedMotion,
  });

  // ── dev assertion: the plates must stay the same size ─────────────────────
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const check = (src: string, label: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (
          img.naturalWidth !== PORTRAIT_SOURCE_SIZE.width ||
          img.naturalHeight !== PORTRAIT_SOURCE_SIZE.height
        ) {
          console.error(
            `[Portrait] ${label} is ${img.naturalWidth}x${img.naturalHeight}, ` +
              `expected ${PORTRAIT_SOURCE_SIZE.width}x${PORTRAIT_SOURCE_SIZE.height}. ` +
              'The layer lock and every hotspot coordinate are now wrong.',
          );
        }
      };
      img.src = src;
    };
    check(PORTRAIT_ASSETS.background, 'background plate');
    check(PORTRAIT_ASSETS.subject, 'subject plate');
  }, []);

  // ── escape closes the page ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePortrait();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePortrait]);

  /**
   * Warm the assets that are fetched only on demand, so the first press of the
   * switch and the first press of the lamp are instant on the next visit.
   *
   * Not done in the service worker's activate handler on purpose: activate runs
   * during whichever page load registered the worker, including the home page
   * that Lighthouse CI audits at /NL/?lh=1, and pulling multi-megabyte media
   * there competes with LCP for bandwidth.
   */
  useEffect(() => {
    if (isAutomatedEnv()) return undefined;

    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData) return undefined;
    if (conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return undefined;

    const targets: string[] = [];
    if (PORTRAIT_PREWARM.poemTrack) targets.push(PORTRAIT_ASSETS.poemTrack);
    if (PORTRAIT_PREWARM.video) targets.push(PORTRAIT_ASSETS.video);
    if (targets.length === 0) return undefined;

    let idleHandle = 0;
    const run = () => {
      for (const href of targets) {
        // A plain GET is enough: the service worker intercepts it and stores it
        // in the portrait cache (section 3.3). Failures are irrelevant here.
        void fetch(href, { mode: 'cors', credentials: 'omit' }).catch(() => undefined);
      }
    };

    const timer = window.setTimeout(() => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === 'function') {
        idleHandle = w.requestIdleCallback(run, { timeout: 4000 });
      } else {
        run();
      }
    }, PORTRAIT_PREWARM.delayMs);

    return () => {
      window.clearTimeout(timer);
      const w = window as Window & { cancelIdleCallback?: (handle: number) => void };
      if (idleHandle && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  // ── pointer -> normalised stage coordinates ───────────────────────────────
  const toStage = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      hints.dismiss(); // first real gesture retires the arrows for good
      const { nx, ny } = toStage(e);
      erase.eraseAt(nx, ny);
    },
    [toStage, erase, hints.dismiss],
  );

  // ── video lifecycle ───────────────────────────────────────────────────────
  const openVideo = useCallback(() => {
    hints.dismiss();
    if (phase !== 'idle') return;
    setPhase('resting');
    audio.duckForVideo();
  }, [phase, audio, hints.dismiss]);

  const closeVideo = useCallback(() => {
    if (phase === 'idle') return;
    orbit.stop();
    setPhase('idle');
    audio.restoreAfterVideo();
  }, [phase, orbit, audio]);

  const startOrbit = useCallback(() => {
    if (phase !== 'resting') return;
    setPhase('orbiting');
    void orbit.start().then(() => {
      // start() resolves after the exit tween, or early if it was cancelled.
      setPhase((p) => (p === 'orbiting' ? 'resting' : p));
    });
  }, [phase, orbit]);

  // ── poem toggle ───────────────────────────────────────────────────────────
  const togglePoem = useCallback(
    (next: boolean) => {
      hints.dismiss();
      setPoemOn(next);
      if (next) {
        closeVideo();
        // Clears the ambience intent flag as well as pausing it, so the guard
        // in playAmbience() cannot bring it back under the recital.
        audio.stopAmbience();
      } else {
        void audio.playAmbience();
      }
    },
    [closeVideo, audio, hints.dismiss],
  );

  // The recital ended on its own — return the switch and the ambience.
  useEffect(() => {
    if (poem.finished && poemOn) {
      setPoemOn(false);
      void audio.playAmbience();
    }
  }, [poem.finished, poemOn, audio]);

  /**
   * Clicking the subject closes the video and restores his size.
   */
  const handleStageClick = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      hints.dismiss(); // must run BEFORE the guard below
      if (phase === 'idle') return;
      // pointerdown precedes click, and the video sits inside SUBJECT_BOX at
      // (0.638, 0.597). Without this guard the stage closes the video before
      // OrbitVideo's own onClick can start the orbit — the orbit was
      // unreachable, not broken.
      if (
        (e.target as HTMLElement).closest(
          '.nl-portrait-video, .nl-portrait-lamp, .nl-poem-toggle, [data-nl-stop]',
        )
      ) {
        return;
      }
      const { nx, ny } = toStage(e);
      if (
        nx >= SUBJECT_BOX.left &&
        nx <= SUBJECT_BOX.right &&
        ny >= SUBJECT_BOX.top &&
        ny <= SUBJECT_BOX.bottom
      ) {
        closeVideo();
      }
    },
    [phase, toStage, closeVideo, hints.dismiss],
  );

  const subjectScale = phase === 'idle' ? 1 : videoCfg.subjectShrink;

  return (
    <div
      className={`nl-portrait-root${poemOn ? ' nl-portrait-root--poem' : ''}`}
      style={poemVars as React.CSSProperties}
    >
      <div
        ref={stageRef}
        className="nl-portrait-stage"
        style={{ ['--nl-stage' as string]: `${stage.size}px` }}
        onPointerMove={handlePointerMove}
        onPointerLeave={erase.endStroke}
        onPointerDown={handleStageClick}
      >
        <img
          className="nl-portrait-layer nl-portrait-layer--bg"
          src={PORTRAIT_ASSETS.background}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          draggable={false}
        />

        {phase !== 'idle' && (
          <OrbitVideo
            ref={orbit.anchorRef}
            setArm={orbit.setArm}
            videoRef={videoElRef}
            src={PORTRAIT_ASSETS.video}
            cfg={videoCfg}
            centerX={SUBJECT_CENTER.x}
            centerY={SUBJECT_CENTER.y}
            orbiting={phase === 'orbiting'}
            onActivate={startOrbit}
            onEnded={closeVideo}
            onAudible={audio.stopAmbience}
          />
        )}

        {poemOn && <PoemOverlay lines={poem.lines} />}

        {/* The shrink is published as a custom property, never as an inline
            transform. An inline transform outranks every stylesheet rule, and
            poem mode needs to replace the transform entirely — not add to it. */}
        <canvas
          ref={canvasRef}
          className="nl-portrait-layer nl-portrait-layer--subject"
          style={{ ['--nl-subject-scale' as string]: String(subjectScale) }}
          aria-hidden="true"
        />

        {phase === 'idle' && !poemOn && <LampHotspot onActivate={openVideo} />}
        {hints.visible && phase === 'idle' && !poemOn && (
          <HintArrows leaving={hints.leaving} />
        )}
      </div>

      {/* Single src, no <source> children: the .m4a twin never existed and its
          404 was the second fault. crossOrigin is gone — nothing reads this
          element through Web Audio, so it only added a CORS failure mode. */}
      <audio ref={audio.audioRef} src={audio.src} preload="auto" />

      {/* Always mounted: it cannot be registered with audioManager while it
          does not exist. preload="metadata" keeps the audio data off the wire
          until the toggle is switched on, without the permanent stall that
          preload="none" causes — see usePoemPlayback, which raises this to
          "auto" before calling load(). */}
      <audio
        ref={poem.setAudio}
        src={PORTRAIT_ASSETS.poemTrack}
        preload="metadata"
        crossOrigin="anonymous"
      />

      <PoemToggle checked={poemOn} onChange={togglePoem} />
      {hints.visible && phase === 'idle' && !poemOn && (
        <HintToggleArrow leaving={hints.leaving} />
      )}

      <button
        type="button"
        className="nl-portrait-close"
        onClick={closePortrait}
        aria-label="Close"
        data-nl-stop
      >
        ✕
      </button>
    </div>
  );
}

