import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Edge } from './graph.geometry';
import type { Size } from './useStageSize';
import type { MotionProfileName } from '../../quality/motion/motionProfile.types';
import { getLauncherRevealSpec } from './launcherRevealSequence';

interface ConnectorLayerProps {
  edges: Edge[];
  size: Size;
  reduced: boolean;
  motionProfile: MotionProfileName;
}

const groupExit = { opacity: 0 };
const rayExit = { pathLength: 0, opacity: 0 };

export const ConnectorLayer = memo(function ConnectorLayer({
  edges,
  size,
  reduced,
  motionProfile,
}: ConnectorLayerProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  const reveal = getLauncherRevealSpec(reduced ? 'reduced' : motionProfile);
  const transition = {
    duration: reveal.duration,
    ease: reveal.ease,
    delay: 0,
  };

  return (
    <svg
      className="nl-graph-links"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nlRayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bff6d8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#5fe0a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6fd0ff" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <AnimatePresence initial={false}>
        {edges.map((edge) => (
          <m.g
            key={edge.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={groupExit}
            transition={transition}
          >
            <m.path
              d={edge.path}
              className="nl-ray-glow"
              stroke="url(#nlRayGrad)"
              strokeWidth={edge.depth === 1 ? 9 : 7}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.55 }}
              exit={rayExit}
              transition={transition}
            />
            <m.path
              d={edge.path}
              className="nl-ray-core"
              stroke="#eafff5"
              strokeWidth={edge.depth === 1 ? 2.4 : 1.8}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              exit={rayExit}
              transition={transition}
            />
          </m.g>
        ))}
      </AnimatePresence>
    </svg>
  );
});
