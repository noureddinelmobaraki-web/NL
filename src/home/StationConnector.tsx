// src/home/StationConnector.tsx
// ثلاثة خيوط (يسار/يمين/عمود) تزحف إلى رأس النافذة مع السكرول (pathLength).
import { memo } from 'react';
import { m, type MotionValue } from 'framer-motion';
import { computeStationRays } from '../components/launcher/graph.geometry';
import type { Size } from '../components/launcher/useStageSize';

interface StationConnectorProps {
  id: string;
  size: Size;
  draw: MotionValue<number>;
  lite: boolean;
}

export const StationConnector = memo(function StationConnector({
  id,
  size,
  draw,
  lite,
}: StationConnectorProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  const rays = computeStationRays(size);
  const gradId = `nlHomeGrad-${id}`;
  const drawStyle = { pathLength: draw };
  const socketStyle = { opacity: draw };
  const coreStroke = `url(#${gradId})`;

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
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#eef4fb" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#dfe8f2" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f7fbff" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {!lite && (
        <>
          <m.path d={rays.left} className="nl-home-ray-glow" strokeWidth={8} strokeLinecap="round" style={drawStyle} />
          <m.path d={rays.right} className="nl-home-ray-glow" strokeWidth={8} strokeLinecap="round" style={drawStyle} />
          <m.path d={rays.stem} className="nl-home-ray-glow" strokeWidth={8} strokeLinecap="round" style={drawStyle} />
        </>
      )}

      <m.path d={rays.left} className="nl-home-ray-core" stroke={coreStroke} strokeWidth={2.4} strokeLinecap="round" style={drawStyle} />
      <m.path d={rays.right} className="nl-home-ray-core" stroke={coreStroke} strokeWidth={2.4} strokeLinecap="round" style={drawStyle} />
      <m.path d={rays.stem} className="nl-home-ray-core" stroke={coreStroke} strokeWidth={2.4} strokeLinecap="round" style={drawStyle} />

      <m.circle cx={rays.head.x} cy={rays.head.y} r={5} className="nl-home-socket" style={socketStyle} />
    </svg>
  );
});
