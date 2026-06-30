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
import { Gamepad2, Film, Tv, Joystick, Monitor, AudioLines, Users } from 'lucide-react';
import { WelcomeGate } from './WelcomeGate';
import { ProfileOrb } from '../../features/account/ProfileOrb';

const POSTER_IMAGE_URL = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp';

export interface LoadingScreenProps {
  onComplete: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterGames?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterCinema?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterTv?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterRetro?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterXp?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterMusic?: (chosenTheme: Theme, musicConsent: boolean) => void;
  onEnterAccounts?: (chosenTheme: Theme, musicConsent: boolean) => void;
}

export const LoadingScreen = ({ onComplete, onEnterGames, onEnterCinema, onEnterTv, onEnterRetro, onEnterXp, onEnterMusic, onEnterAccounts }: LoadingScreenProps) => {
  const isAutomated = isAutomatedEnv();
  const { phase, setPhase, useStatic, triggerVideoFailed } = useLoadingPhase();
  const doneRef = useRef(false);

  const [musicConsent, setMusicConsent] = useState(false);
  const [gateDone, setGateDone] = useState(isAutomated);
  
  const introAudio = useIntroAudio({
    src: INTRO_MUSIC_HLS,
    enabled: musicConsent,
    volume: 0.6,
  });


  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('nl-loading-lock');
    return () => { root.classList.remove('nl-loading-lock'); };
  }, []);

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

  const finishToXp = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterXp?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterXp, setPhase, introAudio]);

  const finishToMusic = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterMusic?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterMusic, setPhase, introAudio]);

  const finishToAccounts = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    if (musicConsent) introAudio.fadeOut(800);
    setTimeout(() => {
      setPhase('hidden');
      onEnterAccounts?.('midnight', musicConsent);
    }, LOADING_TIMINGS.zoomOut);
  }, [musicConsent, onEnterAccounts, setPhase, introAudio]);

  if (phase === 'hidden') return null;

  const zoomStyle = phase === 'zooming'
    ? { animation: `nl-zoom-in ${LOADING_TIMINGS.zoomOut}ms cubic-bezier(0.4,0,0.2,1) forwards`, transformOrigin: 'center center' }
    : {};

  return (
    <>
      {!gateDone && <WelcomeGate onDismiss={() => setGateDone(true)} />}
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

        /* 1. الشاشات الكبيرة (حاسوب ولوحي) -> 7 أزرار بجانب بعضها */
        @media (min-width: 581px) {
          .loading-buttons-container {
            grid-template-columns: repeat(7, auto);
          }
        }

        .nl-welcome-orb {
          position: fixed;
          top: 10px;
          left: 10px;                 /* On mobile, place on the left to avoid speaker overlap */
          z-index: 20000;
          display: block;
        }
        .nl-welcome-orb button {
          width: 40px !important;
          height: 40px !important;
        }
        .nl-speaker-btn {
          top: 10px !important;
          right: 10px !important;
        }

        @media (min-width: 900px) {
          .nl-welcome-orb {
            top: 16px;
            left: auto !important;
            right: 18px !important;   /* On desktop, place top-right */
          }
          .nl-welcome-orb button {
            width: 64px !important;
            height: 64px !important;
          }
          .nl-speaker-btn {
            top: 16px !important;
            right: 96px !important;   /* Shift speaker left on desktop to sit side-by-side */
          }
        }

        /* 2. الشاشات المتوسطة والصغيرة (من 401px إلى 580px) -> تترتب 3 أزرار بجانب بعض */
        @media (max-width: 580px) and (min-width: 401px) {
          .loading-buttons-container {
            grid-template-columns: repeat(3, 1fr);
            max-width: 460px;
          }
          .loading-btn {
            font-size: 0.8rem;
            padding: 7px 14px;
          }
        }

        /* 3. الهواتف الصغيرة جداً (أقل من 400px) -> تترتب 2 بجانب بعض */
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

        .loading-instructions {
          position: absolute;
          bottom: clamp(14px, 2vh, 24px);
          left: 0;
          right: 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: clamp(0.62rem, 1.4vw, 0.74rem);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          font-family: var(--font-mono, monospace);
          text-align: center;
          padding: 0 16px;
          animation: nl-fade-up 0.8s 0.6s ease-out both;
          z-index: 10;
          pointer-events: none;
        }

        @media (max-width: 580px) {
          .loading-instructions {
            bottom: auto;
            top: 76px;
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
        <div className="nl-welcome-orb">
          <ProfileOrb variant="welcome" />
        </div>
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
            onClick={finishToAccounts}
            aria-label="Accounts"
            data-testid="welcome-accounts-btn"
            className="loading-btn"
          >
            <Users size={16} aria-hidden="true" />
            <span>Accounts</span>
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

          <button
            type="button"
            onClick={finishToXp}
            aria-label="Windows XP"
            className="loading-btn"
          >
            <Monitor size={16} aria-hidden="true" />
            <span>Windows XP</span>
          </button>

          <button
            type="button"
            onClick={finishToMusic}
            aria-label="NL Music"
            className="loading-btn"
          >
            <AudioLines size={16} aria-hidden="true" />
            <span>NL Music</span>
          </button>
        </div>
        <div className="loading-instructions">
          Pick a theme to enter · Tap the speaker to enable sound
        </div>
      </div>
    </>
  );
};
