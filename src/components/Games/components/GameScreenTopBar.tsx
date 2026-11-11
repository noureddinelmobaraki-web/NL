/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Top Bar for GameScreen (.nl-screen-bar)
 * Preserves the exact original classes (.nl-screen-bar, .nl-screen-title, .nl-screen-btn)
 * and adds:
 * - Touch Gamepad toggle + profile switch (Console vs Flash/PC)
 * - Save/Load State buttons for Retro Consoles
 * - Audio Mute toggle
 * - Physical Bluetooth Gamepad indicator
 * - Smart Fullscreen (with iOS Safari support) & Back button
 */

import {
  Maximize,
  Gamepad2,
  Volume2,
  VolumeX,
  Download,
  Upload,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ControlProfile, EmulatorEngine } from '../types/games.types';

export interface GameScreenTopBarProps {
  title: string | null;
  platformBadge?: string;
  engine?: EmulatorEngine;
  hasGame: boolean;
  isTouch: boolean;
  barVisible: boolean;
  showTouchControls: boolean;
  controlProfile: ControlProfile;
  isMuted: boolean;
  gamepadConnected: boolean;
  hasSavedState: boolean;
  onRevealBar: () => void;
  onToggleTouchControls: () => void;
  onCycleControlProfile: () => void;
  onToggleMute: () => void;
  onSaveState?: () => void;
  onLoadState?: () => void;
  onReload: () => void;
  onToggleFullscreen: () => void;
  onBack?: () => void;
}

export function GameScreenTopBar({
  title,
  platformBadge,
  engine,
  hasGame,
  isTouch,
  barVisible,
  showTouchControls,
  controlProfile,
  isMuted,
  gamepadConnected,
  hasSavedState,
  onRevealBar,
  onToggleTouchControls,
  onCycleControlProfile,
  onToggleMute,
  onSaveState,
  onLoadState,
  onReload,
  onToggleFullscreen,
  onBack,
}: GameScreenTopBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`nl-screen-bar${isTouch ? ' is-floating' : ''}${barVisible ? '' : ' is-hidden'}`}
    >
      <div className="nl-screen-bar-left">
        <span className="nl-screen-title">{title ?? t('games.idle')}</span>
        {hasGame && platformBadge && (
          <span className="nl-screen-engine-tag">{platformBadge}</span>
        )}
        {gamepadConnected && (
          <span
            className="nl-screen-engine-tag"
            title="Bluetooth/USB Controller Active"
          >
            PAD
          </span>
        )}
      </div>

      <div className="nl-screen-actions">
        {hasGame && engine === 'nostalgist' && onSaveState && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost"
            onClick={() => {
              onRevealBar();
              onSaveState();
            }}
            title="Save State"
            aria-label="Save State"
          >
            <Download size={15} aria-hidden="true" />
          </button>
        )}

        {hasGame && engine === 'nostalgist' && hasSavedState && onLoadState && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost"
            onClick={() => {
              onRevealBar();
              onLoadState();
            }}
            title="Load Saved State"
            aria-label="Load Saved State"
          >
            <Upload size={15} aria-hidden="true" />
          </button>
        )}

        {hasGame && engine !== 'mini-api' && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost"
            aria-pressed={isMuted}
            onClick={() => {
              onRevealBar();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute game' : 'Mute game'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX size={15} aria-hidden="true" />
            ) : (
              <Volume2 size={15} aria-hidden="true" />
            )}
          </button>
        )}

        {hasGame && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost"
            onClick={() => {
              onRevealBar();
              onReload();
            }}
            aria-label="Restart game"
            title="Restart game"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        )}

        {isTouch && hasGame && (
          <button
            type="button"
            className="nl-screen-btn"
            aria-pressed={showTouchControls}
            onClick={() => {
              onRevealBar();
              onToggleTouchControls();
            }}
            aria-label={t('games.controls')}
            title="Toggle Touch Controls"
          >
            <Gamepad2 size={16} aria-hidden="true" />
          </button>
        )}

        {isTouch && hasGame && showTouchControls && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost"
            onClick={() => {
              onRevealBar();
              onCycleControlProfile();
            }}
            title="Switch Gamepad Layout (Console / Flash PC)"
            aria-label="Switch Gamepad Layout"
          >
            {controlProfile === 'console-pad' ? 'PAD' : 'KEYS'}
          </button>
        )}

        {hasGame && (
          <button
            type="button"
            className="nl-screen-btn"
            onClick={() => {
              onRevealBar();
              onToggleFullscreen();
            }}
            aria-label={t('games.fullscreen')}
          >
            <Maximize size={16} aria-hidden="true" />
          </button>
        )}

        {onBack && hasGame && (
          <button
            type="button"
            className="nl-screen-btn nl-screen-btn--ghost nl-screen-btn--close"
            onClick={() => {
              onRevealBar();
              onBack();
            }}
            aria-label="Close game"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
