// src/services/serverSpeedMonitor.ts

export interface ServerSpeedMetric {
  serverId: string;
  ewmaLatencyMs: number;
  lastLatencyMs: number;
  successCount: number;
  failureCount: number;
  lastUpdatedAt: number;
}

interface StoredSpeedState {
  metrics: Record<string, ServerSpeedMetric>;
  byTitle: Record<string, string>;
}

const SPEED_STORAGE_KEY = "nl_cinema_server_speed_v1";
const LEGACY_TITLE_SERVER_KEY = "nl_cinema_last_server_v2";
const DEFAULT_BASELINE_MS = 2600;
const FAILURE_PENALTY_MS = 4500;
const EWMA_ALPHA = 0.38;

function readStorage(): StoredSpeedState {
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const metrics =
      parsed && typeof parsed.metrics === "object" && parsed.metrics !== null
        ? { ...parsed.metrics }
        : {};
    const byTitle =
      parsed && typeof parsed.byTitle === "object" && parsed.byTitle !== null
        ? { ...parsed.byTitle }
        : {};

    // Also migrate legacy per-title preference if present
    try {
      const legacyRaw = localStorage.getItem(LEGACY_TITLE_SERVER_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed?.byItem && typeof legacyParsed.byItem === "object") {
          for (const [k, v] of Object.entries(legacyParsed.byItem)) {
            if (typeof v === "string" && !byTitle[k]) {
              byTitle[k] = v;
            }
          }
        }
      }
    } catch {}

    return { metrics, byTitle };
  } catch {
    return { metrics: {}, byTitle: {} };
  }
}

function writeStorage(state: StoredSpeedState): void {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private browsing / quota errors
  }
}

/**
 * Records a successful server playback startup and updates its EWMA latency score in cache.
 * Faster servers receive lower score values and are automatically promoted to the front.
 */
export function recordServerSuccess(
  serverId: string,
  durationMs: number,
  titleKey?: string,
): void {
  if (!serverId) return;
  const clampedMs = Math.max(120, Math.min(25_000, Math.round(durationMs || 1200)));
  const state = readStorage();
  const prev = state.metrics[serverId];

  const ewmaLatencyMs = prev
    ? Math.round(EWMA_ALPHA * clampedMs + (1 - EWMA_ALPHA) * prev.ewmaLatencyMs)
    : clampedMs;

  state.metrics[serverId] = {
    serverId,
    ewmaLatencyMs,
    lastLatencyMs: clampedMs,
    successCount: (prev?.successCount || 0) + 1,
    failureCount: Math.max(0, (prev?.failureCount || 0) - 1),
    lastUpdatedAt: Date.now(),
  };

  if (titleKey) {
    state.byTitle[titleKey] = serverId;
  }

  writeStorage(state);
}

/**
 * Records a server failure or timeout, increasing its effective latency score so faster
 * working servers are prioritized ahead of it on subsequent plays.
 */
export function recordServerFailure(serverId: string): void {
  if (!serverId) return;
  const state = readStorage();
  const prev = state.metrics[serverId];
  const base = prev?.ewmaLatencyMs ?? DEFAULT_BASELINE_MS;
  const penalized = Math.min(30_000, Math.round(base + FAILURE_PENALTY_MS));

  state.metrics[serverId] = {
    serverId,
    ewmaLatencyMs: penalized,
    lastLatencyMs: penalized,
    successCount: prev?.successCount || 0,
    failureCount: (prev?.failureCount || 0) + 1,
    lastUpdatedAt: Date.now(),
  };

  writeStorage(state);
}

/**
 * Computes an effective priority score (lower = faster & more reliable) for a server.
 */
export function getServerPriorityScore(
  serverId: string,
  defaultIndex: number,
  state?: StoredSpeedState,
): number {
  const current = state || readStorage();
  const metric = current.metrics[serverId];
  if (!metric) {
    // Preserve natural configuration order until measured
    return DEFAULT_BASELINE_MS + defaultIndex * 180;
  }
  const reliabilityBonus = Math.min(600, metric.successCount * 85);
  const failurePenalty = metric.failureCount * 1400;
  return metric.ewmaLatencyMs - reliabilityBonus + failurePenalty;
}

/**
 * Sorts an array of play sources so the fastest cached servers for this user appear first.
 * If the user previously had a fast working server for this specific title, it gets a speed boost.
 * Sources with timeEvents capabilities (Tier 2, e.g. VidLink) receive a strong priority bonus
 * so they are ranked before silent embed servers unless failureCount exceeds successCount.
 */
export function sortSourcesBySpeed<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): T[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources;
  const state = readStorage();
  const preferredForTitle = titleKey ? state.byTitle[titleKey] : undefined;
  const hasTmdb = Boolean(
    titleKey && (titleKey.startsWith("movie_") || titleKey.startsWith("tv_")),
  );

  return [...sources]
    .map((src, originalIdx) => {
      let score = getServerPriorityScore(src.id, originalIdx, state);
      const metric = state.metrics[src.id];
      const hasFailed = Boolean(
        metric && metric.failureCount > metric.successCount,
      );

      // Enforce Tier 2 priority: any source with timeEvents MUST be ranked before sources without
      // timeEvents, unless its failureCount exceeds its successCount for this session.
      const isTimeEvents =
        src.capabilities?.timeEvents === true ||
        (hasTmdb && src.id === "server-vl");
      if (isTimeEvents && !hasFailed) {
        score -= 5000;
      }

      // Boost the title's remembered server unless it has recently failed repeatedly
      if (
        preferredForTitle &&
        src.id === preferredForTitle &&
        (!metric || metric.failureCount <= metric.successCount)
      ) {
        score -= 750;
      }
      return { src, originalIdx, score };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.originalIdx - b.originalIdx;
    })
    .map((entry) => entry.src);
}

/**
 * Returns the ordered indices `[0..sources.length-1]` sorted from fastest server to slowest.
 */
export function buildSpeedSortedQueue<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): number[] {
  if (!Array.isArray(sources) || sources.length === 0) return [0];
  const sorted = sortSourcesBySpeed(sources, titleKey);
  return sorted
    .map((s) => sources.findIndex((orig) => orig.id === s.id))
    .filter((idx) => idx >= 0);
}
