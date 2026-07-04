// src/components/launcher/LauncherSound.tsx
// Glass "enable sound" control for the launcher. Same frutiger-aero pill style
// as the rest of the launcher. Pressing it is a real user gesture that unlocks
// browser autoplay and starts the original intro track (INTRO_MUSIC_HLS) via the
// shared introAudioController — so from then on the site may play audio freely.
// The label morphs smoothly between the muted and playing states.
// motion props are single-brace variables (no inline double braces).

import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useIntroMusic } from '../../hooks/useIntroMusic';
import { spring } from '../../motion/tokens';

const hover = { scale: 1.05 };
const tap = { scale: 0.94 };
const labelInit = { opacity: 0, y: 6 };
const labelAnim = { opacity: 1, y: 0 };
const labelExit = { opacity: 0, y: -6 };
const labelTrans = { duration: 0.22 };
const barsTrans = { duration: 0.9, repeat: Infinity, ease: 'easeInOut' as const };

function EqBars() {
  // Tiny animated equalizer shown while playing.
  const bar = (delay: number) => ({
    scaleY: [0.4, 1, 0.55, 0.85, 0.4],
    transition: { ...barsTrans, delay },
  });
  return (
    <span className="nl-sound-eq" aria-hidden="true">
      <motion.i animate={bar(0)} />
      <motion.i animate={bar(0.15)} />
      <motion.i animate={bar(0.3)} />
    </span>
  );
}

export function LauncherSound() {
  const { isIntroPlaying, toggleIntro } = useIntroMusic(0.6);
  const label = isIntroPlaying ? 'Sound on' : 'Tap for sound';
  const cls = 'nl-sound-btn' + (isIntroPlaying ? ' is-on' : '');

  return (
    <motion.button
      type="button"
      className={cls}
      onClick={toggleIntro}
      whileHover={hover}
      whileTap={tap}
      transition={spring.snappy}
      aria-pressed={isIntroPlaying}
      aria-label={isIntroPlaying ? 'Mute music' : 'Enable sound and play intro music'}
    >
      <span className="nl-sound-ico">
        {isIntroPlaying ? (
          <>
            <Volume2 size={16} />
            <EqBars />
          </>
        ) : (
          <VolumeX size={16} />
        )}
      </span>
      <span className="nl-sound-textwrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            className="nl-sound-label"
            initial={labelInit}
            animate={labelAnim}
            exit={labelExit}
            transition={labelTrans}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
