import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  MoonStar,
  Home,
  Joystick,
  Feather,
  Clapperboard,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { PlacedNode } from './graph.geometry';
import { spring } from '../../motion/tokens';
import { getLauncherRevealSpec } from './launcherRevealSequence';
import type { MotionProfileName } from '../../quality/motion/motionProfile.types';

const LUCIDE: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  'moon-star': MoonStar,
  home: Home,
  joystick: Joystick,
  feather: Feather,
  clapperboard: Clapperboard,
};

const hoverProps = { scale: 1.035 };
const tapProps = { scale: 0.965 };

function NodeIcon({ icon, label, eager }: { icon: string; label: string; eager: boolean }) {
  if (icon.startsWith('lucide:')) {
    const Icon = LUCIDE[icon.slice(7)] ?? MoonStar;
    return <Icon className="nl-node-glyph" strokeWidth={1.9} aria-hidden="true" />;
  }
  return (
    <img
      src={icon}
      alt=""
      className="nl-node-img"
      width={48}
      height={48}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      aria-label={label}
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';
      }}
    />
  );
}

interface NodePillProps {
  placed: PlacedNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>, placed: PlacedNode) => void;
  onIntent: (placed: PlacedNode) => void;
  motionProfile: MotionProfileName;
}

export const NodePill = memo(function NodePill({
  placed,
  onClick,
  onIntent,
  motionProfile,
}: NodePillProps) {
  const { node, level, pos, origin, dimmed, active, compact, hasChildren } = placed;
  const fromX = origin.x - pos.x;
  const fromY = origin.y - pos.y;
  const targetOpacity = dimmed ? 0.42 : 1;
  const targetScale = dimmed ? 0.90 : 1;
  const reveal = getLauncherRevealSpec(motionProfile);
  const branchTransition = {
    type: 'tween' as const,
    duration: reveal.duration,
    ease: reveal.ease,
    delay: 0,
  };
  const className = [
    'nl-node',
    `nl-node-l${level}`,
    active ? 'is-active' : '',
    dimmed ? 'is-dim' : '',
    compact ? 'is-compact' : '',
    node.tint ? `nl-tint-${node.tint}` : '',
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className="nl-node-anchor"
      initial={false}
      animate={{ x: pos.x, y: pos.y }}
      transition={level === 0 ? spring.soft : branchTransition}
      transformTemplate={(_transform, generated) =>
        `${generated} translate(-50%, -50%)`
      }
    >
      <motion.button
        type="button"
        className={className}
        initial={{
          opacity: level === 0 ? 0 : 0.16,
          scale: level === 0 ? 0.92 : 0.88,
          x: fromX,
          y: fromY,
        }}
        animate={{
          opacity: targetOpacity,
          scale: targetScale,
          x: 0,
          y: 0,
        }}
        exit={{ opacity: 0, scale: 0.88, x: fromX, y: fromY }}
        transition={branchTransition}
        whileHover={dimmed ? undefined : hoverProps}
        whileTap={tapProps}
        onMouseEnter={() => onIntent(placed)}
        onPointerDown={() => onIntent(placed)}
        onClick={(event) => onClick(event, placed)}
        aria-expanded={hasChildren ? active : undefined}
      >
        <span className="nl-node-ico">
          <NodeIcon icon={node.icon} label={node.label} eager={level === 0} />
        </span>
        {compact ? null : (
          <span className="nl-node-text">
            <span className="nl-node-label">{node.label}</span>
            {level === 0 && node.tagline ? (
              <span className="nl-node-tag">{node.tagline}</span>
            ) : null}
          </span>
        )}
        {hasChildren && !compact ? (
          <ChevronRight
            className="nl-node-caret"
            size={level === 0 ? 16 : 14}
            aria-hidden="true"
          />
        ) : null}
      </motion.button>
    </motion.div>
  );
});
