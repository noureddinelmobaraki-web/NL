// src/home/StationConnector.tsx
// خيط زجاجي واحد ينبثق من حافة الجانب ويلتوي نحو النافذة، مرسوماً مع السكرول.
// خطّان مكدّسان (توهّج عريض + قلب رفيع) بلا أي مرشّح SVG — نفس لغة الاستقبال.
import { memo } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import type { StationSide } from './home.stations';
import { computeCascade } from '../components/launcher/graph.geometry';
import type { Size } from '../components/launcher/useStageSize';
import { ease } from '../motion/tokens';

interface StationConnectorProps {
  id: string;
  side: StationSide;
  size: Size;
  draw: MotionValue<number>;
  lite: boolean;
}

const rayTransition = { ease: ease.out };

export const StationConnector = memo(function StationConnector({
  id,
  side,
  size,
  draw,
  lite,
}: StationConnectorProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  const { path } = computeCascade(size, side);
  const gradId = `nlHomeGrad-${id}`;

  // lite (هاتف/جهاز ضعيف/reduced): بلا scrub لِـ pathLength — خيط جاهز = صفر عمل
  // هندسي لكل إطار (نفس فرع "lite" في ConnectorLayer الاستقبال).
  const glowDyn = lite ? {} : { style: { pathLength: draw } };
  const coreDyn = lite ? {} : { style: { pathLength: draw } };

  return (
    <svg
      className="nl-home-filament"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bff6d8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#5fe0a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6fd0ff" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <motion.path
        d={path}
        className="nl-home-ray-glow"
        stroke={`url(#${gradId})`}
        strokeWidth={9}
        strokeLinecap="round"
        transition={rayTransition}
        {...glowDyn}
      />
      <motion.path
        d={path}
        className="nl-home-ray-core"
        stroke="#eafff5"
        strokeWidth={2.2}
        strokeLinecap="round"
        transition={rayTransition}
        {...coreDyn}
      />
    </svg>
  );
});
