import { memo, useCallback, useRef } from 'react';
import { m, type Transition } from 'framer-motion';
import {
  Sun,
  Moon,
  MoonStar,
  Home,
  Joystick,
  Feather,
  Clapperboard,
  BookOpen,
  Book,
  Headphones,
  Disc,
  Globe,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { PlacedNode } from './graph.geometry';
import { spring } from '../../motion/tokens';
import { getGlassTierRevealSpec } from './launcherRevealSequence';
import type { MotionProfileName } from '../../quality/motion/motionProfile.types';
import type { GlassTier } from './glass/useGlassTier';

const LUCIDE: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  'moon-star': MoonStar,
  home: Home,
  joystick: Joystick,
  feather: Feather,
  clapperboard: Clapperboard,
  'book-open': BookOpen,
  book: Book,
  headphones: Headphones,
  disc: Disc,
  globe: Globe,
};

/* ---- Module-level press & hover physics constants (React Compiler friendly) ---- */
const LIQUID_HOVER = {
  scale: 1.03,
  transition: { type: 'spring' as const, stiffness: 520, damping: 24, mass: 0.6 },
};
const LIQUID_TAP = {
  scaleX: 1.045,
  scaleY: 0.93,
  transition: { type: 'spring' as const, stiffness: 520, damping: 24, mass: 0.6 },
};
const FROST_TAP = {
  scale: 0.97,
  transition: { type: 'tween' as const, duration: 0.12 },
};
const LITE_TAP = {
  opacity: 0.8,
  transition: { type: 'tween' as const, duration: 0.08 },
};
const INSTANT_TRANSITION: Transition = { type: 'tween', duration: 0 };

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
  glassTier?: GlassTier;
  siblingIndex?: number;
}

export const NodePill = memo(function NodePill({
  placed,
  onClick,
  onIntent,
  motionProfile,
  glassTier,
  siblingIndex = 0,
}: NodePillProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const resolvedTier: GlassTier =
    glassTier ??
    (motionProfile === 'reduced' ? 'lite' : motionProfile === 'balanced' ? 'frost' : 'liquid');

  const { node, level, pos, origin, dimmed, active, compact, hasChildren } = placed;
  const fromX = origin.x - pos.x;
  const fromY = origin.y - pos.y;
  const targetOpacity = dimmed ? 0.5 : 1;
  const targetScale = dimmed ? 0.92 : 1;

  const reveal = getGlassTierRevealSpec(resolvedTier, level === 0 ? 0 : siblingIndex);

  const branchTransition: Transition =
    resolvedTier === 'lite'
      ? INSTANT_TRANSITION
      : reveal.type === 'spring'
        ? {
            type: 'spring',
            stiffness: reveal.stiffness,
            damping: reveal.damping,
            delay: reveal.delay,
            scaleX: {
              type: 'tween',
              duration: reveal.duration,
              ease: reveal.ease,
              times: [0, 0.6, 1],
              delay: reveal.delay,
            },
          }
        : {
            type: 'tween',
            duration: reveal.duration,
            ease: reveal.ease,
            delay: reveal.delay,
          };

  const exitTransition: Transition =
    resolvedTier === 'lite'
      ? INSTANT_TRANSITION
      : {
          type: 'tween',
          duration: reveal.exitDuration,
          ease: reveal.ease,
        };

  const anchorTransition: Transition =
    resolvedTier === 'lite'
      ? INSTANT_TRANSITION
      : level === 0
        ? spring.soft
        : branchTransition;

  const whileHoverProps =
    !dimmed && resolvedTier === 'liquid' ? LIQUID_HOVER : undefined;
  const whileTapProps =
    resolvedTier === 'liquid'
      ? LIQUID_TAP
      : resolvedTier === 'frost'
        ? FROST_TAP
        : LITE_TAP;

  const handleAnimationStart = useCallback(() => {
    if (resolvedTier === 'lite') return;
    if (buttonRef.current) {
      buttonRef.current.style.willChange = 'transform, opacity';
    }
  }, [resolvedTier]);

  const handleAnimationComplete = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.style.willChange = 'auto';
    }
  }, []);

  const className = [
    'nl-node',
    `nl-node-l${level}`,
    active ? 'is-active' : '',
    dimmed ? 'is-dim' : '',
    compact ? 'is-compact' : '',
    node.tint ? `nl-tint-${node.tint}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isChildDroplet = level > 0;
  const initialScale = isChildDroplet ? 0.6 : 0.92;
  const initialOpacity = 0;
  const initialScaleX = isChildDroplet && resolvedTier === 'liquid' ? 1.06 : 1;
  const animateScaleX = isChildDroplet && resolvedTier === 'liquid' ? [1.06, 1.06, 1] : 1;

  return (
    <m.div
      className="nl-node-anchor"
      initial={false}
      animate={{ x: pos.x, y: pos.y }}
      transition={anchorTransition}
      transformTemplate={(_transform, generated) => `${generated} translate(-50%, -50%)`}
    >
      <m.button
        ref={buttonRef}
        type="button"
        className={className}
        initial={{
          opacity: initialOpacity,
          scale: initialScale,
          scaleX: initialScaleX,
          x: fromX,
          y: fromY,
        }}
        animate={{
          opacity: targetOpacity,
          scale: targetScale,
          scaleX: animateScaleX,
          x: 0,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: isChildDroplet ? 0.6 : 0.88,
          scaleX: 1,
          x: fromX,
          y: fromY,
          transition: exitTransition,
        }}
        transition={branchTransition}
        whileHover={whileHoverProps}
        whileTap={whileTapProps}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
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
      </m.button>
    </m.div>
  );
});
