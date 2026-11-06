/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';

/**
 * Safely reads and validates a JSON value from localStorage using a Zod schema.
 */
export function readStore<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely serializes and writes a value to localStorage, ignoring quota errors.
 */
export function writeStore(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota or private browsing errors */
  }
}
