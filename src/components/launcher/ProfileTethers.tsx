// src/components/launcher/ProfileTethers.tsx
// Glass "tether" animation for the profile / auth window.
//
// When the profile orb is tapped and its window opens, four luminous glass rays
// shoot from the orb. Each ray reaches the window, ties a small KNOT that curls
// around the window's corner, then trails off BEHIND the panel. Because the rays
// are injected INTO the window overlay at z-index:-1, they sit above the dark
// backdrop but behind the translucent glass panel, so the panel's own blur
// softens them — they read as filaments physically gripping the window from
// behind. On close they retract back into the orb.
//
// Only these four rays are affected; nothing else is touched. It is a pure,
// measurement-driven overlay (no layout, pointer-events:none), so it never slows
// the page: a short measurement burst during the open animation, a cheap CSS
// opacity pulse, and 4 SVG paths.
//
// All motion props are single-brace variables (no inline double braces).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

interface Corner { x: number; y: number; }
interface TetherGeom { ox: number; oy: number; cx: number; cy: number; w: number; h: number; corners: Corner[]; }

const ORB_SELECTORS = '.profile-orb--welcome, .nl-topbar-orb .profile-orb';
const WIN_SELECTORS = '.profile-shell, .auth-modal';
const OVERLAY_SELECTORS = '.profile-overlay, .auth-overlay';
const EASE = [0.22, 1, 0.36, 1] as const;

function readGeom(): TetherGeom | null {
  if (typeof document === 'undefined') return null;
  const orb = document.querySelector(ORB_SELECTORS) as HTMLElement | null;
  const win = document.querySelector(WIN_SELECTORS) as HTMLElement | null;
  if (!orb || !win) return null;
  const o = orb.getBoundingClientRect();
  const r = win.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const inset = 15;
  const corners: Corner[] = [
    { x: r.left + inset, y: r.top + inset },
    { x: r.right - inset, y: r.top + inset },
    { x: r.right - inset, y: r.bottom - inset },
    { x: r.left + inset, y: r.bottom - inset },
  ];
  return {
    ox: o.left + o.width / 2,
    oy: o.top + o.height / 2,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    w: window.innerWidth,
    h: window.innerHeight,
    corners,
  };
}

// Build one ray: a bowed line from the orb to the corner, a ~300° knot curling
// around the corner, then a short tail trailing inward (behind the panel).
function buildRay(ox: number, oy: number, c: Corner, mcx: number, mcy: number): string {
  const dx = c.x - ox;
  const dy = c.y - oy;
  const dist = Math.hypot(dx, dy) || 1;
  const dirx = dx / dist;
  const diry = dy / dist;

  const ivx = mcx - c.x;
  const ivy = mcy - c.y;
  const ilen = Math.hypot(ivx, ivy) || 1;
  const inx = ivx / ilen;
  const iny = ivy / ilen;

  const loopR = 11;
  const ex = c.x - dirx * loopR;
  const ey = c.y - diry * loopR;

  const perpx = -diry;
  const perpy = dirx;
  const bow = 16;
  const bx = (ox + ex) / 2 + perpx * bow;
  const by = (oy + ey) / 2 + perpy * bow;

  const cross = dirx * iny - diry * inx;
  const sweepSign = cross >= 0 ? 1 : -1;
  const startAng = Math.atan2(ey - c.y, ex - c.x);
  const total = (300 * Math.PI) / 180;
  const steps = 20;

  let d = 'M ' + ox + ' ' + oy + ' Q ' + bx + ' ' + by + ' ' + ex + ' ' + ey;
  for (let i = 1; i <= steps; i++) {
    const a = startAng + sweepSign * total * (i / steps);
    d += ' L ' + (c.x + Math.cos(a) * loopR) + ' ' + (c.y + Math.sin(a) * loopR);
  }
  const lastA = startAng + sweepSign * total;
  const lx = c.x + Math.cos(lastA) * loopR;
  const ly = c.y + Math.sin(lastA) * loopR;
  const tailLen = 22;
  const tcx = lx + inx * tailLen * 0.5;
  const tcy = ly + iny * tailLen * 0.5;
  const tex = c.x + inx * tailLen;
  const tey = c.y + iny * tailLen;
  d += ' Q ' + tcx + ' ' + tcy + ' ' + tex + ' ' + tey;
  return d;
}

