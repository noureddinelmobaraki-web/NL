import { useEffect, useRef, useState, type RefObject } from "react";

export type BridgeKind = "timeupdate" | "play" | "pause" | "seeked" | "ended" | "media";
export type BridgeTier = "worker" | "native";

export interface BridgeEvent {
  kind: BridgeKind;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  rate?: number;
  ackId?: string;
  fid?: string;
  bridgeTier?: BridgeTier;
  payload?: unknown;
}

export type IframePlayerCommand =
  | { type: "seek"; time: number }
  | { type: "play" }
  | { type: "pause" };

const lastSeqByFid = new Map<string, number>();

export function resetNlBridgeSeq(): void {
  lastSeqByFid.clear();
}

export function isSyncCapableEvent(ev: BridgeEvent | null | undefined): boolean {
  return Boolean(ev && typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime));
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

const KIND_MAP: Record<string, BridgeKind> = {
  timeupdate: "timeupdate", time: "timeupdate", progress: "timeupdate",
  play: "play", playing: "play", pause: "pause", paused: "pause",
  seeked: "seeked", seeking: "seeked", seek: "seeked", ended: "ended", complete: "ended",
  loadedmetadata: "timeupdate", durationchange: "timeupdate", ratechange: "timeupdate",
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

  // 1. Versioned NL Worker bridge protocol (__nl: 1)
  if (d.__nl === 1 && typeof d.type === "string") {
    const fidKey = typeof d.fid === "string" && d.fid ? d.fid : "_";
    if (d.type === "NL_READY") {
      lastSeqByFid.delete(fidKey);
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
      };
    }
    if (d.type === "NL_ACK") {
      const ct = num(d.t);
      return {
        kind: "seeked",
        currentTime: ct,
        duration: num(d.d),
        paused: typeof d.paused === "boolean" ? d.paused : undefined,
        rate: num(d.rate),
        ackId: typeof d.id === "string" ? d.id : undefined,
        fid: typeof d.fid === "string" ? d.fid : undefined,
        bridgeTier: ct !== undefined ? "worker" : undefined,
      };
    }
    if (d.type === "NL_STATE") {
      const seq = num(d.seq);
      if (seq !== undefined) {
        const prevSeq = lastSeqByFid.get(fidKey);
        if (prevSeq !== undefined && seq <= prevSeq) return null;
        lastSeqByFid.set(fidKey, seq);
      }
      const evKey = String(d.ev || "timeupdate").toLowerCase();
      const ct = num(d.t);
      return {
        kind: KIND_MAP[evKey] ?? "timeupdate",
        currentTime: ct,
        duration: num(d.d),
        paused: typeof d.paused === "boolean" ? d.paused : undefined,
        rate: num(d.rate),
        fid: typeof d.fid === "string" ? d.fid : undefined,
        bridgeTier: ct !== undefined ? "worker" : undefined,
      };
    }
  }

  // VidLink (documented): { type: "PLAYER_EVENT", data: { event, currentTime, duration, ... } }
  if (d.type === "PLAYER_EVENT" && d.data && typeof d.data === "object") {
    const kind = KIND_MAP[String(d.data.event || "").toLowerCase()] ?? "timeupdate";
    const ct = num(d.data.currentTime);
    return {
      kind,
      currentTime: ct,
      duration: num(d.data.duration),
      paused: kind === "pause" || kind === "ended" ? true : kind === "play" ? false : undefined,
      bridgeTier: ct !== undefined ? "native" : undefined,
      payload: d.data,
    };
  }
  if (d.type === "MEDIA_DATA") {
    const prog = extractMediaDataProgress(d.data);
    return {
      kind: "media",
      currentTime: prog.currentTime,
      duration: prog.duration,
      bridgeTier: prog.currentTime !== undefined ? "native" : undefined,
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
  const resolvedKind = mappedKind ?? "timeupdate";
  return {
    kind: resolvedKind,
    currentTime: t,
    duration: num(inner.duration ?? d.duration),
    paused:
      typeof inner.paused === "boolean"
        ? inner.paused
        : resolvedKind === "pause" || resolvedKind === "ended"
          ? true
          : resolvedKind === "play"
            ? false
            : undefined,
    bridgeTier: t !== undefined ? "native" : undefined,
  };
}

/** Send play / pause / seek commands to an embedded player iframe across common protocols. */
export function sendIframePlayerCommand(
  iframe: HTMLIFrameElement | null | undefined,
  cmd: IframePlayerCommand,
  id?: string,
): void {
  const win = iframe?.contentWindow;
  if (!win) return;

  const nlCmd =
    cmd.type === "seek"
      ? { __nl: 1, type: "NL_CMD", cmd: "seek", t: cmd.time, id }
      : { __nl: 1, type: "NL_CMD", cmd: cmd.type, id };

  const legacyPayloads: unknown[] =
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

  const payloads: unknown[] = [nlCmd, ...legacyPayloads];

  for (const msg of payloads) {
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
  }
}

/** True if `source` is the iframe window or one of its descendant frames up to depth 4 (BFS). */
function isFromFrame(source: MessageEventSource | null, root: Window | null | undefined): boolean {
  if (!source || !root) return false;
  if (source === root) return true;
  const queue: Array<{ win: Window; depth: number }> = [{ win: root, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= 4) continue;
    let len = 0;
    try {
      len = current.win.frames.length;
    } catch {
      /* cross-origin frames access can throw in some browsers */
      continue;
    }
    for (let i = 0; i < len; i += 1) {
      try {
        const child: Window | null | undefined = current.win.frames[i];
        if (!child) continue;
        if (child === source) return true;
        queue.push({ win: child, depth: current.depth + 1 });
      } catch {
        /* ignore frame access error */
      }
    }
  }
  return false;
}

function logBridgeDebug(
  origin: string,
  accepted: boolean,
  reason: "origin" | "source" | "parse" | null,
  data: unknown,
): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("nl_debug_bridge") === "1") {
      // eslint-disable-next-line no-console
      console.debug("[NLBridge]", origin, accepted ? "ACCEPT" : "REJECT:" + reason, data);
    }
  } catch {
    // ignore storage access errors
  }
}

