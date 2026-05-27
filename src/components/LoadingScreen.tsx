import { useEffect, useState, useRef } from 'react';
import { prefersReducedMotion } from '../utils/perf';
import { ASSETS } from '../constants/assets';
import { audioManager } from '../audio/audioManager';

type Phase = 'visible' | 'zooming' | 'hidden';

const OPENING_VIDEO_URL  = ASSETS.media.opening;
const POSTER_IMAGE_URL   = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp';
const ZOOM_DURATION      = 900;    // ms for exit zoom animation
const DISCLAIMER_DELAY   = 3800;   // ms before disclaimer appears

export const LoadingScreen = ({
  onComplete,
  onAudioUnlock,
}: {
  onComplete: () => void;
  onAudioUnlock: () => void;
}) => {
  const [phase, setPhase]                   = useState<Phase>('visible');
  const [dots, setDots]                     = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [videoFailed, setVideoFailed]       = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef  = useRef(false);

  // 1. Detect first-visit vs returning-visit using localStorage
  const [isReturning, setIsReturning] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const visited = localStorage.getItem('nl_has_visited') !== null;
      setIsReturning(visited);
      if (!visited) {
        localStorage.setItem('nl_has_visited', 'true');
      }
    }
  }, []);

  // 2. Detect prefers-reduced-motion AND save-data
  const prefersReduced = prefersReducedMotion();
  const [saveData, setSaveData] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [forceStatic, setForceStatic] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nl_force_static') === 'true';
    }
    return false;
  });

  const triggerVideoFailed = () => {
    setVideoFailed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nl_force_static', 'true');
    }
    setForceStatic(true);
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData === true) {
          setSaveData(true);
        }
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          setSlowConnection(true);
        }
      }
    }
  }, []);

  const useStatic = prefersReduced || saveData || slowConnection || forceStatic;

  // Determine standard Display Duration based on connection and history status
  let displayDuration = 8000;
  if (useStatic) {
    displayDuration = 1000;
  } else if (isReturning) {
    displayDuration = 1500;
  }

  /* animated dots on "NL" */
  useEffect(() => {
    if (useStatic || prefersReducedMotion()) return;
    let n = 0;
    const iv = setInterval(() => { n = (n + 1) % 4; setDots('.'.repeat(n)); }, 400);
    return () => clearInterval(iv);
  }, [useStatic]);

  /* disclaimer appears at ~3.8 seconds if not skipping */
  useEffect(() => {
    if (isReturning || useStatic) return;
    const t = setTimeout(() => setShowDisclaimer(true), DISCLAIMER_DELAY);
    return () => clearTimeout(t);
  }, [isReturning, useStatic]);

  /* cinematic exit: zoom-in → fade → reveal site */
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    setTimeout(() => { setPhase('hidden'); onComplete(); }, ZOOM_DURATION);
  };

  /* hard timeout fallback for safety */
  useEffect(() => {
    const t = setTimeout(finish, displayDuration);
    return () => clearTimeout(t);
  }, [displayDuration]);

  /* 3. Eager eager complete check */
  useEffect(() => {
    let isMounted = true;

    // Minimum visual rhythm time: 800ms
    const timerPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 800);
    });

    // hero_bg.webp decoding promise
    const dImg = new Image();
    dImg.src = POSTER_IMAGE_URL;
    const decodePromise = dImg.decode().catch((err) => {
      console.warn('[LoadingScreen] hero_bg decoding skipped/failed:', err);
    });

    // bg-audio HLS manifest parsed promise
    const manifestPromise = new Promise<void>((resolve) => {
      const unsubscribe = audioManager.onManifestParsed(() => {
        unsubscribe();
        resolve();
      });
    });

    // Fire onComplete when all three criteria are satisfied
    Promise.all([timerPromise, decodePromise, manifestPromise])
      .then(() => {
        if (isMounted) {
          finish();
        }
      })
      .catch((err) => {
        console.warn('[LoadingScreen] Eager load error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* video autoplay with stall guard */
  useEffect(() => {
    if (useStatic) return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    const tryPlay = () => video.play().catch(triggerVideoFailed);
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }
    const stall = setTimeout(() => {
      if (!doneRef.current) {
        triggerVideoFailed();
      }
    }, 3000);
    video.addEventListener('playing', () => clearTimeout(stall), { once: true });
    return () => clearTimeout(stall);
  }, [useStatic]);

  if (phase === 'hidden') return null;

  const zoomStyle = phase === 'zooming'
    ? { animation: `nl-zoom-in ${ZOOM_DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`, transformOrigin: 'center center' }
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
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nl-disclaimer-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nl-line-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        onClick={() => { onAudioUnlock(); finish(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'black',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: 'pointer',
          ...zoomStyle,
        }}
      >
        {/* Background option: Static image OR Autoplay video */}
        {useStatic ? (
          <img
            src={POSTER_IMAGE_URL}
            alt=""
            referrerPolicy="no-referrer"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        ) : !videoFailed ? (
          <video
            ref={videoRef}
            src={OPENING_VIDEO_URL}
            autoPlay muted loop playsInline preload="none"
            onError={triggerVideoFailed}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg,#0a0a0f 0%,#141428 50%,#0a0a0f 100%)',
            backgroundImage: 'radial-gradient(circle at 2px 2px,rgba(255,255,255,0.04) 1px,transparent 0)',
            backgroundSize: '20px 20px',
          }} />
        )}

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.55) 100%)',
        }} />

        {/* NL */}
        <div style={{
          position: 'relative', zIndex: 1, color: 'white',
          fontSize: 'clamp(3.5rem,12vw,7rem)', fontWeight: 'bold',
          letterSpacing: '0.25em',
          fontFamily: 'var(--font-manga,"Impact",sans-serif)',
          textShadow: '3px 3px 0 rgba(0,0,0,0.6)',
          animation: 'nl-fade-up 0.8s ease-out both',
        }}>
          NL{dots}
        </div>

        {/* TAP TO ENABLE SOUND */}
        <div style={{
          position: 'relative', zIndex: 1,
          color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem',
          letterSpacing: '0.35em', marginTop: '1.2rem',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-manga,monospace)',
          animation: 'nl-fade-up 0.8s 0.3s ease-out both',
        }}>
          TAP TO ENABLE SOUND
        </div>

        {/* Disclaimer — appears at ~3.8s, each line slides in from the left */}
        {showDisclaimer && (
          <div style={{
            position: 'absolute',
            bottom: 'clamp(28px,6vh,56px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            textAlign: 'left',
            width: 'min(360px,88vw)',
            padding: '18px 22px',
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderLeft: '2px solid rgba(255,255,255,0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            animation: 'nl-disclaimer-in 1s ease-out both',
          }}>

            <p style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 'clamp(0.68rem,2.2vw,0.78rem)',
              fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
              letterSpacing: '0.04em', lineHeight: 1.6,
              margin: 0,
              animation: 'nl-line-in 0.7s 0.10s ease-out both',
            }}>
              This is just my personal website.
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.70)',
              fontSize: 'clamp(0.65rem,2vw,0.75rem)',
              fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
              letterSpacing: '0.04em', lineHeight: 1.6,
              marginTop: '4px', marginBottom: '10px',
              animation: 'nl-line-in 0.7s 0.25s ease-out both',
            }}>
              I built it for two reasons:
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px', animation: 'nl-line-in 0.7s 0.42s ease-out both' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', marginTop: '3px', flexShrink: 0, fontFamily: 'monospace' }}>◆</span>
              <p style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 'clamp(0.60rem,1.9vw,0.70rem)',
                fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
                letterSpacing: '0.03em', lineHeight: 1.55, margin: 0,
              }}>
                First, just for fun because I have no life,
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', animation: 'nl-line-in 0.7s 0.58s ease-out both' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', marginTop: '3px', flexShrink: 0, fontFamily: 'monospace' }}>◆</span>
              <p style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 'clamp(0.60rem,1.9vw,0.70rem)',
                fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
                letterSpacing: '0.03em', lineHeight: 1.55, margin: 0,
              }}>
                And second, to practice my coding skills.
              </p>
            </div>
          </div>
        )}

        {/* 4. Keyboard-focusable "Skip" button in bottom right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAudioUnlock();
            finish();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onAudioUnlock();
              finish();
            }
          }}
          aria-label="Skip intro"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'white',
            padding: '6px 12px',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
          className="hover:bg-white hover:text-black focus:ring-1 focus:ring-white focus:bg-white focus:text-black"
        >
          SKIP
        </button>
      </div>
    </>
  );
};
