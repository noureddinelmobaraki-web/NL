// src/home/StationLattice.tsx
import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export interface LatticeItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: string;
  content: ReactNode;
}

interface StationLatticeProps {
  items: LatticeItem[];
  lite: boolean;
  cordId?: string;
}

function accentStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  const vars: Record<string, string> = { '--node-accent': color };
  return vars as CSSProperties;
}

export const StationLattice = memo(function StationLattice({
  items,
  lite,
  cordId,
}: StationLatticeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const busRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLElement | null>>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start end', 'center center'],
  });
  const draw = useTransform(scrollYProgress, [0, 0.55, 1], [0, 1, 1]);
  const drawStyle = { pathLength: draw };

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const bus = busRef.current;
    if (!wrap || !bus) return;

    const measure = () => {
      const wb = wrap.getBoundingClientRect();
      const bb = bus.getBoundingClientRect();
      const fromX = bb.left - wb.left + bb.width / 2;
      const fromY = bb.top - wb.top + bb.height;
      const next: string[] = [];
      nodeRefs.current.forEach((el) => {
        if (!el) return;
        const rb = el.getBoundingClientRect();
        const tx = rb.left - wb.left + rb.width / 2;
        const ty = rb.top - wb.top;
        const midY = (fromY + ty) / 2;
        next.push(`M ${fromX} ${fromY} C ${fromX} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);
      });
      setBox({ w: wrap.clientWidth, h: wrap.clientHeight });
      setPaths(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items.length]);

  return (
    <div ref={wrapRef} className="nl-lattice" data-cord-id={cordId}>
      <div ref={busRef} className="nl-lattice-bus" aria-hidden="true" />
      <svg
        className="nl-lattice-svg"
        width={box.w}
        height={box.h}
        viewBox={`0 0 ${box.w} ${box.h}`}
        fill="none"
        aria-hidden="true"
      >
        {paths.map((d, i) => {
          const cls = lite ? 'nl-lattice-ray nl-lattice-ray--lite' : 'nl-lattice-ray';
          return (
            <motion.path key={i} d={d} className={cls} strokeLinecap="round" style={drawStyle} />
          );
        })}
      </svg>

      <div className="nl-lattice-row">
        {items.map((it, i) => {
          const setRef = (el: HTMLElement | null) => {
            nodeRefs.current[i] = el;
          };
          const glass = (
            <span className="nl-lattice-glass">
              <span className="nl-lattice-node-glyph">{it.content}</span>
              <span className="nl-lattice-glass-gloss" aria-hidden="true" />
            </span>
          );
          const icon = it.href ? (
            <a
              ref={(el: HTMLAnchorElement | null) => setRef(el)}
              className="nl-lattice-node"
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={it.label}
            >
              {glass}
            </a>
          ) : (
            <button
              ref={(el: HTMLButtonElement | null) => setRef(el)}
              type="button"
              className="nl-lattice-node"
              onClick={it.onClick}
              aria-label={it.label}
            >
              {glass}
            </button>
          );
          return (
            <div key={it.id} className="nl-lattice-node-unit" style={accentStyle(it.color)}>
              {icon}
              <span className="nl-lattice-hanger">
                <svg
                  className="nl-lattice-strings"
                  viewBox="0 0 44 20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <line x1="8" y1="0" x2="4" y2="20" />
                  <line x1="18" y1="0" x2="16" y2="20" />
                  <line x1="26" y1="0" x2="28" y2="20" />
                  <line x1="36" y1="0" x2="40" y2="20" />
                </svg>
                <span className="nl-lattice-node-label">{it.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
