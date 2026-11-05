// src/features/cinema/player/sandboxPolicy.ts
import type { CinemaServerConfig } from "../../../config/servers";

export const SANDBOX_STORAGE_KEY = "nl_cinema_sandbox_v1";
export const AD_SHIELD_PREF_KEY = "nl_cinema_adshield_v1";
export const SANDBOX_PROBE_MS = 10_000;
export const SANDBOX_ESCAPE_HINT_MS = 6_000;

export type SandboxVerdict = "ok" | "refused";
type ServerLike = Pick<CinemaServerConfig, "id" | "capabilities"> | null | undefined;

/** Always returns undefined: embed servers actively block iframe[sandbox] ("Please Disable Sandbox"). */
export function getIframeSandbox(_server?: ServerLike): string | undefined {
  return undefined;
}

export function getSandboxVerdict(_serverId: string): SandboxVerdict | null {
  return null;
}

export function markSandboxVerdict(_serverId: string, _v: SandboxVerdict): void {}

export function clearSandboxVerdict(_serverId: string): void {}

export function getAdShieldEnabled(): boolean {
  return false;
}

export function setAdShieldEnabled(_enabled: boolean): void {}
