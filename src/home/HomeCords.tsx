// src/home/HomeCords.tsx
// Dynamic white "rope" cords drawn on ONE SVG overlay above the Home map.
// Every endpoint is anchored to REAL DOM positions (getBoundingClientRect) so the
// ropes stay correctly attached at ANY screen size. Recomputed on resize,
// font/image load and layout change (ResizeObserver). Viewport scrolling alone
// does not change coordinates relative to the Home map and must not trigger a
// full geometry pass.
//
// Only the ACTIVE station (the section currently in view) animates: its node is a
// soft luminous red point and a blood-red highlight travels A->B along its cords.
// Every other cord/node stays static white (no animation) so the page never lags.
//
// Link kinds:
//  - 'single' (default): one rope from `from` to `to`.
//  - 'chain': node -> first item, then item[i] -> item[i+1] corner-to-corner for
//    every item matching `itemSel` inside `#station-<station> containerSel`.
//    Corners are chosen from live geometry so it zig-zags correctly on any layout.
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useHomeMapState } from './useHomeMapState';
import type { HomeMotionMode } from './motion/homeMotion.types';

export type CordAnchor =
  | { kind: 'node'; station: string }
  | { kind: 'el'; cordId: string; ax: number; ay: number }
  | { kind: 'stationEl'; station: string; sel: string; ax: number; ay: number };

export interface CordSingle {
  id: string;
  kind?: 'single';
  from: CordAnchor;
  to: CordAnchor;
  sag?: number;
  // Which station this cord belongs to; used to light it up when that section is active.
  station?: string;
}

export interface CordChain {
  id: string;
  kind: 'chain';
  station: string;
  containerSel: string;
  itemSel: string;
  sag?: number;
}

export type CordLink = CordSingle | CordChain;

export interface CordNode {
  station: string;
}

interface Pt { x: number; y: number }

const NODE_OFFSET = 14; // px below a station's top edge where its node sits on the spine

