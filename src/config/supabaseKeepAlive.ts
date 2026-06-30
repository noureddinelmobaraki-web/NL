import { supabase } from './supabase';

/**
 * Interval between keep-alive pings (4 minutes).
 * Supabase closes idle realtime connections after ~5 minutes.
 */
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Sends a lightweight SELECT to keep the Supabase connection alive. */
async function ping(): Promise<void> {
  try {
    // Cheapest possible query — selects nothing meaningful
    await supabase.from('profiles').select('id').limit(1).maybeSingle();
  } catch {
    // Silently ignore — keep-alive failures are non-critical
  }
}

/**
 * Start the keep-alive loop. Call this once when the user is authenticated.
 * Stops automatically when `stop()` is called.
 */
export function startKeepAlive(): void {
  if (intervalId !== null) return; // already running
  intervalId = setInterval(ping, KEEPALIVE_INTERVAL_MS);
}

/**
 * Stop the keep-alive loop. Call this when the user signs out.
 */
export function stopKeepAlive(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}
