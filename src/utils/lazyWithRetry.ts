import { lazy, type ComponentType } from 'react';

type Factory<T> = () => Promise<{ default: T }>;

const RELOAD_SENTINEL_PREFIX = 'nl_chunk_reload_';

/** Cross-browser detection of a dynamic-import / chunk fetch failure. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? '';
  const message = (error as { message?: string }).message ?? String(error);
  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drop-in replacement for React.lazy that:
 *  - retries the dynamic import a few times with backoff (handles transient
 *    network / cold-start failures),
 *  - on persistent failure performs ONE hard reload (guarded by a per-key
 *    sessionStorage sentinel) to pull a fresh index.html + fresh chunk hashes
 *    after a redeploy. The sentinel prevents infinite reload loops.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: Factory<T>,
  key: string,
  retries = 3,
  baseDelayMs = 350,
) {
  const sentinelKey = `${RELOAD_SENTINEL_PREFIX}${key}`;

  return lazy(async () => {
    try {
      const mod = await attempt(factory, retries, baseDelayMs);
      try { sessionStorage.removeItem(sentinelKey); } catch { /* ignore */ }
      return mod;
    } catch (error) {
      if (isChunkLoadError(error)) {
        let alreadyReloaded = false;
        try { alreadyReloaded = sessionStorage.getItem(sentinelKey) === '1'; } catch { /* ignore */ }
        if (!alreadyReloaded) {
          try { sessionStorage.setItem(sentinelKey, '1'); } catch { /* ignore */ }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

async function attempt<T>(
  factory: Factory<T>,
  retries: number,
  baseDelayMs: number,
): Promise<{ default: T }> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (!isChunkLoadError(error) || i === retries) break;
      await wait(baseDelayMs * Math.pow(2, i)); // 350ms, 700ms, 1400ms…
    }
  }
  throw lastError;
}
