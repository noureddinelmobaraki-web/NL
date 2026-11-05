// src/features/cinema/player/ManualSyncBar.tsx
// For silent (Tier 3) servers when bridge is inactive: lets the user drive the subtitle clock by hand.
import { useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { clockNow, clockPause, clockPlay, clockSeek, clockSync, useClockState, useClockTime } from "./playbackClock";

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const sec = v % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

export function ManualSyncBar({ visible, label }: { visible: boolean; label: string }) {
  const st = useClockState();
  const t = useClockTime(500);

  useEffect(() => {
    if (visible && st.source !== "manual") clockSync({ source: "manual" });
  }, [visible, st.source]);

  if (!visible) return null;
  return (
    <div className="nl-manual-sync" role="group" aria-label={label}>
      <span className="nl-manual-sync__label">{label}</span>
      <button type="button" onClick={() => (st.paused ? clockPlay() : clockPause())} aria-label={st.paused ? "Play" : "Pause"}>
        {st.paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      <button type="button" onClick={() => clockSeek(Math.max(0, clockNow() - 0.5))}>−0.5s</button>
      <span className="nl-manual-sync__time">{fmt(t)}</span>
      <button type="button" onClick={() => clockSeek(clockNow() + 0.5)}>+0.5s</button>
    </div>
  );
}
