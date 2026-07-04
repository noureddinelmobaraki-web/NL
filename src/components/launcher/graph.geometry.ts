// src/components/launcher/graph.geometry.ts
// Pure geometry for the radial branching launcher. No React, no DOM reads.
// Given the stage size + which root/branch is open, it returns absolute pixel
// positions for every visible node and the curved SVG paths that connect them.
//
// Two separate, independently-tuned layouts:
//   desktop -> roots on a vertical rail (left); children fan to the RIGHT.
//   mobile  -> narrow-screen friendly. Idle: the 3 roots are a vertical CENTERED
//              stack (always fully visible, never overflows width). When a root
//              opens it rises to the top-center and its children fan DOWNWARD
//              (phones have far more vertical than horizontal room); the other
//              two roots shrink to small ICON-ONLY chips in the top corners so
//              nothing is ever clipped off-screen.

import type { GraphNode } from './graph.config';
import type { Size } from './useStageSize';

export type Layout = 'desktop' | 'mobile';

export interface Pt {
  x: number;
  y: number;
}

export interface PlacedNode {
  node: GraphNode;
  level: 0 | 1 | 2; // 0 root, 1 branch, 2 leaf
  pos: Pt; // final center in stage px
  origin: Pt; // where it animates FROM (its parent center)
  dimmed: boolean; // faded (inactive root / non-active sibling)
  active: boolean; // on the currently open path
  compact: boolean; // render as an icon-only chip (collapsed inactive root)
  hasChildren: boolean;
}

export interface Edge {
  id: string;
  path: string; // svg cubic bezier "M .. C .. .. .."
  depth: 1 | 2;
}

export interface Graph {
  nodes: PlacedNode[];
  edges: Edge[];
}

const DEG = Math.PI / 180;

function clampPt(p: Pt, w: number, h: number, pad: number): Pt {
  return {
    x: Math.max(pad, Math.min(w - pad, p.x)),
    y: Math.max(pad, Math.min(h - pad, p.y)),
  };
}

/** Evenly spread `count` points around `parent` at `radius`, centred on `baseDeg`. */
function fan(parent: Pt, count: number, baseDeg: number, spreadDeg: number, radius: number): Pt[] {
  if (count <= 0) return [];
  if (count === 1) {
    const a = baseDeg * DEG;
    return [{ x: parent.x + Math.cos(a) * radius, y: parent.y + Math.sin(a) * radius }];
  }
  const start = baseDeg - spreadDeg / 2;
  const step = spreadDeg / (count - 1);
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (start + step * i) * DEG;
    pts.push({ x: parent.x + Math.cos(a) * radius, y: parent.y + Math.sin(a) * radius });
  }
  return pts;
}

/**
 * Curved (never straight) connector. The bow follows the dominant axis of
 * travel so horizontal fans (desktop) bow sideways and vertical fans (mobile)
 * bow downward — always reading like a glass filament, not a ruler line.
 */
