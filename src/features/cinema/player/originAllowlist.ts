/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

/** Checks whether origin matches exactly or matches wildcard / subdomain patterns (e.g. *.vidlink.pro). */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || !Array.isArray(allowedOrigins)) return false;
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    for (const allowed of allowedOrigins) {
      if (!allowed) continue;
      if (allowed === origin) return true;
      try {
        const allowedHost = new URL(allowed.replace('*.', '')).hostname.toLowerCase();
        if (originHost === allowedHost || originHost.endsWith('.' + allowedHost)) {
          return true;
        }
      } catch {
        if (allowed.includes('vidlink.') && /(^|\.)vidlink\.[a-z]+$/i.test(originHost)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Checks whether source originates from the active player frame.
 */
export function isFromFrame(
  source: MessageEventSource | null,
  root: Window | null | undefined,
  origin?: string,
  allowedOrigins?: string[],
  parsedEvent?: unknown,
): boolean {
  if (!source) return false;
  if (root && source === root) return true;

  try {
    const anySource = source as any;
    if (anySource.parent === window || anySource.top === window) {
      return true;
    }
  } catch {
    // Cross-origin access restriction in Site Isolation
  }

  if (origin && allowedOrigins && isOriginAllowed(origin, allowedOrigins) && parsedEvent) {
    return true;
  }

  return false;
}
