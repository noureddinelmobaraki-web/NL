import { useEffect, useState } from 'react';

export interface TetherGeom {
  bx: number; by: number; bw: number; bh: number;
  ax: number; ay: number;
  ropePath: string;
}

interface Args {
  anchorEl: HTMLElement | null;
  active: boolean;
}

function computeSize(): { bw: number; bh: number } {
  if (typeof window === 'undefined') return { bw: 320, bh: 300 };
  const vw = window.innerWidth;
  if (vw < 480) {
    const bw = Math.min(vw - 24, 288);
    return { bw, bh: Math.round(bw * 0.94) };
  }
  if (vw < 768) return { bw: 300, bh: 288 };
  return { bw: 340, bh: 320 };
}

/** Places the frameless box beside the button, clamps to the viewport, and
 *  builds a CURVED (quadratic) rope path from button centre to box centre. */
export function useTetherGeometry({ anchorEl, active }: Args): TetherGeom | null {
  const [geom, setGeom] = useState<TetherGeom | null>(null);

  useEffect(() => {
    if (!active || !anchorEl) {
      setGeom(null);
      return;
    }

    const measure = () => {
      const r = anchorEl.getBoundingClientRect();
      const { bw, bh } = computeSize();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ax = r.left + r.width / 2;
      const ay = r.top + r.height / 2;

      const leftFits = r.left - bw - 16 >= 12;
      let bx = leftFits ? r.left - bw - 16 : r.right + 16;
      if (!leftFits && bx + bw + 12 > vw) bx = Math.max(12, (vw - bw) / 2);
      bx = Math.min(vw - bw - 12, Math.max(12, bx));

      let by = ay - bh / 2;
      by = Math.min(vh - bh - 12, Math.max(12, by));

      const bcx = bx + bw / 2;
      const bcy = by + bh / 2;
      const mx = (ax + bcx) / 2 + (leftFits ? -28 : 28);
      const my = (ay + bcy) / 2 - 46;
      const ropePath = `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${bcx.toFixed(1)} ${bcy.toFixed(1)}`;

      setGeom({ bx, by, bw, bh, ax, ay, ropePath });
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchorEl, active]);

  return geom;
}
