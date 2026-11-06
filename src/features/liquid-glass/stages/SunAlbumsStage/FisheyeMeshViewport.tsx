/**
 * src/features/liquid-glass/stages/SunAlbumsStage/FisheyeMeshViewport.tsx
 *
 * Interactive 2D Connected Spherical-Dome Fisheye Mesh Canvas & Pointer/Touch Handlers.
 */

import React, { useEffect, useRef } from 'react';
import type { LiquidGlassAlbum } from '../../albumsData';
import {
  BAKED_TEX_SIZE,
  coverRgbCache,
  drawWarpedTexturedTriangle,
  getAlbumForInfiniteCell,
  getInitialAlbumRgb,
  getOrEnsureAlbumTexture,
  type WarpedCellHitRegion,
  warpSphericalFisheyePoint,
} from './fisheyeMeshMath';
import { useFisheyeGridInteraction } from './useFisheyeGridInteraction';

export interface FisheyeMeshViewportProps {
  albums: LiquidGlassAlbum[];
  viewportWidth: number;
  viewportHeight: number;
  onSelectAlbum: (album: LiquidGlassAlbum) => void;
  onBackToOrbs: () => void;
}

export const FisheyeMeshViewport: React.FC<FisheyeMeshViewportProps> = ({
  albums,
  viewportWidth,
  viewportHeight,
  onSelectAlbum,
  onBackToOrbs,
}) => {
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    isDraggingGrid,
    gridConfig,
    panRef,
    fisheyeFocusRef,
    hitRegionsRef,
    handleGridPointerDown,
    handleGridPointerMove,
    handleGridPointerUp,
    handleGridPointerCancel,
    handleGridWheel,
  } = useFisheyeGridInteraction({
    viewportWidth,
    viewportHeight,
    onSelectAlbum,
    onBackToOrbs,
  });

  useEffect(() => {
    if (albums.length === 0) return undefined;
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

      const margin = tileSize * 2.1;
      const minRow = Math.floor((-p.y - margin) / tileSize);
      const maxRow = Math.ceil((-p.y + viewportHeight + margin) / tileSize);
      const minCol = Math.floor((-p.x - margin - staggerShift) / tileSize);
      const maxCol = Math.ceil((-p.x + viewportWidth + margin + staggerShift) / tileSize);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      const newHitRegions: WarpedCellHitRegion[] = [];
      const vxGrid = new Float32Array((N + 1) * (N + 1));
      const vyGrid = new Float32Array((N + 1) * (N + 1));

      for (let r = minRow; r <= maxRow; r++) {
        const isOddRow = ((r % 2) + 2) % 2 === 1;
        const rowOffset = isOddRow ? staggerShift : 0;
        const baseY = r * tileSize;

        for (let c = minCol; c <= maxCol; c++) {
          const baseX = c * tileSize + rowOffset;
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

              if (i === 2 && j === 2) centerScale = ptOut.scale;
              if (ptOut.x < minX) minX = ptOut.x;
              if (ptOut.x > maxX) maxX = ptOut.x;
              if (ptOut.y < minY) minY = ptOut.y;
              if (ptOut.y > maxY) maxY = ptOut.y;
            }
          }

          if (
            maxX < -16 ||
            minX > viewportWidth + 16 ||
            maxY < -16 ||
            minY > viewportHeight + 16
          ) {
            continue;
          }

          const album = getAlbumForInfiniteCell(r, c, albums);
          const texCanvas = getOrEnsureAlbumTexture(album);

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

          const boundary: Array<{ x: number; y: number }> = [];
          for (let i = 0; i < N; i++) boundary.push({ x: vxGrid[i], y: vyGrid[i] });
          for (let j = 0; j < N; j++) {
            const idx = j * (N + 1) + N;
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }
          for (let i = N; i > 0; i--) {
            const idx = N * (N + 1) + i;
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }
          for (let j = N; j > 0; j--) {
            const idx = j * (N + 1);
            boundary.push({ x: vxGrid[idx], y: vyGrid[idx] });
          }

          newHitRegions.push({ album, boundary });

          ctx.beginPath();
          ctx.moveTo(boundary[0].x, boundary[0].y);
          for (let k = 1; k < boundary.length; k++) {
            ctx.lineTo(boundary[k].x, boundary[k].y);
          }
          ctx.closePath();

          const rgb = coverRgbCache.get(album.id) ?? getInitialAlbumRgb(album.index);
          const silkAlpha = Math.min(0.95, Math.max(0.32, (centerScale - 0.45) * 0.78));

          ctx.lineWidth = 2.2;
          ctx.strokeStyle = `rgba(${rgb}, ${(silkAlpha * 0.28).toFixed(2)})`;
          ctx.stroke();

          ctx.lineWidth = 1.05;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(silkAlpha * 0.88).toFixed(2)})`;
          ctx.stroke();
        }
      }

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
  }, [albums, fisheyeFocusRef, gridConfig, hitRegionsRef, panRef, viewportWidth, viewportHeight]);

  return (
    <div
      className={`lg-brick-viewport${isDraggingGrid ? ' lg-brick-viewport--dragging' : ''}`}
      onPointerDown={handleGridPointerDown}
      onPointerMove={handleGridPointerMove}
      onPointerUp={handleGridPointerUp}
      onPointerCancel={handleGridPointerCancel}
      onWheel={handleGridWheel}
      role="region"
      aria-label="شبكة الألبومات المتصلة بعدسة عين السمكة"
    >
      <canvas ref={meshCanvasRef} className="lg-fisheye-mesh-canvas" />
    </div>
  );
};
