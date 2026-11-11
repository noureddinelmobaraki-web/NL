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
  level: 0 | 1 | 2 | 3; // 0 root, 1 branch, 2 leaf/sub-branch, 3 sub-leaf
  pos: Pt; // final center in stage px
  origin: Pt; // where it animates FROM (its parent center)
  dimmed: boolean; // faded (inactive root / non-active sibling)
  active: boolean; // on the currently open path
  compact: boolean; // render as an icon-only chip (collapsed inactive root)
  hasChildren: boolean;
}

export interface Edge {
  id: string;
  fromId: string;
  toId: string;
  path: string; // svg cubic bezier "M .. C .. .. .."
  depth: 1 | 2 | 3;
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
  activeSubBranchId: string | null = null,
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
  const spread1 = isMobile ? 112 : 76;
  const R1 = isMobile ? Math.min(h * 0.23, 195) : Math.min(w * 0.2, 250);
  const rootPt = rootPts[activeRootId];
  const l1 = fan(rootPt, activeRoot.children.length, base, spread1, R1).map((p) => clampPt(p, w, h, pad));

  const isEntReadListenCoupled =
    activeRootId === 'ent' && (activeBranchId === 'read' || activeBranchId === 'listen');

  const l1Map: Record<string, Pt> = {};
  activeRoot.children.forEach((c, i) => {
    const pos = l1[i];
    l1Map[c.id] = pos;
    const isCoActive = isEntReadListenCoupled && (c.id === 'read' || c.id === 'listen');
    const active = c.id === activeBranchId || isCoActive;
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
    edges.push({
      id: `${activeRoot.id}->${c.id}`,
      fromId: activeRoot.id,
      toId: c.id,
      path: curve(rootPt, pos),
      depth: 1,
    });
  });

  if (!activeBranchId) return { nodes, edges };

