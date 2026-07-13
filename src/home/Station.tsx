// src/home/Station.tsx
import { memo, useRef, type ReactNode } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { useStationProgress } from './useStationProgress';
import { useStageSize } from '../components/launcher/useStageSize';
import { StationConnector } from './StationConnector';
import { StationWindow, type StationWeight } from './StationWindow';
import { useHomeMapState } from './useHomeMapState';
import type { HomeMotionMode } from './motion/homeMotion.types';

interface StationProps {
  id: string;
  title: string;
  weight: StationWeight;
  lite: boolean;
  bare?: boolean;
  children: ReactNode;
  motionMode: HomeMotionMode;
}

export const Station = memo(function Station({
  id,
  title,
  weight,
  lite,
  bare,
  children,
  motionMode,
}: StationProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: stageRef, size } = useStageSize<HTMLDivElement>();
  const motionValues = useStationProgress(sectionRef);
  const setActiveStation = useHomeMapState((s) => s.setActiveStation);
  const isActive = useHomeMapState((s) => s.activeStationId === id);

  useMotionValueEvent(motionValues.progress, 'change', (v) => {
    if (v > 0.35 && v < 0.65) setActiveStation(id);
  });

  return (
    <section
      ref={sectionRef}
      id={`station-${id}`}
      data-station={id}
      data-active={isActive ? 'true' : undefined}
      data-motion-mode={motionMode}
      className="nl-home-station"
      aria-label={title}
    >
      <div ref={stageRef} className="nl-home-stage">
        {!bare && (
          <StationConnector id={id} size={size} draw={motionValues.draw} lite={lite} />
        )}
        <StationWindow
          title={title}
          weight={weight}
          scale={motionValues.windowScale}
          opacity={motionValues.windowOpacity}
          y={motionValues.windowY}
          bare={bare}
        >
          {children}
        </StationWindow>
      </div>
    </section>
  );
});
