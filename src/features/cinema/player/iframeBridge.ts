import { useEffect, useRef, useState, type RefObject } from "react";

export type BridgeKind = "timeupdate" | "play" | "pause" | "seeked" | "ended" | "media";
export type BridgeTier = "worker" | "native";

export interface BridgeDiscoveredSubtitle {
  url: string;
  label?: string;
  lang?: string;
  referer?: string;
}

export interface BridgeDiscoveredStream {
  streamUrl: string;
  streamType?: "hls" | "mp4";
  referer?: string;
}

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
  discoveredSubtitles?: BridgeDiscoveredSubtitle[];
  discoveredStream?: BridgeDiscoveredStream;
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
    if (d.type === "NL_SUBS" && Array.isArray(d.tracks)) {
      const referer = typeof d.referer === "string" ? d.referer : undefined;
      const discoveredSubtitles: BridgeDiscoveredSubtitle[] = d.tracks
        .filter((t: any) => t && typeof t.url === "string" && t.url.trim())
        .map((t: any) => ({
          url: String(t.url).trim(),
          label: typeof t.label === "string" ? t.label : undefined,
          lang: typeof t.lang === "string" ? t.lang : undefined,
          referer,
        }));
      if (discoveredSubtitles.length === 0) return null;
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
        discoveredSubtitles,
      };
    }
    if (d.type === "NL_STREAM" && typeof d.streamUrl === "string" && d.streamUrl.trim()) {
      return {
        kind: "media",
        fid: typeof d.fid === "string" ? d.fid : undefined,
        discoveredStream: {
          streamUrl: d.streamUrl.trim(),
          streamType: d.streamType === "mp4" ? "mp4" : "hls",
          referer: typeof d.referer === "string" ? d.referer : undefined,
        },
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
  if (d.type === "PLAYER_EVENT") {
    const payloadObj = d.data && typeof d.data === "object" ? d.data : d;
    const kind = KIND_MAP[String(payloadObj.event || "").toLowerCase()] ?? "timeupdate";
    const ct = num(payloadObj.currentTime ?? payloadObj.time ?? payloadObj.watched);
    const dur = num(payloadObj.duration ?? d.duration);
    const paused =
      typeof payloadObj.paused === "boolean"
        ? payloadObj.paused
        : kind === "pause" || kind === "ended"
          ? true
          : kind === "play" || kind === "timeupdate"
            ? false
            : undefined;
    return {
      kind,
      currentTime: ct,
      duration: dur,
      paused,
      bridgeTier: ct !== undefined ? "native" : undefined,
      payload: payloadObj,
    };
  }
  if (d.type === "MEDIA_DATA") {
    const prog = extractMediaDataProgress(d.data);
    return {
      kind: "media",
      currentTime: prog.currentTime,
      duration: prog.duration,
      paused: prog.currentTime !== undefined ? false : undefined,
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
          { method: "setCurrentTime", value: cmd.time },
          JSON.stringify({ method: "setCurrentTime", value: cmd.time }),
          { event: "command", func: "seekTo", args: [cmd.time, true] },
          JSON.stringify({ event: "command", func: "seekTo", args: [cmd.time, true] }),
          { action: "seek", time: cmd.time, value: cmd.time },
          { command: "seek", time: cmd.time },
        ]
      : [
          { type: "PLAYER_COMMAND", command: cmd.type },
          { type: cmd.type },
          { command: cmd.type },
          { api: cmd.type },
          JSON.stringify({ api: cmd.type }),
          { method: cmd.type },
          JSON.stringify({ method: cmd.type }),
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
          JSON.stringify({ action: cmd.type }),
          cmd.type,
        ];

  const payloads: unknown[] = [nlCmd, JSON.stringify(nlCmd), ...legacyPayloads];

  for (const msg of payloads) {
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
  }
}

/** Checks whether origin matches exactly or matches wildcard / subdomain patterns (e.g. *.vidlink.pro). */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || !Array.isArray(allowedOrigins)) return false;
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    for (const allowed of allowedOrigins) {
      if (!allowed) continue;
      if (allowed === origin) return true;
      try {
        const allowedHost = new URL(allowed.replace('*.', '')).hostname.toLowerCase();
        if (originHost === allowedHost || originHost.endsWith('.' + allowedHost)) {
          return true;
        }
      } catch {
        if (allowed.includes('vidlink.') && /(^|\.)vidlink\.[a-z]+$/i.test(originHost)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Checks whether source originates from the active player frame.
 */
export function isFromFrame(
  source: MessageEventSource | null,
  root: Window | null | undefined,
  origin?: string,
  allowedOrigins?: string[],
  parsedEvent?: unknown,
): boolean {
  if (!source) return false;
  if (root && source === root) return true;

  try {
    const anySource = source as any;
    if (anySource.parent === window || anySource.top === window) {
      return true;
    }
  } catch {
    // Cross-origin access restriction in Site Isolation
  }

  if (origin && allowedOrigins && isOriginAllowed(origin, allowedOrigins) && parsedEvent) {
    return true;
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
  sessionKey?: string;
  onEvent?: (ev: BridgeEvent) => void;
  onReady?: (fid?: string) => void;
  onMediaData?: (payload: unknown) => void;
  onSubtitlesDiscovered?: (tracks: BridgeDiscoveredSubtitle[]) => void;
  onStreamDiscovered?: (stream: BridgeDiscoveredStream) => void;
}): { active: boolean; tier: BridgeTier | null } {
  const [active, setActive] = useState(false);
  const [tier, setTier] = useState<BridgeTier | null>(null);
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;
  const onReadyRef = useRef(opts.onReady);
  onReadyRef.current = opts.onReady;
  const onMediaRef = useRef(opts.onMediaData);
  onMediaRef.current = opts.onMediaData;
  const onSubsRef = useRef(opts.onSubtitlesDiscovered);
  onSubsRef.current = opts.onSubtitlesDiscovered;
  const onStreamRef = useRef(opts.onStreamDiscovered);
  onStreamRef.current = opts.onStreamDiscovered;
  const originsKey = opts.allowedOrigins.join("|");
  const { iframeRef, enabled, sessionKey } = opts;

  useEffect(() => {
    setActive(false);
    setTier(null);
    resetNlBridgeSeq();
    if (!enabled) return undefined;
    let hasSynced = false;
    const allowed = new Set(originsKey.split("|").filter(Boolean));
    const isAllowedOrigin = (origin: string): boolean => {
      if (!origin) return false;
      if (allowed.has(origin)) return true;
      try {
        return (
          /(^|\.)vidlink\.[a-z]+$/i.test(new URL(origin).hostname) ||
          isOriginAllowed(origin, Array.from(allowed))
        );
      } catch {
        return false;
      }
    };

    const onMessage = (e: MessageEvent) => {
      if (!isAllowedOrigin(e.origin)) {
        logBridgeDebug(e.origin, false, "origin", e.data);
        return;
      }

      let d: any = e.data;
      if (typeof d === "string" && d.trim().startsWith("{")) {
        try {
          d = JSON.parse(d);
        } catch {
          // ignore json parse error
        }
      }

      const isKnownFormat =
        Boolean(d && typeof d === "object") &&
        (d.type === "PLAYER_EVENT" || d.__nl === 1 || d.type === "MEDIA_DATA");

      if (
        !isKnownFormat &&
        !isFromFrame(
          e.source,
          iframeRef.current?.contentWindow,
          e.origin,
          Array.from(allowed),
          d,
        )
      ) {
        logBridgeDebug(e.origin, false, "source", e.data);
        return;
      }

      const ev = parsePlayerMessage(e.data);
      if (!ev) {
        logBridgeDebug(e.origin, false, "parse", e.data);
        return;
      }
      logBridgeDebug(e.origin, true, null, e.data);

      if (d && typeof d === "object" && d.__nl === 1 && d.type === "NL_READY") {
        onReadyRef.current?.(typeof d.fid === "string" ? d.fid : undefined);
      }

      if (ev.discoveredSubtitles && ev.discoveredSubtitles.length > 0) {
        onSubsRef.current?.(ev.discoveredSubtitles);
      }
      if (ev.discoveredStream) {
        onStreamRef.current?.(ev.discoveredStream);
      }

      const syncCapable = isSyncCapableEvent(ev);
      if (syncCapable) {
        hasSynced = true;
        setActive(true);
        if (ev.bridgeTier === "worker") {
          setTier("worker");
        } else if (ev.bridgeTier === "native") {
          setTier((prev) => prev ?? "native");
        }
      }

      if (ev.kind === "media") {
        if (syncCapable) {
          onEventRef.current?.(ev);
        }
        if (ev.payload !== undefined) {
          onMediaRef.current?.(ev.payload);
        }
        return;
      }

      if (syncCapable || (hasSynced && (ev.kind === "play" || ev.kind === "pause" || ev.kind === "ended")) || ev.ackId) {
        if (ev.ackId) {
          hasSynced = true;
          setActive(true);
        }
        onEventRef.current?.(ev);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, originsKey, iframeRef, sessionKey]);

  return { active, tier };
}