  // Special interconnected geometry for Entertainment -> Read / Listen
  if (isEntReadListenCoupled) {
    const listenNode = activeRoot.children.find((c) => c.id === 'listen');
    const readNode = activeRoot.children.find((c) => c.id === 'read');
    const listenPt = l1Map['listen'] ?? rootPt;
    const readPt = l1Map['read'] ?? rootPt;

    const musicLeaf = listenNode?.children?.find((c) => c.id === 'music');
    const albumsLeaf = listenNode?.children?.find((c) => c.id === 'og-albums');
    const audioLeaf =
      listenNode?.children?.find((c) => c.id === 'audiobooks') ??
      readNode?.children?.find((c) => c.id === 'audiobooks');
    const booksLeaf = readNode?.children?.find((c) => c.id === 'books');
    const artNode = readNode?.children?.find((c) => c.id === 'art');

    if (activeBranchId === 'read') {
      // Read opens Books, Audio Books (connected to BOTH Listen and Books), and Art (expandable into 3 sub-nodes)
      const leafX = isMobile ? w * 0.5 : Math.min(w - pad - 40, Math.max(readPt.x, listenPt.x) + Math.min(w * 0.19, 220));
      const baseMobileY = Math.min(h - 140, Math.max(listenPt.y, readPt.y) + Math.min(h * 0.18, 140));
      const audioPos: Pt = isMobile
        ? clampPt({ x: w * 0.25, y: baseMobileY }, w, h, 44)
        : clampPt({ x: leafX, y: (listenPt.y + readPt.y) * 0.5 - 32 }, w, h, pad);
      const booksPos: Pt = isMobile
        ? clampPt({ x: w * 0.75, y: baseMobileY }, w, h, 44)
        : clampPt({ x: leafX, y: readPt.y + 24 }, w, h, pad);
      const artPos: Pt = isMobile
        ? clampPt({ x: w * 0.5, y: Math.min(h - 96, baseMobileY + 72) }, w, h, 44)
        : clampPt({ x: leafX, y: readPt.y + 96 }, w, h, pad);

      if (booksLeaf) {
        nodes.push({
          node: booksLeaf,
          level: 2,
          pos: booksPos,
          origin: readPt,
          dimmed: !!activeSubBranchId,
          active: false,
          compact: false,
          hasChildren: false,
        });
        edges.push({
          id: `read->${booksLeaf.id}`,
          fromId: 'read',
          toId: booksLeaf.id,
          path: curve(readPt, booksPos),
          depth: 2,
        });
      }

      if (audioLeaf) {
        nodes.push({
          node: audioLeaf,
          level: 2,
          pos: audioPos,
          origin: readPt,
          dimmed: !!activeSubBranchId,
          active: false,
          compact: false,
          hasChildren: false,
        });
        edges.push({
          id: `listen->${audioLeaf.id}`,
          fromId: 'listen',
          toId: audioLeaf.id,
          path: curve(listenPt, audioPos),
          depth: 2,
        });
        if (booksLeaf) {
          edges.push({
            id: `${booksLeaf.id}->${audioLeaf.id}`,
            fromId: booksLeaf.id,
            toId: audioLeaf.id,
            path: curve(booksPos, audioPos),
            depth: 2,
          });
        }
      }

      if (artNode) {
        const isArtActive = activeSubBranchId === artNode.id;
        nodes.push({
          node: artNode,
          level: 2,
          pos: artPos,
          origin: readPt,
          dimmed: !!activeSubBranchId && !isArtActive,
          active: isArtActive,
          compact: false,
          hasChildren: !!artNode.children?.length,
        });
        edges.push({
          id: `read->${artNode.id}`,
          fromId: 'read',
          toId: artNode.id,
          path: curve(readPt, artPos),
          depth: 2,
        });

        if (isArtActive && artNode.children?.length) {
          const subCount = artNode.children.length;
          const spread3 = isMobile ? 116 : 68;
          const R3 = isMobile ? Math.min(h * 0.16, 125) : Math.min(w * 0.17, 200);
          const l3 = fan(artPos, subCount, base, spread3, R3).map((p) =>
            clampPt(p, w, h, isMobile ? 42 : 76),
          );
          artNode.children.forEach((subLeaf, idx) => {
            const subPos = l3[idx];
            nodes.push({
              node: subLeaf,
              level: 3,
              pos: subPos,
              origin: artPos,
              dimmed: false,
              active: false,
              compact: false,
              hasChildren: false,
            });
            edges.push({
              id: `${artNode.id}->${subLeaf.id}`,
              fromId: artNode.id,
              toId: subLeaf.id,
              path: curve(artPos, subPos),
              depth: 3,
            });
          });
        }
      }

      return { nodes, edges };
    }

    // activeBranchId === 'listen':
    // Opens NL Music, OG ALBUMS, Audio Books, AND co-opens Read -> Books connected to Audio Books
    const leafX = Math.min(w - pad - 40, Math.max(listenPt.x, readPt.x) + Math.min(w * 0.21, 245));
    const baseMobileY = Math.max(listenPt.y, readPt.y) + Math.min(h * 0.17, 130);
    const rowGapMobile = Math.min(h * 0.12, 82);

    const desktopCenterY = (listenPt.y + readPt.y) * 0.5;
    const desktopStep = Math.min(h * 0.135, 86);

    const musicPos: Pt = isMobile
      ? clampPt({ x: w * 0.27, y: baseMobileY }, w, h, 46)
      : clampPt({ x: leafX, y: desktopCenterY - desktopStep * 1.5 }, w, h, 64);
    const albumsPos: Pt = isMobile
      ? clampPt({ x: w * 0.73, y: baseMobileY }, w, h, 46)
      : clampPt({ x: leafX, y: desktopCenterY - desktopStep * 0.5 }, w, h, 64);
    const audioPos: Pt = isMobile
      ? clampPt({ x: w * 0.27, y: baseMobileY + rowGapMobile }, w, h, 46)
      : clampPt({ x: leafX, y: desktopCenterY + desktopStep * 0.5 }, w, h, 64);
    const booksPos: Pt = isMobile
      ? clampPt({ x: w * 0.73, y: baseMobileY + rowGapMobile }, w, h, 46)
      : clampPt({ x: leafX, y: desktopCenterY + desktopStep * 1.5 }, w, h, 64);

    if (musicLeaf) {
      nodes.push({
        node: musicLeaf,
        level: 2,
        pos: musicPos,
        origin: listenPt,
        dimmed: false,
        active: false,
        compact: false,
        hasChildren: false,
      });
      edges.push({
        id: `listen->${musicLeaf.id}`,
        fromId: 'listen',
        toId: musicLeaf.id,
        path: curve(listenPt, musicPos),
        depth: 2,
      });
    }

    if (albumsLeaf) {
      nodes.push({
        node: albumsLeaf,
        level: 2,
        pos: albumsPos,
        origin: listenPt,
        dimmed: false,
        active: false,
        compact: false,
        hasChildren: false,
      });
      edges.push({
        id: `listen->${albumsLeaf.id}`,
        fromId: 'listen',
        toId: albumsLeaf.id,
        path: curve(listenPt, albumsPos),
        depth: 2,
      });
    }

    if (audioLeaf) {
      nodes.push({
        node: audioLeaf,
        level: 2,
        pos: audioPos,
        origin: listenPt,
        dimmed: false,
        active: false,
        compact: false,
        hasChildren: false,
      });
      edges.push({
        id: `listen->${audioLeaf.id}`,
        fromId: 'listen',
        toId: audioLeaf.id,
        path: curve(listenPt, audioPos),
        depth: 2,
      });
    }

    if (booksLeaf) {
      nodes.push({
        node: booksLeaf,
        level: 2,
        pos: booksPos,
        origin: readPt,
        dimmed: false,
        active: false,
        compact: false,
        hasChildren: false,
      });
      edges.push({
        id: `read->${booksLeaf.id}`,
        fromId: 'read',
        toId: booksLeaf.id,
        path: curve(readPt, booksPos),
        depth: 2,
      });
      if (audioLeaf) {
        edges.push({
          id: `${booksLeaf.id}->${audioLeaf.id}`,
          fromId: booksLeaf.id,
          toId: audioLeaf.id,
          path: curve(booksPos, audioPos),
          depth: 2,
        });
      }
    }

    return { nodes, edges };
  }

