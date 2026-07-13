export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isRenderableRect(rect: RectLike): boolean {
  return Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && rect.width >= 4
    && rect.height >= 4;
}

export function rectsAreStable(
  previous: RectLike | null,
  next: RectLike,
  tolerancePx: number,
): boolean {
  if (!previous || !isRenderableRect(next)) return false;
  return Math.abs(previous.x - next.x) <= tolerancePx
    && Math.abs(previous.y - next.y) <= tolerancePx
    && Math.abs(previous.width - next.width) <= tolerancePx
    && Math.abs(previous.height - next.height) <= tolerancePx;
}
