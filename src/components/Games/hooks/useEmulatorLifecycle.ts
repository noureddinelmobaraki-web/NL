/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Emulator Lifecycle & Zero-Leak Audio/Memory Manager
 * Ensures no background audio or orphaned WebAssembly loops survive when switching
 * between games or closing the Games window.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ActiveEmulatorController {
  mute?: (muted: boolean) => void;
  saveState?: () => Promise<Blob | null>;
  loadState?: (blob: Blob) => Promise<void>;
  focus?: () => void;
  destroy?: () => void;
}

export function useEmulatorLifecycle(selectedId: string | null) {
  const [isMuted, setIsMuted] = useState(false);
  const activeControllerRef = useRef<ActiveEmulatorController | null>(null);

  const registerController = useCallback(
    (controller: ActiveEmulatorController | null) => {
      activeControllerRef.current = controller;
      if (controller && isMuted) {
        try {
          controller.mute?.(true);
        } catch {
          // ignore
        }
      }
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        activeControllerRef.current?.mute?.(next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const focusActiveEmulator = useCallback(() => {
    try {
      activeControllerRef.current?.focus?.();
    } catch {
      // ignore
    }
  }, []);

  // Zero-leak cleanup when switching games or unmounting
  useEffect(() => {
    return () => {
      try {
        activeControllerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      activeControllerRef.current = null;
    };
  }, [selectedId]);

  return {
    isMuted,
    toggleMute,
    registerController,
    activeControllerRef,
    focusActiveEmulator,
  };
}
