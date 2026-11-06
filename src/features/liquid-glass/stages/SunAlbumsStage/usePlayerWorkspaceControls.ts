/**
 * Copyright (c) 2026 NL Archive.
 * SPDX-License-Identifier: MIT
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/usePlayerWorkspaceControls.ts
 *
 * Encapsulates expanded track player card pointer-drag physics, audio seek bar
 * scrubbing, and track step/play/restart handlers for AlbumPlayerWorkspace.
 */

import React, { useCallback, useRef, useState } from 'react';
import type { LiquidGlassAlbum, LiquidGlassTrack } from '../../albumsData';

export interface UsePlayerWorkspaceControlsArgs {
  album: LiquidGlassAlbum;
  activeTrack: LiquidGlassTrack | null;
  setActiveTrack: React.Dispatch<React.SetStateAction<LiquidGlassTrack | null>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  duration: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  isPhone: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export function usePlayerWorkspaceControls({
  album,
  activeTrack,
  setActiveTrack,
  audioRef,
  seekBarRef,
  duration,
  setCurrentTime,
  isPhone,
  viewportWidth,
  viewportHeight,
}: UsePlayerWorkspaceControlsArgs) {
  const [playerDragOffset, setPlayerDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const playerDragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const toggleAudioPlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      if (a.paused || a.ended) void a.play().catch(() => {});
      else a.pause();
    },
    [audioRef],
  );

  const handleRestartTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = 0;
      setCurrentTime(0);
      if (a.paused) void a.play().catch(() => {});
    },
    [audioRef, setCurrentTime],
  );

  const handleStepTrack = useCallback(
    (dir: -1 | 1, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!activeTrack) return;
      const len = album.tracks.length;
      const idx = album.tracks.findIndex((t) => t.num === activeTrack.num);
      setActiveTrack(album.tracks[(idx + dir + len) % len]);
    },
    [album.tracks, activeTrack, setActiveTrack],
  );

  const handlePlayerCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPhone) return;
      const target = e.target as HTMLElement;
      if (target.closest('button,[role="slider"],.lg-seek-hit')) return;
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
    [isPhone, playerDragOffset.x, playerDragOffset.y],
  );

  const handlePlayerCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = playerDragStartRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.stopPropagation();
      const maxX = viewportWidth * 0.42;
      const maxY = viewportHeight * 0.42;
      setPlayerDragOffset({
        x: Math.max(-maxX, Math.min(maxX, drag.origX + (e.clientX - drag.startX))),
        y: Math.max(-maxY, Math.min(maxY, drag.origY + (e.clientY - drag.startY))),
      });
    },
    [viewportWidth, viewportHeight],
  );

  const handlePlayerCardPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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
  }, []);

  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      const a = audioRef.current;
      if (!bar || !a || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      a.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    },
    [audioRef, duration, seekBarRef, setCurrentTime],
  );

  return {
    playerDragOffset,
    setPlayerDragOffset,
    isDraggingPlayer,
    toggleAudioPlayPause,
    handleRestartTrack,
    handleStepTrack,
    handlePlayerCardPointerDown,
    handlePlayerCardPointerMove,
    handlePlayerCardPointerUp,
    seekAudioClientX,
  };
}
