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
import { Gamepad2, Film, Tv, Joystick } from 'lucide-react';

const POSTER_IMAGE_URL = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp';

export interface LoadingScreenProps {
  onComplete: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterGames?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterCinema?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterTv?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterRetro?: (chosenTheme: Theme, musicConsent: boolean) => void;
}

export const LoadingScreen = ({ onComplete, onEnterGames, onEnterCinema, onEnterTv, onEnterRetro }: LoadingScreenProps) => {
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

  const finishToGames = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterGames?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterGames, setPhase, introAudio]);

  const finishToCinema = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterCinema?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterCinema, setPhase, introAudio]);

  const finishToTv = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterTv?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterTv, setPhase, introAudio]);

  const finishToRetro = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterRetro?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterRetro, setPhase, introAudio]);

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

        /* ── شبكة أزرار شاشة التحميل المتجاوبة ── */
        .loading-buttons-container {
          display: grid;
          gap: 10px;
          width: 100%;
          max-width: 580px;
          margin-top: 14px;
          padding: 0 16px;
          box-sizing: border-box;
          justify-content: center;
        }

        .loading-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 0.5px solid rgba(255,255,255,0.2);
          color: #fff;
          font-size: 0.85rem;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: nl-fade-up 0.6s ease both;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
        }

        .loading-btn:hover {
          transform: scale(1.05);
          background: rgba(255,255,255,0.18);
          border-color: rgba(255,255,255,0.35);
        }

        .loading-btn:active {
          transform: scale(0.95);
        }

        /* 1. الشاشات الكبيرة (حاسوب ولوحي) -> 4 أزرار بجانب بعضها */
        @media (min-width: 581px) {
          .loading-buttons-container {
            grid-template-columns: repeat(4, auto);
          }
        }

        /* 2. الشاشات المتوسطة والصغيرة (من 401px إلى 580px) -> تترتب 3 أزرار بجانب بعض والرابع يلتف ليكون بالأسفل ممركزاً */
        @media (max-width: 580px) and (min-width: 401px) {
          .loading-buttons-container {
            grid-template-columns: repeat(3, 1fr);
            max-width: 460px;
          }
          .loading-buttons-container > button:last-child {
            grid-column: span 3;
            justify-self: center;
            width: auto;
            min-width: 120px;
          }
          .loading-btn {
            font-size: 0.8rem;
            padding: 7px 14px;
          }
        }

        /* 3. الهواتف الصغيرة جداً (أقل من 400px) -> تترتب 2 فوق و 2 تحت مع تصغير الحجم */
        @media (max-width: 400px) {
          .loading-buttons-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            max-width: 340px;
          }
          .loading-btn {
            font-size: 0.75rem;
            padding: 6px 10px;
            gap: 5px;
          }
          .loading-btn svg {
            width: 14px !important;
            height: 14px !important;
          }
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
        <div className="loading-buttons-container">
          <button
            type="button"
            onClick={finishToGames}
            aria-label="Games"
            className="loading-btn"
          >
            <Gamepad2 size={16} aria-hidden="true" />
            <span>Games</span>
          </button>
          
          <button
            type="button"
            onClick={finishToCinema}
            aria-label="Movies & Series"
            className="loading-btn"
          >
            <Film size={16} aria-hidden="true" />
            <span>Movies & Series</span>
          </button>

          <button
            type="button"
            onClick={finishToTv}
            aria-label="NL TV"
            className="loading-btn"
          >
            <Tv size={16} aria-hidden="true" />
            <span>NL TV</span>
          </button>

          <button
            type="button"
            onClick={finishToRetro}
            aria-label="Retro"
            className="loading-btn"
          >
            <Joystick size={16} aria-hidden="true" />
            <span>Retro</span>
          </button>
        </div>
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
