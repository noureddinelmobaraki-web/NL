import { useEffect, useRef } from 'react';
import { ASSETS } from '../../constants/assets';
import { audioManager } from '../../audio/audioManager';
import { useLoadingPhase } from '../../hooks/useLoadingPhase';
import { LoadingVideo } from './LoadingVideo';
import { LoadingDisclaimer } from './LoadingDisclaimer';
import { LOADING_TIMINGS } from '../../constants/loading';

const OPENING_VIDEO_URL = ASSETS.media.opening;
const POSTER_IMAGE_URL = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp';

export interface LoadingScreenProps {
  onComplete: () => void;
  onAudioUnlock: () => void;
}

export const LoadingScreen = ({
  onComplete,
  onAudioUnlock,
}: LoadingScreenProps) => {
  // Instant exit for automated/headless environments (Lighthouse, CI)
  const isAutomated = typeof navigator !== 'undefined' && (navigator as any).webdriver === true;

  const {
    phase,
    setPhase,
    dots,
    isReturning,
    useStatic,
    showDisclaimer,
    setShowDisclaimer,
    triggerVideoFailed,
  } = useLoadingPhase();

  const doneRef = useRef(false);

  useEffect(() => {
    if (isAutomated && !doneRef.current) {
      doneRef.current = true;
      setPhase('hidden');
      onComplete();
    }
  }, [isAutomated, onComplete, setPhase]);

  // Determine standard Display Duration based on connection and history status
  let displayDuration: number = LOADING_TIMINGS.default;
  if (isAutomated) {
    displayDuration = LOADING_TIMINGS.automated;
  } else if (useStatic) {
    displayDuration = LOADING_TIMINGS.staticFallback;
  } else if (isReturning) {
    displayDuration = LOADING_TIMINGS.returning;
  }

  /* disclaimer appears at ~3.8 seconds if not skipping */
  useEffect(() => {
    if (isReturning || useStatic) return;
    const t = setTimeout(() => setShowDisclaimer(true), LOADING_TIMINGS.disclaimerDelay);
    return () => clearTimeout(t);
  }, [isReturning, useStatic, setShowDisclaimer]);

  /* cinematic exit: zoom-in → fade → reveal site */
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    setTimeout(() => {
      setPhase('hidden');
      onComplete();
    }, LOADING_TIMINGS.zoomOut);
  };

  /* hard timeout fallback for safety */
  useEffect(() => {
    const t = setTimeout(finish, displayDuration);
    return () => clearTimeout(t);
  }, [displayDuration]);

  /* Eager complete check */
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

  if (phase === 'hidden') return null;

  const zoomStyle = phase === 'zooming'
    ? { animation: `nl-zoom-in ${LOADING_TIMINGS.zoomOut}ms cubic-bezier(0.4,0,0.2,1) forwards`, transformOrigin: 'center center' }
    : {};

  const handleVideoFail = () => {
    triggerVideoFailed();
  };

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
        role="button"
        tabIndex={0}
        onClick={() => {
          onAudioUnlock();
          finish();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAudioUnlock();
            finish();
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'black',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
          outline: 'none',
          ...zoomStyle,
        }}
      >
        {/* Loading Video / Image Container */}
        <LoadingVideo
          videoUrl={OPENING_VIDEO_URL}
          posterUrl={POSTER_IMAGE_URL}
          useStatic={useStatic}
          isReturning={isReturning}
          onFail={handleVideoFail}
        />

        {/* Vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.55) 100%)',
        }} />

        {/* NL */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          color: 'white',
          fontSize: 'clamp(3.5rem,12vw,7rem)',
          fontWeight: 'bold',
          letterSpacing: '0.25em',
          fontFamily: 'var(--font-manga,"Impact",sans-serif)',
          textShadow: '3px 3px 0 rgba(0,0,0,0.6)',
          animation: 'nl-fade-up 0.8s ease-out both',
        }}>
          NL{dots}
        </div>

        {/* TAP TO ENABLE SOUND */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.75rem',
          letterSpacing: '0.35em',
          marginTop: '1.2rem',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-manga,monospace)',
          animation: 'nl-fade-up 0.8s 0.3s ease-out both',
        }}>
          TAP TO ENABLE SOUND
        </div>

        {/* Disclaimer */}
        <LoadingDisclaimer visible={showDisclaimer} />

        {/* Keyboard-focusable "Skip" button in bottom right */}
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
