// src/home/StationWindow.tsx
// النافذة الزجاجية (Frutiger-Aero). تكبر/تصغر وتتلاشى عبر قيم Motion فقط.
import { memo, type ReactNode } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import type { StationSide } from './home.stations';

interface StationWindowProps {
  title: string;
  side: StationSide;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
  y: MotionValue<number>;
  children: ReactNode;
  bare?: boolean;
}

export const StationWindow = memo(function StationWindow({
  title,
  side,
  scale,
  opacity,
  y,
  children,
  bare,
}: StationWindowProps) {
  if (bare) {
    const bareStyle = { opacity, y };
    return (
      <motion.div className="nl-home-bare" style={bareStyle}>
        {children}
      </motion.div>
    );
  }

  const windowStyle = { scale, opacity, y };

  return (
    <motion.div
      className={`nl-home-window nl-home-window--${side}`}
      style={windowStyle}
    >
      <div className="nl-home-window-glass">
        <div className="nl-home-window-titlebar">
          <span className="nl-home-window-dot" />
          <span className="nl-home-window-title">{title}</span>
        </div>
        <div className="nl-home-window-body">{children}</div>
      </div>
    </motion.div>
  );
});
