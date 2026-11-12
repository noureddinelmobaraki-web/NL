/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * IntroHomePortal — A 3D glass "Home" window that flips out of the Home capsule,
 * rushes toward the viewer, then recedes into depth on pull-back.
 */
import { m, type Variants } from 'framer-motion';
import { Home } from 'lucide-react';
import { ASSETS } from '../../../constants/assets';
import type { IntroPhase } from './launcherIntro.timeline';

type Bezier = [number, number, number, number];

const EASE_EXPO_OUT: Bezier = [0.16, 1, 0.3, 1];
const EASE_EXPO_IN: Bezier = [0.7, 0, 0.84, 0];

const PORTAL_STATIONS = ['Music', 'Cinema', 'TV', 'Games'] as const;

const PORTAL_VARIANTS: Variants = {
  hidden: { opacity: 0, rotateY: -82, rotateX: 14, z: -900, scale: 0.35 },
  open: {
    opacity: 1,
    rotateY: 0,
    rotateX: 0,
    z: 0,
    scale: 1,
    transition: { duration: 1.25, ease: EASE_EXPO_OUT, opacity: { duration: 0.35 } },
  },
  recede: {
    opacity: 0,
    rotateY: 24,
    rotateX: -6,
    z: -520,
    scale: 0.62,
    transition: { duration: 0.9, ease: EASE_EXPO_IN },
  },
};

const STATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  open: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.55 + index * 0.08, duration: 0.4, ease: EASE_EXPO_OUT },
  }),
  recede: { opacity: 0, y: -6, transition: { duration: 0.25 } },
};

interface IntroHomePortalProps {
  phase: IntroPhase;
}

export function IntroHomePortal({ phase }: IntroHomePortalProps) {
  const state = phase === 'homePortal' ? 'open' : phase === 'pullBack' ? 'recede' : 'hidden';

  return (
    <div className="nl-intro-portal-stage" aria-hidden="true">
      <m.div className="nl-intro-portal" initial="hidden" animate={state} variants={PORTAL_VARIANTS}>
        <div className="nl-intro-portal__bar">
          <i />
          <i />
          <i />
          <b>
            <Home size={12} aria-hidden="true" />
            <span>Home</span>
          </b>
        </div>

        <div className="nl-intro-portal__body">
          <div className="nl-intro-portal__avatar">
            <img src={ASSETS.profile.main} alt="" decoding="async" referrerPolicy="no-referrer" draggable={false} />
          </div>
          <div className="nl-intro-portal__name">NOUREDDIN EL MOBARAKI</div>
          <div className="nl-intro-portal__stations">
            {PORTAL_STATIONS.map((station, index) => (
              <m.span key={station} custom={index} variants={STATION_VARIANTS}>
                {station}
              </m.span>
            ))}
          </div>
        </div>

        <div className="nl-intro-portal__glare" />
      </m.div>
    </div>
  );
}
