// src/components/layout/GlassBubbleGraph.tsx
// نسخة مصغّرة وخفيفة من متصفّح نافذة الافتتاح (radial branching) مخصّصة
// لنافذة الفقاعة. جذران: Modes / Go-to. عند اختيار جذر تتفرّع أبناؤه على
// أشعّة زجاجية منحنية. حركة أبطأ وأخفّ من نافذة الافتتاح، وتخطيط منفصل
// للهاتف والحاسوب. يُبقي معرّفات التنقل mode-<id>/dest-<id>.

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Compass, ChevronDown, type LucideIcon } from 'lucide-react';
import { useStageSize } from '../launcher/useStageSize';
import type { Theme } from '../../utils/userPrefs';

export interface BubbleMode { id: Theme; label: string; icon: LucideIcon; }
export interface BubbleDest {
  id: string;
  label: string;
  title?: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}

interface Props {
  modes: BubbleMode[];
  destinations: BubbleDest[];
  theme: Theme;
  onMode: (id: Theme) => void;
  getTabIndex: (id: string) => number;
  handleFocus: (id: string) => void;
  reduceMotion: boolean;
  isMobile: boolean;
}

type RootId = 'modes' | 'dest';
interface Pt { x: number; y: number; }
interface Leaf {
  navId: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  pos: Pt;
  onClick: (e: React.MouseEvent) => void;
}

const DEG = Math.PI / 180;

function clamp(p: Pt, w: number, h: number, pad: number): Pt {
  return {
    x: Math.max(pad, Math.min(w - pad, p.x)),
    y: Math.max(pad, Math.min(h - pad, p.y)),
  };
}

/** منحنى زجاجي (ليس خطًا مستقيمًا) — ينحني على المحور المهيمن. */
function curve(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) >= Math.abs(dx)) {
    const c1y = a.y + dy * 0.55;
    const c2y = b.y - dy * 0.55;
    return `M ${a.x} ${a.y} C ${a.x} ${c1y}, ${b.x} ${c2y}, ${b.x} ${b.y}`;
  }
  const c1x = a.x + dx * 0.55;
  const c2x = b.x - dx * 0.55;
  return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
}

/** نشر count نقاط في قوس متجه للأسفل (90°) حول parent. */
function fanDown(parent: Pt, count: number, spreadDeg: number, radius: number): Pt[] {
  if (count <= 0) return [];
  const baseDeg = 90;
  if (count === 1) {
    const A = baseDeg * DEG;
    return [{ x: parent.x + Math.cos(A) * radius, y: parent.y + Math.sin(A) * radius }];
  }
  const start = baseDeg - spreadDeg / 2;
  const step = spreadDeg / (count - 1);
  const out: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const A = (start + step * i) * DEG;
    out.push({ x: parent.x + Math.cos(A) * radius, y: parent.y + Math.sin(A) * radius });
  }
  return out;
}

// حركة أبطأ وألين من نافذة الافتتاح (أطول وأنعم).
const softSpring = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 1.1 };