const drawInit = { pathLength: 0, opacity: 0 };
const drawShown = { pathLength: 1, opacity: 1 };
const drawExit = { pathLength: 0, opacity: 0 };
const drawTrans = (i: number) => ({ duration: 0.62, delay: i * 0.08, ease: EASE });
const pulseStyle = (i: number) => ({ animationDelay: (0.55 + i * 0.09).toFixed(2) + 's' });

function TetherSvg({ geom }: { geom: TetherGeom }) {
  return (
    <svg
      className="nl-tether-svg"
      width={geom.w}
      height={geom.h}
      viewBox={'0 0 ' + geom.w + ' ' + geom.h}
      aria-hidden="true"
    >
      <defs>
        {geom.corners.map((c, i) => (
          <linearGradient
            key={i}
            id={'nl-tether-grad-' + i}
            gradientUnits="userSpaceOnUse"
            x1={geom.ox}
            y1={geom.oy}
            x2={c.x}
            y2={c.y}
          >
            <stop offset="0%" stopColor="#78c4ff" stopOpacity={0.16} />
            <stop offset="52%" stopColor="#78f0be" stopOpacity={0.82} />
            <stop offset="100%" stopColor="#e8fff6" stopOpacity={1} />
          </linearGradient>
        ))}
      </defs>
      {geom.corners.map((c, i) => {
        const d = buildRay(geom.ox, geom.oy, c, geom.cx, geom.cy);
        const st = pulseStyle(i);
        return (
          <g key={i}>
            <motion.path
              className="nl-tether-glow"
              d={d}
              style={st}
              initial={drawInit}
              animate={drawShown}
              exit={drawExit}
              transition={drawTrans(i)}
            />
            <motion.path
              className="nl-tether-core"
              d={d}
              style={st}
              stroke={'url(#nl-tether-grad-' + i + ')'}
              initial={drawInit}
              animate={drawShown}
              exit={drawExit}
              transition={drawTrans(i)}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ProfileTethers() {
  const { isProfileOpen, isAuthModalOpen } = useAuth();
  const open = isProfileOpen || isAuthModalOpen;
  const [geom, setGeom] = useState<TetherGeom | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    const ensureBox = () => {
      const overlay = document.querySelector(OVERLAY_SELECTORS) as HTMLElement | null;
      if (!overlay) return;
      if (!boxRef.current) {
        const box = document.createElement('div');
        box.className = 'nl-tether-box';
        boxRef.current = box;
      }
      if (boxRef.current.parentElement !== overlay) {
        overlay.insertBefore(boxRef.current, overlay.firstChild);
      }
      // Bail out of the re-render when the container is unchanged.
      setContainer((prev) => (prev === boxRef.current ? prev : boxRef.current));
    };

    const update = () => {
      ensureBox();
      const g = readGeom();
      if (g && alive) setGeom(g);
    };

    update();
    const measurementTimers = [0, 80, 180, 320, 520, 800].map((delay) =>
      window.setTimeout(() => {
        if (alive) update();
      }, delay),
    );
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    let ro: ResizeObserver | null = null;
    const win = document.querySelector(WIN_SELECTORS);
    if (win && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(win);
    }
    return () => {
      alive = false;
      measurementTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro?.disconnect();
    };
  }, [open]);

  // Remove the injected box only AFTER the retract animation has finished.
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      boxRef.current?.remove();
      boxRef.current = null;
      setContainer(null);
    }, 700);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!container) return null;

  return createPortal(
    <AnimatePresence>{open && geom ? <TetherSvg geom={geom} /> : null}</AnimatePresence>,
    container,
  );
}
