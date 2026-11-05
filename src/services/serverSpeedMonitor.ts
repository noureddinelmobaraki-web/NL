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

const SPEED_STORAGE_KEY = "nl_cinema_server_speed_v2";
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
    return { metrics, byTitle };
  } catch {
    const emptyMetrics: Record<string, ServerSpeedMetric> = {};
    const emptyByTitle: Record<string, string> = {};
    return { metrics: emptyMetrics, byTitle: emptyByTitle };
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
 * Faster servers receive lower score values and are automatically promoted within their tier.
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
 * Sorts an array of play sources using a strict Tiered Hierarchy:
 * - Bucket 0 (Tier 2 Sync-Capable): Sources with `capabilities.timeEvents === true` or
 *   `capabilities.workerBridge === true` (or `server-vl` when bare mock objects without `capabilities`
 *   are passed in unit tests), ordered among themselves by EWMA speed and reliability.
 * - Bucket 1 (Tier 3 Silent): Fallback embeds without sync capabilities, ordered by EWMA speed.
 */
export function sortSourcesBySpeed<
  T extends { id: string; capabilities?: { timeEvents?: boolean; workerBridge?: boolean } },
>(sources: T[], titleKey?: string): T[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources;
  const state = readStorage();
  const preferredForTitle = titleKey ? state.byTitle[titleKey] : undefined;
  const hasTmdb = Boolean(
    titleKey && (titleKey.startsWith("movie_") || titleKey.startsWith("tv_")),
  );
  const anyExplicitCaps = sources.some((s) => s.capabilities !== undefined);

  return [...sources]
    .map((src, originalIdx) => {
      let score = getServerPriorityScore(src.id, originalIdx, state);
      const metric = state.metrics[src.id];
      const hasFailed = Boolean(
        metric && metric.failureCount > metric.successCount,
      );

      const isTimeEvents =
        src.capabilities?.timeEvents === true ||
        src.capabilities?.workerBridge === true ||
        (!anyExplicitCaps && hasTmdb && src.id === "server-vl");

      const bucket = isTimeEvents && !hasFailed ? 0 : 1;

      if (isTimeEvents && !hasFailed) {
        score -= 5000;
      }

      if (
        preferredForTitle &&
        src.id === preferredForTitle &&
        !hasFailed
      ) {
        score -= 750;
      }
      return { src, originalIdx, bucket, score };
    })
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      if (a.score !== b.score) return a.score - b.score;
      return a.originalIdx - b.originalIdx;
    })
    .map((entry) => entry.src);
}

/**
 * Returns the ordered indices `[0..sources.length-1]` sorted by tier and speed.
 */
export function buildSpeedSortedQueue<
  T extends { id: string; capabilities?: { timeEvents?: boolean; workerBridge?: boolean } },
>(sources: T[], titleKey?: string): number[] {
  if (!Array.isArray(sources) || sources.length === 0) return [0];
  const sorted = sortSourcesBySpeed(sources, titleKey);
  return sorted
    .map((s) => sources.findIndex((orig) => orig.id === s.id))
    .filter((idx) => idx >= 0);
}
