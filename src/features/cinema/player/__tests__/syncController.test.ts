import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clockGetState,
  clockNow,
  clockReport,
  clockReset,
} from "../playbackClock";
import { createSyncController } from "../syncController";

describe("syncController", () => {
  let fakeNow = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeNow = 1000;
    clockReset("manual");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("T1: userSeek(500) ignores stale timeupdate(25) at +400ms and confirms on NL_ACK", () => {
    const sendSeek = vi.fn();
    const sendPlay = vi.fn();
    const sendPause = vi.fn();

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek,
      sendPlay,
      sendPause,
    });

    ctrl.userSeek(500);
    expect(clockNow()).toBe(500);
    expect(sendSeek).toHaveBeenCalledTimes(1);
    const seekId = sendSeek.mock.calls[0][1] as string;
    expect(seekId).toBeTruthy();

    // +400ms: stale timeupdate(25) from iframe
    fakeNow += 400;
    const decision1 = ctrl.onReport({ kind: "timeupdate", currentTime: 25 });
    expect(decision1).toBe("ignore");
    expect(clockNow()).toBe(500);

    // NL_ACK arrives with matching id
    fakeNow += 100;
    const decision2 = ctrl.onReport({
      kind: "seeked",
      currentTime: 500,
      ackId: seekId,
    });
    expect(decision2).toBe("accept");
    expect(ctrl.getState().seekInSupported).toBe(true);
    expect(ctrl.getState().pendingSeek).toBeNull();

    ctrl.dispose();
  });

  it("T2: userSeek(500) with no ack within 2500ms falls back to reloadAt(500) and subsequent seeks go straight to reloadAt", () => {
    const sendSeek = vi.fn();
    const reloadAt = vi.fn();

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek,
      sendPlay: vi.fn(),
      sendPause: vi.fn(),
      reloadAt,
    });

    ctrl.userSeek(500);
    expect(sendSeek).toHaveBeenCalledTimes(1);
    expect(reloadAt).not.toHaveBeenCalled();

    // Advance 2500ms -> command phase times out and triggers reloadAt(500)
    fakeNow += 2500;
    vi.advanceTimersByTime(2500);

    expect(reloadAt).toHaveBeenCalledTimes(1);
    expect(reloadAt).toHaveBeenCalledWith(500);
    expect(ctrl.getState().seekInSupported).toBe(false);
    expect(ctrl.getState().pendingSeek?.phase).toBe("reload");

    // Player reloads and reports ~500s
    fakeNow += 1200;
    expect(ctrl.onReport({ kind: "timeupdate", currentTime: 501 })).toBe("accept");
    expect(ctrl.getState().pendingSeek).toBeNull();

    // Next userSeek skips sendSeek and invokes reloadAt directly
    ctrl.userSeek(900);
    expect(sendSeek).toHaveBeenCalledTimes(1);
    expect(reloadAt).toHaveBeenCalledTimes(2);
    expect(reloadAt).toHaveBeenLastCalledWith(900);

    ctrl.dispose();
  });

  it("T3: userSeek(500) with no reloadAt reverts clock to clockReportedNow() and calls onSeekUnsupported after 2500ms", () => {
    const sendSeek = vi.fn();
    const onSeekUnsupported = vi.fn();

    // Seed last authoritative report at 42s (paused)
    clockReport(42, { paused: true, duration: 3600, source: "bridge" });
    expect(clockNow()).toBe(42);

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek,
      sendPlay: vi.fn(),
      sendPause: vi.fn(),
      onSeekUnsupported,
    });

    ctrl.userSeek(500);
    expect(clockNow()).toBe(500);

    fakeNow += 2500;
    vi.advanceTimersByTime(2500);

    expect(onSeekUnsupported).toHaveBeenCalledTimes(1);
    expect(clockNow()).toBe(42);
    expect(ctrl.getState().pendingSeek).toBeNull();

    ctrl.dispose();
  });

  it("T4: userSeek(500) followed by inner player seeked event (900s at +500ms) accepts inner seek and clears pending", () => {
    const sendSeek = vi.fn();

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek,
      sendPlay: vi.fn(),
      sendPause: vi.fn(),
    });

    ctrl.userSeek(500);
    expect(ctrl.getState().pendingSeek).not.toBeNull();

    // User scrubs inside the embedded player to 900s at +500ms (> 300ms)
    fakeNow += 500;
    const res = ctrl.onReport({ kind: "seeked", currentTime: 900 });
    expect(res).toBe("accept");
    expect(ctrl.getState().pendingSeek).toBeNull();

    ctrl.dispose();
  });

  it("T5: inbound reports never invoke sendSeek, sendPlay, or sendPause (no feedback loops)", () => {
    const sendSeek = vi.fn();
    const sendPlay = vi.fn();
    const sendPause = vi.fn();

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek,
      sendPlay,
      sendPause,
    });

    for (const t of [10, 20, 35, 120, 480]) {
      fakeNow += 250;
      expect(ctrl.onReport({ kind: "timeupdate", currentTime: t, duration: 7200 })).toBe("accept");
    }
    expect(ctrl.onReport({ kind: "pause", currentTime: 480, paused: true })).toBe("accept");
    expect(ctrl.onReport({ kind: "play", currentTime: 480, paused: false })).toBe("accept");
    expect(ctrl.onReport({ kind: "seeked", currentTime: 1200 })).toBe("accept");

    expect(sendSeek).not.toHaveBeenCalled();
    expect(sendPlay).not.toHaveBeenCalled();
    expect(sendPause).not.toHaveBeenCalled();

    ctrl.dispose();
  });

  it("T6: userTogglePlay optimistically flips paused state and reverts after 2000ms if unconfirmed", () => {
    const sendPlay = vi.fn();
    const sendPause = vi.fn();

    clockReport(30, { paused: true, duration: 3600, source: "bridge" });
    expect(clockGetState().paused).toBe(true);

    const ctrl = createSyncController({
      now: () => fakeNow,
      sendSeek: vi.fn(),
      sendPlay,
      sendPause,
    });

    ctrl.userTogglePlay();
    expect(sendPlay).toHaveBeenCalledTimes(1);
    expect(clockGetState().paused).toBe(false);

    // No confirmation within 2000ms -> reverts to paused: true
    fakeNow += 2000;
    vi.advanceTimersByTime(2000);
    expect(clockGetState().paused).toBe(true);

    ctrl.dispose();
  });
});