function curve(from: Pt, to: Pt): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const c1x = from.x + dx * 0.55;
    const c2x = to.x - dx * 0.55;
    return `M ${r(from.x)} ${r(from.y)} C ${r(c1x)} ${r(from.y)}, ${r(c2x)} ${r(to.y)}, ${r(to.x)} ${r(to.y)}`;
  }
  const c1y = from.y + dy * 0.55;
  const c2y = to.y - dy * 0.55;
  return `M ${r(from.x)} ${r(from.y)} C ${r(from.x)} ${r(c1y)}, ${r(to.x)} ${r(c2y)}, ${r(to.x)} ${r(to.y)}`;
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeGraph(
  size: Size,
  layout: Layout,
  roots: GraphNode[],
  activeRootId: string | null,
  activeBranchId: string | null,
): Graph {
  const nodes: PlacedNode[] = [];
  const edges: Edge[] = [];
  const { w, h } = size;
  if (w === 0 || h === 0) return { nodes, edges };

  const isMobile = layout === 'mobile';
  const pad = isMobile ? 56 : 92;
  const n = roots.length;

  // Which inactive roots collapse to icon chips (mobile, when a root is open).
  const compactIds = new Set<string>();

  // ---------------------------------------------------------------- roots
  const rootPts: Record<string, Pt> = {};
  if (isMobile) {
    if (activeRootId) {
      // Active root rises to the top-center; children will fan downward.
      rootPts[activeRootId] = { x: w * 0.5, y: Math.max(72, h * 0.11) };
      // Inactive roots become small icon chips pinned to the top corners.
      const inactive = roots.filter((rt) => rt.id !== activeRootId);
      const chipY = Math.max(44, h * 0.07);
      const xs = inactive.length <= 1 ? [w - 44] : [44, w - 44];
      inactive.forEach((rt, i) => {
        rootPts[rt.id] = { x: xs[i] ?? w * 0.5, y: chipY };
        compactIds.add(rt.id);
      });
    } else {
      // Idle: a vertical centered stack — always fits a narrow screen.
      const spacing = Math.min(h * 0.15, 104);
      const cy = h * 0.4;
      roots.forEach((rt, i) => {
        rootPts[rt.id] = { x: w * 0.5, y: cy + (i - (n - 1) / 2) * spacing };
      });
    }
  } else {
    const railX = Math.max(180, w * 0.17);
    const spacing = Math.min(h * 0.24, 172);
    const centerY = h * 0.5;
    roots.forEach((rt, i) => {
      rootPts[rt.id] = { x: railX, y: centerY + (i - (n - 1) / 2) * spacing };
    });
  }

  roots.forEach((rt) => {
    const active = rt.id === activeRootId;
    nodes.push({
      node: rt,
      level: 0,
      pos: rootPts[rt.id],
      origin: rootPts[rt.id],
      dimmed: !!activeRootId && !active,
      active,
      compact: compactIds.has(rt.id),
      hasChildren: !!rt.children?.length,
    });
  });

  if (!activeRootId) return { nodes, edges };
  const activeRoot = roots.find((rt) => rt.id === activeRootId);
  if (!activeRoot?.children?.length) return { nodes, edges };

  // ------------------------------------------------------------ level 1
  const base = isMobile ? 90 : 0;
  const spread1 = isMobile ? 104 : 74;
  const R1 = isMobile ? Math.min(h * 0.26, 220) : Math.min(w * 0.2, 260);
  const rootPt = rootPts[activeRootId];
  const l1 = fan(rootPt, activeRoot.children.length, base, spread1, R1).map((p) => clampPt(p, w, h, pad));

  activeRoot.children.forEach((c, i) => {
    const pos = l1[i];
    const active = c.id === activeBranchId;
    nodes.push({
      node: c,
      level: 1,
      pos,
      origin: rootPt,
      dimmed: !!activeBranchId && !active,
      active,
      compact: false,
      hasChildren: !!c.children?.length,
    });
    edges.push({ id: `${activeRoot.id}->${c.id}`, path: curve(rootPt, pos), depth: 1 });
  });

  if (!activeBranchId) return { nodes, edges };
  const branchIdx = activeRoot.children.findIndex((c) => c.id === activeBranchId);
  const branch = activeRoot.children[branchIdx];
  if (!branch?.children?.length) return { nodes, edges };

  // ------------------------------------------------------------ level 2
  const branchPt = l1[branchIdx];
  const spread2 = isMobile ? 88 : 66;
  const R2 = isMobile ? Math.min(h * 0.22, 190) : Math.min(w * 0.19, 230);
  const l2 = fan(branchPt, branch.children.length, base, spread2, R2).map((p) => clampPt(p, w, h, pad));

  branch.children.forEach((leaf, i) => {
    const pos = l2[i];
    nodes.push({
      node: leaf,
      level: 2,
      pos,
      origin: branchPt,
      dimmed: false,
      active: false,
      compact: false,
      hasChildren: false,
    });
    edges.push({ id: `${branch.id}->${leaf.id}`, path: curve(branchPt, pos), depth: 2 });
  });

  return { nodes, edges };
}