function ropePath(a: Pt, b: Pt, sag: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const droop = Math.max(10, dist * sag);
  const c1x = a.x + dx * 0.25;
  const c1y = a.y + dy * 0.25 + droop;
  const c2x = a.x + dx * 0.75;
  const c2y = a.y + dy * 0.75 + droop;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

interface CordState {
  w: number;
  h: number;
  paths: Array<{ id: string; d: string; station?: string }>;
  dots: Array<{ id: string; x: number; y: number }>;
}

interface HomeCordsProps {
  links: CordLink[];
  nodes: CordNode[];
  motionMode: HomeMotionMode;
}

export const HomeCords = memo(function HomeCords({ links, nodes, motionMode }: HomeCordsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeStation = useHomeMapState((s) => s.activeStationId);
  const [state, setState] = useState<CordState>({ w: 0, h: 0, paths: [], dots: [] });

  const measure = useCallback(() => {
    const svg = svgRef.current;
    const root = svg?.parentElement;
    if (!svg || !root) return;
    const origin = svg.getBoundingClientRect();
    const w = origin.width;
    const h = origin.height;
    if (w < 2 || h < 2) return;

    const toPt = (x: number, y: number): Pt => ({ x: x - origin.left, y: y - origin.top });

    const resolve = (a: CordAnchor): Pt | null => {
      if (a.kind === 'node') {
        const st = root.querySelector(`#station-${a.station}`);
        if (!st) return null;
        const r = st.getBoundingClientRect();
        return { x: w / 2, y: r.top - origin.top + NODE_OFFSET };
      }
      let el: Element | null = null;
      if (a.kind === 'el') {
        el = root.querySelector(`[data-cord-id="${a.cordId}"]`);
      } else {
        el = root.querySelector(`#station-${a.station} ${a.sel}`);
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left - origin.left + r.width * a.ax,
        y: r.top - origin.top + r.height * a.ay,
      };
    };

    const paths: Array<{ id: string; d: string; station?: string }> = [];
    for (const link of links) {
      if (link.kind === 'chain') {
        const container = root.querySelector(`#station-${link.station} ${link.containerSel}`);
        const items = container
          ? Array.from(container.querySelectorAll(link.itemSel))
          : [];
        if (items.length === 0) continue;
        const sag = link.sag ?? 0.14;
        const rects = items.map((el) => el.getBoundingClientRect());
        const nodePt = resolve({ kind: 'node', station: link.station });

        // Rope-ladder: every card is held by TWO ropes at its top-left and
        // top-right corners. A card hangs from the nearest card ABOVE it in the
        // same column (matched by x-center); top-row cards (no card above them)
        // hang from the station node. Works for any column count (1 col on
        // mobile, 2 cols on desktop) purely from live geometry.
        const inset = 0.06;
        for (let i = 0; i < rects.length; i++) {
          const c = rects[i];
          const cCx = (c.left + c.right) / 2;
          let parent = -1;
          let bestGap = Infinity;
          for (let j = 0; j < rects.length; j++) {
            if (j === i) continue;
            const p = rects[j];
            if (p.bottom > c.top + 2) continue; // p must sit above c
            const pCx = (p.left + p.right) / 2;
            if (Math.abs(pCx - cCx) > Math.min(c.width, p.width) * 0.5) continue; // same column
            const gap = c.top - p.bottom;
            if (gap < bestGap) { bestGap = gap; parent = j; }
          }
          const topL = toPt(c.left + c.width * inset, c.top + 2);
          const topR = toPt(c.right - c.width * inset, c.top + 2);
          if (parent === -1) {
            if (!nodePt) continue;
            paths.push({ id: `${link.id}-${i}-l`, d: ropePath(nodePt, topL, sag), station: link.station });
            paths.push({ id: `${link.id}-${i}-r`, d: ropePath(nodePt, topR, sag), station: link.station });
          } else {
            const p = rects[parent];
            const botL = toPt(p.left + p.width * inset, p.bottom - 2);
            const botR = toPt(p.right - p.width * inset, p.bottom - 2);
            paths.push({ id: `${link.id}-${i}-l`, d: ropePath(botL, topL, sag), station: link.station });
            paths.push({ id: `${link.id}-${i}-r`, d: ropePath(botR, topR, sag), station: link.station });
          }
        }
        continue;
      }

      const p0 = resolve(link.from);
      const p1 = resolve(link.to);
      if (!p0 || !p1) continue;
      paths.push({ id: link.id, d: ropePath(p0, p1, link.sag ?? 0.16), station: link.station });
    }

    const dots: Array<{ id: string; x: number; y: number }> = [];
    for (const n of nodes) {
      const p = resolve({ kind: 'node', station: n.station });
      if (p) dots.push({ id: n.station, x: p.x, y: p.y });
    }

    setState((prev) => {
      const same =
        prev.w === w &&
        prev.h === h &&
        prev.paths.length === paths.length &&
        prev.dots.length === dots.length &&
        prev.paths.every((p, i) => p.d === paths[i].d && p.id === paths[i].id) &&
        prev.dots.every((d, i) => d.x === dots[i].x && d.y === dots[i].y && d.id === dots[i].id);
      return same ? prev : { w, h, paths, dots };
    });
  }, [links, nodes]);

  useEffect(() => {
    let raf = 0;

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();

    const svg = svgRef.current;
    const root = svg?.parentElement ?? null;
    const ro = new ResizeObserver(schedule);
    const mo = new MutationObserver(schedule);
    if (root) ro.observe(root);
    const targetIds = new Set<string>();
    links.forEach((l) => {
      if (l.kind === 'chain') {
        const c = root?.querySelector(`#station-${l.station} ${l.containerSel}`);
        if (c) {
          ro.observe(c);
          mo.observe(c, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-song-revealed'],
          });
        }
        return;
      }
      [l.from, l.to].forEach((a) => {
        if (a.kind === 'el') targetIds.add(a.cordId);
      });
    });
    targetIds.forEach((id) => {
      const el = root?.querySelector(`[data-cord-id="${id}"]`);
      if (el) ro.observe(el);
    });

    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    const timers = [120, 400, 1000, 2200].map((ms) => window.setTimeout(schedule, ms));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [measure, links]);

  return (
    <svg
      ref={svgRef}
      className="nl-cords"
      width="100%"
      height="100%"
      viewBox={`0 0 ${Math.max(1, state.w)} ${Math.max(1, state.h)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      data-motion-mode={motionMode}
    >
      <defs>
        <radialGradient id="nlNodeIdle">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="38%" stopColor="rgba(220,235,255,0.45)" />
          <stop offset="100%" stopColor="rgba(220,235,255,0)" />
        </radialGradient>
        <radialGradient id="nlNodeActive">
          <stop offset="0%" stopColor="rgba(255,255,255,1)" />
          <stop offset="28%" stopColor="rgba(255,90,96,0.9)" />
          <stop offset="70%" stopColor="rgba(193,22,38,0.5)" />
          <stop offset="100%" stopColor="rgba(193,22,38,0)" />
        </radialGradient>
      </defs>
      {state.paths.map((p) => {
        const active = !!p.station && p.station === activeStation;
        const node = state.dots.find((dot) => dot.id === p.station);
        const groupStyle: CSSProperties | undefined = node
          ? { transformOrigin: `${node.x}px ${node.y}px` }
          : undefined;
        const className = [
          'nl-cord',
          active ? 'nl-cord--active' : '',
          motionMode === 'a777' && p.station ? 'nl-cord--physical' : '',
        ].filter(Boolean).join(' ');

        return (
          <g
            key={p.id}
            className={className}
            data-station={p.station}
            style={groupStyle}
          >
            <path d={p.d} className="nl-cord-glow" />
            <path d={p.d} className="nl-cord-core" />
          </g>
        );
      })}
      {state.dots.map((d) => {
        const active = d.id === activeStation;
        return (
          <g key={d.id} className={active ? 'nl-cord-node nl-cord-node--active' : 'nl-cord-node'}>
            <circle
              cx={d.x}
              cy={d.y}
              r={active ? 26 : 15}
              className="nl-cord-node-glow"
              fill={active ? 'url(#nlNodeActive)' : 'url(#nlNodeIdle)'}
            />
            <circle cx={d.x} cy={d.y} r={active ? 3.4 : 2.6} className="nl-cord-node-core" />
          </g>
        );
      })}
    </svg>
  );
});