  const branchIdx = activeRoot.children.findIndex((c) => c.id === activeBranchId);
  const branch = activeRoot.children[branchIdx];
  if (!branch?.children?.length) return { nodes, edges };

  // ------------------------------------------------------------ level 2 (standard branches e.g. Watch)
  const branchPt = l1[branchIdx];
  const childCount = branch.children.length;
  const spread2 = isMobile ? (childCount >= 3 ? 110 : 88) : (childCount >= 3 ? 78 : 66);
  const R2 = isMobile ? Math.min(h * 0.22, 185) : Math.min(w * 0.19, 230);
  const base2 = isMobile && branchPt.x > w * 0.62 ? 112 : base;
  const l2 = fan(branchPt, childCount, base2, spread2, R2).map((p) =>
    clampPt(p, w, h, isMobile ? 48 : pad),
  );

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
    edges.push({
      id: `${branch.id}->${leaf.id}`,
      fromId: branch.id,
      toId: leaf.id,
      path: curve(branchPt, pos),
      depth: 2,
    });
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------- home rays
export interface StationRays {
  head: Pt;
  headY: number;
  left: string;
  right: string;
  stem: string;
}

// خيوط Home: تزحف من الحافتين ومن العمود نحو رأس النافذة (أعلى-الوسط).
export function computeStationRays(size: Size, headYRatio = 0.28): StationRays {
  const { w, h } = size;
  const headY = h * headYRatio;
  const head: Pt = { x: w * 0.5, y: headY };
  const top: Pt = { x: w * 0.5, y: 0 };
  const leftFrom: Pt = { x: 0, y: headY };
  const rightFrom: Pt = { x: w, y: headY };
  return {
    head,
    headY,
    left: curve(leftFrom, head),
    right: curve(rightFrom, head),
    stem: curve(top, head),
  };
}

