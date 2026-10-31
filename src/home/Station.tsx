import { memo, useEffect, useRef, type ReactNode } from 'react';
import { StationWindow, type StationWeight } from './StationWindow';
import { useHomeMapState } from './useHomeMapState';
import type { HomeMotionMode } from './motion/homeMotion.types';

interface StationProps {
  id: string;
  index?: number;
  title: string;
  weight: StationWeight;
  lite: boolean;
  bare?: boolean;
  children: ReactNode;
  motionMode: HomeMotionMode;
}

export const Station = memo(function Station({
  id,
  index,
  title,
  weight,
  bare,
  children,
  motionMode,
}: StationProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const setActiveStation = useHomeMapState((s) => s.setActiveStation);
  const isActive = useHomeMapState((s) => s.activeStationId === id);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveStation(id);
          }
        }
      },
      { rootMargin: '-25% 0px -25% 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, setActiveStation]);

  return (
    <section
      ref={sectionRef}
      id={`station-${id}`}
      data-station={id}
      data-station-index={index}
      data-active={isActive ? 'true' : undefined}
      data-motion-mode={motionMode}
      className={`nl-home-station nl-home-station--${id}`}
      aria-label={title}
    >
      <div className="nl-home-stage">
        <StationWindow
          title={title}
          weight={weight}
          bare={bare}
        >
          {children}
        </StationWindow>
      </div>
    </section>
  );
});

