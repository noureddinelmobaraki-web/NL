import { useEffect, useRef, useState, useCallback } from 'react';
import { INTRO_VIDEOS, INTRO_MUSIC_HLS } from '../../constants/assets';
import { useLoadingPhase } from '../../hooks/useLoadingPhase';
import { useIntroAudio } from '../../hooks/useIntroAudio';
import { LoadingVideo } from './LoadingVideo';
import { IntroSpeakerButton } from './IntroSpeakerButton';
import { ThemePicker } from './ThemePicker';
import { LOADING_TIMINGS } from '../../constants/loading';
import { isAutomatedEnv } from '../../utils/env';
import type { Theme } from '../../utils/userPrefs';

const POSTER_IMAGE_URL = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp';

export interface LoadingScreenProps {
  onComplete: (chosenTheme: Theme, musicConsent: boolean) => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const isAutomated = isAutomatedEnv();
  const { phase, setPhase, useStatic, triggerVideoFailed } = useLoadingPhase();
  const doneRef = useRef(false);

  const [musicConsent, setMusicConsent] = useState(false);
  
  const introAudio = useIntroAudio({
    src: INTRO_MUSIC_HLS,
    enabled: musicConsent,
    volume: 0.6,
  });

  useEffect(() => {
    if (isAutomated && !doneRef.current) {
      doneRef.current = true;
      setPhase('hidden');
      onComplete('midnight', false);
    }
  }, [isAutomated, onComplete, setPhase]);

  const handleSpeakerToggle = useCallback(() => {
    if (musicConsent) {
      introAudio.pause();
      setMusicConsent(false);
    } else {
      setMusicConsent(true);
      introAudio.play();
    }
  }, [musicConsent, introAudio]);

  const finishWithTheme = useCallback((theme: Theme) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    
    // Stop intro music smoothly
    if (musicConsent) {
      introAudio.fadeOut(800);
    }
    
    // Hand over background music consent implicitly since user interacted
    setTimeout(() => {
      setPhase('hidden');
      onComplete(theme, musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onComplete, setPhase, introAudio]);

  if (phase === 'hidden') return null;

  const zoomStyle = phase === 'zooming'
    ? { animation: `nl-zoom-in ${LOADING_TIMINGS.zoomOut}ms cubic-bezier(0.4,0,0.2,1) forwards`, transformOrigin: 'center center' }
    : {};

  return (
    <>
      <style>{`
        @keyframes nl-zoom-in {
          0%   { transform: scale(1);    opacity: 1; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes nl-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#050a1f',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', ...zoomStyle,
        }}
      >
        <LoadingVideo
          desktopUrl={INTRO_VIDEOS.desktop}
          mobileUrl={INTRO_VIDEOS.mobile}
          posterUrl={POSTER_IMAGE_URL}
          useStatic={useStatic}
          onFail={triggerVideoFailed}
        />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.58) 100%)',
        }} />
        <IntroSpeakerButton enabled={musicConsent} onToggle={handleSpeakerToggle} />
        <div style={{
          position: 'relative', zIndex: 2,
          color: 'white',
          fontSize: 'clamp(2.4rem,7vw,4.2rem)',
          fontWeight: 'bold',
          letterSpacing: '0.25em',
          fontFamily: 'var(--font-manga,"Impact",sans-serif)',
          textShadow: '3px 3px 0 rgba(0,0,0,0.65)',
          marginBottom: 'clamp(18px,3vw,30px)',
          animation: 'nl-fade-up 0.8s ease-out both',
        }}>NL</div>
        <ThemePicker onPick={finishWithTheme} />
        <div style={{
          position: 'absolute', bottom: 'clamp(14px,2vh,24px)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 'clamp(0.62rem,1.4vw,0.74rem)',
          letterSpacing: '0.25em', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono, monospace)',
          textAlign: 'center', padding: '0 16px',
          animation: 'nl-fade-up 0.8s 0.6s ease-out both',
        }}>
          Pick a theme to enter · Tap the speaker to enable sound
        </div>
      </div>
    </>
  );
};
