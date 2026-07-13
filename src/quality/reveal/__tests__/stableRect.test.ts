import { describe, expect, it } from 'vitest';
import { isRenderableRect, rectsAreStable } from '../stableRect';

const rect = { x: 10, y: 20, width: 100, height: 50 };

describe('visual geometry stability', () => {
  it('rejects missing/zero visual targets', () => {
    expect(isRenderableRect({ ...rect, width: 0 })).toBe(false);
    expect(isRenderableRect(rect)).toBe(true);
  });

  it('accepts sub-pixel settling but rejects real movement', () => {
    expect(rectsAreStable(rect, { ...rect, x: 10.4 }, 0.75)).toBe(true);
    expect(rectsAreStable(rect, { ...rect, y: 23 }, 0.75)).toBe(false);
  });
});
