// src/components/launcher/ConnectorLayer.tsx
// The glass rays. Each edge draws two stacked paths:
//   1) a wide, blurred "glow" filament (frutiger-aero bloom)
//   2) a thin bright "core" that animates on via pathLength 0 -> 1
// Collapsing a branch fades its edges out (AnimatePresence) so rays retract.
//
// NOTE: motion props are passed as single-brace variables on purpose — inline
// double-brace object literals must be avoided in this codegen pipeline.

import { motion, AnimatePresence } from 'framer-motion';
import type { Edge } from './graph.geometry';
import type { Size } from './useStageSize';
import { ease } from '../../motion/tokens';

interface ConnectorLayerProps {
  edges: Edge[];
  size: Size;
  reduced: boolean;
}

const groupInit = { opacity: 0 };
const groupAnim = { opacity: 1 };
const groupExit = { opacity: 0, transition: { duration: 0.18 } };
const rayInit = { pathLength: 0, opacity: 0 };
const glowAnim = { pathLength: 1, opacity: 0.55 };
const coreAnim = { pathLength: 1, opacity: 0.95 };
const rayExit = { opacity: 0 };

export function ConnectorLayer({ edges, size, reduced }: ConnectorLayerProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  const drawDur = reduced ? 0.001 : 0.5;
  const rayTrans = {
    pathLength: { duration: drawDur, ease: ease.out },
    opacity: { duration: 0.2 },
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
        <filter id="nlRayGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence>
        {edges.map((edge) => (
          <motion.g key={edge.id} initial={groupInit} animate={groupAnim} exit={groupExit}>
            <motion.path
              d={edge.path}
              className="nl-ray-glow"
              stroke="url(#nlRayGrad)"
              strokeWidth={edge.depth === 1 ? 9 : 7}
              strokeLinecap="round"
              filter="url(#nlRayGlow)"
              initial={rayInit}
              animate={glowAnim}
              exit={rayExit}
              transition={rayTrans}
            />
            <motion.path
              d={edge.path}
              className="nl-ray-core"
              stroke="#eafff5"
              strokeWidth={edge.depth === 1 ? 2.4 : 1.8}
              strokeLinecap="round"
              initial={rayInit}
              animate={coreAnim}
              exit={rayExit}
              transition={rayTrans}
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
}
