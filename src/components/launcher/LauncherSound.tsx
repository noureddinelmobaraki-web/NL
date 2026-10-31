import { m, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useIntroMusic } from '../../hooks/useIntroMusic';
import { useGlassTier } from './glass/useGlassTier';

const LIQUID_HOVER = { scale: 1.03 };
const LIQUID_TAP = { scaleX: 1.045, scaleY: 0.93 };
const LIQUID_SPRING = { type: 'spring' as const, stiffness: 520, damping: 24, mass: 0.6 };

const FROST_TAP = { scale: 0.97 };
const FROST_TWEEN = { type: 'tween' as const, duration: 0.12 };

const LITE_TAP = { opacity: 0.8 };
const LITE_TWEEN = { type: 'tween' as const, duration: 0.08 };

const labelInit = { opacity: 0, y: 4 };
const labelAnim = { opacity: 1, y: 0 };
const labelExit = { opacity: 0, y: -4 };
const labelTrans = { duration: 0.16 };

function EqBars() {
  return (
    <span className="nl-sound-eq" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function LauncherSound() {
  const { isIntroPlaying, toggleIntro } = useIntroMusic(0.6);
  const glassTier = useGlassTier();
  const label = isIntroPlaying ? 'Sound on' : 'Tap for sound';

  const hoverProps = glassTier === 'liquid' ? LIQUID_HOVER : undefined;
  const tapProps =
    glassTier === 'liquid' ? LIQUID_TAP : glassTier === 'frost' ? FROST_TAP : LITE_TAP;
  const transitionProps =
    glassTier === 'liquid' ? LIQUID_SPRING : glassTier === 'frost' ? FROST_TWEEN : LITE_TWEEN;

  return (
    <m.button
      type="button"
      className={`nl-sound-btn ${isIntroPlaying ? 'is-on' : ''}`}
      onClick={toggleIntro}
      whileHover={hoverProps}
      whileTap={tapProps}
      transition={transitionProps}
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
          <m.span
            key={label}
            className="nl-sound-label"
            initial={labelInit}
            animate={labelAnim}
            exit={labelExit}
            transition={labelTrans}
          >
            {label}
          </m.span>
        </AnimatePresence>
      </span>
    </m.button>
  );
}
