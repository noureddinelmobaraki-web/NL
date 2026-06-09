import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from './__test-utils__/renderHook';
import { useWaveAnimation } from './useWaveAnimation';

const setupMatchMedia = (reducedMotion: boolean) => {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  (window as any).matchMedia = (q: string) => ({
    matches: q.includes('reduce') ? reducedMotion : false,
    media: q,
    addEventListener: (_t: string, l: any) => listeners.push(l),
    removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  });
  return {
    flip(value: boolean) {
      listeners.forEach((l) => l({ matches: value } as MediaQueryListEvent));
    },
  };
};

describe('useWaveAnimation', () => {
  beforeEach(() => {
    setupMatchMedia(false);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true, value: 'visible',
    });
  });

  it('returns "running" when isActive=true and conditions are normal', () => {
    const { result } = renderHook(() => useWaveAnimation({ isActive: true }));
    expect(result.current.playState).toBe('running');
    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it('returns "paused" when isActive=false', () => {
    const { result } = renderHook(() => useWaveAnimation({ isActive: false }));
    expect(result.current.playState).toBe('paused');
  });

  it('returns "paused" when prefers-reduced-motion is set', () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useWaveAnimation({ isActive: true }));
    expect(result.current.playState).toBe('paused');
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('returns "paused" when document is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true, value: 'hidden',
    });
    const { result } = renderHook(() => useWaveAnimation({ isActive: true }));
    expect(result.current.playState).toBe('paused');
  });

  it('reacts to visibilitychange events', () => {
    const { result } = renderHook(() => useWaveAnimation({ isActive: true }));
    expect(result.current.playState).toBe('running');
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true, value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.playState).toBe('paused');
  });
});
