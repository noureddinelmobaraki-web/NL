import { useCallback } from 'react';

const DEBUG =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('nl-debug') === '1');

export function useDebugLogger(scope: string) {
  return {
    log: useCallback((...args: unknown[]) => { if (DEBUG) console.log(`[${scope}]`, ...args); }, [scope]),
    warn: useCallback((...args: unknown[]) => { if (DEBUG) console.warn(`[${scope}]`, ...args); }, [scope]),
    error: useCallback((...args: unknown[]) => { console.error(`[${scope}]`, ...args); }, [scope]),
  };
}