export function useIframePlayerBridge(opts: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigins: string[];
  enabled: boolean;
  onEvent?: (ev: BridgeEvent) => void;
  onMediaData?: (payload: unknown) => void;
}): { active: boolean; tier: BridgeTier | null } {
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<BridgeTier | null>(null);
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;
  const onMediaRef = useRef(opts.onMediaData);
  onMediaRef.current = opts.onMediaData;
  const originsKey = opts.allowedOrigins.join("|");
  const { iframeRef, enabled } = opts;

  useEffect(() => {
    setActive(false);
    setTier(null);
    resetNlBridgeSeq();
    if (!enabled) return undefined;
    const allowed = new Set(originsKey.split("|").filter(Boolean));

    const onMessage = (e: MessageEvent) => {
      if (!allowed.has(e.origin)) {
        logBridgeDebug(e.origin, false, "origin", e.data);
        return;
      }
      if (!isFromFrame(e.source, iframeRef.current?.contentWindow)) {
        logBridgeDebug(e.origin, false, "source", e.data);
        return;
      }
      const ev = parsePlayerMessage(e.data);
      if (!ev) {
        logBridgeDebug(e.origin, false, "parse", e.data);
        return;
      }
      logBridgeDebug(e.origin, true, null, e.data);

      if (isSyncCapableEvent(ev)) {
        if (ev.bridgeTier === "worker") {
          setTier("worker");
        } else if (ev.bridgeTier === "native") {
          setTier((prev) => prev ?? "native");
        }
      }

      if (ev.kind === "media") {
        if (isSyncCapableEvent(ev)) {
          setActive(true);
          onEventRef.current?.(ev);
        }
        if (ev.payload !== undefined) {
          onMediaRef.current?.(ev.payload);
        }
        return;
      }

      if (isSyncCapableEvent(ev) || ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended" || ev.ackId) {
        setActive(true);
        onEventRef.current?.(ev);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, originsKey, iframeRef]);

  return { active, tier };
}
