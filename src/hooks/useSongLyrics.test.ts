import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from './__test-utils__/renderHook';
import { useSongLyrics } from './useSongLyrics';
import type { Song, LyricLine } from '../types';

const SESSION_KEY = 'nl-session-v1';
const baseSong: Pick<Song, 'id' | 'lrc'> = { id: 7, lrc: 'sample.lrc' };
const fakeLyrics: LyricLine[] = [
  { time: 0, text: 'one' }, { time: 1, text: 'two' },
];

const originalFetch = globalThis.fetch;
beforeEach(() => sessionStorage.clear());
afterEach(() => { globalThis.fetch = originalFetch; });

describe('useSongLyrics — Path A (parent)', () => {
  it('returns parent lyrics immediately', () => {
    const { result } = renderHook(() =>
      useSongLyrics({ song: baseSong, externalLyrics: fakeLyrics }));
    expect(result.current.lyrics).toEqual(fakeLyrics);
  });
});

describe('useSongLyrics — Path B (session cache)', () => {
  it('hydrates from session storage', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lrcCache: { 7: fakeLyrics } }));
    const { result } = renderHook(() => useSongLyrics({ song: baseSong }));
    expect(result.current.lyrics).toEqual(fakeLyrics);
  });
});

describe('useSongLyrics — Path C (lrc-ready event)', () => {
  it('responds to lrc-ready event', () => {
    const { result } = renderHook(() => useSongLyrics({ song: baseSong }));
    expect(result.current.lyrics).toEqual([]);
    act(() => {
      window.dispatchEvent(new CustomEvent('lrc-ready', {
        detail: { songId: 7, lyrics: fakeLyrics },
      }));
    });
    expect(result.current.lyrics).toEqual(fakeLyrics);
  });
});

describe('useSongLyrics — Path D (self-fetch)', () => {
  it('does NOT fetch when enableSelfFetch is false', () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as any;
    renderHook(() => useSongLyrics({ song: baseSong, enableSelfFetch: false }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches, parses & caches when enableSelfFetch=true', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('[00:00.00]from-network\n[00:01.50]second'),
    })) as any;

    const { result } = renderHook(() =>
      useSongLyrics({ song: baseSong, enableSelfFetch: true }));
    await waitFor(() => expect(result.current.lyrics.length).toBeGreaterThan(0));
    expect(result.current.lyrics[0].text).toBe('from-network');
    const raw = sessionStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw!).lrcCache[7].length).toBe(2);
  });

  it('aborts in-flight fetch on unmount', () => {
    const abortSpy = vi.fn();
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as any;
    const Real = globalThis.AbortController;
    class Fake extends Real { abort() { abortSpy(); super.abort(); } }
    (globalThis as any).AbortController = Fake;
    try {
      const { unmount } = renderHook(() =>
        useSongLyrics({ song: baseSong, enableSelfFetch: true }));
      unmount();
      expect(abortSpy).toHaveBeenCalled();
    } finally { (globalThis as any).AbortController = Real; }
  });
});
