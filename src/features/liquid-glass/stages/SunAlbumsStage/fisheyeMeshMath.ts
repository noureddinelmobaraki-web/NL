/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/fisheyeMeshMath.ts
 *
 * Pure mathematical & canvas helpers for the Connected Spherical-Dome Fisheye Mesh.
 */

import type { LiquidGlassAlbum } from '../../albumsData';

export const coverRgbCache = new Map<string, string>();
export const bakedTileCanvasCache = new Map<string, HTMLCanvasElement>();

export let albumTextureVersion = 0;
const MAX_CONCURRENT_IMAGE_LOADS = 6;
let activeImageLoads = 0;
const pendingLoadQueue: LiquidGlassAlbum[] = [];
const queuedAlbumIds = new Set<string>();
const loadedAlbumIds = new Set<string>();
const cachedCoverUrlById = new Map<string, string>();
const readyBakeQueue: Array<{ album: LiquidGlassAlbum; img: HTMLImageElement }> = [];

export function bumpAlbumTextureVersion(): void {
  albumTextureVersion = (albumTextureVersion + 1) | 0;
}

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

const ARABIC_CHAR_RE = /[\u0600-\u06FF]/;

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
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(S / iw, S / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (S - dw) * 0.5, (S - dh) * 0.5, dw, dh);
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

  const shade = ctx.createLinearGradient(0, S * 0.42, 0, S);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.55, 'rgba(3, 5, 12, 0.62)');
  shade.addColorStop(1, 'rgba(2, 4, 9, 0.94)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, S * 0.42, S, S * 0.58);

  const padX = Math.round(S * 0.085);
  const maxTextW = S - padX * 2;
  const isArabic = ARABIC_CHAR_RE.test(album.title) || ARABIC_CHAR_RE.test(album.subtitle ?? '');

  ctx.save();
  if (isArabic) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
  } else {
    ctx.textAlign = 'left';
  }
  ctx.textBaseline = 'alphabetic';
  const anchorX = isArabic ? S - padX : padX;

  ctx.font = '800 22px "Plus Jakarta Sans", "Outfit", system-ui, -apple-system, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  const fittedTitle = truncateCanvasText(ctx, album.title, maxTextW);
  ctx.fillText(fittedTitle, anchorX, S - 46);

  ctx.font = '700 15px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 244, 205, 0.94)';
  const subRaw =
    album.subtitle !== undefined
      ? album.subtitle
      : `${album.tracks.length} ${album.tracks.length === 1 ? 'Song' : 'Songs'}`;
  const fittedSub = truncateCanvasText(ctx, subRaw, maxTextW);
  ctx.fillText(fittedSub, anchorX, S - 21);
  ctx.restore();
}

/**
 * Processes up to `maxPerFrame` decoded images into their 320x320 baked tile canvases
 * per animation frame so main-thread frame time stays well under 16ms.
 */
export function flushReadyAlbumBakes(maxPerFrame = 2): boolean {
  if (readyBakeQueue.length === 0) return false;
  let count = 0;
  while (readyBakeQueue.length > 0 && count < maxPerFrame) {
    const item = readyBakeQueue.shift()!;
    extractCoverRgbFromImage(item.img, item.album.id);
    const target = bakedTileCanvasCache.get(item.album.id);
    if (target) {
      renderBakedAlbumTexture(target, item.album, item.img);
    }
    count++;
  }
  bumpAlbumTextureVersion();
  return true;
}

function pumpImageLoadQueue(): void {
  while (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS && pendingLoadQueue.length > 0) {
    const album = pendingLoadQueue.shift()!;
    activeImageLoads++;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    let triedFallback = false;

    const finishLoad = (resolvedImg: HTMLImageElement | null) => {
      activeImageLoads = Math.max(0, activeImageLoads - 1);
      if (resolvedImg) {
        loadedAlbumIds.add(album.id);
        readyBakeQueue.push({ album, img: resolvedImg });
        bumpAlbumTextureVersion();
      }
      pumpImageLoadQueue();
    };

    const loadFallbackWithoutCors = () => {
      const fallbackSrc =
        album.fallbackCoverUrl ||
        (album.coverUrl.includes('maxresdefault.jpg')
          ? album.coverUrl.replace('maxresdefault.jpg', 'hqdefault.jpg')
          : album.coverUrl);
      const fallbackImg = new Image();
      fallbackImg.referrerPolicy = 'no-referrer';
      fallbackImg.decoding = 'async';
      fallbackImg.onload = () => {
        if (
          fallbackImg.src.includes('maxresdefault.jpg') &&
          fallbackImg.naturalWidth <= 120 &&
          !triedFallback
        ) {
          triedFallback = true;
          fallbackImg.src = fallbackSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
          return;
        }
        finishLoad(fallbackImg);
      };
      fallbackImg.onerror = () => {
        if (!triedFallback && fallbackSrc !== album.coverUrl) {
          triedFallback = true;
          fallbackImg.src = fallbackSrc;
          return;
        }
        finishLoad(null);
      };
      fallbackImg.src = album.coverUrl;
    };

    img.onload = () => {
      if (img.src.includes('maxresdefault.jpg') && img.naturalWidth <= 120) {
        const hqSrc = album.fallbackCoverUrl || img.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
        if (!triedFallback && hqSrc !== img.src) {
          triedFallback = true;
          img.src = hqSrc;
          return;
        }
      }
      if (typeof img.decode === 'function') {
        img.decode().then(() => finishLoad(img)).catch(() => finishLoad(img));
      } else {
        finishLoad(img);
      }
    };

    img.onerror = () => {
      if (!triedFallback && album.fallbackCoverUrl && album.fallbackCoverUrl !== img.src) {
        triedFallback = true;
        img.src = album.fallbackCoverUrl;
        return;
      }
      loadFallbackWithoutCors();
    };

    img.src = album.coverUrl;
  }
}

export function getOrEnsureAlbumTexture(album: LiquidGlassAlbum): HTMLCanvasElement {
  const previousCoverUrl = cachedCoverUrlById.get(album.id);
  if (previousCoverUrl !== undefined && previousCoverUrl !== album.coverUrl) {
    bakedTileCanvasCache.delete(album.id);
    coverRgbCache.delete(album.id);
    queuedAlbumIds.delete(album.id);
    loadedAlbumIds.delete(album.id);
  }
  cachedCoverUrlById.set(album.id, album.coverUrl);

  let baked = bakedTileCanvasCache.get(album.id);
  if (!baked) {
    baked = document.createElement('canvas');
    baked.width = BAKED_TEX_SIZE;
    baked.height = BAKED_TEX_SIZE;
    renderBakedAlbumTexture(baked, album, null);
    bakedTileCanvasCache.set(album.id, baked);
  }

  if (!queuedAlbumIds.has(album.id) && !loadedAlbumIds.has(album.id)) {
    queuedAlbumIds.add(album.id);
    pendingLoadQueue.push(album);
    pumpImageLoadQueue();
  }

  return baked;
}

export {
  drawWarpedTexturedTriangle,
  formatTrackTime,
  getAlbumForInfiniteCell,
  pointInPolygon,
  warpSphericalFisheyePoint,
  type WarpedCellHitRegion,
} from './fisheyeMeshGeometry';
