// src/services/serverSpeedMonitor.ts
import { CINEMA_SERVERS } from "../config/servers";

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

export interface ProbeableServerSource {
  id: string;
  url: string;
  origins?: string[];
}

const SPEED_STORAGE_KEY = "nl_cinema_server_speed_v2";
const DEFAULT_BASELINE_MS = 2600;
const FAILURE_PENALTY_MS = 4500;
const EWMA_ALPHA = 0.38;
const PROBE_CACHE_TTL_MS = 50_000;

const probeMemoryCache = new Map<string, { timestamp: number; order: string[] }>();
const inflightProbes = new Map<string, Promise<string[]>>();

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

export function recordServerSuccess(
  serverId: string,
  durationMs: number,
  titleKey?: string,
): void {
  if (!serverId) return;
  const clampedMs = Math.max(40, Math.min(25_000, Math.round(durationMs || 1200)));
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
    const currentBestId = state.byTitle[titleKey];
    const currentBestMetric = currentBestId ? state.metrics[currentBestId] : undefined;
    const currentBestHasFailed = Boolean(
      currentBestMetric && currentBestMetric.failureCount > currentBestMetric.successCount,
    );
    if (
      !currentBestId ||
      currentBestId === serverId ||
      currentBestHasFailed ||
      !currentBestMetric ||
      ewmaLatencyMs <= currentBestMetric.ewmaLatencyMs
    ) {
      state.byTitle[titleKey] = serverId;
    }
  }

  writeStorage(state);
}

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

export function getServerPriorityScore(
  serverId: string,
  defaultIndex: number,
  state?: StoredSpeedState,
): number {
  const current = state || readStorage();
  const metric = current.metrics[serverId];
  if (!metric) {
    return DEFAULT_BASELINE_MS + defaultIndex * 180;
  }
  const reliabilityBonus = Math.min(600, metric.successCount * 85);
  const failurePenalty = metric.failureCount * 1400;
  return metric.ewmaLatencyMs - reliabilityBonus + failurePenalty;
}

export function sortSourcesBySpeed<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): T[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources;
  const state = readStorage();
  const preferredForTitle = titleKey ? state.byTitle[titleKey] : undefined;

  return [...sources]
    .map((src, originalIdx) => {
      let score = getServerPriorityScore(src.id, originalIdx, state);
      const metric = state.metrics[src.id];
      const hasFailed = Boolean(
        metric && metric.failureCount > metric.successCount,
      );
      const hasMeasuredSuccess = Boolean(
        metric && metric.successCount > 0 && !hasFailed,
      );

      // Bucket 0: Responsive / non-failing servers (fastest ping/latency wins index 0)
      // Bucket 1: Servers with more failures than successes (demoted to end)
      const bucket = hasFailed ? 1 : 0;

      // Give servers with verified live speed measurements priority over unprobed baseline defaults
      if (hasMeasuredSuccess) {
        score -= 1000;
      }

      if (
        preferredForTitle &&
        src.id === preferredForTitle &&
        !hasFailed
      ) {
        score -= 350;
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

export function buildSpeedSortedQueue<
  T extends { id: string; capabilities?: { timeEvents?: boolean } },
>(sources: T[], titleKey?: string): number[] {
  if (!Array.isArray(sources) || sources.length === 0) return [0];
  const sorted = sortSourcesBySpeed(sources, titleKey);
  return sorted
    .map((s) => sources.findIndex((orig) => orig.id === s.id))
    .filter((idx) => idx >= 0);
}

/**
 * Live Concurrent Server Ping & Speed Probe
 * Sends concurrent lightweight no-cors GET probes to all 5 cinema servers simultaneously,
 * records real response latency via performance.now(), and returns the speed-sorted server IDs
 * with the fastest responding server at index 0.
 */
export async function probeAllServersSpeed(
  sources?: ProbeableServerSource[],
  titleKey?: string,
  timeoutMs = 2800,
): Promise<string[]> {
  const effectiveSources: ProbeableServerSource[] =
    Array.isArray(sources) && sources.length > 0
      ? sources
      : CINEMA_SERVERS.map((srv) => ({
          id: srv.id,
          url: srv.origins[0] || `https://${srv.host}`,
          origins: srv.origins,
        }));

  const cacheKey = titleKey || effectiveSources.map((s) => s.id).join(",");
  const now = Date.now();
  const cached = probeMemoryCache.get(cacheKey);
  if (cached && now - cached.timestamp < PROBE_CACHE_TTL_MS) {
    return sortSourcesBySpeed(effectiveSources, titleKey).map((s) => s.id);
  }

  const existingInflight = inflightProbes.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }

  if (typeof fetch !== "function") {
    return sortSourcesBySpeed(effectiveSources, titleKey).map((s) => s.id);
  }

  const probePromise = (async () => {
    try {
      let fastestWinnerRecorded = false;
      await Promise.allSettled(
        effectiveSources.map(async (src) => {
          const probeUrl = src.origins?.[0] || src.url;
          if (!probeUrl) return;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const start =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          try {
            await fetch(probeUrl, {
              method: "GET",
              mode: "no-cors",
              cache: "no-store",
              credentials: "omit",
              signal: controller.signal,
            });
            const end =
              typeof performance !== "undefined" ? performance.now() : Date.now();
            const latencyMs = Math.max(40, Math.round(end - start));
            const effectiveLatency = !fastestWinnerRecorded
              ? latencyMs
              : latencyMs + 15;
            fastestWinnerRecorded = true;
            recordServerSuccess(src.id, effectiveLatency, titleKey);
          } catch {
            recordServerFailure(src.id);
          } finally {
            clearTimeout(timer);
          }
        }),
      );

      const orderedIds = sortSourcesBySpeed(effectiveSources, titleKey).map(
        (s) => s.id,
      );
      probeMemoryCache.set(cacheKey, {
        timestamp: Date.now(),
        order: orderedIds,
      });
      return orderedIds;
    } finally {
      inflightProbes.delete(cacheKey);
    }
  })();

  inflightProbes.set(cacheKey, probePromise);
  return probePromise;
}

export function clearServerProbeCache(): void {
  probeMemoryCache.clear();
  inflightProbes.clear();
}
