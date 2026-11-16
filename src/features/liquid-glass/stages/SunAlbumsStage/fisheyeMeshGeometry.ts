/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/fisheyeMeshGeometry.ts
 *
 * Pure geometric warp, torus lattice indexing, and polygon hit-test helpers
 * for the Connected Spherical-Dome Fisheye Mesh.
 */

import type { LiquidGlassAlbum } from '../../albumsData';

export interface WarpedCellHitRegion {
  album: LiquidGlassAlbum;
  boundary: Array<{ x: number; y: number }>;
}

export function formatTrackTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function pickCoprimeStride(total: number): number {
  if (total <= 1) return 1;
  const candidates = [10, 11, 13, 7, 17, 19, 5, 3, 2, 1];
  for (const c of candidates) {
    if (gcd(c, total) === 1) return c;
  }
  return 1;
}

export function getAlbumForInfiniteCell(
  row: number,
  col: number,
  albums: LiquidGlassAlbum[],
): LiquidGlassAlbum {
  const total = Math.max(1, albums.length);
  const stride = pickCoprimeStride(total);
  const idx = (((row * stride + col) % total) + total) % total;
  return albums[idx];
}

export function warpSphericalFisheyePoint(
  ux: number,
  uy: number,
  focusX: number,
  focusY: number,
  lensRadius: number,
  tileSize: number,
  isPhone: boolean,
  out: { x: number; y: number; scale: number },
): void {
  const dx = ux - focusX;
  const dy = uy - focusY;
  const r = Math.hypot(dx, dy);
  const u = r / Math.max(lensRadius, 1);
  const u2 = u * u;

  const maxMag = isPhone ? 1.54 : 1.58;
  const minMag = isPhone ? 0.54 : 0.52;
  const radialScale = minMag + (maxMag - minMag) / Math.pow(1 + u2, 0.92);

  const waveFreq = 1 / Math.max(lensRadius * 0.62, 1);
  const waveAmp = (tileSize * 0.068) / (1 + 0.35 * u2);
  const curveX = Math.sin(dy * waveFreq) * Math.cos(dx * waveFreq * 0.82) * waveAmp;
  const curveY = -Math.sin(dx * waveFreq) * Math.cos(dy * waveFreq * 0.82) * waveAmp;

  out.x = focusX + dx * radialScale + curveX;
  out.y = focusY + dy * radialScale + curveY;
  out.scale = radialScale;
}

export function drawWarpedTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  u2: number,
  v2: number,
): void {
  const cx = (x0 + x1 + x2) / 3;
  const cy = (y0 + y1 + y2) / 3;

  const d0 = Math.hypot(x0 - cx, y0 - cy) || 1;
  const d1 = Math.hypot(x1 - cx, y1 - cy) || 1;
  const d2 = Math.hypot(x2 - cx, y2 - cy) || 1;
  const pad = 0.55;

  const ex0 = x0 + ((x0 - cx) / d0) * pad;
  const ey0 = y0 + ((y0 - cy) / d0) * pad;
  const ex1 = x1 + ((x1 - cx) / d1) * pad;
  const ey1 = y1 + ((y1 - cy) / d1) * pad;
  const ex2 = x2 + ((x2 - cx) / d2) * pad;
  const ey2 = y2 + ((y2 - cy) / d2) * pad;

  const du1 = u1 - u0;
  const dv1 = v1 - v0;
  const du2 = u2 - u0;
  const dv2 = v2 - v0;
  const det = du1 * dv2 - du2 * dv1;
  if (Math.abs(det) < 1e-5) return;

  const invDet = 1 / det;
  const dx1 = x1 - x0;
  const dy1 = y1 - y0;
  const dx2 = x2 - x0;
  const dy2 = y2 - y0;

  const a = (dx1 * dv2 - dx2 * dv1) * invDet;
  const b = (dy1 * dv2 - dy2 * dv1) * invDet;
  const c = (dx2 * du1 - dx1 * du2) * invDet;
  const d = (dy2 * du1 - dy1 * du2) * invDet;
  const e = x0 - a * u0 - c * v0;
  const f = y0 - b * u0 - d * v0;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ex0, ey0);
  ctx.lineTo(ex1, ey1);
  ctx.lineTo(ex2, ey2);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export function pointInPolygon(
  px: number,
  py: number,
  poly: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-7) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
