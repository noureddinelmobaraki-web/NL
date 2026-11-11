/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Ruffle Flash Engine View (.swf)
 * Wraps the existing useRuffle hook and exposes playerRef + lifecycle controls
 */

import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRuffle } from '../useRuffle';
import type { ActiveEmulatorController } from '../hooks/useEmulatorLifecycle';

export interface RuffleEngineViewProps {
  swfUrl: string;
  posterUrl: string | null;
  reloadToken: number;
  onRetry: () => void;
  onReadyStateChange: (ready: boolean) => void;
  onTargetElementChange: (el: HTMLElement | null) => void;
  registerController: (ctrl: ActiveEmulatorController | null) => void;
}

export function RuffleEngineView({
  swfUrl,
  posterUrl,
  reloadToken,
  onRetry,
  onReadyStateChange,
  onTargetElementChange,
  registerController,
}: RuffleEngineViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { status, playerRef } = useRuffle(containerRef, swfUrl, reloadToken);

  useEffect(() => {
    onReadyStateChange(status === 'ready');
    if (status === 'ready' && playerRef.current) {
      onTargetElementChange(playerRef.current);
      registerController({
        mute: (muted: boolean) => {
          try {
            const p = playerRef.current;
            if (!p) return;
            p.volume = muted ? 0 : 1;
          } catch {
            // ignore
          }
        },
        focus: () => {
          try {
            playerRef.current?.focus?.();
          } catch {
            // ignore
          }
        },
        destroy: () => {
          try {
            playerRef.current?.remove?.();
          } catch {
            // ignore
          }
        },
      });
    }
    return () => {
      registerController(null);
    };
  }, [
    status,
    playerRef,
    onReadyStateChange,
    onTargetElementChange,
    registerController,
  ]);

  return (
    <>
      <div className="nl-ruffle-host" ref={containerRef} />

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
          <p className="nl-screen-hint">{t('games.loading')}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="nl-screen-overlay">
          <p className="nl-screen-hint">{t('games.error')}</p>
          <button type="button" className="nl-screen-btn" onClick={onRetry}>
            <RotateCcw size={16} aria-hidden="true" /> {t('games.errorRetry')}
          </button>
        </div>
      )}
    </>
  );
}
