/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

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
  | { type: "pause" }
  | { type: "rate"; value: number }
  | { type: "hideNativeSubs" };

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
  timeupdate: "timeupdate", time: "timeupdate", progress: "timeupdate", bind: "timeupdate",
  play: "play", playing: "play", pause: "pause", paused: "pause",
  seeked: "seeked", seeking: "seeked", seek: "seeked", ack: "seeked", ended: "ended", complete: "ended",
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
    if ((d.type === "NL_SUBS" || d.type === "NL_TRACKS") && Array.isArray(d.tracks)) {
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

/** Send play / pause / seek / hideNativeSubs / rate commands to an embedded player iframe across common protocols. */
export function sendIframePlayerCommand(
  iframe: HTMLIFrameElement | null | undefined,
  cmd: IframePlayerCommand,
  id?: string,
): void {
  const win = iframe?.contentWindow;
  if (!win) return;

  if (cmd.type === "hideNativeSubs") {
    const msg = { __nl: 1, type: "NL_CMD", cmd: "hideNativeSubs", id };
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
    return;
  }

  if (cmd.type === "rate") {
    const msg = { __nl: 1, type: "NL_CMD", cmd: "rate", v: cmd.value, id };
    try {
      win.postMessage(msg, "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
    return;
  }

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
