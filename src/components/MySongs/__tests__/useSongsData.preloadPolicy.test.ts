import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldUseAggressiveSongPreload } from '../hooks/useSongsData';

function setNavigatorValue(key: string, value: unknown) {
  Object.defineProperty(navigator, key, { configurable: true, value });
}

describe('My Songs aggressive preload policy', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn());
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    setNavigatorValue('hardwareConcurrency', 8);
    setNavigatorValue('deviceMemory', 8);
    setNavigatorValue('connection', { saveData: false, effectiveType: '4g' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('allows desktop preloading on a capable connection', () => {
    expect(shouldUseAggressiveSongPreload()).toBe(true);
  });

  it('blocks aggressive preloading on mobile', () => {
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    expect(shouldUseAggressiveSongPreload()).toBe(false);
  });

  it('blocks aggressive preloading for save-data, slow networks, and low-end hardware', () => {
    setNavigatorValue('connection', { saveData: true, effectiveType: '4g' });
    expect(shouldUseAggressiveSongPreload()).toBe(false);
    setNavigatorValue('connection', { saveData: false, effectiveType: '2g' });
    expect(shouldUseAggressiveSongPreload()).toBe(false);
    setNavigatorValue('connection', { saveData: false, effectiveType: '4g' });
    setNavigatorValue('hardwareConcurrency', 2);
    expect(shouldUseAggressiveSongPreload()).toBe(false);
  });
});
