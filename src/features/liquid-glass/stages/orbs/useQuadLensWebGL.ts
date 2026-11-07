/**
 * src/features/liquid-glass/stages/orbs/useQuadLensWebGL.ts
 *
 * Encapsulates the WebGL Quad-Lens Liquid Glass shader loop and background WebP texture loader.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GLASS_CONFIG, initQuadLensGlContext } from './portalShaders';

export type LiquidGlassMode = 'orbs' | 'video' | 'sun' | 'books' | 'audiobooks';

export const LIQUID_GLASS_BACKGROUNDS = {
  pc: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/pc.webp',
  phone: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/phone.webp',
  mobileBreakpointQuery: '(max-width: 768px)',
} as const;

interface BubbleGeom {
  x: number;
  y: number;
  hw: number;
  hh: number;
  corner: number;
  wobble: number;
  alpha: number;
}

interface UseQuadLensWebGLParams {
  mode: LiquidGlassMode;
  isMobileView: boolean;
  pcBgUrl?: string;
  phoneBgUrl?: string;
  glassBoxRef: React.RefObject<HTMLDivElement | null>;
  sunGlassBoxRef: React.RefObject<HTMLDivElement | null>;
  booksGlassBoxRef: React.RefObject<HTMLDivElement | null>;
  audiobooksGlassBoxRef: React.RefObject<HTMLDivElement | null>;
}

function measureBox(
  box: HTMLDivElement | null,
  active: boolean,
  canvasRect: DOMRect,
  dpr: number,
  curr: BubbleGeom,
  isWindowMode: boolean,
  baseWindowCorner: number,
) {
  if (!box || !active) return curr;
  const r = box.getBoundingClientRect();
  if (r.width <= 4 || r.height <= 4) return curr;
  const x = (r.left - canvasRect.left + r.width * 0.5) * dpr;
  const y = (r.top - canvasRect.top + r.height * 0.5) * dpr;
  const hw = Math.max(r.width * 0.5 * dpr, 20);
  const hh = Math.max(r.height * 0.5 * dpr, 20);
  const corner = isWindowMode
    ? Math.min(baseWindowCorner, Math.min(hw, hh) - 1)
    : Math.min(hw, hh);
  return { ...curr, x, y, hw, hh, corner };
}

function stepGeom(
  curr: BubbleGeom,
  target: Omit<BubbleGeom, 'wobble' | 'alpha'>,
  targetWobble: number,
  targetAlpha: number,
  init: boolean,
): BubbleGeom {
  if (!init) {
    return {
      x: target.x,
      y: target.y,
      hw: target.hw,
      hh: target.hh,
      corner: target.corner,
      wobble: targetWobble,
      alpha: targetAlpha,
    };
  }
  const ease = 0.18;
  return {
    x: curr.x + (target.x - curr.x) * ease,
    y: curr.y + (target.y - curr.y) * ease,
    hw: curr.hw + (target.hw - curr.hw) * ease,
    hh: curr.hh + (target.hh - curr.hh) * ease,
    corner: curr.corner + (target.corner - curr.corner) * ease,
    wobble: curr.wobble + (targetWobble - curr.wobble) * 0.14,
    alpha: curr.alpha + (targetAlpha - curr.alpha) * 0.16,
  };
}

export function useQuadLensWebGL({
  mode,
  isMobileView,
  pcBgUrl = LIQUID_GLASS_BACKGROUNDS.pc,
  phoneBgUrl = LIQUID_GLASS_BACKGROUNDS.phone,
  glassBoxRef,
  sunGlassBoxRef,
  booksGlassBoxRef,
  audiobooksGlassBoxRef,
}: UseQuadLensWebGLParams) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglReady, setWebglReady] = useState(false);

  const renderStateRef = useRef({
    mode: 'orbs' as LiquidGlassMode,
    isMobile: isMobileView,
    imageAspect: isMobileView ? 9 / 16 : 16 / 9,
    a: { x: 0, y: 0, hw: 142, hh: 142, corner: 142, wobble: 1, alpha: 1 } as BubbleGeom,
    b: { x: 0, y: 0, hw: 164, hh: 164, corner: 164, wobble: 1, alpha: 1 } as BubbleGeom,
    c: { x: 0, y: 0, hw: 142, hh: 142, corner: 142, wobble: 1, alpha: 1 } as BubbleGeom,
    d: { x: 0, y: 0, hw: 142, hh: 142, corner: 142, wobble: 1, alpha: 1 } as BubbleGeom,
    geometryInitialized: false,
    lightX: 0,
    lightY: 0,
    targetLightX: 0,
    targetLightY: 0,
  });

  useEffect(() => {
    renderStateRef.current.mode = mode;
    renderStateRef.current.isMobile = isMobileView;
  }, [mode, isMobileView]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const vw = Math.max(window.innerWidth, 1);
    const vh = Math.max(window.innerHeight, 1);
    renderStateRef.current.targetLightX = (e.clientX / vw - 0.5) * 2;
    renderStateRef.current.targetLightY = (e.clientY / vh - 0.5) * 2;
  }, []);

  const handlePointerLeave = useCallback(() => {
    renderStateRef.current.targetLightX = 0;
    renderStateRef.current.targetLightY = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      setWebglReady(false);
      return undefined;
    }

    const res = initQuadLensGlContext(gl);
    if (!res) {
      setWebglReady(false);
      return undefined;
    }
    const { program, vs, fs, vbo, texture, locs } = res;

    let rafId = 0;
    let disposed = false;
    let lastSizeKey = '';
    const t0 = performance.now();

    (
      canvas as HTMLCanvasElement & {
        __lgCtx?: { gl: WebGLRenderingContext; texture: WebGLTexture | null };
      }
    ).__lgCtx = { gl, texture };

    const bindBubbleUniforms = (
      g: BubbleGeom,
      uCenter: WebGLUniformLocation | null,
      uSize: WebGLUniformLocation | null,
      uCorner: WebGLUniformLocation | null,
      uWobble: WebGLUniformLocation | null,
      uAlpha: WebGLUniformLocation | null,
    ) => {
      gl.uniform2f(uCenter, g.x, g.y);
      gl.uniform2f(uSize, g.hw, g.hh);
      gl.uniform1f(uCorner, Math.min(Math.max(g.corner, 4), Math.min(g.hw, g.hh) - 0.5));
      gl.uniform1f(uWobble, g.wobble);
      gl.uniform1f(uAlpha, g.alpha);
    };

    const renderFrame = (now: number) => {
      if (disposed) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(canvas.clientWidth, 1);
      const cssH = Math.max(canvas.clientHeight, 1);
      const sizeKey = `${cssW}x${cssH}@${dpr}`;

      if (sizeKey !== lastSizeKey) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        lastSizeKey = sizeKey;
      }

      const st = renderStateRef.current;
      if (st.mode !== 'orbs') {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const baseWindowCorner =
        (st.isMobile ? GLASS_CONFIG.cornerRadiusMobile : GLASS_CONFIG.cornerRadiusDesktop) * dpr;

      const isOrbs = true;

      const mA = measureBox(
        glassBoxRef.current,
        isOrbs,
        canvasRect,
        dpr,
        st.a,
        false,
        baseWindowCorner,
      );
      const mB = measureBox(
        sunGlassBoxRef.current,
        isOrbs,
        canvasRect,
        dpr,
        st.b,
        false,
        baseWindowCorner,
      );
      const mC = measureBox(
        booksGlassBoxRef.current,
        isOrbs,
        canvasRect,
        dpr,
        st.c,
        false,
        baseWindowCorner,
      );
      const mD = measureBox(
        audiobooksGlassBoxRef.current,
        isOrbs,
        canvasRect,
        dpr,
        st.d,
        false,
        baseWindowCorner,
      );

      const targetWobble = 1.0;
      const init = st.geometryInitialized;
      st.a = stepGeom(st.a, mA, targetWobble, 1.0, init);
      st.b = stepGeom(st.b, mB, targetWobble, 1.0, init);
      st.c = stepGeom(st.c, mC, targetWobble, 1.0, init);
      st.d = stepGeom(st.d, mD, targetWobble, 1.0, init);
      st.geometryInitialized = true;

      st.lightX += (st.targetLightX - st.lightX) * 0.08;
      st.lightY += (st.targetLightY - st.lightY) * 0.08;

      gl.useProgram(program);
      gl.uniform1f(locs.u_time, (now - t0) * 0.001);
      gl.uniform2f(locs.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(locs.u_lightShift, st.lightX, st.lightY);
      gl.uniform1i(locs.u_texture, 0);

      bindBubbleUniforms(st.a, locs.u_centerA, locs.u_sizeA, locs.u_cornerA, locs.u_wobbleA, locs.u_alphaA);
      bindBubbleUniforms(st.b, locs.u_centerB, locs.u_sizeB, locs.u_cornerB, locs.u_wobbleB, locs.u_alphaB);
      bindBubbleUniforms(st.c, locs.u_centerC, locs.u_sizeC, locs.u_cornerC, locs.u_wobbleC, locs.u_alphaC);
      bindBubbleUniforms(st.d, locs.u_centerD, locs.u_sizeD, locs.u_cornerD, locs.u_wobbleD, locs.u_alphaD);

      gl.uniform3f(locs.u_tint, GLASS_CONFIG.tint[0], GLASS_CONFIG.tint[1], GLASS_CONFIG.tint[2]);
      gl.uniform1f(locs.u_saturation, GLASS_CONFIG.saturation);
      gl.uniform1f(locs.u_distortion, GLASS_CONFIG.distortion);
      gl.uniform1f(locs.u_blur, isOrbs ? GLASS_CONFIG.blurOrbMode : GLASS_CONFIG.blurWindowRim);
      gl.uniform1f(locs.u_imageAspect, st.imageAspect);
      gl.uniform1f(locs.u_canvasAspect, canvas.width / Math.max(canvas.height, 1));
      gl.uniform1f(locs.u_shadowIntensity, GLASS_CONFIG.shadowIntensity);
      gl.uniform2f(
        locs.u_shadowOffset,
        GLASS_CONFIG.shadowOffsetX * dpr,
        GLASS_CONFIG.shadowOffsetY * dpr,
      );
      gl.uniform1f(locs.u_shadowBlur, GLASS_CONFIG.shadowBlur * dpr);
      gl.uniform1f(locs.u_chromaticAberration, GLASS_CONFIG.chromaticAberration);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      delete (canvas as HTMLCanvasElement & { __lgCtx?: unknown }).__lgCtx;
      gl.deleteTexture(texture);
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [glassBoxRef, sunGlassBoxRef, booksGlassBoxRef, audiobooksGlassBoxRef]);

  useEffect(() => {
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & {
          __lgCtx?: { gl: WebGLRenderingContext; texture: WebGLTexture | null };
        })
      | null;
    const ctx = canvas?.__lgCtx;
    if (!ctx || !ctx.texture) return undefined;

    let cancelled = false;
    const targetUrl = isMobileView ? phoneBgUrl : pcBgUrl;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled || !ctx.texture) return;
      renderStateRef.current.imageAspect =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : isMobileView
            ? 9 / 16
            : 16 / 9;
      try {
        ctx.gl.bindTexture(ctx.gl.TEXTURE_2D, ctx.texture);
        ctx.gl.texImage2D(
          ctx.gl.TEXTURE_2D,
          0,
          ctx.gl.RGBA,
          ctx.gl.RGBA,
          ctx.gl.UNSIGNED_BYTE,
          img,
        );
        setWebglReady(true);
      } catch {
        setWebglReady(false);
      }
    };
    img.onerror = () => {
      if (!cancelled) setWebglReady(false);
    };
    img.src = targetUrl;

    return () => {
      cancelled = true;
    };
  }, [isMobileView, pcBgUrl, phoneBgUrl]);

  return {
    canvasRef,
    webglReady,
    handlePointerMove,
    handlePointerLeave,
  };
}
