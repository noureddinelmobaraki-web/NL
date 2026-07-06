// src/home/StationWindow.tsx
// نافذة فضّية معدنية مثبّتة عند رأسها (top:28%) لتتصل بالخيوط.
import { memo, type ReactNode } from 'react';
import { motion, type MotionValue } from 'framer-motion';

export type StationWeight = 'sm' | 'md' | 'lg';

interface StationWindowProps {
  title: string;
  weight: StationWeight;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
  y: MotionValue<number>;
  children: ReactNode;
  bare?: boolean;
}

export const StationWindow = memo(function StationWindow({
  title,
  weight,
  scale,
  opacity,
  y,
  children,
  bare,
}: StationWindowProps) {
  const windowStyle = { scale, opacity, y };

  if (bare) {
    const bareStyle = { opacity, y };
    return (
      <div className="nl-home-anchor">
        <motion.div className="nl-home-bare" style={bareStyle}>
          {children}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="nl-home-anchor">
      <motion.div
        className={`nl-home-window nl-home-window--${weight}`}
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
    </div>
  );
});
