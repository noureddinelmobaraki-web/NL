/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * IntroCinemaOverlay — Film-grade chrome for the Genesis Sequence:
 * veil, depth-of-field ring, light sweep, grain, letterbox, caption, progress, skip.
 */
import { AnimatePresence, m } from 'framer-motion';
import { ChevronsRight } from 'lucide-react';
import { INTRO_TOTAL_MS, type IntroAnchors, type IntroPhase } from './launcherIntro.timeline';
import { IntroHomePortal } from './IntroHomePortal';
import { IntroProfileBox } from './IntroProfileBox';

type Bezier = [number, number, number, number];

const EASE_EXPO_OUT: Bezier = [0.16, 1, 0.3, 1];
const EASE_GLASS: Bezier = [0.22, 1, 0.36, 1];
const EASE_LETTERBOX: Bezier = [0.76, 0, 0.24, 1];

const CAPTIONS: Record<IntroPhase, string> = {
  boot: 'NL · 2026',
  focusMe: '01 — ME',
  homePortal: '02 — HOME',
  pullBack: '02 — HOME',
  profileBox: '03 — PROFILE',
  branchBurst: '04 — UNIVERSE',
  settle: '',
  done: '',
};

interface IntroCinemaOverlayProps {
  phase: IntroPhase;
  anchors: IntroAnchors;
  richFx: boolean;
  onSkip: () => void;
}

export function IntroCinemaOverlay({ phase, anchors, richFx, onSkip }: IntroCinemaOverlayProps) {
  const settling = phase === 'settle';
  const depthOn = phase === 'focusMe' || phase === 'homePortal' || phase === 'profileBox';
  const portalMounted = phase === 'focusMe' || phase === 'homePortal' || phase === 'pullBack';
  const sweepKey = phase === 'focusMe' || phase === 'branchBurst' ? phase : null;
  const caption = CAPTIONS[phase];

  const { w, h } = anchors.size;
  const meOffset =
    anchors.me && w > 0 && h > 0
      ? { x: anchors.me.x - w / 2, y: anchors.me.y - h / 2 }
      : { x: 0, y: 0 };

  return (
    <div className="nl-intro-overlay" data-phase={phase}>
      <div className="nl-intro-catcher" onPointerDown={onSkip} aria-hidden="true" />

      <m.div
        className="nl-intro-veil"
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: EASE_EXPO_OUT }}
      />

      <m.div
        className={`nl-intro-depth${richFx ? ' nl-intro-depth--rich' : ''}`}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: depthOn ? 1 : 0 }}
        transition={{ duration: 0.7, ease: EASE_GLASS }}
      />

      {sweepKey ? <div key={sweepKey} className="nl-intro-sweep" aria-hidden="true" /> : null}

      {portalMounted ? <IntroHomePortal phase={phase} /> : null}

      <AnimatePresence>
        {phase === 'profileBox' ? <IntroProfileBox key="nl-intro-profile" meOffset={meOffset} /> : null}
      </AnimatePresence>

      {richFx ? (
        <svg className="nl-intro-grain" aria-hidden="true" focusable="false">
          <filter id="nl-intro-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#nl-intro-grain-filter)" />
        </svg>
      ) : null}

      <m.div
        className="nl-intro-letterbox nl-intro-letterbox--top"
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: settling ? 0 : 1 }}
        transition={{ duration: settling ? 0.7 : 0.9, ease: EASE_LETTERBOX }}
      />
      <m.div
        className="nl-intro-letterbox nl-intro-letterbox--bottom"
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: settling ? 0 : 1 }}
        transition={{ duration: settling ? 0.7 : 0.9, ease: EASE_LETTERBOX }}
      />

      <div className="nl-intro-progress" aria-hidden="true">
        <span style={{ animationDuration: `${INTRO_TOTAL_MS}ms` }} />
      </div>

      <AnimatePresence mode="wait">
        {caption ? (
          <m.span
            key={caption}
            className="nl-intro-caption"
            aria-hidden="true"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: EASE_GLASS }}
          >
            {caption}
          </m.span>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        className="nl-intro-skip"
        onClick={onSkip}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Skip intro"
      >
        <span>Skip</span>
        <ChevronsRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
