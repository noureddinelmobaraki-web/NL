import { useEffect, useRef, useState, type RefObject } from "react";
import { clockSoftSync, clockSync } from "./playbackClock";

export type BridgeKind = "timeupdate" | "play" | "pause" | "seeked" | "ended" | "media";
export interface BridgeEvent {
  kind: BridgeKind;
  currentTime?: number;
  duration?: number;
  payload?: unknown;
}

export type IframePlayerCommand =
  | { type: "seek"; time: number }
  | { type: "play" }
  | { type: "pause" };

let lastExternalSeekAt = 0;
let lastExternalSeekTarget: number | null = null;

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

const KIND_MAP: Record<string, BridgeKind> = {
  timeupdate: "timeupdate", time: "timeupdate", progress: "timeupdate",
  play: "play", playing: "play", pause: "pause", paused: "pause",
  seeked: "seeked", seeking: "seeked", seek: "seeked", ended: "ended", complete: "ended",
};

function extractMediaDataProgress(data: any): { currentTime?: number; duration?: number } {
  if (!data || typeof data !== "object") return {};
  const direct = data.progress && typeof data.progress === "object" ? data.progress : data;
  const ct = num(direct.watched ?? direct.currentTime ?? direct.time ?? direct.position);
  const dur = num(direct.duration ?? data.duration);
  if (ct !== undefined) return { currentTime: ct, duration: dur };
  for (const val of Object.values(data)) {
    if (val && typeof val === "object") {
      const p = (val as any).progress ?? val;
      const w = num(p?.watched ?? p?.currentTime ?? p?.time);
      const d = num(p?.duration);
      if (w !== undefined) return { currentTime: w, duration: d };
    }
  }
  return {};
}

export function parsePlayerMessage(raw: unknown): BridgeEvent | null {
  let d: any = raw;
  if (typeof d === "string") {
    if (!d.trim().startsWith("{")) return null;
    try { d = JSON.parse(d); } catch { return null; }
  }
  if (!d || typeof d !== "object") return null;

  // VidLink (documented): { type: "PLAYER_EVENT", data: { event, currentTime, duration, ... } }
  if (d.type === "PLAYER_EVENT" && d.data && typeof d.data === "object") {
    return {
      kind: KIND_MAP[String(d.data.event || "").toLowerCase()] ?? "timeupdate",
      currentTime: num(d.data.currentTime),
      duration: num(d.data.duration),
      payload: d.data,
    };
  }
  if (d.type === "MEDIA_DATA") {
    const prog = extractMediaDataProgress(d.data);
    return {
      kind: "media",
      currentTime: prog.currentTime,
      duration: prog.duration,
      payload: d.data,
    };
  }

  // Generic best-effort shapes (PlayerJS, JW, Video.js, HTML5 wrappers — still origin-gated by caller).
  const inner =
    d.data && typeof d.data === "object"
      ? d.data
      : d.info && typeof d.info === "object"
        ? d.info
        : d;
  const t = num(inner.currentTime ?? inner.time ?? inner.position ?? inner.watched);
  const evRaw = String(inner.event ?? d.event ?? d.api ?? "timeupdate").toLowerCase();
  const mappedKind = KIND_MAP[evRaw];
  if (t === undefined && !mappedKind) return null;
  return {
    kind: mappedKind ?? "timeupdate",
    currentTime: t,
    duration: num(inner.duration ?? d.duration),
  };
}

/** Send play / pause / seek commands to an embedded player iframe across common protocols. */
export function sendIframePlayerCommand(
  iframe: HTMLIFrameElement | null | undefined,
  cmd: IframePlayerCommand,
): void {
  const win = iframe?.contentWindow;
  if (!win) return;
  if (cmd.type === "seek") {
    lastExternalSeekAt = performance.now();
    lastExternalSeekTarget = cmd.time;
  }
  const payloads: unknown[] =
    cmd.type === "seek"
      ? [
          { type: "PLAYER_COMMAND", command: "seek", currentTime: cmd.time, time: cmd.time },
          { api: "seek", set: cmd.time },
          JSON.stringify({ api: "seek", set: cmd.time }),
          { event: "command", func: "seekTo", args: [cmd.time, true] },
          JSON.stringify({ event: "command", func: "seekTo", args: [cmd.time, true] }),
          { action: "seek", time: cmd.time, value: cmd.time },
        ]
      : [
          { type: "PLAYER_COMMAND", command: cmd.type },
          { api: cmd.type },
          JSON.stringify({ api: cmd.type }),
          {
            event: "command",
            func: cmd.type === "play" ? "playVideo" : "pauseVideo",
            args: [],
          },
          JSON.stringify({
            event: "command",
            func: cmd.type === "play" ? "playVideo" : "pauseVideo",
            args: [],
          }),
          { action: cmd.type },
        ];

  for (const msg of payloads) {
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
  }
}

/** True if `source` is the iframe window or one of its direct child frames. */
function isFromFrame(source: MessageEventSource | null, root: Window | null | undefined): boolean {
  if (!source || !root) return false;
  if (source === root) return true;
  try {
    for (let i = 0; i < root.frames.length; i += 1) {
      if (root.frames[i] === source) return true;
    }
  } catch { /* cross-origin frames access can throw in some browsers */ }
  return false;
}

export function useIframePlayerBridge(opts: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigins: string[];
  enabled: boolean;
  onMediaData?: (payload: unknown) => void;
}): boolean {
  const [active, setActive] = useState(false);
  const onMediaRef = useRef(opts.onMediaData);
  onMediaRef.current = opts.onMediaData;
  const originsKey = opts.allowedOrigins.join("|");
  const { iframeRef, enabled } = opts;

  useEffect(() => {
    setActive(false);
    if (!enabled) return undefined;
    const allowed = new Set(originsKey.split("|").filter(Boolean));

    const onMessage = (e: MessageEvent) => {
      if (!allowed.has(e.origin)) return;
      if (!isFromFrame(e.source, iframeRef.current?.contentWindow)) return;
      const ev = parsePlayerMessage(e.data);
      if (!ev) return;
      if (ev.kind === "media") {
        if (ev.currentTime !== undefined) {
          setActive(true);
          clockSoftSync(ev.currentTime, { duration: ev.duration, source: "bridge" });
        }
        onMediaRef.current?.(ev.payload);
        return;
      }
      if (ev.currentTime === undefined) {
        if (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended") {
          setActive(true);
          clockSync({ paused: ev.kind !== "play", source: "bridge" });
        }
        return;
      }
      setActive(true);
      // Avoid snapping back to old iframe time right after user scrubbed the external seekbar
      if (
        ev.kind === "timeupdate" &&
        lastExternalSeekTarget !== null &&
        performance.now() - lastExternalSeekAt < 1400 &&
        Math.abs(ev.currentTime - lastExternalSeekTarget) > 4
      ) {
        return;
      }
      if (ev.kind === "timeupdate") {
        clockSoftSync(ev.currentTime, { paused: false, duration: ev.duration, source: "bridge" });
      } else {
        clockSync({
          time: ev.currentTime,
          duration: ev.duration,
          paused: ev.kind === "pause" || ev.kind === "ended" ? true : ev.kind === "play" ? false : undefined,
          source: "bridge",
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, originsKey, iframeRef]);

  return active;
}
