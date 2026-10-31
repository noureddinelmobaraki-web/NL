import { memo } from 'react';
import { m, AnimatePresence, type Transition } from 'framer-motion';
import type { Edge, Pt } from './graph.geometry';
import type { Size } from './useStageSize';
import type { MotionProfileName } from '../../quality/motion/motionProfile.types';
import { getGlassTierRevealSpec } from './launcherRevealSequence';
import type { GlassTier } from './glass/useGlassTier';

interface ConnectorLayerProps {
  edges: Edge[];
  size: Size;
  reduced: boolean;
  motionProfile: MotionProfileName;
  glassTier?: GlassTier;
  edgeStaggerMap?: ReadonlyMap<string, number>;
  nodePositions?: ReadonlyMap<string, Pt>;
}

const INSTANT_TRANSITION: Transition = { type: 'tween', duration: 0 };

function parsePathEndpoints(path: string): { from: Pt; to: Pt } | null {
  const nums = path.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return null;
  const x1 = Number(nums[0]);
  const y1 = Number(nums[1]);
  const x2 = Number(nums[nums.length - 2]);
  const y2 = Number(nums[nums.length - 1]);
  if (Number.isNaN(x1) || Number.isNaN(y1) || Number.isNaN(x2) || Number.isNaN(y2)) {
    return null;
  }
  return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } };
}

export const ConnectorLayer = memo(function ConnectorLayer({
  edges,
  size,
  reduced,
  motionProfile,
  glassTier,
  edgeStaggerMap,
  nodePositions,
}: ConnectorLayerProps) {
  const { w, h } = size;
  if (w === 0 || h === 0) return null;

  const resolvedTier: GlassTier = reduced
    ? 'lite'
    : (glassTier ??
      (motionProfile === 'reduced' ? 'lite' : motionProfile === 'balanced' ? 'frost' : 'liquid'));

  const isLiquid = resolvedTier === 'liquid';
  const isLite = resolvedTier === 'lite';

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
        <linearGradient
          id="nlRayGrad"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={w}
          y2={h}
        >
          <stop offset="0%" stopColor="#bff6d8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#5fe0a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6fd0ff" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <AnimatePresence initial={false}>
        {edges.map((edge, idx) => {
          const siblingIndex = edgeStaggerMap?.get(edge.id) ?? idx;
          const reveal = getGlassTierRevealSpec(resolvedTier, siblingIndex);

          const drawTransition: Transition = isLite
            ? INSTANT_TRANSITION
            : reveal.type === 'spring'
              ? {
                  type: 'spring',
                  stiffness: reveal.stiffness,
                  damping: reveal.damping,
                  delay: reveal.delay,
                }
              : {
                  type: 'tween',
                  duration: reveal.duration,
                  ease: reveal.ease,
                  delay: reveal.delay,
                };

          const exitTransition: Transition = isLite
            ? INSTANT_TRANSITION
            : {
                type: 'tween',
                duration: reveal.exitDuration,
                ease: reveal.ease,
              };

          const fromPt = nodePositions?.get(edge.fromId);
          const toPt = nodePositions?.get(edge.toId);
          const parsed = !fromPt || !toPt ? parsePathEndpoints(edge.path) : null;
          const start = fromPt ?? parsed?.from ?? null;
          const end = toPt ?? parsed?.to ?? null;

          return (
            <m.g
              key={edge.id}
              initial={isLite ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: exitTransition }}
              transition={drawTransition}
            >
              {/* a) Outer glass tube (liquid + frost only) */}
              {!isLite ? (
                <m.path
                  d={edge.path}
                  className="nl-ray-glow"
                  stroke="url(#nlRayGrad)"
                  strokeWidth={edge.depth === 1 ? 8 : 6}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.35 }}
                  exit={{ pathLength: 0, opacity: 0, transition: exitTransition }}
                  transition={drawTransition}
                />
              ) : null}

              {/* b) Luminous core (all tiers) */}
              <m.path
                d={edge.path}
                className="nl-ray-core"
                stroke="#eafff5"
                strokeWidth={edge.depth === 1 ? 2.2 : 1.6}
                strokeLinecap="round"
                initial={isLite ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                exit={isLite ? { opacity: 0 } : { pathLength: 0, opacity: 0, transition: exitTransition }}
                transition={drawTransition}
              />

              {/* c) Specular top rim line shifted -1px on Y + one-shot light pulse (liquid only) */}
              {isLiquid ? (
                <>
                  <m.path
                    d={edge.path}
                    className="nl-ray-spec"
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    transform="translate(0 -1)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    exit={{ pathLength: 0, opacity: 0, transition: exitTransition }}
                    transition={drawTransition}
                  />
                  <path
                    d={edge.path}
                    pathLength={1}
                    className="nl-ray-pulse"
                    stroke="#ffffff"
                    strokeWidth={edge.depth === 1 ? 3 : 2.2}
                    strokeLinecap="round"
                    style={{ animationDelay: `${Math.round(120 + reveal.delay * 1000)}ms` }}
                  />
                </>
              ) : null}

              {/* Glowing socket circles (r=3) where each ray plugs into a pill */}
              {start ? (
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={3}
                  fill="#eafff5"
                  stroke="rgba(126, 240, 180, 0.55)"
                  strokeWidth={1.5}
                />
              ) : null}
              {end ? (
                <circle
                  cx={end.x}
                  cy={end.y}
                  r={3}
                  fill="#eafff5"
                  stroke="rgba(126, 240, 180, 0.55)"
                  strokeWidth={1.5}
                />
              ) : null}
            </m.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
});
