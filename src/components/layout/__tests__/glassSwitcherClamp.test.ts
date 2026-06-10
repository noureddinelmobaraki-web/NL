import { describe, it, expect } from 'vitest';
import { clampOffset } from '../GlassModeSwitcher';

describe('clampOffset', () => {
  const vw = 1000;
  const vh = 800;

  it('لا يغيّر الإزاحة إذا كانت الفقاعة داخل الحدود', () => {
    const base = { left: 900, right: 960, top: 20, bottom: 80 };
    expect(clampOffset(base, 0, 0, vw, vh)).toEqual({ x: 0, y: 0 });
  });

  it('يدفع للداخل عند تجاوز الحافة اليمنى', () => {
    const base = { left: 970, right: 1030, top: 20, bottom: 80 };
    const r = clampOffset(base, 0, 0, vw, vh, 8);
    expect(base.right + r.x).toBeLessThanOrEqual(vw - 8);
  });

  it('يدفع للداخل عند الحافة السفلية', () => {
    const base = { left: 900, right: 960, top: 760, bottom: 820 };
    const r = clampOffset(base, 0, 0, vw, vh, 8);
    expect(base.bottom + r.y).toBeLessThanOrEqual(vh - 8);
  });

  it('يدفع للداخل عند الحافة اليسرى', () => {
    const base = { left: -20, right: 40, top: 20, bottom: 80 };
    const r = clampOffset(base, 0, 0, vw, vh, 8);
    expect(base.left + r.x).toBeGreaterThanOrEqual(8);
  });
});
