import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeFetch, safeFetchJson, safeFetchText, SafeFetchError } from './safeFetch';

describe('safeFetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should successfully fetch data', async () => {
    const mockResponse = new Response('ok', { status: 200, statusText: 'OK' });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const res = await safeFetch('https://example.com/api');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('ok');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/api', expect.any(Object));
  });

  it('should parse JSON successfully using safeFetchJson', async () => {
    const mockData = { hello: 'world' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const json = await safeFetchJson<{ hello: string }>('https://example.com/json');
    expect(json).toEqual(mockData);
  });

  it('should parse Text successfully using safeFetchText', async () => {
    const mockResponse = new Response('hello world', { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const text = await safeFetchText('https://example.com/text');
    expect(text).toBe('hello world');
  });

  it('should throw server error when response is not ok', async () => {
    const mockResponse = new Response('not found', { status: 404 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(safeFetch('https://example.com/bad')).rejects.toThrow(SafeFetchError);
    try {
      await safeFetch('https://example.com/bad');
    } catch (e) {
      const err = e as SafeFetchError;
      expect(err.kind).toBe('server');
      expect(err.status).toBe(404);
    }
  });

  it('should handle timeout and throw timeout error', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_, opt) => {
      const signal = opt?.signal;
      return new Promise((_resolve, reject) => {
        if (signal?.aborted) {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          reject(err);
          return;
        }
        signal?.addEventListener('abort', () => {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const timeoutPromise = safeFetch('https://example.com/timeout', {
      timeoutMs: 1000,
    });
    // Attach a handler to prevent Unhandled Rejection flags during fake timers advancement
    timeoutPromise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1100);

    try {
      await timeoutPromise;
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      const err = e as SafeFetchError;
      expect(err).toBeInstanceOf(SafeFetchError);
      expect(err.kind).toBe('timeout');
    }
  });

  it('should retry once if retryOnFailure is true', async () => {
    const errorResponse = new Response('server error', { status: 500 });
    const successResponse = new Response('ok', { status: 200 });

    let calls = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(errorResponse);
      }
      return Promise.resolve(successResponse);
    });

    const res = await safeFetch('https://example.com/retry', {
      retryOnFailure: true,
    });

    expect(calls).toBe(2);
    expect(res.status).toBe(200);
  });
});
