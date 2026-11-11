/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * MS-DOS Classics Engine View (.jsdos / DOSBox WASM)
 * Lazily injects js-dos v8 on demand and runs classic MS-DOS bundles inside .nl-screen
 * with automatic audio & instance cleanup on unmount.
 */

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ActiveEmulatorController } from '../hooks/useEmulatorLifecycle';

export interface DosEngineViewProps {
  bundleUrl: string;
  posterUrl: string | null;
  reloadToken: number;
  onRetry: () => void;
  onReadyStateChange: (ready: boolean) => void;
  onTargetElementChange: (el: HTMLElement | null) => void;
  registerController: (ctrl: ActiveEmulatorController | null) => void;
}

interface JsDosInstance {
  stop?: () => Promise<void> | void;
  setVolume?: (v: number) => void;
}

type DosFactory = (
  element: HTMLElement,
  options: Record<string, unknown>,
) => JsDosInstance;

let jsDosLoadPromise: Promise<DosFactory> | null = null;

function loadJsDosRuntime(): Promise<DosFactory> {
  const win = window as unknown as { Dos?: DosFactory };
  if (typeof win.Dos === 'function') {
    return Promise.resolve(win.Dos);
  }
  if (jsDosLoadPromise) return jsDosLoadPromise;

  jsDosLoadPromise = new Promise<DosFactory>((resolve, reject) => {
    if (!document.getElementById('nl-jsdos-css')) {
      const link = document.createElement('link');
      link.id = 'nl-jsdos-css';
      link.rel = 'stylesheet';
      link.href = 'https://v8.js-dos.com/latest/js-dos.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://v8.js-dos.com/latest/js-dos.js';
    script.async = true;
    script.onload = () => {
      if (typeof win.Dos === 'function') {
        resolve(win.Dos);
      } else {
        jsDosLoadPromise = null;
        reject(new Error('Dos factory missing'));
      }
    };
    script.onerror = () => {
      jsDosLoadPromise = null;
      reject(new Error('Failed to load js-dos'));
    };
    document.head.appendChild(script);
  });

  return jsDosLoadPromise;
}

export function DosEngineView({
  bundleUrl,
  posterUrl,
  reloadToken,
  onRetry,
  onReadyStateChange,
  onTargetElementChange,
  registerController,
}: DosEngineViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !bundleUrl) return;

    let cancelled = false;
    let dosInstance: JsDosInstance | null = null;
    setStatus('loading');
    onReadyStateChange(false);

    const mountEl = document.createElement('div');
    mountEl.className = 'nl-dos-mount';
    host.replaceChildren(mountEl);

    (async () => {
      try {
        const Dos = await loadJsDosRuntime();
        if (cancelled) return;

        dosInstance = Dos(mountEl, {
          url: bundleUrl,
          autoStart: true,
          theme: 'dark',
          kiosk: true,
        });

        setStatus('ready');
        onReadyStateChange(true);
        onTargetElementChange(mountEl);

        registerController({
          mute: (muted: boolean) => {
            try {
              dosInstance?.setVolume?.(muted ? 0 : 1);
            } catch {
              // ignore
            }
          },
          focus: () => {
            try {
              mountEl.focus();
            } catch {
              // ignore
            }
          },
          destroy: () => {
            try {
              dosInstance?.stop?.();
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
        dosInstance?.stop?.();
      } catch {
        // ignore
      }
      dosInstance = null;
      try {
        host.replaceChildren();
      } catch {
        // ignore
      }
    };
  }, [
    bundleUrl,
    reloadToken,
    onReadyStateChange,
    onTargetElementChange,
    registerController,
  ]);

  return (
    <>
      <div className="nl-ruffle-host nl-dos-host" ref={hostRef} />

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
          <p className="nl-screen-hint">Starting MS-DOS WASM Engine...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="nl-screen-overlay">
          <p className="nl-screen-hint">تعذر تشغيل حزمة MS-DOS</p>
          <button type="button" className="nl-screen-btn" onClick={onRetry}>
            <RotateCcw size={16} aria-hidden="true" /> إعادة المحاولة
          </button>
        </div>
      )}
    </>
  );
}
