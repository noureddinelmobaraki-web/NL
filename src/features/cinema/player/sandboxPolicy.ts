// src/features/cinema/player/sandboxPolicy.ts
import type { CinemaServerConfig } from "../../../config/servers";

export const SANDBOX_STORAGE_KEY = "nl_cinema_sandbox_v1";
export const AD_SHIELD_PREF_KEY = "nl_cinema_adshield_v1";
/** Time-emitting servers must produce a sync-capable event within this window while sandboxed. */
export const SANDBOX_PROBE_MS = 10_000;
/** Silent servers: after this delay show the "disable protection" escape button. */
export const SANDBOX_ESCAPE_HINT_MS = 6_000;
const VERDICT_TTL_MS = 7 * 24 * 3600 * 1000;

export type SandboxVerdict = "ok" | "refused";
type Store = Record<string, { v: SandboxVerdict; at: number }>;

function read(): Store {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
}

type ServerLike = Pick<CinemaServerConfig, "id" | "capabilities"> | null | undefined;

/** Returns sandbox tokens for the iframe, or undefined when the server must run unsandboxed. */
export function getIframeSandbox(server: ServerLike): string | undefined {
  const tokens = server?.capabilities?.sandbox;
  if (!server || !tokens) return undefined;
  const rec = read()[server.id];
  if (rec && rec.v === "refused" && Date.now() - rec.at < VERDICT_TTL_MS) return undefined;
  return tokens;
}

export function getSandboxVerdict(serverId: string): SandboxVerdict | null {
  const rec = read()[serverId];
  if (!rec || Date.now() - rec.at >= VERDICT_TTL_MS) return null;
  return rec.v;
}

export function markSandboxVerdict(serverId: string, v: SandboxVerdict): void {
  if (!serverId) return;
  const store = read();
  if (store[serverId]?.v === v && Date.now() - store[serverId].at < VERDICT_TTL_MS / 2) return;
  store[serverId] = { v, at: Date.now() };
  write(store);
}

export function clearSandboxVerdict(serverId: string): void {
  const store = read();
  if (serverId in store) {
    delete store[serverId];
    write(store);
  }
}

export function getAdShieldEnabled(): boolean {
  try {
    return localStorage.getItem(AD_SHIELD_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAdShieldEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AD_SHIELD_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