export function GlassBubbleGraph({
  modes, destinations, theme, onMode, getTabIndex, handleFocus, reduceMotion, isMobile,
}: Props) {
  const { ref, size } = useStageSize<HTMLDivElement>();
  const [activeRoot, setActiveRoot] = useState<RootId | null>('modes');

  const roots: { id: RootId; label: string; icon: LucideIcon }[] = useMemo(() => ([
    { id: 'modes', label: 'Modes', icon: Palette },
    { id: 'dest', label: 'Go to', icon: Compass },
  ]), []);

  const { w, h } = size;

  const { rootPts, leaves, edges } = useMemo(() => {
    const empty = { rootPts: {} as Record<RootId, Pt>, leaves: [] as Leaf[], edges: [] as { id: string; path: string }[] };
    if (w === 0 || h === 0) return empty;

    const pad = isMobile ? 42 : 48;
    const rootY = Math.max(28, h * 0.13);
    // جذران في صفّ أعلى المسرح.
    const rp: Record<RootId, Pt> = {
      modes: { x: w * 0.30, y: rootY },
      dest: { x: w * 0.70, y: rootY },
    };
    if (!activeRoot) return { rootPts: rp, leaves: [], edges: [] };

    const parent = rp[activeRoot];
    const list: Omit<Leaf, 'pos'>[] = activeRoot === 'modes'
      ? modes.map((m) => {
          const Icon = m.icon;
          return {
            navId: `mode-${m.id}`,
            label: m.label,
            icon: <Icon size={16} />,
            active: theme === m.id,
            onClick: () => onMode(m.id),
          };
        })
      : destinations.map((d) => ({
          navId: `dest-${d.id}`,
          label: d.label,
          icon: d.icon,
          active: d.isActive,
          onClick: d.onClick,
        }));

    const count = list.length;
    // قوس أوسع للعدد الأكبر، مقيّد داخل المسرح.
    const spread = Math.min(isMobile ? 168 : 150, 30 * (count - 1) + 46);
    const radius = Math.min(h - rootY - pad, isMobile ? 116 : 132);
    const pts = fanDown(parent, count, spread, radius).map((p) => clamp(p, w, h, pad));
    const lv: Leaf[] = list.map((it, i) => ({ ...it, pos: pts[i] }));
    const ed = lv.map((c) => ({ id: c.navId, path: curve(parent, c.pos) }));
    return { rootPts: rp, leaves: lv, edges: ed };
  }, [w, h, activeRoot, modes, destinations, theme, onMode, isMobile]);

  return (
    <div
      ref={ref}
      className={`gs-graph ${isMobile ? 'gs-graph--mobile' : 'gs-graph--desktop'}`}
      dir="ltr"
    >
      {/* الأشعّة الزجاجية المنحنية */}
      <svg className="gs-graph-links" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="gsRayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bff6d8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6fd0ff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <AnimatePresence>
          {edges.map((e) => (
            <motion.path
              key={e.id}
              d={e.path}
              stroke="url(#gsRayGrad)"
              strokeWidth={2}
              strokeLinecap="round"
              initial={reduceMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
              animate={reduceMotion ? { opacity: 0.7 } : { pathLength: 1, opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </svg>

      {/* الجذور */}
      {roots.map((rt) => {
        const p = rootPts[rt.id];
        if (!p) return null;
        const Icon = rt.icon;
        const isOpen = activeRoot === rt.id;
        return (
          <motion.div
            key={rt.id}
            className="gs-graph-anchor"
            initial={false}
            animate={{ left: p.x, top: p.y }}
            transition={reduceMotion ? { duration: 0 } : softSpring}
          >
            <button
              type="button"
              className={`gs-gnode gs-gnode--root ${isOpen ? 'is-open' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveRoot((prev) => (prev === rt.id ? null : rt.id)); }}
              aria-expanded={isOpen}
            >
              <span className="gs-gnode-ico"><Icon size={16} /></span>
              <span className="gs-gnode-label">{rt.label}</span>
              <ChevronDown className={`gs-gnode-caret ${isOpen ? 'is-open' : ''}`} size={13} aria-hidden="true" />
            </button>
          </motion.div>
        );
      })}

      {/* الأوراق (أبناء الجذر المفتوح) */}
      <AnimatePresence>
        {leaves.map((lf) => (
          <motion.div
            key={lf.navId}
            className="gs-graph-anchor"
            initial={false}
            animate={{ left: lf.pos.x, top: lf.pos.y }}
            transition={reduceMotion ? { duration: 0 } : softSpring}
          >
            <motion.button
              type="button"
              className={`gs-gnode gs-gnode--leaf ${lf.active ? 'is-active' : ''}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
              transition={reduceMotion ? { duration: 0 } : { ...softSpring, delay: 0.06 }}
              onClick={(e) => { e.stopPropagation(); lf.onClick(e); }}
              data-nav-id={lf.navId}
              tabIndex={getTabIndex(lf.navId)}
              onFocus={() => handleFocus(lf.navId)}
              title={lf.label}
            >
              <span className="gs-gnode-ico">{lf.icon}</span>
              <span className="gs-gnode-label">{lf.label}</span>
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
