// src/features/cinema/player/AdShield.tsx
// Transparent overlay above an ad-heavy iframe. Because no pointer event ever reaches the iframe,
// its scripts never receive transient user activation, so browsers block window.open popups.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

export interface AdShieldProps {
  active: boolean;
  onTogglePlay: () => void;
  onSeekRelative: (deltaSec: number) => void;
  onToggleFullscreen?: () => void;
  onActivity?: () => void;
  labels: { armed: string; passThrough: string; passThroughHint: string };
  passThroughMs?: number;
}

const DOUBLE_MS = 260;

export function AdShield({
  active,
  onTogglePlay,
  onSeekRelative,
  onToggleFullscreen,
  onActivity,
  labels,
  passThroughMs = 8000,
}: AdShieldProps) {
  const [passUntil, setPassUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);
  const passing = passUntil > now;

  useEffect(() => {
    if (!passUntil) return undefined;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= passUntil) setPassUntil(0);
    }, 250);
    return () => window.clearInterval(id);
  }, [passUntil]);

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!active) setPassUntil(0);
  }, [active]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onActivity?.();
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
      const t = performance.now();
      if (t - lastTapAt.current < DOUBLE_MS) {
        lastTapAt.current = 0;
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
        if (e.pointerType !== "mouse" && relX < 0.35) onSeekRelative(-10);
        else if (e.pointerType !== "mouse" && relX > 0.65) onSeekRelative(10);
        else onToggleFullscreen?.();
        return;
      }
      lastTapAt.current = t;
      // Touch: single tap only reveals controls (YouTube-like). Mouse: single click toggles play.
      if (e.pointerType === "mouse") {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          onTogglePlay();
        }, DOUBLE_MS);
      }
    },
    [onActivity, onSeekRelative, onToggleFullscreen, onTogglePlay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") onTogglePlay();
      else if (k === "arrowleft") onSeekRelative(-10);
      else if (k === "arrowright") onSeekRelative(10);
      else if (k === "f") onToggleFullscreen?.();
      else return;
      e.preventDefault();
      onActivity?.();
    },
    [onActivity, onSeekRelative, onToggleFullscreen, onTogglePlay],
  );

  if (!active) return null;

  return (
    <>
      <div
        className={`nl-adshield${passing ? " nl-adshield--passing" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={labels.armed}
        onPointerUp={handlePointerUp}
        onPointerMove={onActivity}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        type="button"
        className="nl-adshield__toggle"
        data-passing={passing ? "true" : "false"}
        title={passing ? labels.passThroughHint : labels.passThrough}
        aria-label={passing ? labels.passThroughHint : labels.passThrough}
        onClick={(e) => {
          e.stopPropagation();
          if (passing) {
            setPassUntil(0);
          } else {
            const t = Date.now();
            setNow(t);
            setPassUntil(t + passThroughMs);
          }
        }}
      >
        {passing ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
        <span>{passing ? `${Math.max(0, Math.ceil((passUntil - now) / 1000))}s` : labels.armed}</span>
      </button>
    </>
  );
}
