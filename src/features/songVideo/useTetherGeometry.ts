import { useMemo } from 'react';
import type { Rect } from './useAnchorRect';

export interface TetherGeometry {
  box: { left: number; top: number; width: number; height: number };
  ropePath: string;
  anchorPoint: { x: number; y: number };
  boxPoint: { x: number; y: number };
}

export function useTetherGeometry(anchor: Rect | null, isMobile: boolean): TetherGeometry | null {
  return useMemo(() => {
    if (!anchor) return null;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

    const margin = isMobile ? 12 : 20;
    const width = isMobile ? Math.min(vw - margin * 2, 340) : 460;
    const height = Math.round((width * 9) / 16); // pure video, no bar

    const ax = anchor.x + anchor.width / 2;
    const ay = anchor.y + anchor.height / 2;

    let left = ax - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));

    let top = anchor.y + anchor.height + (isMobile ? 28 : 44);
    let below = true;
    if (top + height > vh - margin) {
      top = anchor.y - height - (isMobile ? 28 : 44);
      below = false;
    }
    top = Math.max(margin, Math.min(top, vh - height - margin));

    const startX = ax;
    const startY = ay;
    const endX = left + width / 2;
    const endY = below ? top : top + height;

    // curvy "rope" (not a straight line): sag with cubic bezier control points
    const sag = Math.abs(endY - startY) * 0.4 + 34;
    const dir = below ? 1 : -1;
    const c1x = startX - 26;
    const c1y = startY + sag * dir;
    const c2x = endX + 26;
    const c2y = endY - sag * dir;
    const ropePath = 'M ' + startX + ' ' + startY +
      ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + endX + ' ' + endY;

    return {
      box: { left, top, width, height },
      ropePath,
      anchorPoint: { x: startX, y: startY },
      boxPoint: { x: endX, y: endY },
    };
  }, [anchor, isMobile]);
}
