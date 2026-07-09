import { useRef } from 'react';
import { usePrefersReducedMotion } from './pendulum/usePrefersReducedMotion';
import { useInViewport } from './pendulum/useInViewport';
import { usePosterCrossfade } from './pendulum/usePosterCrossfade';
import { usePendulumPhysics } from './pendulum/usePendulumPhysics';

interface DrawingsWindowProps {
  sources: string[];
  onOpen: () => void;
}

/**
 * Small square glass "window" on Home. It cross-fades through the FIRST FRAME
 * of each drawing video and opens the fullscreen gallery on click / Enter /
 * Space.
 *
 * It hangs from an elastic rope on the central column and behaves like a REAL
 * interactive pendulum (grab & fling, momentum, damping). Every expensive part
 * is lazy and viewport-gated by the hooks below, so while the user is higher up
 * the page this component does no work at all:
 *   - usePrefersReducedMotion : disables motion for accessibility
 *   - useInViewport           : the physics gate (idle until near the viewport)
 *   - usePosterCrossfade      : poster timer that only ticks while in view
 *   - usePendulumPhysics      : the rAF simulation (sleeps when at rest)
 */
export const DrawingsWindow = ({ sources, onOpen }: DrawingsWindowProps) => {
  const count = sources.length;

  const rigRef = useRef<HTMLDivElement | null>(null);
  const draggedRef = useRef(false);

  const reducedMotion = usePrefersReducedMotion();
  // physics gate: toggles as the rig scrolls into / out of view
  const active = useInViewport(rigRef, { rootMargin: '240px 0px' });
  // media latch: mount the videos + glass filter on first appearance, then keep
  const seen = useInViewport(rigRef, { rootMargin: '240px 0px', once: true });

  const { cur, prev } = usePosterCrossfade(count, active);

  usePendulumPhysics({ rigRef, active, reducedMotion, draggedRef });

  const windowStyle = { width: 'clamp(232px, 72vw, 340px)' };

  // Force each <video> to paint its first frame as a still poster.
  const showFirstFrame = (el: HTMLVideoElement | null) => {
    if (!el) return;
    try {
      el.currentTime = 0.1;
    } catch {
      /* not seekable yet; a later loadeddata/seeked will retry */
    }
  };

  // A click that ends a swing-drag must NOT open the gallery; a real tap does.
  const handleOpen = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen();
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 select-none">
      <h2 className="nld-window-title">Drawings</h2>
      <span className="nld-window-hint">Tap to open</span>

      <div className="nld-pendulum" ref={rigRef}>
        <div className="nld-pendulum__arm">
          <span className="nld-pendulum__pivot" aria-hidden="true" />
          <span className="nld-pendulum__rope" aria-hidden="true" />
          <div className="nld-pendulum__bob">
            <div
              role="button"
              tabIndex={0}
              aria-label="Open drawings gallery"
              onClick={handleOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen();
                }
              }}
              className="nld-glass-window aspect-square"
              style={windowStyle}
            >
              {seen && count > 0 && (
                <>
                  <video
                    src={sources[prev]}
                    muted
                    playsInline
                    preload="metadata"
                    className="nld-window-img"
                    onLoadedMetadata={(e) => showFirstFrame(e.currentTarget)}
                    onLoadedData={(e) => showFirstFrame(e.currentTarget)}
                  />
                  <video
                    key={cur}
                    src={sources[cur]}
                    muted
                    playsInline
                    preload="metadata"
                    className="nld-window-img nld-window-img-front"
                    onLoadedMetadata={(e) => showFirstFrame(e.currentTarget)}
                    onLoadedData={(e) => showFirstFrame(e.currentTarget)}
                  />
                </>
              )}

              {/* Frutiger glass finish (draw order: refraction -> tint -> gloss) */}
              <div className="nld-window-refract" aria-hidden="true" />
              <div className="nld-window-tint" aria-hidden="true" />
              <div className="nld-window-gloss" aria-hidden="true" />

              <div className="nld-window-cta" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M8 5v14l11-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Open gallery</span>
              </div>

              {/* Expensive SVG glass filter is only mounted once it is in view */}
              {seen && (
                <svg className="nld-window-svg" aria-hidden="true" focusable="false">
                  <filter id="nld-glass-refract" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
