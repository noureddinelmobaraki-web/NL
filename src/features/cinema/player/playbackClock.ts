import { useEffect, useState, useSyncExternalStore } from "react";

export type ClockSource = "none" | "video" | "bridge" | "manual";

export interface ClockState {
  anchorTime: number;
  anchorAt: number;
  duration: number;
  paused: boolean;
  rate: number;
  source: ClockSource;
}

const initial = (source: ClockSource = "none"): ClockState => ({
  anchorTime: 0,
  anchorAt: performance.now(),
  duration: 0,
  paused: true,
  rate: 1,
  source,
});

let state: ClockState = initial();
const listeners = new Set<() => void>();

function emit(next: ClockState) {
  state = next;
  listeners.forEach((l) => l());
}

/** Current media time (seconds), interpolated between events. Cheap: call it inside rAF. */
export function clockNow(): number {
  if (state.paused) return state.anchorTime;
  return Math.max(0, state.anchorTime + ((performance.now() - state.anchorAt) / 1000) * state.rate);
}

export const clockGetState = (): ClockState => state;

export function clockSubscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface ClockSyncInput {
  time?: number;
  paused?: boolean;
  duration?: number;
  rate?: number;
  source?: ClockSource;
}

export function clockSync(input: ClockSyncInput): void {
  const time =
    typeof input.time === "number" && Number.isFinite(input.time) ? Math.max(0, input.time) : clockNow();
  const duration =
    typeof input.duration === "number" && Number.isFinite(input.duration) && input.duration > 0
      ? input.duration
      : state.duration;
  emit({
    anchorTime: time,
    anchorAt: performance.now(),
    duration,
    paused: input.paused ?? state.paused,
    rate: input.rate ?? state.rate,
    source: input.source ?? state.source,
  });
}

/** Re-anchor only on drift/state change (avoids renders on periodic timeupdate). */
export function clockSoftSync(time: number, extra: Omit<ClockSyncInput, "time"> = {}, toleranceSec = 0.35): void {
  const pausedChanged = extra.paused !== undefined && extra.paused !== state.paused;
  const durationChanged = extra.duration !== undefined && Math.abs((extra.duration || 0) - state.duration) > 1;
  const sourceChanged = extra.source !== undefined && extra.source !== state.source;
  if (pausedChanged || durationChanged || sourceChanged || Math.abs(clockNow() - time) > toleranceSec) {
    clockSync({ ...extra, time });
  }
}

export const clockPlay = () => {
  if (state.paused) clockSync({ paused: false });
};
export const clockPause = () => {
  if (!state.paused) clockSync({ time: clockNow(), paused: true });
};
export const clockSeek = (t: number) => clockSync({ time: t });
export const clockReset = (source: ClockSource = "none") => emit(initial(source));

export function useClockState(): ClockState {
  return useSyncExternalStore(clockSubscribe, clockGetState, clockGetState);
}

/** Low-frequency time for labels/progress bars. Re-renders ONLY the component using it. */
export function useClockTime(intervalMs = 250): number {
  const s = useClockState();
  const [t, setT] = useState(() => clockNow());
  useEffect(() => {
    setT(clockNow());
    if (s.paused) return undefined;
    const id = window.setInterval(() => setT(clockNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [s, intervalMs]);
  return t;
}

/** Drive the clock from a real <video>. Returns cleanup. */
export function bindVideoElementToClock(video: HTMLVideoElement): () => void {
  const push = (paused?: boolean) =>
    clockSync({
      time: video.currentTime,
      duration: video.duration,
      paused: paused ?? video.paused,
      rate: video.playbackRate,
      source: "video",
    });
  const onTime = () =>
    clockSoftSync(video.currentTime, { paused: video.paused, duration: video.duration, source: "video" }, 0.25);
  const handlers: Array<[string, EventListener]> = [
    ["timeupdate", onTime],
    ["playing", () => push(false)],
    ["play", () => push(false)],
    ["pause", () => push(true)],
    ["waiting", () => push(true)],
    ["ended", () => push(true)],
    ["seeking", () => push()],
    ["seeked", () => push()],
    ["ratechange", () => push()],
    ["loadedmetadata", () => push()],
    ["durationchange", () => push()],
  ];
  handlers.forEach(([n, f]) => video.addEventListener(n, f));
  push();
  return () => handlers.forEach(([n, f]) => video.removeEventListener(n, f));
}
