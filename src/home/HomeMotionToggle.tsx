import { memo } from 'react';
import type { A777GuardState } from './motion/useA777PerformanceGuard';
import type { HomeMotionMode } from './motion/homeMotion.types';
import { useMotionProfile } from '../quality/motion/useMotionProfile';

interface HomeMotionToggleProps {
  mode: HomeMotionMode;
  guardState: A777GuardState;
  fallbackNotice: string | null;
  onToggle: () => void;
}

export const HomeMotionToggle = memo(function HomeMotionToggle({
  mode,
  guardState,
  fallbackNotice,
  onToggle,
}: HomeMotionToggleProps) {
  const profile = useMotionProfile();
  const isReduced = profile.name === 'reduced';
  const isA777 = isReduced ? false : mode === 'a777';
  
  const status = isReduced
    ? 'DEVICE PROFILED: HARDWARE-ACCELERATED REDUCED MOTION ACTIVE'
    : isA777
    ? guardState === 'warming' ? 'CALIBRATING' : guardState === 'stable' ? 'STABLE' : 'ACTIVE'
    : 'ZERO PHYSICS';

  return (
    <div className="nl-motion-switch-wrap">
      <p className="nl-motion-switch-caption">For "sell-a-kidney" tier devices.</p>
      <button
        type="button"
        className={`nl-motion-switch ${isA777 ? 'is-a777' : ''} ${isReduced ? 'is-disabled' : ''}`}
        aria-pressed={isA777}
        aria-label={isReduced ? 'Home physics mode locked to NORMAL due to device profiling' : `Switch Home physics mode. Current mode: ${isA777 ? 'A777' : 'NORMAL'}`}
        onClick={isReduced ? undefined : onToggle}
        disabled={isReduced}
      >
        <span className="nl-motion-switch-slider" aria-hidden="true" />
        <span className="nl-motion-switch-label">NORMAL</span>
        <span className="nl-motion-switch-label">A777</span>
      </button>
      <span className="nl-motion-switch-status" aria-live="polite">
        {fallbackNotice ?? status}
      </span>
    </div>
  );
});
