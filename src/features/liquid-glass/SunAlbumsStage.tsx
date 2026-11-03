/**
 * src/features/liquid-glass/SunAlbumsStage.tsx
 *
 * Full-page Sun Albums Experience:
 *  1. Connected Spherical-Dome Fisheye Mesh (Zero Overlapping Squares, Zero Straight Lines):
 *     - Renders an infinite 2D staggered lattice where all adjacent album covers share
 *       their exact mathematical boundary vertices through a unified C-infinity
 *       Spherical-Dome Fisheye projection W(x, y).
 *     - No album climbs on top of its neighbor (zero z-index card stacking).
 *     - Every deformation in one album cover automatically curves and deforms its
 *       connected neighbors; parts of an album closer to the focal center expand
 *       while parts farther from the center compress smaller (zero flat squares).
 *     - Ultra-thin luminous silk glass thread (1px) curves continuously along every
 *       shared boundary between connected album covers.
 *     - On Desktop: spherical fisheye dome is anchored at the screen center (and
 *       responds subtly to cursor). On Phone/Touch: spherical fisheye dome follows
 *       the user's finger in real time.
 *  2. Instant & Smooth Album Opening on Phone, Tablet, and PC via exact warped-polygon
 *     hit-testing (0ms delay).
 *  3. True Sun & Earth Orb Clear Bubble Glass:
 *     - Selected Album cover fills 100% of the wobbling water-droplet bubble with
 *       an ultra-thin caustic glass rim.
 *     - Track tubes, expanded player, and lyrics capsule use the crystal-clear
 *       transparent bubble glass from the Sun & Earth orbs.
 *  4. Self-Luminous Golden-Yellow Letters (Zero Rectangular Glow Box):
 *     - Song titles and track numbers have their letter strokes themselves painted
 *       with a radiant golden-yellow gradient (-webkit-background-clip: text) and
 *       zero clipped rectangular text-shadow boxes.
 *  5. iOS 26 Diagonal 3-Capsule Lyrics displaying STRICTLY 2 lines only.
 *  6. Smart Background Video Engine: verifies YouTube playability and displays the
 *       Album Cover in the background whenever YouTube is off or unavailable.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronUp,
  Move,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type Hls from 'hls.js';
import {
  fetchLyrics,
  getCachedLyrics,
  type LyricsResult,
} from '../music/data/lyrics';
import {
  LIQUID_GLASS_ALBUMS,
  type LiquidGlassAlbum,
  type LiquidGlassTrack,
} from './albumsData';
import { getTrackYoutubeVideoId } from './albumsYoutubeCatalog';

// ============================================================================
// Lightweight Cover Color Cache & Pre-Baked High-DPI Tile Texture Cache
// ============================================================================
const coverRgbCache = new Map<string, string>();
const bakedTileCanvasCache = new Map<string, HTMLCanvasElement>();
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

function getInitialAlbumRgb(index: number): string {
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

let sharedSamplerCanvas: HTMLCanvasElement | null = null;
let sharedSamplerCtx: CanvasRenderingContext2D | null = null;

function extractCoverRgbFromImage(img: HTMLImageElement, albumId: string): string | null {
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

const BAKED_TEX_SIZE = 320;

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

  // Subtle top-left liquid glass internal sheen
  const sheen = ctx.createRadialGradient(S * 0.25, S * 0.14, 4, S * 0.25, S * 0.14, S * 0.75);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);

  // Bottom legibility gradient for Album Title + Song Count
  const shade = ctx.createLinearGradient(0, S * 0.44, 0, S);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.55, 'rgba(3, 5, 12, 0.56)');
  shade.addColorStop(1, 'rgba(2, 4, 9, 0.90)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, S * 0.44, S, S * 0.56);

  // Bottom-left Metadata: Bold White Album Title + Song Count Beneath
  const padX = Math.round(S * 0.085);
  const maxTextW = S - padX * 2;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Album Title
  ctx.font = '800 22px "Plus Jakarta Sans", "Outfit", system-ui, -apple-system, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  const fittedTitle = truncateCanvasText(ctx, album.title, maxTextW);
  ctx.fillText(fittedTitle, padX, S - 46);

  // Song Count beneath title
  ctx.font = '700 15.5px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 244, 205, 0.92)';
  const countLabel = `${album.tracks.length} ${album.tracks.length === 1 ? 'Song' : 'Songs'}`;
  ctx.fillText(countLabel, padX, S - 22);
  ctx.restore();
}

function getOrEnsureAlbumTexture(album: LiquidGlassAlbum): HTMLCanvasElement {
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
      // Retry without crossOrigin if CDN blocks CORS headers
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

function formatTrackTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// Deterministic Spatial Hash for Infinite 2D Exploration without Neighbor Clones
// ============================================================================
const TOTAL_ALBUMS = LIQUID_GLASS_ALBUMS.length;

function getAlbumForInfiniteCell(row: number, col: number): LiquidGlassAlbum {
  if (row >= 0 && row < 10 && col >= 0 && col < 10) {
    const linear = (row * 10 + col) % TOTAL_ALBUMS;
    return LIQUID_GLASS_ALBUMS[linear];
  }
  const h1 = Math.imul(row, 73856093) ^ Math.imul(col, 19349663);
  const h2 = Math.imul(row + 104729, 83492791) ^ Math.imul(col - 65537, 49979693);
  const mixed = Math.abs((h1 + h2 + row * 17 + col * 31) | 0);
  return LIQUID_GLASS_ALBUMS[mixed % TOTAL_ALBUMS];
}

// ============================================================================
// Unified Spherical-Dome Fisheye Projection W(ux, uy)
// ============================================================================
// Every vertex on the connected staggered mesh is transformed through this
// single global bijection. Because adjacent album tiles share the exact same
// boundary coordinates (ux, uy), their warped edges are 100% identical curves:
//   - Zero overlapping layers (no square climbs on top of its neighbor)
//   - Zero straight lines anywhere on the screen
//   - Zero flat squares: the side of an album closer to the center expands,
//     while the side of the SAME album farther from the center compresses!
function warpSphericalFisheyePoint(
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

  // Monotonic spherical dome magnification:
  // At focal center (u = 0): scale = maxMag (~1.56x)
  // At outer periphery (u >> 1): scale compresses smoothly toward minMag (~0.52x)
  // Satisfies dr'/dr > 0 everywhere so adjacent tiles never fold or overlap!
  const maxMag = isPhone ? 1.54 : 1.58;
  const minMag = isPhone ? 0.54 : 0.52;
  const radialScale = minMag + (maxMag - minMag) / Math.pow(1 + u2, 0.92);

  // Subtle continuous spherical lens curvature wave so even radial lines curve organically
  const waveFreq = 1 / Math.max(lensRadius * 0.62, 1);
  const waveAmp = (tileSize * 0.068) / (1 + 0.35 * u2);
  const curveX = Math.sin(dy * waveFreq) * Math.cos(dx * waveFreq * 0.82) * waveAmp;
  const curveY = -Math.sin(dx * waveFreq) * Math.cos(dy * waveFreq * 0.82) * waveAmp;

  out.x = focusX + dx * radialScale + curveX;
  out.y = focusY + dy * radialScale + curveY;
  out.scale = radialScale;
}

// ============================================================================
// Affine Textured Triangle Renderer on 2D Canvas (Subdivided Mesh Cell)
// ============================================================================
function drawWarpedTexturedTriangle(
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
  // Expand triangle clip vertices by 0.55px from centroid to prevent sub-pixel antialiasing seams
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

function pointInPolygon(px: number, py: number, poly: ReadonlyArray<{ x: number; y: number }>): boolean {
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

interface WarpedCellHitRegion {
  album: LiquidGlassAlbum;
  boundary: Array<{ x: number; y: number }>;
}

// ============================================================================
// Expressive Icons (Icon-Only Lyrics SVG + Icon-Only YouTube SVG)
// ============================================================================
const LyricsExpressiveIcon = React.memo(function LyricsExpressiveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h11" />
      <path d="M4 12h9" />
      <path d="M4 18h7" />
      <path d="M18 15a2.5 2.5 0 1 0 2.5 2.5V7l2.5 1.5" />
    </svg>
  );
});

const YoutubeExpressiveIcon = React.memo(function YoutubeExpressiveIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="4.5"
        width="20"
        height="15"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="2"
        fill={active ? 'rgba(255, 70, 70, 0.25)' : 'none'}
      />
      <path
        d="M10 9.2L15.2 12L10 14.8V9.2Z"
        fill="currentColor"
      />
      {!active && (
        <line
          x1="3.5"
          y1="3.5"
          x2="20.5"
          y2="20.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
});

// ============================================================================
// Main SunAlbumsStage Component
// ============================================================================
export interface SunAlbumsStageProps {
  viewportWidth: number;
  viewportHeight: number;
  externalMuted: boolean;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  onBackToOrbs: () => void;
}

export const SunAlbumsStage = React.memo(function SunAlbumsStage({
  viewportWidth,
  viewportHeight,
  externalMuted,
  onToggleMute,
  onAudioActiveChange,
  onAudioElementMount,
  onBackToOrbs,
}: SunAlbumsStageProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<LiquidGlassAlbum | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);

  // Active track & audio playback state
  const [activeTrack, setActiveTrack] = useState<LiquidGlassTrack | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Background YouTube video state & verified playability state
  const [ytBgEnabled, setYtBgEnabled] = useState(true);
  const [ytVideoVerifiedPlaying, setYtVideoVerifiedPlaying] = useState(false);
  const [ytVideoFailed, setYtVideoFailed] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Free 2D drag offset for the Expanded Clear Bubble Glass Player Card
  const [playerDragOffset, setPlayerDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const playerDragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Lyrics state (via `nl music` lyrics engine)
  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsWindowOpen, setLyricsWindowOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Selected Album Cover Droplet Ref
  const ascendedCoverRef = useRef<HTMLDivElement | null>(null);

  // ── Contiguous Staggered Mesh Base Metrics ────────────────────────────────
  const gridConfig = useMemo(() => {
    const isPhone =
      viewportWidth <= 768 ||
      (viewportWidth < 900 && viewportHeight > viewportWidth * 1.05);

    const tileSize = isPhone
      ? Math.round(Math.max(142, Math.min(viewportWidth * 0.44, 180)))
      : Math.round(Math.max(204, Math.min(viewportWidth * 0.18, 256)));

    const staggerShift = tileSize * 0.5;

    return {
      isPhone,
      tileSize,
      staggerShift,
    };
  }, [viewportWidth, viewportHeight]);

  // ── Connected Spherical Fisheye Mesh Canvas & Hit Regions ─────────────────
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitRegionsRef = useRef<WarpedCellHitRegion[]>([]);

  const panRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    isDown: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    movedDist: number;
    initialized: boolean;
  }>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    isDown: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    movedDist: 0,
    initialized: false,
  });

  // Live Fisheye Focal Point: Center of screen on PC; follows finger on Phone!
  const fisheyeFocusRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    activeTouch: boolean;
  }>({
    x: viewportWidth * 0.5,
    y: viewportHeight * 0.5,
    targetX: viewportWidth * 0.5,
    targetY: viewportHeight * 0.5,
    activeTouch: false,
  });

  useEffect(() => {
    if (!fisheyeFocusRef.current.activeTouch) {
      fisheyeFocusRef.current.targetX = viewportWidth * 0.5;
      fisheyeFocusRef.current.targetY = viewportHeight * 0.5;
      fisheyeFocusRef.current.x = viewportWidth * 0.5;
      fisheyeFocusRef.current.y = viewportHeight * 0.5;
    }
  }, [viewportWidth, viewportHeight]);

  // ── Instant & Smooth Album Selection on Both Phone and PC ─────────────────
  const lastSelectTimeRef = useRef<number>(0);
  const handleSelectAlbum = useCallback((album: LiquidGlassAlbum) => {
    const now = performance.now();
    if (now - lastSelectTimeRef.current < 220) return;
    lastSelectTimeRef.current = now;

    panRef.current.isDown = false;
    panRef.current.vx = 0;
    panRef.current.vy = 0;
    setIsDraggingGrid(false);

    setSelectedAlbum(album);
    setActiveTrack(null);
    setIsPlayerExpanded(false);
    setPlayerDragOffset({ x: 0, y: 0 });
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLyricsData(null);
    setLyricsWindowOpen(false);
  }, []);

  // ── Main Connected Spherical Fisheye Mesh Render Loop ─────────────────────
  useEffect(() => {
    if (selectedAlbum) return undefined;

    const canvas = meshCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const p = panRef.current;
    if (!p.initialized) {
      p.x = Math.round(viewportWidth * 0.5 - gridConfig.tileSize * 4.5);
      p.y = Math.round(viewportHeight * 0.5 - gridConfig.tileSize * 3.5);
      p.initialized = true;
    }

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const cw = Math.max(1, Math.round(viewportWidth * dpr));
    const ch = Math.max(1, Math.round(viewportHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Subdivision resolution per album cover: N=4 (5x5 shared vertices = 32 triangles per album)
    // Because N=4 is even, the 0.5 stagger offset at i=2 shares the exact vertex with staggered rows!
    const N = 4;
    const ptOut = { x: 0, y: 0, scale: 1 };

    let rafId = 0;
    const renderMeshFrame = () => {
      if (!p.isDown) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        if (Math.abs(p.vx) < 0.04) p.vx = 0;
        if (Math.abs(p.vy) < 0.04) p.vy = 0;
      }

      const focus = fisheyeFocusRef.current;
      focus.x += (focus.targetX - focus.x) * 0.24;
      focus.y += (focus.targetY - focus.y) * 0.24;

      const focusX = focus.x;
      const focusY = focus.y;
      const { tileSize, staggerShift, isPhone } = gridConfig;
      const lensRadius = Math.hypot(viewportWidth, viewportHeight) * (isPhone ? 0.44 : 0.42);

      // Compute visible cell window in unwarped world coordinates (with generous margin for outer compression)
      const margin = tileSize * 2.1;
      const minRow = Math.floor((-p.y - margin) / tileSize);
      const maxRow = Math.ceil((-p.y + viewportHeight + margin) / tileSize);
      const minCol = Math.floor((-p.x - margin - staggerShift) / tileSize);
      const maxCol = Math.ceil((-p.x + viewportWidth + margin + staggerShift) / tileSize);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      const newHitRegions: WarpedCellHitRegion[] = [];

      // Grid of warped vertices for current cell: (N+1) x (N+1)
      const vxGrid = new Float32Array((N + 1) * (N + 1));
      const vyGrid = new Float32Array((N + 1) * (N + 1));
      const vsGrid = new Float32Array((N + 1) * (N + 1));

      for (let r = minRow; r <= maxRow; r++) {
        const isOddRow = ((r % 2) + 2) % 2 === 1;
        const rowOffset = isOddRow ? staggerShift : 0;
        const baseY = r * tileSize;

        for (let c = minCol; c <= maxCol; c++) {
          const baseX = c * tileSize + rowOffset;

          // Compute all (N+1)x(N+1) warped vertices for this album cell
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          let maxY = -Infinity;
          let centerScale = 1;

          for (let j = 0; j <= N; j++) {
            const vFrac = j / N;
            const uy = baseY + vFrac * tileSize + p.y;
            for (let i = 0; i <= N; i++) {
              const uFrac = i / N;
              const ux = baseX + uFrac * tileSize + p.x;

              warpSphericalFisheyePoint(
                ux,
                uy,
                focusX,
                focusY,
                lensRadius,
                tileSize,
                isPhone,
                ptOut,
              );

              const idx = j * (N + 1) + i;
              vxGrid[idx] = ptOut.x;
              vyGrid[idx] = ptOut.y;
              vsGrid[idx] = ptOut.scale;

              if (i === 2 && j === 2) {
                centerScale = ptOut.scale;
              }
              if (ptOut.x < minX) minX = ptOut.x;
              if (ptOut.x > maxX) maxX = ptOut.x;
              if (ptOut.y < minY) minY = ptOut.y;
              if (ptOut.y > maxY) maxY = ptOut.y;
            }
          }

          // Cull cell if its warped bounding box is completely off-screen
          if (
            maxX < -16 ||
            minX > viewportWidth + 16 ||
            maxY < -16 ||
            minY > viewportHeight + 16
          ) {
            continue;
          }

          const album = getAlbumForInfiniteCell(r, c);
          const texCanvas = getOrEnsureAlbumTexture(album);

          // Draw N x N * 2 subdivided textured triangles for this album cover
          for (let j = 0; j < N; j++) {
            const v0 = (j / N) * BAKED_TEX_SIZE;
            const v1 = ((j + 1) / N) * BAKED_TEX_SIZE;

            for (let i = 0; i < N; i++) {
              const u0 = (i / N) * BAKED_TEX_SIZE;
              const u1 = ((i + 1) / N) * BAKED_TEX_SIZE;

              const i00 = j * (N + 1) + i;
              const i10 = i00 + 1;
              const i01 = (j + 1) * (N + 1) + i;
              const i11 = i01 + 1;

              // Upper-left triangle (i00 -> i10 -> i11)
              drawWarpedTexturedTriangle(
                ctx,
                texCanvas,
                vxGrid[i00],
                vyGrid[i00],
                vxGrid[i10],
                vyGrid[i10],
                vxGrid[i11],
                vyGrid[i11],
                u0,
                v0,
                u1,
                v0,
                u1,
                v1,
              );

              // Lower-right triangle (i00 -> i11 -> i01)
              drawWarpedTexturedTriangle(
                ctx,
                texCanvas,
                vxGrid[i00],
                vyGrid[i00],
                vxGrid[i11],
                vyGrid[i11],
                vxGrid[i01],
                vyGrid[i01],
                u0,
                v0,
                u1,
                v1,
                u0,
                v1,
              );
            }
          }

          // Build the 16-point curved perimeter path of this tile (shared with neighbors!)
          const boundary: Array<{ x: number; y: number }> = [];
          // Top edge (j=0, i=0..N)
          for (let i = 0; i < N; i++) {
            const idx = i;
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }
          // Right edge (i=N, j=0..N)
          for (let j = 0; j < N; j++) {
            const idx = j * (N + 1) + N;
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }
          // Bottom edge (j=N, i=N..0)
          for (let i = N; i > 0; i--) {
            const idx = N * (N + 1) + i;
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }
          // Left edge (i=0, j=N..0)
          for (let j = N; j > 0; j--) {
            const idx = j * (N + 1);
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }

          newHitRegions.push({ album, boundary });

          // Draw Ultra-Thin Curved Luminous Silk Glass Thread along the shared perimeter
          ctx.beginPath();
          ctx.moveTo(boundary[0].x, boundary[0].y);
          for (let k = 1; k < boundary.length; k++) {
            ctx.lineTo(boundary[k].x, boundary[k].y);
          }
          ctx.closePath();

          const rgb = coverRgbCache.get(album.id) ?? getInitialAlbumRgb(album.index);
          const silkAlpha = Math.min(0.95, Math.max(0.32, (centerScale - 0.45) * 0.78));

          // Soft inner glass bevel refraction along the curved edge
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = `rgba(${rgb}, ${(silkAlpha * 0.28).toFixed(2)})`;
          ctx.stroke();

          // Crisp 1px luminous silk filament
          ctx.lineWidth = 1.05;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(silkAlpha * 0.88).toFixed(2)})`;
          ctx.stroke();
        }
      }

      // Subtle optical dome specular aura at the fisheye center
      const domeAura = ctx.createRadialGradient(
        focusX,
        focusY,
        4,
        focusX,
        focusY,
        lensRadius * 0.65,
      );
      domeAura.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
      domeAura.addColorStop(0.5, 'rgba(255, 230, 175, 0.025)');
      domeAura.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = domeAura;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      ctx.restore();
      hitRegionsRef.current = newHitRegions;

      rafId = requestAnimationFrame(renderMeshFrame);
    };

    rafId = requestAnimationFrame(renderMeshFrame);
    return () => cancelAnimationFrame(rafId);
  }, [selectedAlbum, gridConfig, viewportWidth, viewportHeight]);

  // ── Pointer & Touch Handlers (Live Touch-Following Fisheye + Instant Tap Open) ──
  const handleGridPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const p = panRef.current;
      p.isDown = true;
      p.pointerId = e.pointerId;
      p.startX = e.clientX;
      p.startY = e.clientY;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.vx = 0;
      p.vy = 0;
      p.movedDist = 0;
      setIsDraggingGrid(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      // On Phone / Touch, fisheye focal point immediately tracks finger location
      if (e.pointerType === 'touch' || gridConfig.isPhone) {
        fisheyeFocusRef.current.activeTouch = true;
        fisheyeFocusRef.current.targetX = e.clientX;
        fisheyeFocusRef.current.targetY = e.clientY;
      }
    },
    [gridConfig.isPhone],
  );

  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = panRef.current;
      if (e.pointerType === 'touch' || gridConfig.isPhone) {
        fisheyeFocusRef.current.targetX = e.clientX;
        fisheyeFocusRef.current.targetY = e.clientY;
      }
      if (!p.isDown || p.pointerId !== e.pointerId) return;
      const dx = e.clientX - p.lastX;
      const dy = e.clientY - p.lastY;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.movedDist += Math.hypot(dx, dy);
      p.x += dx;
      p.y += dy;
      p.vx = dx;
      p.vy = dy;
    },
    [gridConfig.isPhone],
  );

  const handleGridPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = panRef.current;
      const wasTap = p.isDown && p.pointerId === e.pointerId && p.movedDist <= 14;

      if (p.pointerId === e.pointerId) {
        p.isDown = false;
        p.pointerId = -1;
        setIsDraggingGrid(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      fisheyeFocusRef.current.activeTouch = false;

      // Instant 0ms Album Opening on Tap/Click using exact warped polygon hit-testing
      if (wasTap) {
        const rect = e.currentTarget.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const tapY = e.clientY - rect.top;
        const regions = hitRegionsRef.current;
        for (let i = regions.length - 1; i >= 0; i--) {
          if (pointInPolygon(tapX, tapY, regions[i].boundary)) {
            handleSelectAlbum(regions[i].album);
            break;
          }
        }
      }
    },
    [handleSelectAlbum],
  );

  const handleGridPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (p.pointerId === e.pointerId) {
      p.isDown = false;
      p.pointerId = -1;
      setIsDraggingGrid(false);
    }
    fisheyeFocusRef.current.activeTouch = false;
  }, []);

  const handleGridWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const p = panRef.current;
    p.vx -= e.deltaX * 0.15;
    p.vy -= e.deltaY * 0.15;
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (selectedAlbum) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      onAudioActiveChange?.(false);
      setActiveTrack(null);
      setIsPlayerExpanded(false);
      setPlayerDragOffset({ x: 0, y: 0 });
      setIsPlaying(false);
      setLyricsWindowOpen(false);
      setSelectedAlbum(null);
    } else {
      onBackToOrbs();
    }
  }, [selectedAlbum, onBackToOrbs, onAudioActiveChange]);

  // ── Organic Sun/Earth Bubble Wobble on Selected Album Cover ──────────────
  useEffect(() => {
    if (!selectedAlbum) return undefined;
    let rafId = 0;
    const t0 = performance.now();

    const animateDroplet = (now: number) => {
      const elapsed = (now - t0) * 0.001;
      if (ascendedCoverRef.current) {
        const r1 = 28 + Math.sin(elapsed * 1.45) * 6 + Math.cos(elapsed * 0.75) * 2.5;
        const r2 = 28 + Math.cos(elapsed * 1.3) * 6 + Math.sin(elapsed * 0.9) * 2.5;
        const r3 = 28 + Math.sin(elapsed * 1.55 + 1.2) * 6;
        const r4 = 28 + Math.cos(elapsed * 1.2 + 2.1) * 6;
        const r5 = 28 + Math.cos(elapsed * 1.35 + 0.6) * 6;
        const r6 = 28 + Math.sin(elapsed * 1.65 + 1.8) * 6;
        const r7 = 28 + Math.cos(elapsed * 1.45 + 2.7) * 6;
        const r8 = 28 + Math.sin(elapsed * 1.25 + 0.4) * 6;
        ascendedCoverRef.current.style.borderRadius = `${r1.toFixed(1)}% ${r2.toFixed(1)}% ${r3.toFixed(1)}% ${r4.toFixed(1)}% / ${r5.toFixed(1)}% ${r6.toFixed(1)}% ${r7.toFixed(1)}% ${r8.toFixed(1)}%`;
      }
      rafId = requestAnimationFrame(animateDroplet);
    };

    rafId = requestAnimationFrame(animateDroplet);
    return () => cancelAnimationFrame(rafId);
  }, [selectedAlbum]);

  // ── Register shared <audio> element with NL audioManager ─────────────────
  useEffect(() => {
    const audio = audioRef.current;
    onAudioElementMount?.(audio);
    return () => {
      onAudioElementMount?.(null);
      onAudioActiveChange?.(false);
    };
  }, [onAudioElementMount, onAudioActiveChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  // ── Escape key support inside Sun Albums Stage ───────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAlbum) {
        e.stopPropagation();
        e.preventDefault();
        handleBackNavigation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedAlbum, handleBackNavigation]);

  // ── Active Track YouTube Background Video ID + Smart Availability Check ──
  const activeYoutubeVideoId = useMemo(() => {
    if (!selectedAlbum || !activeTrack) return null;
    return getTrackYoutubeVideoId(selectedAlbum.id, activeTrack.num);
  }, [selectedAlbum, activeTrack]);

  // Pre-verify video availability via oEmbed + listen to YouTube IFrame JS API state
  useEffect(() => {
    setYtVideoVerifiedPlaying(false);
    setYtVideoFailed(false);

    if (!selectedAlbum || !activeTrack || !ytBgEnabled || !activeYoutubeVideoId) {
      return undefined;
    }

    let cancelled = false;

    fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
        activeYoutubeVideoId,
      )}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('oembed failed');
        return res.json();
      })
      .then((data: { error?: string; title?: string }) => {
        if (cancelled) return;
        if (data.error || !data.title) {
          setYtVideoFailed(true);
        }
      })
      .catch(() => {
        /* fallback to YT postMessage listener */
      });

    const onMessage = (event: MessageEvent) => {
      if (cancelled) return;
      if (
        typeof event.origin === 'string' &&
        !event.origin.includes('youtube.com') &&
        !event.origin.includes('youtube-nocookie.com')
      ) {
        return;
      }
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data) as {
          event?: string;
          info?: number | { playerState?: number; videoData?: { isPlayable?: boolean } };
        };
        if (msg.event === 'onError') {
          setYtVideoFailed(true);
          setYtVideoVerifiedPlaying(false);
          return;
        }
        if (msg.event === 'onStateChange' && typeof msg.info === 'number') {
          if (msg.info === 1) {
            setYtVideoVerifiedPlaying(true);
          }
        } else if (msg.event === 'infoDelivery' && msg.info && typeof msg.info === 'object') {
          if (msg.info.videoData && msg.info.videoData.isPlayable === false) {
            setYtVideoFailed(true);
            setYtVideoVerifiedPlaying(false);
            return;
          }
          if (msg.info.playerState === 1) {
            setYtVideoVerifiedPlaying(true);
          }
        }
      } catch {
        /* ignore non-JSON messages */
      }
    };

    window.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
  }, [selectedAlbum, activeTrack, ytBgEnabled, activeYoutubeVideoId]);

  const handleYtIframeLoad = useCallback(() => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*',
      );
    } catch {
      /* ignore */
    }
  }, []);

  // ── Singleton HLS (.m3u8) Audio Streaming for Selected Track Tube ────────
  useEffect(() => {
    if (!selectedAlbum || !activeTrack) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    let cancelled = false;

    const destroyHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
    };

    destroyHls();
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    audio.muted = externalMuted;

    const onLoadedMetadata = () => {
      if (cancelled) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsBuffering(false);
    };

    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onAudioActiveChange?.(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    const onEnded = () => {
      setIsPlaying(false);
      const idx = selectedAlbum.tracks.findIndex((t) => t.num === activeTrack.num);
      if (idx >= 0 && idx + 1 < selectedAlbum.tracks.length) {
        setActiveTrack(selectedAlbum.tracks[idx + 1]);
      } else {
        onAudioActiveChange?.(false);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);

    const startPlayback = () => {
      if (cancelled) return;
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    };

    void (async () => {
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          startPosition: 0,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
        });
        hlsRef.current = hls;

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          startPlayback();
        });

        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            destroyHls();
            setIsBuffering(false);
          }
        });

        hls.loadSource(activeTrack.url);
        hls.attachMedia(audio);
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = activeTrack.url;
        audio.addEventListener('loadedmetadata', startPlayback, { once: true });
      }
    })();

    return () => {
      cancelled = true;
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      destroyHls();
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        /* ignore */
      }
    };
  }, [selectedAlbum, activeTrack, externalMuted, onAudioActiveChange]);

  // ── Automatic Background Lyrics Fetching via `nl music` (`fetchLyrics`) ──
  useEffect(() => {
    let alive = true;
    if (!selectedAlbum || !activeTrack) {
      setLyricsData(null);
      setLyricsLoading(false);
      return undefined;
    }

    const trackKey = `${selectedAlbum.id}_track_${activeTrack.num}`;
    const cached = getCachedLyrics(trackKey);
    if (cached !== undefined) {
      setLyricsData(cached);
      setLyricsLoading(false);
      return undefined;
    }

    setLyricsLoading(true);
    const primaryArtist = selectedAlbum.artist.split(/[,;&]/)[0].trim();

    fetchLyrics({
      id: trackKey,
      title: activeTrack.title,
      artist: primaryArtist,
      album: selectedAlbum.title,
    })
      .then((res) => {
        if (alive) setLyricsData(res);
      })
      .catch(() => {
        if (alive) setLyricsData(null);
      })
      .finally(() => {
        if (alive) setLyricsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedAlbum, activeTrack]);

  // ── Active Synced Lyric Index & Word-Level Karaoke Progress ───────────────
  const lyricLines = lyricsData?.lines ?? [];
  const isSyncedLyrics = Boolean(lyricsData?.synced) && lyricLines.length > 0;

  const activeLyricIndex = useMemo(() => {
    if (lyricLines.length === 0) return 0;
    if (!isSyncedLyrics) {
      if (duration > 0) {
        return Math.min(
          lyricLines.length - 1,
          Math.floor((currentTime / duration) * lyricLines.length),
        );
      }
      return 0;
    }
    let idx = 0;
    for (let i = 0; i < lyricLines.length; i++) {
      if (currentTime >= lyricLines[i].t) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [isSyncedLyrics, lyricLines, currentTime, duration]);

  const lineKaraokeRatio = useMemo(() => {
    if (lyricLines.length === 0) return 0.5;
    if (!isSyncedLyrics) return 0.5;
    const currentLine = lyricLines[activeLyricIndex];
    const nextLine = lyricLines[activeLyricIndex + 1];
    if (!currentLine) return 0.5;
    const startT = currentLine.t;
    const endT = nextLine ? nextLine.t : Math.max(startT + 4, duration);
    const span = Math.max(endT - startT, 0.4);
    return Math.min(Math.max((currentTime - startT) / span, 0), 1);
  }, [lyricLines, isSyncedLyrics, activeLyricIndex, currentTime, duration]);

  // ── Track Tube Click, Prev/Next/Rewind & Smooth Tube <-> Player Morph ────
  const handleTrackTubeClick = useCallback(
    (track: LiquidGlassTrack) => {
      if (activeTrack?.num === track.num) {
        setIsPlayerExpanded(true);
        const a = audioRef.current;
        if (!a) return;
        if (a.paused || a.ended) {
          void a.play().catch(() => {});
        } else {
          a.pause();
        }
      } else {
        setActiveTrack(track);
        setIsPlayerExpanded(true);
        setPlayerDragOffset({ x: 0, y: 0 });
      }
    },
    [activeTrack],
  );

  const toggleAudioPlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused || a.ended) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  const handleRestartTrack = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    setCurrentTime(0);
    if (a.paused) {
      void a.play().catch(() => {});
    }
  }, []);

  const handlePrevTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedAlbum || !activeTrack) return;
      const idx = selectedAlbum.tracks.findIndex((t) => t.num === activeTrack.num);
      if (idx > 0) {
        setActiveTrack(selectedAlbum.tracks[idx - 1]);
      } else {
        setActiveTrack(selectedAlbum.tracks[selectedAlbum.tracks.length - 1]);
      }
    },
    [selectedAlbum, activeTrack],
  );

  const handleNextTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedAlbum || !activeTrack) return;
      const idx = selectedAlbum.tracks.findIndex((t) => t.num === activeTrack.num);
      if (idx >= 0 && idx + 1 < selectedAlbum.tracks.length) {
        setActiveTrack(selectedAlbum.tracks[idx + 1]);
      } else {
        setActiveTrack(selectedAlbum.tracks[0]);
      }
    },
    [selectedAlbum, activeTrack],
  );

  const handleCollapseExpandedPlayer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayerExpanded(false);
    setPlayerDragOffset({ x: 0, y: 0 });
  }, []);

  // ── Draggable Expanded Glass Player Card Handlers ─────────────────────────
  const handlePlayerCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('[role="slider"]') ||
        target.closest('.lg-seek-hit')
      ) {
        return;
      }
      e.stopPropagation();
      playerDragStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: playerDragOffset.x,
        origY: playerDragOffset.y,
      };
      setIsDraggingPlayer(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [playerDragOffset.x, playerDragOffset.y],
  );

  const handlePlayerCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = playerDragStartRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.stopPropagation();
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setPlayerDragOffset({
        x: Math.max(-viewportWidth * 0.42, Math.min(viewportWidth * 0.42, drag.origX + dx)),
        y: Math.max(-viewportHeight * 0.42, Math.min(viewportHeight * 0.42, drag.origY + dy)),
      });
    },
    [viewportWidth, viewportHeight],
  );

  const handlePlayerCardPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = playerDragStartRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.stopPropagation();
      playerDragStartRef.current = null;
      setIsDraggingPlayer(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  // ── Seek Bar Scrubbing ────────────────────────────────────────────────────
  const seekAudioToSec = useCallback(
    (sec: number) => {
      const a = audioRef.current;
      if (!a || !Number.isFinite(duration) || duration <= 0) return;
      const clamped = Math.min(Math.max(sec, 0), duration);
      a.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration],
  );

  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      if (!bar || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(
        Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0),
        1,
      );
      seekAudioToSec(ratio * duration);
    },
    [duration, seekAudioToSec],
  );

  const handleAudioSeekDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleAudioSeekMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleAudioSeekUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  const selectedAlbumRgb = selectedAlbum
    ? coverRgbCache.get(selectedAlbum.id) ?? getInitialAlbumRgb(selectedAlbum.index)
    : '255, 196, 86';

  // Strictly 2 Lines for the iOS 26 Lyrics Capsule
  const currentPrimaryLyric = lyricLines[activeLyricIndex]?.text ?? '';
  const currentSecondaryLyric = lyricLines[activeLyricIndex + 1]?.text ?? '';

  const originParam =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

  return (
    <div
      className="lg-sun-fullstage"
      style={
        {
          '--selected-album-rgb': selectedAlbumRgb,
        } as React.CSSProperties
      }
    >
      {/* Subtle Darkened Atmospheric Backdrop */}
      <div
        className={`lg-sun-backdrop-dim${
          selectedAlbum ? ' lg-sun-backdrop-dim--detail' : ''
        }`}
        aria-hidden="true"
      />

      {/* Smart Background Layer when Playing a Track:
          Always renders the Album Cover as a rich fallback background, and only fades in
          the YouTube video once verified playing (so "Video unavailable" NEVER appears!) */}
      {selectedAlbum && activeTrack && (
        <div className="lg-yt-bg-stage" aria-hidden="true">
          <div
            className={`lg-yt-bg-stage__album-fallback${
              ytBgEnabled && ytVideoVerifiedPlaying && !ytVideoFailed
                ? ' lg-yt-bg-stage__album-fallback--dimmed'
                : ''
            }`}
            style={{
              backgroundImage: `url("${selectedAlbum.coverUrl}")`,
            }}
          />

          {ytBgEnabled && activeYoutubeVideoId && !ytVideoFailed && (
            <div
              className={`lg-yt-bg-stage__frame-wrap${
                ytVideoVerifiedPlaying ? ' lg-yt-bg-stage__frame-wrap--playing' : ''
              }`}
            >
              <iframe
                ref={ytIframeRef}
                key={`${selectedAlbum.id}_${activeTrack.num}_${activeYoutubeVideoId}`}
                className="lg-yt-bg-stage__iframe"
                src={`https://www.youtube-nocookie.com/embed/${activeYoutubeVideoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${activeYoutubeVideoId}&enablejsapi=1&origin=${originParam}`}
                title=""
                allow="autoplay; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
                onLoad={handleYtIframeLoad}
              />
            </div>
          )}

          <div className="lg-yt-bg-stage__vignette" />
        </div>
      )}

      {/* Hidden Singleton HLS <audio> Element */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {/* Contextual Back Button (Returns from Selected Album -> Infinite Mesh, or Mesh -> Orbs) */}
      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={handleBackNavigation}
        aria-label={selectedAlbum ? 'العودة إلى شبكة الألبومات' : 'العودة إلى كوكب الأرض والشمس'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {/* ====================================================================
       * VIEW 1: CONNECTED SPHERICAL-DOME FISHEYE MESH (ZERO SQUARES / ZERO OVERLAP)
       * ==================================================================== */}
      {!selectedAlbum && (
        <div
          className={`lg-brick-viewport${
            isDraggingGrid ? ' lg-brick-viewport--dragging' : ''
          }`}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
          onPointerCancel={handleGridPointerCancel}
          onWheel={handleGridWheel}
          role="region"
          aria-label="شبكة الألبومات المتصلة بعدسة عين السمكة"
        >
          <canvas
            ref={meshCanvasRef}
            className="lg-fisheye-mesh-canvas"
          />
        </div>
      )}

      {/* ====================================================================
       * VIEW 2: SELECTED ALBUM (Sun/Earth Clear Bubble Cover + Clear Glass Tubes
       *         + Self-Luminous Golden Letters + Strictly 2-Line iOS 26 Lyrics)
       * ==================================================================== */}
      {selectedAlbum && (
        <div
          className={`lg-album-detail-workspace${
            lyricsWindowOpen && activeTrack ? ' lg-album-detail-workspace--with-lyrics' : ''
          }`}
        >
          {/* Main Column: Full-Bleed Droplet Album Cover + Clear Bubble Glass Track Tubes */}
          <div className="lg-album-player-column">
            {/* Selected Album Cover with Ultra-Thin Sun/Earth Bubble Glass Rim */}
            <header className="lg-ascended-album-hero">
              <div
                ref={ascendedCoverRef}
                className="lg-ascended-album-cover lg-ascended-album-cover--sun-bubble"
              >
                <img
                  src={selectedAlbum.coverUrl}
                  alt={selectedAlbum.title}
                  className="lg-ascended-album-cover__img"
                  decoding="async"
                  draggable={false}
                />
                <span className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
                <span className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
                <span className="lg-main-glass__sheen" aria-hidden="true" />
              </div>

              <div className="lg-ascended-album-meta">
                <h1 className="lg-ascended-album-title">{selectedAlbum.title}</h1>
                <p className="lg-ascended-album-artist">
                  {selectedAlbum.artist} • {selectedAlbum.tracks.length} Songs
                </p>
              </div>
            </header>

            {/* Scrollable List of True Clear Bubble Glass Track Tubes */}
            <div
              className="lg-track-tubes-list"
              role="list"
              aria-label={`أغاني ألبوم ${selectedAlbum.title}`}
            >
              {selectedAlbum.tracks.map((track, idx) => {
                const isSelectedTrack = activeTrack?.num === track.num;
                const isExpandedCard = isSelectedTrack && isPlayerExpanded;
                const trackNumFormatted = String(track.num).padStart(2, '0');
                const hasLyricsReady =
                  isSelectedTrack && Boolean(lyricsData && lyricsData.lines.length > 0);

                return (
                  <div
                    key={track.num}
                    role="listitem"
                    className={`lg-track-tube${
                      isSelectedTrack ? ' lg-track-tube--current' : ''
                    }${isExpandedCard ? ' lg-track-tube--expanded-player' : ''}${
                      isExpandedCard && isDraggingPlayer
                        ? ' lg-track-tube--dragging-player'
                        : ''
                    }`}
                    style={
                      {
                        '--tube-delay': `${Math.min(idx * 20, 300)}ms`,
                        transform: isExpandedCard
                          ? `translate3d(${playerDragOffset.x.toFixed(1)}px, ${playerDragOffset.y.toFixed(1)}px, 0)`
                          : undefined,
                        zIndex: isExpandedCard ? 60 : undefined,
                      } as React.CSSProperties
                    }
                    onPointerDown={isExpandedCard ? handlePlayerCardPointerDown : undefined}
                    onPointerMove={isExpandedCard ? handlePlayerCardPointerMove : undefined}
                    onPointerUp={isExpandedCard ? handlePlayerCardPointerUp : undefined}
                    onPointerCancel={isExpandedCard ? handlePlayerCardPointerUp : undefined}
                    onClick={() => {
                      if (!isExpandedCard) {
                        handleTrackTubeClick(track);
                      }
                    }}
                  >
                    {/* Sun/Earth Orb Caustic Rim on every capsule */}
                    <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                    <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                    {/* ── COMPACT TUBE STATE ─────────────────────────────────── */}
                    {!isExpandedCard && (
                      <div className="lg-track-tube__header">
                        {isSelectedTrack ? (
                          <button
                            type="button"
                            className="lg-tube-play-btn"
                            onClick={toggleAudioPlayPause}
                            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                          >
                            {isBuffering ? (
                              <span className="lg-tube-mini-spinner" aria-hidden="true" />
                            ) : isPlaying ? (
                              <Pause size={15} fill="currentColor" />
                            ) : (
                              <Play size={15} fill="currentColor" />
                            )}
                          </button>
                        ) : (
                          <span className="lg-track-tube__num">
                            <span className="lg-track-tube__num-glyph">{trackNumFormatted}</span>
                          </span>
                        )}

                        <div className="lg-track-tube__title-wrap">
                          {isSelectedTrack && (
                            <span className="lg-track-tube__num lg-track-tube__num--inline">
                              <span className="lg-track-tube__num-glyph">{trackNumFormatted}</span>
                            </span>
                          )}
                          <span className="lg-track-tube__title">{track.title}</span>
                        </div>

                        {isSelectedTrack && (
                          <div
                            className="lg-track-tube__actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="lg-tube-time-readout">
                              {formatTrackTime(currentTime)} / {formatTrackTime(duration)}
                            </span>

                            <button
                              type="button"
                              className={`lg-tube-lyrics-btn${
                                lyricsWindowOpen ? ' lg-tube-lyrics-btn--active' : ''
                              }${hasLyricsReady ? ' lg-tube-lyrics-btn--ready' : ''}`}
                              onClick={() => setLyricsWindowOpen((open) => !open)}
                              title="عرض الكلمات المتزامنة"
                              aria-label="نافذة الكلمات المتزامنة"
                              aria-pressed={lyricsWindowOpen}
                            >
                              <LyricsExpressiveIcon />
                              {lyricsLoading && (
                                <span className="lg-tube-lyrics-dot" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── EXPANDED CLEAR BUBBLE GLASS PLAYER CARD ────────────── */}
                    {isExpandedCard && (
                      <div
                        className="lg-expanded-player-card"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="lg-expanded-player__top">
                          <div className="lg-expanded-player__identity">
                            <div
                              className={`lg-expanded-player__thumb-wrap${
                                isPlaying ? ' lg-expanded-player__thumb-wrap--playing' : ''
                              }`}
                            >
                              <img
                                src={selectedAlbum.coverUrl}
                                alt={selectedAlbum.title}
                                className="lg-expanded-player__thumb"
                                draggable={false}
                              />
                              <span
                                className="lg-expanded-player__thumb-ring"
                                aria-hidden="true"
                              />
                            </div>

                            <div className="lg-expanded-player__titles">
                              <span className="lg-expanded-player__song-title">
                                {track.title}
                              </span>
                              <span className="lg-expanded-player__album-sub">
                                {selectedAlbum.title} • {selectedAlbum.artist.split(',')[0]}
                              </span>
                            </div>
                          </div>

                          <div className="lg-expanded-player__top-actions">
                            {(playerDragOffset.x !== 0 || playerDragOffset.y !== 0) && (
                              <button
                                type="button"
                                className="lg-tube-icon-btn"
                                onClick={() => setPlayerDragOffset({ x: 0, y: 0 })}
                                title="إعادة المشغل لمكانه"
                                aria-label="إعادة المشغل لمكانه"
                              >
                                <Move size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              className={`lg-tube-icon-btn lg-yt-toggle-btn${
                                ytBgEnabled ? ' lg-yt-toggle-btn--active' : ''
                              }`}
                              onClick={() => setYtBgEnabled((v) => !v)}
                              title={
                                ytBgEnabled
                                  ? 'إيقاف فيديو الخلفية (YouTube)'
                                  : 'تشغيل فيديو الخلفية (YouTube)'
                              }
                              aria-label="تبديل فيديو يوتيوب في الخلفية"
                              aria-pressed={ytBgEnabled}
                            >
                              <YoutubeExpressiveIcon active={ytBgEnabled} />
                            </button>

                            <button
                              type="button"
                              className={`lg-tube-lyrics-btn${
                                lyricsWindowOpen ? ' lg-tube-lyrics-btn--active' : ''
                              }${hasLyricsReady ? ' lg-tube-lyrics-btn--ready' : ''}`}
                              onClick={() => setLyricsWindowOpen((open) => !open)}
                              title="عرض الكلمات المتزامنة"
                              aria-label="نافذة الكلمات المتزامنة"
                              aria-pressed={lyricsWindowOpen}
                            >
                              <LyricsExpressiveIcon />
                              {lyricsLoading && (
                                <span className="lg-tube-lyrics-dot" aria-hidden="true" />
                              )}
                            </button>

                            <button
                              type="button"
                              className="lg-tube-icon-btn"
                              onClick={handleCollapseExpandedPlayer}
                              title="طي المشغل"
                              aria-label="طي المشغل إلى الأنبوب"
                            >
                              <ChevronUp size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="lg-expanded-player__progress-section">
                          <div
                            ref={seekBarRef}
                            className="lg-seek-hit lg-tube-seek-hit"
                            role="slider"
                            tabIndex={0}
                            aria-label="تقديم أو ترجيع الأغنية"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(duration || 0)}
                            aria-valuenow={Math.round(currentTime || 0)}
                            onPointerDown={handleAudioSeekDown}
                            onPointerMove={handleAudioSeekMove}
                            onPointerUp={handleAudioSeekUp}
                            onPointerCancel={handleAudioSeekUp}
                          >
                            <div className="lg-seek-track lg-tube-seek-track">
                              <div
                                className="lg-seek-fill lg-tube-seek-fill"
                                style={{ width: `${progressPercent}%` }}
                              >
                                <span
                                  className="lg-seek-fill__wave"
                                  aria-hidden="true"
                                />
                              </div>
                              <div
                                className="lg-seek-thumb lg-tube-seek-thumb"
                                style={{ left: `${progressPercent}%` }}
                              />
                              <div
                                className="lg-seek-tube-gloss"
                                aria-hidden="true"
                              />
                            </div>
                          </div>

                          <div className="lg-expanded-player__time-row">
                            <span>{formatTrackTime(currentTime)}</span>
                            <span>{formatTrackTime(duration)}</span>
                          </div>
                        </div>

                        <div className="lg-expanded-player__controls-row">
                          <button
                            type="button"
                            className="lg-player-side-btn"
                            onClick={handleRestartTrack}
                            title="إعادة الأغنية من البداية"
                            aria-label="إعادة الأغنية من البداية"
                          >
                            <RotateCcw size={18} strokeWidth={2.2} />
                          </button>

                          <div className="lg-player-center-trio">
                            <button
                              type="button"
                              className="lg-player-trio-btn"
                              onClick={handlePrevTrack}
                              title="الأغنية السابقة"
                              aria-label="الأغنية السابقة"
                            >
                              <SkipBack size={20} fill="currentColor" />
                            </button>

                            <button
                              type="button"
                              className="lg-player-trio-btn lg-player-trio-btn--primary"
                              onClick={toggleAudioPlayPause}
                              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                            >
                              {isBuffering ? (
                                <span className="lg-tube-mini-spinner" aria-hidden="true" />
                              ) : isPlaying ? (
                                <Pause size={22} fill="currentColor" />
                              ) : (
                                <Play size={22} fill="currentColor" />
                              )}
                            </button>

                            <button
                              type="button"
                              className="lg-player-trio-btn"
                              onClick={handleNextTrack}
                              title="الأغنية التالية"
                              aria-label="الأغنية التالية"
                            >
                              <SkipForward size={20} fill="currentColor" />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="lg-player-side-btn"
                            onClick={onToggleMute}
                            title={externalMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                            aria-label={externalMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                          >
                            {externalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==================================================================
           * SIDE LYRICS STAGE — STRICTLY 2-LINE "LIQUID GLASS iOS 26" CAPSULE
           * ================================================================== */}
          {lyricsWindowOpen && activeTrack && (
            <aside
              className="lg-ios26-lyrics-stage"
              aria-label={`كلمات أغنية ${activeTrack.title}`}
            >
              <div className="lg-ios26-diagonal-assembly">
                {/* 1. Top-Left Small Capsule: Double-Layered Rim + Milky Frosted Core + Opening Quote (“) */}
                <div className="lg-ios26-quote-row">
                  <div className="lg-ios26-quote-capsule lg-ios26-quote-capsule--open" aria-hidden="true">
                    <div className="lg-ios26-quote-capsule__outer-rim">
                      <div className="lg-ios26-quote-capsule__milky-core">
                        <span className="lg-ios26-quote-glyph">“</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="lg-ios26-lyrics-close"
                    onClick={() => setLyricsWindowOpen(false)}
                    aria-label="إغلاق الكلمات"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 2. Wide Central Container: Strictly 2 Lines Only + Sun/Earth Clear Bubble Glass */}
                <div className="lg-ios26-central-capsule">
                  <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                  {lyricsLoading ? (
                    <div className="lg-ios26-lyrics-empty">
                      <span className="lg-tube-mini-spinner" aria-hidden="true" />
                      <span>Synchronizing lyrics...</span>
                    </div>
                  ) : lyricLines.length === 0 ? (
                    <div className="lg-ios26-lyrics-empty">
                      <span>Instrumental / Lyrics unavailable</span>
                    </div>
                  ) : (
                    <div
                      className="lg-ios26-two-line-spotlight"
                      style={
                        {
                          '--word-aura-x': `${(18 + lineKaraokeRatio * 64).toFixed(1)}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className="lg-ios26-word-cover-aura"
                        style={{
                          backgroundImage: `url("${selectedAlbum.coverUrl}")`,
                        }}
                        aria-hidden="true"
                      />

                      <p
                        key={`p_${activeLyricIndex}`}
                        className="lg-ios26-line lg-ios26-line--primary"
                      >
                        {currentPrimaryLyric || '♪ ♪ ♪'}
                      </p>

                      {currentSecondaryLyric && (
                        <p
                          key={`s_${activeLyricIndex + 1}`}
                          className="lg-ios26-line lg-ios26-line--secondary"
                        >
                          {currentSecondaryLyric}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Bottom-Right Small Capsule: Double-Layered Rim + Milky Frosted Core + Closing Quote (”) */}
                <div className="lg-ios26-quote-capsule lg-ios26-quote-capsule--close" aria-hidden="true">
                  <div className="lg-ios26-quote-capsule__outer-rim">
                    <div className="lg-ios26-quote-capsule__milky-core">
                      <span className="lg-ios26-quote-glyph">”</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
});
