import { useSyncExternalStore } from "react";

export interface WatchProgress {
  key: string;
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
const MAX = 40;
const listeners = new Set<() => void>();
let snapshot: WatchProgress[] = compute();

function readAll(): Record<string, WatchProgress> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function compute(): WatchProgress[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}
function commit(all: Record<string, WatchProgress>) {
  const sorted = Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(sorted.map((p) => [p.key, p])))); } catch { /* ignore */ }
  snapshot = sorted;
  listeners.forEach((l) => l());
}

export const progressKey = (mediaType: "movie" | "tv", id: number) => `${mediaType}_${id}`;

export function saveProgress(p: Omit<WatchProgress, "key" | "updatedAt">): void {
  if (!Number.isFinite(p.time) || !Number.isFinite(p.duration) || p.duration < 60 || p.time < 30) return;
  const all = readAll();
  const key = progressKey(p.mediaType, p.id);
  if (p.time / p.duration > 0.95) delete all[key];
  else all[key] = { ...p, key, updatedAt: Date.now() };
  commit(all);
}
export function getProgress(mediaType: "movie" | "tv", id: number): WatchProgress | undefined {
  return readAll()[progressKey(mediaType, id)];
}
export function removeProgress(mediaType: "movie" | "tv", id: number): void {
  const all = readAll();
  delete all[progressKey(mediaType, id)];
  commit(all);
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { snapshot = compute(); listeners.forEach((l) => l()); }
  });
}
export function useContinueWatching(): WatchProgress[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => snapshot,
    () => snapshot,
  );
}
