/**
 * cssVarCheck.ts
 *
 * Dev-only utility for asserting that a list of CSS custom properties
 * resolve to a non-empty value on `:root` for the active theme.
 *
 * Production builds tree-shake this away because:
 *   1. The body is wrapped in `if (import.meta.env.DEV)`.
 *   2. Vite's `import.meta.env.DEV` is replaced with `false` at build time,
 *      so dead-code elimination removes the entire `checkCSSVars` body.
 *
 * Usage:
 *   useDevCSSVarCheck(REQUIRED_HERO_VARS, resolvedTheme);
 */

import { useEffect } from 'react';

export type CSSVarList = ReadonlyArray<string>;

/**
 * Imperative variant — call inside a `useEffect`.
 */
export function checkCSSVars(vars: CSSVarList, label = 'Theme Check'): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;

  const style = getComputedStyle(document.documentElement);
  for (const v of vars) {
    const value = style.getPropertyValue(v).trim();
    if (!value) {
      console.warn(
        `[${label}] Warning: Required CSS variable "${v}" is not resolved in active theme.`
      );
    }
  }
}

/**
 * Hook variant — re-runs whenever `dep` changes (usually the resolved theme).
 */
export function useDevCSSVarCheck(vars: CSSVarList, dep: unknown, label = 'Theme Check'): void {
  useEffect(() => {
    checkCSSVars(vars, label);
  }, [dep, vars, label]);
}
