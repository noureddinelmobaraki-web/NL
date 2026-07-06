// src/home/Station.tsx
// قسم طويل (مساحة سكرول) يحوي مسرحاً لاصقاً (sticky) فيه الخيط + النافذة.
import { memo, useRef, type ReactNode } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { useStationProgress } from './useStationProgress';
import { useStageSize } from '../components/launcher/useStageSize';
import { StationConnector } from './StationConnector';
import { StationWindow } from './StationWindow';
import { useHomeMapState } from './useHomeMapState';
import type { StationSide } from './home.stations';

interface StationProps {
  id: string;
  side: StationSide;
  title: string;
  lite: boolean;
  reduced: boolean;
  bare?: boolean;
  children: ReactNode;
}

export const Station = memo(function Station({
  id,
  side,
  title,
  lite,
  reduced,
  bare,
  children,
}: StationProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: stageRef, size } = useStageSize<HTMLDivElement>();
  const motionValues = useStationProgress(sectionRef, reduced);
  const setActiveStation = useHomeMapState((s) => s.setActiveStation);

  useMotionValueEvent(motionValues.progress, 'change', (v) => {
    if (v > 0.35 && v < 0.65) setActiveStation(id);
  });

  return (
    <section
      ref={sectionRef}
      id={`station-${id}`}
      data-station={id}
      className={`nl-home-station nl-home-station--${side}`}
      aria-label={title}
    >
      <div ref={stageRef} className="nl-home-stage">
        {!bare && (
          <StationConnector
            id={id}
            side={side}
            size={size}
            draw={motionValues.draw}
            lite={lite}
          />
        )}
        <StationWindow
          title={title}
          side={side}
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
