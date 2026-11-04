import {
  clockGetState,
  clockNow,
  clockPause,
  clockPlay,
  clockReportedNow,
  clockSeek,
  clockSync,
} from "./playbackClock";
import type { BridgeKind } from "./iframeBridge";

export interface SyncControllerDeps {
  now: () => number;
  sendSeek: (t: number, id: string) => void;
  sendPlay: () => void;
  sendPause: () => void;
  reloadAt?: (t: number) => void;
  onSeekUnsupported?: () => void;
}

export interface PendingSeek {
  id: string;
  target: number;
  issuedAt: number;
  phase: "command" | "reload";
}

export interface SyncReportEvent {
  kind: BridgeKind;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  ackId?: string;
}

export interface SyncController {
  userSeek: (target: number) => void;
  userTogglePlay: () => void;
  onReport: (ev: SyncReportEvent) => "accept" | "ignore";
  fail: () => void;
  dispose: () => void;
  getState: () => {
    pendingSeek: PendingSeek | null;
    seekInSupported: boolean | "unknown";
  };
}

const COMMAND_TIMEOUT_MS = 2500;
const RELOAD_TIMEOUT_MS = 15000;
const PLAY_TOGGLE_TIMEOUT_MS = 2000;
const SEEK_TOLERANCE_SEC = 3;
const INNER_SEEK_MIN_AGE_MS = 300;

export function createSyncController(deps: SyncControllerDeps): SyncController {
  let pendingSeek: PendingSeek | null = null;
  let seekInSupported: boolean | "unknown" = "unknown";
  let seekTimer: ReturnType<typeof setTimeout> | null = null;
  let playToggleTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingPlayToggle: { targetPaused: boolean; previousPaused: boolean } | null = null;
  let seqCounter = 0;

  const clearSeekTimer = () => {
    if (seekTimer !== null) {
      clearTimeout(seekTimer);
      seekTimer = null;
    }
  };

  const clearPlayToggleTimer = () => {
    if (playToggleTimer !== null) {
      clearTimeout(playToggleTimer);
      playToggleTimer = null;
    }
  };

  const clearPendingSeek = () => {
    clearSeekTimer();
    pendingSeek = null;
  };

  const scheduleSeekCheck = (ms: number) => {
    clearSeekTimer();
    seekTimer = setTimeout(() => {
      seekTimer = null;
      if (pendingSeek) {
        fail();
      }
    }, ms);
  };

  const fail = () => {
    if (!pendingSeek) return;
    const current = pendingSeek;
    if (current.phase === "command" && deps.reloadAt) {
      seekInSupported = false;
      pendingSeek = {
        ...current,
        phase: "reload",
        issuedAt: deps.now(),
      };
      scheduleSeekCheck(RELOAD_TIMEOUT_MS);
      deps.reloadAt(current.target);
      return;
    }
    clearPendingSeek();
    clockSync({ time: clockReportedNow() ?? clockNow() });
    deps.onSeekUnsupported?.();
  };

  const userSeek = (rawTarget: number) => {
    const target = Math.max(0, Number.isFinite(rawTarget) ? rawTarget : 0);
    clockSeek(target);
    seqCounter += 1;
    const id = `nl-seek-${seqCounter}-${Math.floor(deps.now())}`;

    if (seekInSupported === false) {
      if (deps.reloadAt) {
        pendingSeek = {
          id,
          target,
          issuedAt: deps.now(),
          phase: "reload",
        };
        scheduleSeekCheck(RELOAD_TIMEOUT_MS);
        deps.reloadAt(target);
      } else {
        pendingSeek = {
          id,
          target,
          issuedAt: deps.now(),
          phase: "command",
        };
        fail();
      }
      return;
    }

    pendingSeek = {
      id,
      target,
      issuedAt: deps.now(),
      phase: "command",
    };
    deps.sendSeek(target, id);
    scheduleSeekCheck(COMMAND_TIMEOUT_MS);
  };

  const userTogglePlay = () => {
    const st = clockGetState();
    const previousPaused = st.paused;
    const targetPaused = !previousPaused;
    clearPlayToggleTimer();
    pendingPlayToggle = { targetPaused, previousPaused };

    if (targetPaused) {
      clockPause();
      deps.sendPause();
    } else {
      clockPlay();
      deps.sendPlay();
    }

    playToggleTimer = setTimeout(() => {
      playToggleTimer = null;
      if (pendingPlayToggle) {
        const revertTo = pendingPlayToggle.previousPaused;
        pendingPlayToggle = null;
        clockSync({ paused: revertTo });
      }
    }, PLAY_TOGGLE_TIMEOUT_MS);
  };

  const onReport = (ev: SyncReportEvent): "accept" | "ignore" => {
    // Check if report confirms a pending play/pause toggle
    if (pendingPlayToggle) {
      const reportedPaused =
        ev.paused !== undefined
          ? ev.paused
          : ev.kind === "pause" || ev.kind === "ended"
            ? true
            : ev.kind === "play"
              ? false
              : undefined;
      if (reportedPaused === pendingPlayToggle.targetPaused) {
        clearPlayToggleTimer();
        pendingPlayToggle = null;
      }
    }

    if (ev.ackId && pendingSeek && ev.ackId === pendingSeek.id) {
      seekInSupported = true;
      clearPendingSeek();
      return "accept";
    }

    if (!pendingSeek) {
      return "accept";
    }

    const age = deps.now() - pendingSeek.issuedAt;
    const hasTime = typeof ev.currentTime === "number" && Number.isFinite(ev.currentTime);

    if (hasTime && Math.abs((ev.currentTime as number) - pendingSeek.target) <= SEEK_TOLERANCE_SEC) {
      if (pendingSeek.phase === "command") {
        seekInSupported = true;
      }
      clearPendingSeek();
      return "accept";
    }

    if (
      ev.kind === "seeked" &&
      hasTime &&
      Math.abs((ev.currentTime as number) - pendingSeek.target) > SEEK_TOLERANCE_SEC &&
      age > INNER_SEEK_MIN_AGE_MS
    ) {
      // User seeked INSIDE the embedded player: inner seek wins
      clearPendingSeek();
      return "accept";
    }

    const windowMs = pendingSeek.phase === "command" ? COMMAND_TIMEOUT_MS : RELOAD_TIMEOUT_MS;
    if (age < windowMs) {
      return "ignore";
    }

    fail();
    return "accept";
  };

  const dispose = () => {
    clearSeekTimer();
    clearPlayToggleTimer();
    pendingSeek = null;
    pendingPlayToggle = null;
  };

  return {
    userSeek,
    userTogglePlay,
    onReport,
    fail,
    dispose,
    getState: () => ({
      pendingSeek,
      seekInSupported,
    }),
  };
}
