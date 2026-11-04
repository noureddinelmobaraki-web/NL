import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  isSyncCapableEvent,
  parsePlayerMessage,
  resetNlBridgeSeq,
  useIframePlayerBridge,
} from "../iframeBridge";

describe("iframeBridge", () => {
  beforeEach(() => {
    resetNlBridgeSeq();
  });

  it("NL_READY does not set bridgeTier or count as a sync-capable event", () => {
    const readyEv = parsePlayerMessage({
      __nl: 1,
      type: "NL_READY",
      fid: "frameA",
    });
    expect(readyEv).not.toBeNull();
    expect(readyEv?.kind).toBe("media");
    expect(readyEv?.bridgeTier).toBeUndefined();
    expect(isSyncCapableEvent(readyEv)).toBe(false);

    // Also verify via useIframePlayerBridge hook that NL_READY leaves tier unchanged (null)
    const fakeWin = {} as Window;
    const iframeRef = {
      current: { contentWindow: fakeWin } as unknown as HTMLIFrameElement,
    };

    const { result } = renderHook(() =>
      useIframePlayerBridge({
        iframeRef,
        allowedOrigins: ["https://broad-block-7bd7.nordinegb2018.workers.dev"],
        enabled: true,
      }),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://broad-block-7bd7.nordinegb2018.workers.dev",
          source: fakeWin,
          data: { __nl: 1, type: "NL_READY", fid: "frameA" },
        }),
      );
    });

    expect(result.current.tier).toBeNull();
    expect(result.current.active).toBe(false);

    // When an NL_STATE with finite t arrives, tier becomes "worker"
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://broad-block-7bd7.nordinegb2018.workers.dev",
          source: fakeWin,
          data: {
            __nl: 1,
            type: "NL_STATE",
            ev: "timeupdate",
            t: 14.5,
            d: 3600,
            paused: false,
            seq: 1,
            fid: "frameA",
          },
        }),
      );
    });

    expect(result.current.tier).toBe("worker");
    expect(result.current.active).toBe(true);
  });

  it("accepts NL_STATE from 2 different fids with independent seq counters", () => {
    const evA1 = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 10,
      d: 1200,
      seq: 5,
      fid: "fid-outer",
    });
    const evB1 = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 22,
      d: 1200,
      seq: 1,
      fid: "fid-inner",
    });

    expect(evA1).not.toBeNull();
    expect(evA1?.currentTime).toBe(10);
    expect(evA1?.fid).toBe("fid-outer");
    expect(isSyncCapableEvent(evA1)).toBe(true);

    // Even though seq=1 < 5, it is from a different fid ("fid-inner") so it is accepted
    expect(evB1).not.toBeNull();
    expect(evB1?.currentTime).toBe(22);
    expect(evB1?.fid).toBe("fid-inner");
    expect(isSyncCapableEvent(evB1)).toBe(true);
  });

  it("drops duplicate or older seq from the same fid, and NL_READY resets only its own fid", () => {
    const first = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 30,
      seq: 3,
      fid: "fid-1",
    });
    expect(first).not.toBeNull();

    // Duplicate seq=3 for fid-1 is dropped
    const dup = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 31,
      seq: 3,
      fid: "fid-1",
    });
    expect(dup).toBeNull();

    // Older seq=2 for fid-1 is dropped
    const older = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 32,
      seq: 2,
      fid: "fid-1",
    });
    expect(older).toBeNull();

    // NL_READY for fid-2 does not reset fid-1
    parsePlayerMessage({ __nl: 1, type: "NL_READY", fid: "fid-2" });
    expect(
      parsePlayerMessage({
        __nl: 1,
        type: "NL_STATE",
        ev: "timeupdate",
        t: 33,
        seq: 3,
        fid: "fid-1",
      }),
    ).toBeNull();

    // NL_READY for fid-1 resets fid-1 so seq=1 is accepted again
    parsePlayerMessage({ __nl: 1, type: "NL_READY", fid: "fid-1" });
    const afterReset = parsePlayerMessage({
      __nl: 1,
      type: "NL_STATE",
      ev: "timeupdate",
      t: 35,
      seq: 1,
      fid: "fid-1",
    });
    expect(afterReset).not.toBeNull();
    expect(afterReset?.currentTime).toBe(35);
  });

  it("parses VidLink PLAYER_EVENT with currentTime and duration", () => {
    const ev = parsePlayerMessage({
      type: "PLAYER_EVENT",
      data: {
        event: "timeupdate",
        currentTime: 125.4,
        duration: 5400,
      },
    });
    expect(ev).not.toBeNull();
    expect(ev?.kind).toBe("timeupdate");
    expect(ev?.currentTime).toBe(125.4);
    expect(ev?.duration).toBe(5400);
    expect(ev?.bridgeTier).toBe("native");
    expect(isSyncCapableEvent(ev)).toBe(true);
  });

  it("isOriginAllowed matches exact origins and wildcard subdomains", async () => {
    const { isOriginAllowed } = await import("../iframeBridge");
    const allowed = ["https://vidlink.pro", "https://*.vidlink.pro", "https://streamimdb.ru"];
    expect(isOriginAllowed("https://vidlink.pro", allowed)).toBe(true);
    expect(isOriginAllowed("https://player.vidlink.pro", allowed)).toBe(true);
    expect(isOriginAllowed("https://cloud.vidlink.pro", allowed)).toBe(true);
    expect(isOriginAllowed("https://streamimdb.ru", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.com", allowed)).toBe(false);
  });

  it("isFromFrame accepts messages from allowlisted origins with valid player payloads under Site Isolation", async () => {
    const { isFromFrame, parsePlayerMessage } = await import("../iframeBridge");
    const allowed = ["https://vidlink.pro", "https://player.vidlink.pro"];
    const fakeSubFrameWindow = {} as Window; // Not equal to root, cross-origin traversal impossible
    const rootWindow = {} as Window;

    const payload = {
      type: "PLAYER_EVENT",
      data: { event: "timeupdate", currentTime: 45, duration: 120 },
    };
    const parsed = parsePlayerMessage(payload);

    const accepted = isFromFrame(
      fakeSubFrameWindow,
      rootWindow,
      "https://player.vidlink.pro",
      allowed,
      parsed,
    );
    expect(accepted).toBe(true);

    const rejectedBadOrigin = isFromFrame(
      fakeSubFrameWindow,
      rootWindow,
      "https://attacker.com",
      allowed,
      parsed,
    );
    expect(rejectedBadOrigin).toBe(false);
  });
});
