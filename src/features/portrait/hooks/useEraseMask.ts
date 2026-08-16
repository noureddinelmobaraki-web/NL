import { useCallback, useEffect, useRef } from 'react';
import type { ErasePointerConfig } from '../constants';

type Params = {
  /** Visible canvas the subject is painted into. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Subject plate URL (the transparent PNG). */
  src: string;
  /** Square stage edge in CSS pixels. */
  size: number;
  cfg: ErasePointerConfig;
  enabled: boolean;
};

type Stroke = { x: number; y: number; r: number; t: number };

/** Alpha of a stamp given its remaining life in 0..1. Snappy, not linear. */
function lifeToAlpha(life: number): number {
  return Math.pow(Math.max(0, Math.min(1, life)), 1.6);
}

export function useEraseMask({ canvasRef, src, size, cfg, enabled }: Params) {
  const strokesRef = useRef<Stroke[]>([]);
  const rafRef = useRef<number | null>(null);

  /** Sharp subject bitmap. */
  const imgRef = useRef<HTMLImageElement | null>(null);
  /** Subject pre-blurred once at load; source for the distortion band. */
  const blurRef = useRef<HTMLCanvasElement | null>(null);
  /** Offscreen: sharp subject punched with the wide radius. */
  const sharpRef = useRef<HTMLCanvasElement | null>(null);
  /** Half-res masks. core = small holes, wide = large holes. */
  const maskCoreRef = useRef<HTMLCanvasElement | null>(null);
  const maskWideRef = useRef<HTMLCanvasElement | null>(null);

  const readyRef = useRef(false);
  /** Guards one final clean composite after the last stroke dies. */
  const settledRef = useRef(true);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  /** Assigned further down. Only ever read from callbacks that run after
      mount, but it is declared here so no-use-before-define stays quiet. */
  const wakeRef = useRef<(() => void) | null>(null);

  // ── build the bitmaps ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';

    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;

      // Pre-blur once. Downscale-then-upscale is used when ctx.filter is
      // unavailable; it is a cruder blur but costs nothing and never throws.
      const bw = img.naturalWidth;
      const bh = img.naturalHeight;
      const blur = document.createElement('canvas');
      blur.width = bw;
      blur.height = bh;
      const bctx = blur.getContext('2d');
      if (bctx) {
        const radius = Math.max(2, Math.round(bw * cfg.distortionBlur));
        if (typeof bctx.filter === 'string') {
          bctx.filter = `blur(${radius}px)`;
          bctx.drawImage(img, 0, 0, bw, bh);
          bctx.filter = 'none';
        } else {
          const small = document.createElement('canvas');
          small.width = Math.max(1, Math.round(bw / 12));
          small.height = Math.max(1, Math.round(bh / 12));
          const sctx = small.getContext('2d');
          if (sctx) {
            sctx.drawImage(img, 0, 0, small.width, small.height);
            bctx.imageSmoothingEnabled = true;
            bctx.drawImage(small, 0, 0, bw, bh);
          }
        }
      }
      blurRef.current = blur;

      readyRef.current = true;
      settledRef.current = false;
      wakeRef.current?.();
    };

    img.onerror = () => {
      if (!cancelled) {
        console.error('[portrait] subject plate failed to load:', src);
      }
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, cfg.distortionBlur]);

  // ── size the canvases ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;

    // The backing store is capped independently of DPR. A 1080p desktop at
    // dpr 2 would otherwise allocate three 2160^2 buffers (~75 MB) for a
    // soft mask that does not need that resolution.
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    const px = Math.min(Math.round(size * dpr), cfg.maxCanvasPx);

    canvas.width = px;
    canvas.height = px;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ensure = (ref: React.RefObject<HTMLCanvasElement | null>, w: number) => {
      if (!ref.current) ref.current = document.createElement('canvas');
      ref.current.width = w;
      ref.current.height = w;
    };

    ensure(sharpRef, px);
    const maskPx = Math.max(64, Math.round(px * cfg.maskScale));
    ensure(maskCoreRef, maskPx);
    ensure(maskWideRef, maskPx);

    settledRef.current = false;
    wakeRef.current?.();
  }, [canvasRef, size, cfg.maxDpr, cfg.maxCanvasPx, cfg.maskScale]);

  // ── one frame ─────────────────────────────────────────────────────────────
  const composite = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const blur = blurRef.current;
    const sharp = sharpRef.current;
    const maskCore = maskCoreRef.current;
    const maskWide = maskWideRef.current;
    if (!canvas || !img || !blur || !sharp || !maskCore || !maskWide) return;

    const vctx = canvas.getContext('2d');
    const sctx = sharp.getContext('2d');
    const cctx = maskCore.getContext('2d');
    const wctx = maskWide.getContext('2d');
    if (!vctx || !sctx || !cctx || !wctx) return;

    const w = canvas.width;
    const mw = maskCore.width;
    const now = performance.now();

    // 1. Rebuild both masks from scratch. The fillRect at alpha 1 is the whole
    //    reason the ghost cannot survive: every frame starts from pure white.
    const paintMask = (
      ctx: CanvasRenderingContext2D,
      radiusFactor: number,
      blurPx: number,
    ) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, mw, mw);

      if (strokesRef.current.length === 0) return;

      ctx.globalCompositeOperation = 'destination-out';
      if ('filter' in ctx && blurPx > 0) ctx.filter = `blur(${blurPx}px)`;

      const solid = 1 - cfg.softness;
      for (const s of strokesRef.current) {
        const life = 1 - (now - s.t) / cfg.trailMs;
        if (life <= 0) continue;
        const a = lifeToAlpha(life);
        const r = s.r * radiusFactor * mw;
        const cx = s.x * mw;
        const cy = s.y * mw;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(solid, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    };

    const blurPx = Math.max(1, mw * cfg.maskBlur);
    paintMask(cctx, 1, blurPx);
    paintMask(wctx, cfg.wideRadiusFactor, blurPx);

    // 2. Sharp subject, punched with the WIDE holes.
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, w, w);
    sctx.drawImage(img, 0, 0, w, w);
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(maskWide, 0, 0, w, w);
    sctx.globalCompositeOperation = 'source-over';

    // 3. Visible = blurred subject punched with the SMALL holes, then the
    //    sharp layer on top. Between the two radii only the blurred copy
    //    survives, which is the smear the owner asked for.
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.globalCompositeOperation = 'source-over';
    vctx.clearRect(0, 0, w, w);
    vctx.drawImage(blur, 0, 0, w, w);
    vctx.globalCompositeOperation = 'destination-in';
    vctx.drawImage(maskCore, 0, 0, w, w);
    vctx.globalCompositeOperation = 'source-over';
    vctx.drawImage(sharp, 0, 0, w, w);
  }, [
    canvasRef,
    cfg.softness,
    cfg.trailMs,
    cfg.maskBlur,
    cfg.wideRadiusFactor,
  ]);

  // ── the loop ──────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const now = performance.now();
    const before = strokesRef.current.length;
    if (before > 0) {
      strokesRef.current = strokesRef.current.filter(
        (s) => now - s.t < cfg.trailMs,
      );
    }

    composite();

    if (strokesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // The list just emptied. The composite above already ran against an
      // all-white mask, so the subject is exactly whole. Park.
      rafRef.current = null;
      settledRef.current = true;
      if (before > 0) lastPointRef.current = null;
    }
  }, [composite, cfg.trailMs]);

  const wake = useCallback(() => {
    if (rafRef.current !== null) return;
    if (settledRef.current && strokesRef.current.length === 0) {
      // Nothing animating — one composite is enough (first paint, resize).
      composite();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [composite, tick]);
  wakeRef.current = wake;

  // ── public API ────────────────────────────────────────────────────────────

  /** Erase at a stage-relative point, both axes in 0..1. */
  const eraseAt = useCallback(
    (nx: number, ny: number) => {
      if (!enabled || !readyRef.current || size <= 0) return;

      const r = (cfg.radiusCm * cfg.cssPxPerCm) / size; // stage fraction
      const now = performance.now();
      const prev = lastPointRef.current;
      const list = strokesRef.current;

      // Interpolate so a fast flick leaves a continuous trail rather than dots.
      if (prev) {
        const dx = nx - prev.x;
        const dy = ny - prev.y;
        const dist = Math.hypot(dx, dy);
        const step = r * 0.35;
        const n = Math.min(Math.floor(dist / step), cfg.maxStepsPerMove);
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1);
          list.push({ x: prev.x + dx * t, y: prev.y + dy * t, r, t: now });
        }
      }
      list.push({ x: nx, y: ny, r, t: now });
      lastPointRef.current = { x: nx, y: ny };

      if (list.length > cfg.maxStrokes) {
        strokesRef.current = list.slice(list.length - cfg.maxStrokes);
      }

      settledRef.current = false;
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
    },
    [enabled, size, cfg.radiusCm, cfg.cssPxPerCm, cfg.maxStepsPerMove, cfg.maxStrokes, tick],
  );

  /** Pointer left the stage — break interpolation, let the trail expire. */
  const endStroke = useCallback(() => {
    lastPointRef.current = null;
  }, []);

  // First paint and every resize.
  useEffect(() => {
    if (readyRef.current) wake();
  }, [wake, size]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    [],
  );

  return { eraseAt, endStroke };
}
