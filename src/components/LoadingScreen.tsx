import { useEffect, useState, useRef } from 'react';
import { prefersReducedMotion } from '../utils/perf';

import { ASSETS } from '../constants/assets';

type Phase = 'visible' | 'zooming' | 'hidden';

const OPENING_VIDEO_URL  = ASSETS.media.opening;
const DISPLAY_DURATION   = 8000;   // ms before auto-finish
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

  /* animated dots on "NL" */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let n = 0;
    const iv = setInterval(() => { n = (n + 1) % 4; setDots('.'.repeat(n)); }, 400);
    return () => clearInterval(iv);
  }, []);

  /* disclaimer appears at ~4 seconds */
  useEffect(() => {
    const t = setTimeout(() => setShowDisclaimer(true), DISCLAIMER_DELAY);
    return () => clearTimeout(t);
  }, []);

  /* cinematic exit: zoom-in → fade → reveal site */
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('zooming');
    setTimeout(() => { setPhase('hidden'); onComplete(); }, ZOOM_DURATION);
  };

  /* hard timeout at 8 seconds */
  useEffect(() => {
    const t = setTimeout(finish, DISPLAY_DURATION);
    return () => clearTimeout(t);
  }, []);

  /* video autoplay with stall guard */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    const tryPlay = () => video.play().catch(() => setVideoFailed(true));
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }
    const stall = setTimeout(() => { if (!doneRef.current) setVideoFailed(true); }, 3000);
    video.addEventListener('playing', () => clearTimeout(stall), { once: true });
    return () => clearTimeout(stall);
  }, []);

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
        {/* Video background */}
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={OPENING_VIDEO_URL}
            autoPlay muted loop playsInline preload="auto"
            onError={() => setVideoFailed(true)}
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

        {/* Pulse dot — bottom right */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px', zIndex: 2,
          width: '8px', height: '8px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          animation: 'nl-fade-up 1s 1.5s ease-out both',
        }} />
      </div>
    </>
  );
};
