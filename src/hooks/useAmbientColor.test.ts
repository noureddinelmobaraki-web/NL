import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from './__test-utils__/renderHook';
import { useAmbientColor } from './useAmbientColor';

vi.mock('../utils/extractColors', () => ({
  extractDominantColorCached: vi.fn((_src: string, cb: (c: string) => void) =>
    cb('123, 45, 67'),
  ),
}));

const SESSION_KEY = 'nl-session-v1';

class IOStub {
  static instances: IOStub[] = [];
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    IOStub.instances.push(this);
  }
  observe() {} disconnect() {} unobserve() {} takeRecords() { return []; }
  root = null; rootMargin = ''; thresholds = [];
  trigger() {
    this.cb([{
      isIntersecting: true, intersectionRatio: 1,
      target: document.createElement('div'), time: 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly, rootBounds: null,
    }], this as unknown as IntersectionObserver);
  }
}

beforeEach(() => {
  sessionStorage.clear();
  IOStub.instances = [];
  (globalThis as any).IntersectionObserver = IOStub;
});

describe('useAmbientColor', () => {
  it('fires onColor immediately when isActive is true', () => {
    const onColor = vi.fn();
    renderHook(() => useAmbientColor({ imageUrl: 'a.jpg', isActive: true, onColor }));
    expect(onColor).toHaveBeenCalledWith('123, 45, 67');
  });

  it('persists the resolved color to session storage', () => {
    renderHook(() => useAmbientColor({ imageUrl: 'b.jpg', isActive: true, onColor: vi.fn() }));
    const raw = sessionStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw!).dominantColors['b.jpg']).toBe('123, 45, 67');
  });

  it('reads from session cache without re-extracting', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ dominantColors: { 'c.jpg': 'cached!' } }));
    const onColor = vi.fn();
    renderHook(() => useAmbientColor({ imageUrl: 'c.jpg', isActive: true, onColor }));
    expect(onColor).toHaveBeenCalledWith('cached!');
  });

  it('does NOT call onColor when isActive=false even after extraction', () => {
    const onColor = vi.fn();
    const ref = { current: document.createElement('div') };
    renderHook(() => useAmbientColor({
      imageUrl: 'd.jpg', isActive: false, onColor, targetRef: ref as any,
    }));
    expect(onColor).not.toHaveBeenCalled();
    IOStub.instances[0]?.trigger();
    expect(onColor).not.toHaveBeenCalled();
    // Cache still filled:
    const raw = sessionStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw!).dominantColors['d.jpg']).toBe('123, 45, 67');
  });

  it('is a no-op when imageUrl is falsy', () => {
    const onColor = vi.fn();
    renderHook(() => useAmbientColor({ imageUrl: undefined, isActive: true, onColor }));
    expect(onColor).not.toHaveBeenCalled();
  });
});
