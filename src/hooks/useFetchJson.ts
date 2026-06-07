import { useEffect, useState, useRef } from 'react';
import { safeFetchJson, SafeFetchError } from '../utils/safeFetch';

interface FetchState<T> {
  data: T | null;
  error: SafeFetchError | null;
  isLoading: boolean;
  refetch: () => void;
}

const cache = new Map<string, unknown>();

export function useFetchJson<T>(url: string, options?: { cacheKey?: string; deps?: unknown[] }): FetchState<T> {
  const cacheKey = options?.cacheKey ?? url;
  const [data, setData] = useState<T | null>((cache.get(cacheKey) as T) ?? null);
  const [error, setError] = useState<SafeFetchError | null>(null);
  const [isLoading, setIsLoading] = useState(!cache.has(cacheKey));
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoading(true);
    setError(null);

    safeFetchJson<T>(url, { signal: ctrl.signal, retryOnFailure: true, timeoutMs: 8000 })
      .then((d) => {
        if (ctrl.signal.aborted) return;
        cache.set(cacheKey, d);
        setData(d);
        setIsLoading(false);
      })
      .catch((e: SafeFetchError) => {
        if (e.kind === 'abort') return;
        setError(e);
        setIsLoading(false);
      });

    return () => ctrl.abort();
  }, [url, cacheKey, reloadKey]);

  return { data, error, isLoading, refetch: () => setReloadKey((k) => k + 1) };
}
