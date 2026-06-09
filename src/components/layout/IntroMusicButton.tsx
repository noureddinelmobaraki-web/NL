import { useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import { useButtonContext } from './ButtonOrchestrator';
import { useIntroMusic } from '../../hooks/useIntroMusic';

/**
 * Self-contained "Intro Music" control. Mount it ONCE inside <ButtonProvider>.
 * Registers into slot 'topRight2' (stacks with the bg-music button) and is only
 * visible on the main page context. Uses the project's real "fab-button" class.
 */
export function IntroMusicButton() {
  const { isIntroPlaying, toggleIntro } = useIntroMusic();
  const { registerButton, unregisterButton } = useButtonContext();

  useEffect(() => {
    registerButton({
      id: 'introMusic',
      priority: 2,
      allowedContexts: ['page'],
      slot: 'topRight2',
      render: () => (
        <button
          type="button"
          onClick={toggleIntro}
          aria-pressed={isIntroPlaying}
          aria-label={isIntroPlaying ? 'إيقاف موسيقى المقدّمة' : 'تشغيل موسيقى المقدّمة'}
          title={isIntroPlaying ? 'إيقاف موسيقى المقدّمة' : 'تشغيل موسيقى المقدّمة'}
          className="fab-button border-dashed group relative"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <Disc3
            className={isIntroPlaying ? 'w-4 h-4 animate-spin' : 'w-4 h-4'}
            aria-hidden="true"
          />
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[10px] font-mono tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5 uppercase">
            {isIntroPlaying ? 'Stop Intro' : 'Play Intro'}
          </div>
        </button>
      ),
    });
    return () => unregisterButton('introMusic');
  }, [isIntroPlaying, toggleIntro, registerButton, unregisterButton]);

  return null;
}
