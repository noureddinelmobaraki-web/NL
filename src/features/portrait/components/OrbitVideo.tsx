import { forwardRef, memo, useEffect } from 'react';
import { audioManager } from '../../../audio/audioManager';
import type { OrbitConfig } from '../constants';

type Props = {
  src: string;
  cfg: OrbitConfig;
  /** Subject centre, stage-relative. The ring is centred here. */
  centerX: number;
  centerY: number;
  /** True while orbiting — drives the size change only. */
  orbiting: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setArm: (node: HTMLDivElement | null) => void;
  onActivate: () => void;
  onEnded: () => void;
  onAudible?: () => void;
};

/**
 * Four nested elements, one job each:
 *   anchor  perspective origin, sits exactly on the subject's centre of mass
 *   plane   tilts the orbital ring out of the screen
 *   arm     carries the animated transform (owned by useOrbitAnimation)
 *   video   centring and scale only
 * Collapsing any two of them breaks either the vanishing point or the tilt.
 */
export const OrbitVideo = memo(
  forwardRef<HTMLDivElement, Props>(function OrbitVideo(
    {
      src,
      cfg,
      centerX,
      centerY,
      orbiting,
      videoRef,
      setArm,
      onActivate,
      onEnded,
      onAudible,
    },
    anchorRef,
  ) {
    useEffect(() => {
      const el = videoRef.current;
      if (!el) return undefined;
      // Makes the raw <video> visible to the priority system.
      return audioManager.registerExternal('video', {
        isPlaying: () => !el.paused && !el.ended,
        pause: () => {
          try {
            el.pause();
          } catch {
            /* detached */
          }
        },
      });
    }, [videoRef]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el || !onAudible) return undefined;
      el.addEventListener('playing', onAudible);
      return () => el.removeEventListener('playing', onAudible);
    }, [videoRef, onAudible]);

    return (
      <div
        ref={anchorRef}
        className="nl-portrait-orbit-anchor"
        style={{
          left: `${centerX * 100}%`,
          top: `${centerY * 100}%`,
          perspective: `${cfg.perspectivePx}px`,
        }}
      >
        <div
          className="nl-portrait-orbit-plane"
          style={{ transform: `rotateX(${cfg.orbitTiltDeg}deg)` }}
        >
          <div ref={setArm} className="nl-portrait-orbit-arm">
            <div
              className="nl-portrait-video"
              style={{
                ['--nl-video-w' as string]: String(cfg.restWidthPct),
                transform: `translate(-50%, -50%) scale(${orbiting ? cfg.orbitScale : 1})`,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <video
                ref={videoRef}
                className="nl-portrait-video__el"
                src={src}
                autoPlay
                playsInline
                preload="auto"
                onClick={onActivate}
                onEnded={onEnded}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
