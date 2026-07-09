/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * AeroZoomBar — a VERY thin Frutiger-Aero glass rail carrying a single simple
 * glass knob (the "ball"). It is a pure controlled slider:
 *   - desktop  -> vertical rail pinned beside the image (top = max zoom)
 *   - mobile   -> horizontal rail near the bottom (left = min zoom)
 *
 * Visibility is fully controlled by the parent viewer (see AeroImageViewer):
 *   desktop -> shown for the first 3s, then hidden; re-appears when the cursor
 *              moves near the rail.
 *   mobile  -> shown while pinching, hidden ~2s after the gesture ends.
 *
 * This component only reports value changes + interaction activity; it owns no
 * timers and no zoom math.
 */

import type React from "react";
import { useCallback, useRef } from "react";

export interface AeroZoomBarProps {
  min: number;
  max: number;
  value: number;
  visible: boolean;
  accent: string;
  orientation: "vertical" | "horizontal";
  onChange: (value: number) => void;
  /** Fired on any pointer interaction so the parent can keep the rail awake. */
  onActivity: () => void;
}

export function AeroZoomBar(props: AeroZoomBarProps) {
  const { min, max, value, visible, accent, orientation, onChange, onActivity } = props;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const range = Math.max(0.0001, max - min);
  const ratio = Math.min(1, Math.max(0, (value - min) / range));
  // Vertical rail: top edge is MAX zoom, so invert the ratio for the offset.
  const knobPct = orientation === "vertical" ? (1 - ratio) * 100 : ratio * 100;

  const knobStyle: React.CSSProperties =
    orientation === "vertical"
      ? { top: knobPct + "%", borderColor: accent }
      : { left: knobPct + "%", borderColor: accent };

  const fillStyle: React.CSSProperties =
    orientation === "vertical"
      ? { top: knobPct + "%", bottom: 0, background: accent }
      : { left: 0, width: knobPct + "%", background: accent };

  const valueFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const r = el.getBoundingClientRect();
      let frac: number;
      if (orientation === "vertical") {
        frac = 1 - (clientY - r.top) / Math.max(1, r.height);
      } else {
        frac = (clientX - r.left) / Math.max(1, r.width);
      }
      frac = Math.min(1, Math.max(0, frac));
      return min + frac * range;
    },
    [min, range, orientation, value],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      dragging.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      onActivity();
      onChange(valueFromEvent(e.clientX, e.clientY));
    },
    [onActivity, onChange, valueFromEvent],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.stopPropagation();
      onActivity();
      onChange(valueFromEvent(e.clientX, e.clientY));
    },
    [onActivity, onChange, valueFromEvent],
  );

  const stopDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div
      ref={trackRef}
      className="nlav-zoombar"
      data-orientation={orientation}
      data-visible={visible ? "true" : "false"}
      role="slider"
      aria-label="Zoom"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerEnter={onActivity}
    >
      <span className="nlav-zoombar-fill" style={fillStyle} />
      <span className="nlav-zoombar-knob" style={knobStyle} />
    </div>
  );
}

export default AeroZoomBar;
