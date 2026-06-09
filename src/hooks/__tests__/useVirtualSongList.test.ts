import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualSongList } from '../useVirtualSongList';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  cb: IntersectionObserverCallback;
  observed: Element[] = [];
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) { this.observed.push(el); }
  unobserve(el: Element) { this.observed = this.observed.filter(e => e !== el); }
  disconnect() { this.observed = []; }
  trigger(el: Element, isIntersecting: boolean) {
    this.cb([{ target: el, isIntersecting } as any], this as any);
  }
}

beforeEach(() => {
  (global as any).IntersectionObserver = MockIntersectionObserver;
  MockIntersectionObserver.instances = [];
});

describe('useVirtualSongList', () => {
  it('starts with no revealed ids (excluding initialVisibleCount)', () => {
    const { result } = renderHook(() => useVirtualSongList({ initialVisibleCount: 0 }));
    expect(result.current.isRevealed(1)).toBe(false);
  });

  it('reveals card when it enters viewport (sticky)', () => {
    const { result } = renderHook(() => useVirtualSongList({ initialVisibleCount: 0 }));
    const el = document.createElement('div');

    act(() => { result.current.observe(42, el); });
    const obs = MockIntersectionObserver.instances[0];

    act(() => { obs.trigger(el, true); });
    expect(result.current.isRevealed(42)).toBe(true);

    // sticky: مع رمي event 'not intersecting' لاحقاً، يبقى revealed
    act(() => { obs.trigger(el, false); });
    expect(result.current.isRevealed(42)).toBe(true);
  });

  it('forcedVisibleIds always returns true', () => {
    const { result } = renderHook(() =>
      useVirtualSongList({ forcedVisibleIds: new Set([7]) })
    );
    expect(result.current.isRevealed(7)).toBe(true);
  });

  it('unobserve on null ref', () => {
    const { result } = renderHook(() => useVirtualSongList({ initialVisibleCount: 0 }));
    const el = document.createElement('div');
    act(() => { result.current.observe(1, el); });
    const obs = MockIntersectionObserver.instances[0];
    expect(obs.observed).toContain(el);

    act(() => { result.current.observe(1, null); });
    expect(obs.observed).not.toContain(el);
  });
});
