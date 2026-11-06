/**
 * src/features/liquid-glass/stages/SunAlbumsStage/fisheyeMeshMath.ts
 *
 * Pure mathematical & canvas helpers for the Connected Spherical-Dome Fisheye Mesh.
 */

import type { LiquidGlassAlbum } from '../../albumsData';

export const coverRgbCache = new Map<string, string>();
export const bakedTileCanvasCache = new Map<string, HTMLCanvasElement>();
const loadingAlbumIds = new Set<string>();

const FALLBACK_PALETTE: readonly string[] = [
  '255, 196, 86',
  '120, 214, 255',
  '244, 114, 182',
  '167, 139, 250',
  '52, 211, 153',
  '251, 166, 60',
  '96, 165, 250',
  '248, 113, 113',
  '232, 121, 249',
  '45, 212, 191',
];

export function getInitialAlbumRgb(index: number): string {
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

let sharedSamplerCanvas: HTMLCanvasElement | null = null;
let sharedSamplerCtx: CanvasRenderingContext2D | null = null;

export function extractCoverRgbFromImage(img: HTMLImageElement, albumId: string): string | null {
  const cached = coverRgbCache.get(albumId);
  if (cached) return cached;

  try {
    if (!sharedSamplerCanvas) {
      sharedSamplerCanvas = document.createElement('canvas');
      sharedSamplerCanvas.width = 6;
      sharedSamplerCanvas.height = 6;
      sharedSamplerCtx = sharedSamplerCanvas.getContext('2d', {
        willReadFrequently: true,
      });
    }
    if (!sharedSamplerCtx) return null;

    sharedSamplerCtx.clearRect(0, 0, 6, 6);
    sharedSamplerCtx.drawImage(img, 0, 0, 6, 6);
    const data = sharedSamplerCtx.getImageData(0, 0, 6, 6).data;

    let bestR = 235;
    let bestG = 195;
    let bestB = 110;
    let bestScore = -1;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (max + min) * 0.5;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lum - 255) + 1);
      const lumWeight = lum > 35 && lum < 235 ? 1.25 : 0.45;
      const score = sat * lumWeight * (max / 255);
      if (score > bestScore) {
        bestScore = score;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }

    const boost = Math.max(1, 175 / Math.max(bestR, bestG, bestB, 65));
    const finalR = Math.min(255, Math.round(bestR * boost));
    const finalG = Math.min(255, Math.round(bestG * boost));
    const finalB = Math.min(255, Math.round(bestB * boost));
    const rgb = `${finalR}, ${finalG}, ${finalB}`;
    coverRgbCache.set(albumId, rgb);
    return rgb;
  } catch {
    return null;
  }
}

export const BAKED_TEX_SIZE = 320;

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end--;
  }
  return `${text.slice(0, end)}…`;
}

function renderBakedAlbumTexture(
  canvas: HTMLCanvasElement,
  album: LiquidGlassAlbum,
  img: HTMLImageElement | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = BAKED_TEX_SIZE;
  ctx.clearRect(0, 0, S, S);

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, S, S);
  } else {
    const rgb = coverRgbCache.get(album.id) ?? getInitialAlbumRgb(album.index);
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, `rgba(${rgb}, 0.52)`);
    grad.addColorStop(0.5, 'rgba(18, 24, 38, 0.95)');
    grad.addColorStop(1, 'rgba(8, 11, 18, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  }

  const sheen = ctx.createRadialGradient(S * 0.25, S * 0.14, 4, S * 0.25, S * 0.14, S * 0.75);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);

  const shade = ctx.createLinearGradient(0, S * 0.44, 0, S);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.55, 'rgba(3, 5, 12, 0.56)');
  shade.addColorStop(1, 'rgba(2, 4, 9, 0.90)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, S * 0.44, S, S * 0.56);

  const padX = Math.round(S * 0.085);
  const maxTextW = S - padX * 2;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '800 22px "Plus Jakarta Sans", "Outfit", system-ui, -apple-system, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  const fittedTitle = truncateCanvasText(ctx, album.title, maxTextW);
  ctx.fillText(fittedTitle, padX, S - 46);

  ctx.font = '700 15.5px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 244, 205, 0.92)';
  const countLabel = `${album.tracks.length} ${album.tracks.length === 1 ? 'Song' : 'Songs'}`;
  ctx.fillText(countLabel, padX, S - 22);
  ctx.restore();
}

export function getOrEnsureAlbumTexture(album: LiquidGlassAlbum): HTMLCanvasElement {
  let baked = bakedTileCanvasCache.get(album.id);
  if (!baked) {
    baked = document.createElement('canvas');
    baked.width = BAKED_TEX_SIZE;
    baked.height = BAKED_TEX_SIZE;
    renderBakedAlbumTexture(baked, album, null);
    bakedTileCanvasCache.set(album.id, baked);
  }

  if (!loadingAlbumIds.has(album.id)) {
    loadingAlbumIds.add(album.id);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => {
      extractCoverRgbFromImage(img, album.id);
      const target = bakedTileCanvasCache.get(album.id);
      if (target) {
        renderBakedAlbumTexture(target, album, img);
      }
    };
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.referrerPolicy = 'no-referrer';
      fallbackImg.onload = () => {
        const target = bakedTileCanvasCache.get(album.id);
        if (target) {
          renderBakedAlbumTexture(target, album, fallbackImg);
        }
      };
      fallbackImg.src = album.coverUrl;
    };
    img.src = album.coverUrl;
  }

  return baked;
}

export function formatTrackTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getAlbumForInfiniteCell(
  row: number,
  col: number,
  albums: LiquidGlassAlbum[],
): LiquidGlassAlbum {
  const total = Math.max(1, albums.length);
  if (row >= 0 && row < 10 && col >= 0 && col < 10) {
    const linear = (row * 10 + col) % total;
    return albums[linear];
  }
  const h1 = Math.imul(row, 73856093) ^ Math.imul(col, 19349663);
  const h2 = Math.imul(row + 104729, 83492791) ^ Math.imul(col - 65537, 49979693);
  const mixed = Math.abs((h1 + h2 + row * 17 + col * 31) | 0);
  return albums[mixed % total];
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

export interface WarpedCellHitRegion {
  album: LiquidGlassAlbum;
  boundary: Array<{ x: number; y: number }>;
}
