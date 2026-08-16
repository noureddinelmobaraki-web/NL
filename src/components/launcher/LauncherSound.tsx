import { m, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useIntroMusic } from '../../hooks/useIntroMusic';
import { spring } from '../../motion/tokens';

const hover = { scale: 1.035 };
const tap = { scale: 0.96 };
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
  const label = isIntroPlaying ? 'Sound on' : 'Tap for sound';

  return (
    <m.button
      type="button"
      className={`nl-sound-btn ${isIntroPlaying ? 'is-on' : ''}`}
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
