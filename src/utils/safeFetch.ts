export type SafeFetchErrorKind = 'timeout' | 'network' | 'server' | 'parse' | 'abort';

/**
 * Class representing safe fetch errors with unified type classification.
 */
export class SafeFetchError extends Error {
  kind: SafeFetchErrorKind;
  status?: number;
  originalError?: any;

  constructor(message: string, kind: SafeFetchErrorKind, status?: number, originalError?: any) {
    super(message);
    this.name = 'SafeFetchError';
    this.kind = kind;
    this.status = status;
    this.originalError = originalError;
  }
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  retryOnFailure?: boolean;
}

/**
 * Executes a fetch request with an integrated timeout, abort integration, and optional retry.
 * 
 * @param url The resource URL to fetch.
 * @param options Custom setup including timeout and retry parameters.
 * @returns Fully loaded Response object.
 * @throws SafeFetchError
 */
export async function safeFetch(
  url: string | URL,
  options?: SafeFetchOptions
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 10000;
  const retryOnFailure = options?.retryOnFailure ?? false;
  const externalSignal = options?.signal;

  let attempt = 0;
  const maxAttempts = retryOnFailure ? 2 : 1;

  while (attempt < maxAttempts) {
    attempt++;
    let isTimeout = false;
    let timeoutId: any = null;
    const controller = new AbortController();

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, timeoutMs);
    }

    const onExternalAbort = () => {
      cleanup();
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        cleanup();
        throw new SafeFetchError('Request aborted', 'abort');
      }
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const mergedOptions = {
        ...options,
        signal: controller.signal,
      };

      const response = await fetch(url, mergedOptions);
      cleanup();
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      if (!response.ok) {
        throw new SafeFetchError(
          `Server responded with status ${response.status}`,
          'server',
          response.status
        );
      }

      return response;
    } catch (err: any) {
      cleanup();
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      let errorToThrow: SafeFetchError;

      if (err instanceof SafeFetchError) {
        errorToThrow = err;
      } else if (err.name === 'AbortError') {
        if (isTimeout) {
          errorToThrow = new SafeFetchError('Request timed out', 'timeout', undefined, err);
        } else {
          errorToThrow = new SafeFetchError('Request aborted', 'abort', undefined, err);
        }
      } else if (err.name === 'TypeError') {
        errorToThrow = new SafeFetchError('Network error or connection failed', 'network', undefined, err);
      } else {
        errorToThrow = new SafeFetchError(err.message || 'Unknown network error', 'network', undefined, err);
      }

      // If aborted externally, do not retry
      if (errorToThrow.kind === 'abort') {
        throw errorToThrow;
      }

      if (attempt >= maxAttempts) {
        throw errorToThrow;
      }

      // Loop continues to next attempt for network/server/timeout
    }
  }

  throw new SafeFetchError('Unknown fetch error', 'network');
}

/**
 * Executes a fetch request and parses the response as JSON safely.
 * 
 * @param url The resource URL.
 * @param options SafeFetch options.
 * @returns Typed JSON response.
 * @throws SafeFetchError
 */
export async function safeFetchJson<T>(
  url: string | URL,
  options?: SafeFetchOptions
): Promise<T> {
  const response = await safeFetch(url, options);
  try {
    return await response.json() as T;
  } catch (err: any) {
    throw new SafeFetchError('Failed to parse response as JSON', 'parse', response.status, err);
  }
}

/**
 * Executes a fetch request and parses the response as text safely.
 * 
 * @param url The resource URL.
 * @param options SafeFetch options.
 * @returns Response body as a string.
 * @throws SafeFetchError
 */
export async function safeFetchText(
  url: string | URL,
  options?: SafeFetchOptions
): Promise<string> {
  const response = await safeFetch(url, options);
  try {
    return await response.text();
  } catch (err: any) {
    throw new SafeFetchError('Failed to parse response as text', 'parse', response.status, err);
  }
}
