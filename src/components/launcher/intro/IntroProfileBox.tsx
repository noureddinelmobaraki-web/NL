/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * IntroProfileBox — Iris-opens from a dot into a glass square showing the site's
 * profile photo (same asset as Home), scans, types the name, then flies into "Me".
 */
import { m } from 'framer-motion';
import { ASSETS } from '../../../constants/assets';

type Bezier = [number, number, number, number];

const EASE_WARP: Bezier = [0.7, 0, 0.2, 1];
const NAME = 'NOUREDDIN EL MOBARAKI';
const NAME_LETTERS = Array.from(NAME);

interface IntroProfileBoxProps {
  meOffset: { x: number; y: number };
}

export function IntroProfileBox({ meOffset }: IntroProfileBoxProps) {
  return (
    <div className="nl-intro-profile-stage" aria-hidden="true">
      <m.div
        className="nl-intro-profile"
        initial={{
          opacity: 0,
          scale: 0.6,
          rotateZ: -6,
          x: 0,
          y: 0,
          clipPath: 'inset(50% 50% 50% 50% round 999px)',
        }}
        animate={{
          opacity: 1,
          scale: 1,
          rotateZ: 0,
          x: 0,
          y: 0,
          clipPath: 'inset(0% 0% 0% 0% round 28px)',
          transition: { type: 'spring', stiffness: 260, damping: 20, opacity: { duration: 0.2 } },
        }}
        exit={{
          opacity: 0,
          scale: 0.14,
          rotateZ: 8,
          x: meOffset.x,
          y: meOffset.y,
          clipPath: 'inset(0% 0% 0% 0% round 999px)',
          transition: { duration: 0.5, ease: EASE_WARP },
        }}
      >
        <img src={ASSETS.profile.main} alt="" decoding="async" referrerPolicy="no-referrer" draggable={false} />
        <div className="nl-intro-profile__chroma" />
        <div className="nl-intro-profile__scan" />
        <div className="nl-intro-profile__caption">
          {NAME_LETTERS.map((letter, index) => (
            <span key={`${letter}-${index}`} style={{ animationDelay: `${260 + index * 28}ms` }}>
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </div>
      </m.div>
    </div>
  );
}
