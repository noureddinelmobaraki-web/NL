/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  resetNlBridgeSeq,
  isSyncCapableEvent,
  parsePlayerMessage,
  type BridgeEvent,
  type BridgeTier,
  type BridgeDiscoveredSubtitle,
  type BridgeDiscoveredStream,
} from "./messageProtocol";
import { isOriginAllowed, isFromFrame } from "./originAllowlist";

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
