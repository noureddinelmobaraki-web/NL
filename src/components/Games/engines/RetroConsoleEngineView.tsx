/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Retro Console Emulator Engine View (NES, GBA, GB, GBC, SNES, Genesis)
 * Lazily loads Nostalgist (RetroArch Libretro WebAssembly) via ESM CDN on demand
 * with full Save/Load state and zero-leak cleanup on exit.
 */

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ConsoleCore } from '../types/games.types';
import type { ActiveEmulatorController } from '../hooks/useEmulatorLifecycle';

export interface RetroConsoleEngineViewProps {
  romUrl: string;
  core: ConsoleCore;
  posterUrl: string | null;
  reloadToken: number;
  onRetry: () => void;
  onReadyStateChange: (ready: boolean) => void;
  onTargetElementChange: (el: HTMLElement | null) => void;
  registerController: (ctrl: ActiveEmulatorController | null) => void;
}

interface NostalgistInstance {
  exit: (opts?: { removeCanvas?: boolean }) => void;
  saveState: () => Promise<{ state: Blob }>;
  loadState: (state: Blob) => Promise<void>;
  sendCommand: (cmd: string) => void;
  getCanvas: () => HTMLCanvasElement;
}

interface NostalgistStatic {
  launch: (opts: Record<string, unknown>) => Promise<NostalgistInstance>;
}

async function loadNostalgistModule(
  url: string,
): Promise<{ Nostalgist?: NostalgistStatic; default?: NostalgistStatic }> {
  return import(/* @vite-ignore */ url);
}

export function RetroConsoleEngineView({
  romUrl,
  core,
  posterUrl,
  reloadToken,
  onRetry,
  onReadyStateChange,
  onTargetElementChange,
  registerController,
}: RetroConsoleEngineViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !romUrl) return;

    let cancelled = false;
    let instance: NostalgistInstance | null = null;
    setStatus('loading');
    onReadyStateChange(false);

    const canvas = document.createElement('canvas');
    canvas.className = 'nl-emulator-canvas';
    canvas.tabIndex = 0;
    host.replaceChildren(canvas);

    (async () => {
      try {
        const mod = await loadNostalgistModule('https://esm.sh/nostalgist@0.17.0');
        if (cancelled) return;
        const Nostalgist = mod.Nostalgist || mod.default;
        if (!Nostalgist) throw new Error('Nostalgist unavailable');

        instance = await Nostalgist.launch({
          element: canvas,
          core,
          rom: romUrl,
          retroarchConfig: {
            input_player1_a: 'x',
            input_player1_b: 'z',
            input_player1_x: 's',
            input_player1_y: 'a',
            input_player1_start: 'enter',
            input_player1_select: 'rshift',
            input_player1_up: 'up',
            input_player1_down: 'down',
            input_player1_left: 'left',
            input_player1_right: 'right',
          },
        });

        if (cancelled) {
          instance.exit({ removeCanvas: true });
          return;
        }

        setStatus('ready');
        onReadyStateChange(true);
        onTargetElementChange(canvas);
        try {
          canvas.focus();
        } catch {
          // ignore
        }

        registerController({
          mute: () => {
            try {
              instance?.sendCommand('MUTE');
            } catch {
              // ignore
            }
          },
          saveState: async () => {
            if (!instance) return null;
            const res = await instance.saveState();
            return res?.state || null;
          },
          loadState: async (blob: Blob) => {
            if (!instance) return;
            await instance.loadState(blob);
          },
          focus: () => {
            try {
              canvas.focus();
            } catch {
              // ignore
            }
          },
          destroy: () => {
            try {
              instance?.exit({ removeCanvas: true });
            } catch {
              // ignore
            }
          },
        });
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      registerController(null);
      try {
        instance?.exit({ removeCanvas: true });
      } catch {
        // ignore
      }
      instance = null;
      try {
        host.replaceChildren();
      } catch {
        // ignore
      }
    };
  }, [
    romUrl,
    core,
    reloadToken,
    onReadyStateChange,
    onTargetElementChange,
    registerController,
  ]);

  return (
    <>
      <div className="nl-ruffle-host nl-console-host" ref={hostRef} />

      {status === 'loading' && (
        <div className="nl-screen-overlay">
          {posterUrl && (
            <img
              className="nl-screen-poster"
              src={posterUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="nl-progress">
            <span />
          </div>
          <p className="nl-screen-hint">
            Loading {core.toUpperCase()} RetroArch Core...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="nl-screen-overlay">
          <p className="nl-screen-hint">
            تعذر تحميل محاكي الكونسول أو ملف الـ ROM
          </p>
          <button type="button" className="nl-screen-btn" onClick={onRetry}>
            <RotateCcw size={16} aria-hidden="true" /> إعادة المحاولة
          </button>
        </div>
      )}
    </>
  );
}
