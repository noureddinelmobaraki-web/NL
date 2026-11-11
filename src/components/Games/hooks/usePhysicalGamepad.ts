/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Physical Bluetooth/USB Gamepad API Hook (PS4/PS5 DualSense, Xbox, Backbone)
 * Polls navigator.getGamepads() via requestAnimationFrame and dispatches synthetic
 * KeyboardEvents to the active game container so any Flash, DOS, or Console game
 * works with a real controller out of the box.
 */

import { useState, useEffect, useRef } from 'react';

interface KeyMapping {
  key: string;
  code: string;
}

const BUTTON_TO_KEY: Record<number, KeyMapping> = {
  0: { key: 'z', code: 'KeyZ' }, // Cross / A -> Action / Jump
  1: { key: 'x', code: 'KeyX' }, // Circle / B -> Secondary Action
  2: { key: 'a', code: 'KeyA' }, // Square / X -> Attack
  3: { key: 's', code: 'KeyS' }, // Triangle / Y -> Special
  8: { key: 'Shift', code: 'ShiftRight' }, // Select / Share
  9: { key: 'Enter', code: 'Enter' }, // Start / Options
  12: { key: 'ArrowUp', code: 'ArrowUp' }, // D-Pad Up
  13: { key: 'ArrowDown', code: 'ArrowDown' }, // D-Pad Down
  14: { key: 'ArrowLeft', code: 'ArrowLeft' }, // D-Pad Left
  15: { key: 'ArrowRight', code: 'ArrowRight' }, // D-Pad Right
};

function dispatchKeyToTarget(
  target: HTMLElement | null,
  type: 'keydown' | 'keyup',
  mapping: KeyMapping,
) {
  const el = target || document.activeElement || window;
  const ev = new KeyboardEvent(type, {
    key: mapping.key,
    code: mapping.code,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  el.dispatchEvent(ev);
}

export function usePhysicalGamepad(
  enabled: boolean,
  getTargetElement: () => HTMLElement | null,
) {
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState<string | null>(null);
  const pressedStateRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      setGamepadConnected(true);
      setGamepadName(e.gamepad?.id || 'Controller');
    };
    const onDisconnect = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyActive = Array.from(pads).some(Boolean);
      setGamepadConnected(anyActive);
      if (!anyActive) setGamepadName(null);
    };

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== 'function') return;

    let rafId = 0;
    const poll = () => {
      const pads = navigator.getGamepads();
      const pad = pads?.[0] || pads?.[1] || pads?.[2] || pads?.[3];

      if (pad) {
        if (!gamepadConnected) {
          setGamepadConnected(true);
          setGamepadName(pad.id);
        }
        const target = getTargetElement();

        for (const [btnIndexStr, mapping] of Object.entries(BUTTON_TO_KEY)) {
          const idx = Number(btnIndexStr);
          const btn = pad.buttons[idx];
          const isPressed = Boolean(btn && (btn.pressed || btn.value > 0.5));
          const stateKey = `btn_${idx}`;
          const wasPressed = Boolean(pressedStateRef.current[stateKey]);

          if (isPressed !== wasPressed) {
            pressedStateRef.current[stateKey] = isPressed;
            dispatchKeyToTarget(
              target,
              isPressed ? 'keydown' : 'keyup',
              mapping,
            );
          }
        }

        // Left Analog Stick support
        const axisX = pad.axes[0] || 0;
        const axisY = pad.axes[1] || 0;
        const stickDirs: Array<[string, boolean, KeyMapping]> = [
          ['stick_left', axisX < -0.45, { key: 'ArrowLeft', code: 'ArrowLeft' }],
          ['stick_right', axisX > 0.45, { key: 'ArrowRight', code: 'ArrowRight' }],
          ['stick_up', axisY < -0.45, { key: 'ArrowUp', code: 'ArrowUp' }],
          ['stick_down', axisY > 0.45, { key: 'ArrowDown', code: 'ArrowDown' }],
        ];

        for (const [keyId, active, mapping] of stickDirs) {
          const prev = Boolean(pressedStateRef.current[keyId]);
          if (active !== prev) {
            pressedStateRef.current[keyId] = active;
            dispatchKeyToTarget(target, active ? 'keydown' : 'keyup', mapping);
          }
        }
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, gamepadConnected, getTargetElement]);

  return {
    gamepadConnected,
    gamepadName,
  };
}
