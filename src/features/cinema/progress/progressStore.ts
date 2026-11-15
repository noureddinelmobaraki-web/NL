import { useMemo, useSyncExternalStore } from "react";

export type CinemaHubId = "movies" | "anime" | "cartoon" | "noir" | "commercials";

export interface WatchProgress {
  key: string;
  hub: CinemaHubId;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  time: number;
  duration: number;
  updatedAt: number;
}

const KEY = "nl_cinema_progress_v1";
const MAX = 60;
const listeners = new Set<() => void>();

export const progressKey = (
  hub: CinemaHubId,
  mediaType: "movie" | "tv",
  id: number,
) => `${hub}_${mediaType}_${id}`;

function readAll(): Record<string, WatchProgress> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<
      string,
      WatchProgress
    >;
    if (!raw || typeof raw !== "object") return {};
    const migrated: Record<string, WatchProgress> = {};
    let didMigrate = false;
    for (const [k, entry] of Object.entries(raw)) {
      if (!entry || typeof entry !== "object") continue;
      if (!entry.hub) {
        const hub: CinemaHubId = "movies";
        const newKey = progressKey(hub, entry.mediaType, entry.id);
        migrated[newKey] = { ...entry, hub, key: newKey };
        didMigrate = true;
      } else {
        const expectedKey = progressKey(entry.hub, entry.mediaType, entry.id);
        if (k !== expectedKey || entry.key !== expectedKey) {
          migrated[expectedKey] = { ...entry, key: expectedKey };
          didMigrate = true;
        } else {
          migrated[k] = entry;
        }
      }
    }
    if (didMigrate) {
      try {
        localStorage.setItem(KEY, JSON.stringify(migrated));
      } catch {
        /* ignore */
      }
    }
    return migrated;
  } catch {
    return {};
  }
}

let snapshot: WatchProgress[] = compute();

function compute(): WatchProgress[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function commit(all: Record<string, WatchProgress>) {
  const sorted = Object.values(all)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX);
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(Object.fromEntries(sorted.map((p) => [p.key, p]))),
    );
  } catch {
    /* ignore */
  }
  snapshot = sorted;
  listeners.forEach((l) => l());
}

export function saveProgress(
  p: Omit<WatchProgress, "key" | "updatedAt" | "hub"> & { hub?: CinemaHubId },
  explicitHub?: CinemaHubId,
): void {
  if (
    !Number.isFinite(p.time) ||
    !Number.isFinite(p.duration) ||
    p.duration < 60 ||
    p.time < 30
  ) {
    return;
  }
  const hub: CinemaHubId = explicitHub || p.hub || "movies";
  const all = readAll();
  const key = progressKey(hub, p.mediaType, p.id);
  if (p.time / p.duration > 0.95) delete all[key];
  else all[key] = { ...p, hub, key, updatedAt: Date.now() };
  commit(all);
}

export function getProgress(
  mediaType: "movie" | "tv",
  id: number,
  hub: CinemaHubId = "movies",
): WatchProgress | undefined {
  return readAll()[progressKey(hub, mediaType, id)];
}

export function removeProgress(
  mediaType: "movie" | "tv",
  id: number,
  hub: CinemaHubId = "movies",
): void {
  const all = readAll();
  delete all[progressKey(hub, mediaType, id)];
  commit(all);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      snapshot = compute();
      listeners.forEach((l) => l());
    }
  });
}

export function useContinueWatching(hub?: CinemaHubId): WatchProgress[] {
  const all = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => snapshot,
    () => snapshot,
  );
  return useMemo(
    () =>
      hub ? all.filter((item) => (item.hub || "movies") === hub) : all,
    [all, hub],
  );
}

