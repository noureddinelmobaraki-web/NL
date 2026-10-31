// src/home/StationWindow.tsx
import { memo, type ReactNode } from 'react';
import type { MotionValue } from 'framer-motion';

export type StationWeight = 'sm' | 'md' | 'lg';

interface StationWindowProps {
  title: string;
  weight: StationWeight;
  scale?: MotionValue<number>;
  opacity?: MotionValue<number>;
  y?: MotionValue<number>;
  children: ReactNode;
  bare?: boolean;
}

export const StationWindow = memo(function StationWindow({
  title,
  weight,
  children,
  bare,
}: StationWindowProps) {
  if (bare) {
    return (
      <div className="nl-home-anchor">
        <div className="nl-home-bare">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="nl-home-anchor">
      <div className={`nl-home-window nl-home-window--${weight}`}>
        <div className="nl-home-window-glass">
          <div className="nl-home-window-titlebar">
            <span className="nl-home-window-dot" />
            <span className="nl-home-window-title">{title}</span>
          </div>
          <div className="nl-home-window-body">{children}</div>
        </div>
      </div>
    </div>
  );
});

