// src/components/launcher/NodePill.tsx
// A single graph node rendered as a WIDE frutiger-aero glass PILL that hugs its
// label (icon chip + text). Never a card/window. Root pills carry a tagline;
// deeper pills are tighter. The pill enters from its parent's centre so it
// reads as "the ray drew this button at its tip".
//
// motion props are passed as single-brace variables (no inline double braces).

import { motion } from "framer-motion";
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
} from "lucide-react";
import type { PlacedNode } from "./graph.geometry";
import { spring } from "../../motion/tokens";

const LUCIDE: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "moon-star": MoonStar,
  home: Home,
  joystick: Joystick,
  feather: Feather,
  clapperboard: Clapperboard,
};

const hoverProps = { scale: 1.06 };
const tapProps = { scale: 0.95 };

function NodeIcon({ icon, label }: { icon: string; label: string }) {
  if (icon.startsWith("lucide:")) {
    const Cmp = LUCIDE[icon.slice(7)] ?? MoonStar;
    return (
      <Cmp className="nl-node-glyph" strokeWidth={1.9} aria-hidden="true" />
    );
  }
  return (
    <img
      src={icon}
      alt=""
      className="nl-node-img"
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      aria-label={label}
      onError={(ev) => {
        (ev.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

interface NodePillProps {
  placed: PlacedNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>, placed: PlacedNode) => void;
}

export function NodePill({ placed, onClick }: NodePillProps) {
  const { node, level, pos, origin, dimmed, active, compact, hasChildren } =
    placed;

  const fromX = origin.x - pos.x;
  const fromY = origin.y - pos.y;
  const delay = level === 0 ? 0 : 0.22;
  const targetOpacity = dimmed ? 0.4 : 1;
  const targetScale = dimmed ? 0.86 : 1;

  const anchorAnim = { x: pos.x, y: pos.y };
  // نُبقي التوسيط عبر transformTemplate بدل CSS transform الثابت، لأن framer
  // يكتب transform مضمّناً فيتجاوز أي transform في الـ CSS.
  const centerTemplate = (_t: unknown, gen: string) =>
    `${gen} translate(-50%, -50%)`;
  const btnInit = { opacity: 0, scale: 0.5, x: fromX, y: fromY };
  const btnAnim = { opacity: targetOpacity, scale: targetScale, x: 0, y: 0 };
  const btnExit = { opacity: 0, scale: 0.4, x: fromX, y: fromY };
  const btnTrans = { ...spring.soft, delay };

  const className = [
    "nl-node",
    `nl-node-l${level}`,
    active ? "is-active" : "",
    dimmed ? "is-dim" : "",
    compact ? "is-compact" : "",
    node.tint ? `nl-tint-${node.tint}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className="nl-node-anchor"
      initial={false}
      animate={anchorAnim}
      transition={spring.soft}
      transformTemplate={centerTemplate}
    >
      <motion.button
        type="button"
        className={className}
        initial={btnInit}
        animate={btnAnim}
        exit={btnExit}
        transition={btnTrans}
        whileHover={dimmed ? undefined : hoverProps}
        whileTap={tapProps}
        onClick={(e) => onClick(e, placed)}
        aria-expanded={hasChildren ? active : undefined}
      >
        <span className="nl-node-ico">
          <NodeIcon icon={node.icon} label={node.label} />
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
}
