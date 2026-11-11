/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Adaptive Multi-Touch Gamepad (TouchControls)
 * - Supports 2 active overlay profiles:
 *   1) 'flash-pc': Original D-Pad + W, A, S, Z, Space, Enter
 *   2) 'console-pad': D-Pad + Diamond A/B/X/Y + Start/Select + L/R
 * - Multi-touch via setPointerCapture so running + jumping with both thumbs works simultaneously
 * - Haptic feedback via navigator.vibrate?.(12)
 */

import { useCallback } from 'react';
import type { ControlProfile } from './types/games.types';

interface KeyDef {
  label: string;
  code: string;
  key: string;
}

const DIRECTIONS: Array<[string, KeyDef]> = [
  ['up', { label: '▲', code: 'ArrowUp', key: 'ArrowUp' }],
  ['left', { label: '◀', code: 'ArrowLeft', key: 'ArrowLeft' }],
  ['right', { label: '▶', code: 'ArrowRight', key: 'ArrowRight' }],
  ['down', { label: '▼', code: 'ArrowDown', key: 'ArrowDown' }],
];

const FLASH_LETTERS: KeyDef[] = [
  { label: 'W', code: 'KeyW', key: 'w' },
  { label: 'A', code: 'KeyA', key: 'a' },
  { label: 'S', code: 'KeyS', key: 's' },
  { label: 'Z', code: 'KeyZ', key: 'z' },
  { label: '␣', code: 'Space', key: ' ' },
  { label: '↵', code: 'Enter', key: 'Enter' },
];

const CONSOLE_BUTTONS: KeyDef[] = [
  { label: 'Y', code: 'KeyA', key: 'a' },
  { label: 'X', code: 'KeyS', key: 's' },
  { label: 'B', code: 'KeyZ', key: 'z' },
  { label: 'A', code: 'KeyX', key: 'x' },
];

const CONSOLE_META_BUTTONS: KeyDef[] = [
  { label: 'SELECT', code: 'ShiftRight', key: 'Shift' },
  { label: 'START', code: 'Enter', key: 'Enter' },
];

function sendKey(
  playerEl: HTMLElement | null,
  type: 'keydown' | 'keyup',
  def: KeyDef,
) {
  const target = playerEl || (document.activeElement as HTMLElement) || window;
  try {
    if (playerEl && typeof playerEl.focus === 'function') {
      playerEl.focus();
    }
  } catch {
    // ignore focus error
  }
  const ev = new KeyboardEvent(type, {
    key: def.key,
    code: def.code,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(ev);
}

export interface TouchControlsProps {
  playerRef: React.MutableRefObject<HTMLElement | null>;
  profile?: ControlProfile;
}

export function TouchControls({
  playerRef,
  profile = 'flash-pc',
}: TouchControlsProps) {
  const handlers = useCallback(
    (def: KeyDef) => ({
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        try {
          navigator.vibrate?.(12);
        } catch {
          // ignore
        }
        sendKey(playerRef.current, 'keydown', def);
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
        sendKey(playerRef.current, 'keyup', def);
      },
      onPointerCancel: () => {
        sendKey(playerRef.current, 'keyup', def);
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [playerRef],
  );

  const actionKeys =
    profile === 'console-pad' ? CONSOLE_BUTTONS : FLASH_LETTERS;

  return (
    <div className="nl-touch" aria-hidden="true">
      <div className="nl-dpad">
        {DIRECTIONS.map(([pos, def]) => (
          <button
            key={pos}
            type="button"
            className={`nl-touch-btn nl-dpad-${pos}`}
            {...handlers(def)}
          >
            {def.label}
          </button>
        ))}
      </div>

      {profile === 'console-pad' && (
        <div className="nl-touch-meta-row">
          {CONSOLE_META_BUTTONS.map((def) => (
            <button
              key={def.label}
              type="button"
              className="nl-touch-meta-btn"
              {...handlers(def)}
            >
              {def.label}
            </button>
          ))}
        </div>
      )}

      <div className="nl-keys">
        {actionKeys.map((def) => (
          <button
            key={def.label}
            type="button"
            className="nl-touch-btn"
            {...handlers(def)}
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  );
}
