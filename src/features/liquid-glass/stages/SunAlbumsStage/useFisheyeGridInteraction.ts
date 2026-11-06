/**
 * src/features/liquid-glass/stages/SunAlbumsStage/useFisheyeGridInteraction.ts
 *
 * Encapsulates pointer/touch drag physics, inertia pan state, focus tracking,
 * and polygon hit-testing for FisheyeMeshViewport.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiquidGlassAlbum } from '../../albumsData';
import { pointInPolygon, type WarpedCellHitRegion } from './fisheyeMeshMath';

export interface UseFisheyeGridInteractionArgs {
  viewportWidth: number;
  viewportHeight: number;
  onSelectAlbum: (album: LiquidGlassAlbum) => void;
  onBackToOrbs: () => void;
}

export function useFisheyeGridInteraction({
  viewportWidth,
  viewportHeight,
  onSelectAlbum,
  onBackToOrbs,
}: UseFisheyeGridInteractionArgs) {
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const hitRegionsRef = useRef<WarpedCellHitRegion[]>([]);

  const gridConfig = useMemo(() => {
    const isPhone =
      viewportWidth <= 768 ||
      (viewportWidth < 900 && viewportHeight > viewportWidth * 1.05);

    const tileSize = isPhone
      ? Math.round(Math.max(142, Math.min(viewportWidth * 0.44, 180)))
      : Math.round(Math.max(204, Math.min(viewportWidth * 0.18, 256)));

    return {
      isPhone,
      tileSize,
      staggerShift: tileSize * 0.5,
    };
  }, [viewportWidth, viewportHeight]);

  const panRef = useRef({
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

  const fisheyeFocusRef = useRef({
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

      if (wasTap) {
        const rect = e.currentTarget.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const tapY = e.clientY - rect.top;
        const regions = hitRegionsRef.current;
        let matchedTile = false;
        for (let i = regions.length - 1; i >= 0; i--) {
          if (pointInPolygon(tapX, tapY, regions[i].boundary)) {
            onSelectAlbum(regions[i].album);
            matchedTile = true;
            break;
          }
        }
        if (!matchedTile && !gridConfig.isPhone) {
          onBackToOrbs();
        }
      }
    },
    [onSelectAlbum, onBackToOrbs, gridConfig.isPhone],
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

  return {
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
  };
}
