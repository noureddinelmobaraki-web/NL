import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from './__test-utils__/renderHook';
import {
  useMobileLyricsBodyLock,
  __resetMobileLyricsBodyLockForTests,
} from './useMobileLyricsBodyLock';

beforeEach(() => __resetMobileLyricsBodyLockForTests());

describe('useMobileLyricsBodyLock', () => {
  it('locks body when isLocked=true and unlocks on cleanup', () => {
    const { unmount } = renderHook(() => useMobileLyricsBodyLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not lock when isLocked=false', () => {
    renderHook(() => useMobileLyricsBodyLock(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('refcount keeps body locked while at least one consumer holds it', () => {
    const a = renderHook(() => useMobileLyricsBodyLock(true));
    const b = renderHook(() => useMobileLyricsBodyLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    a.unmount();
    // Second consumer still active.
    expect(document.body.style.overflow).toBe('hidden');
    b.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('is a no-op when enabled=false', () => {
    const { unmount } = renderHook(() => useMobileLyricsBodyLock(true, false));
    expect(document.body.style.overflow).toBe('');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores scrollY via rAF on full release', async () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true, value: 350, writable: true,
    });
    const scrollSpy: number[] = [];
    const origScrollTo = window.scrollTo;
    (window as any).scrollTo = (_x: number, y: number) => scrollSpy.push(y);

    const { unmount } = renderHook(() => useMobileLyricsBodyLock(true));
    unmount();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(scrollSpy).toContain(350);
    (window as any).scrollTo = origScrollTo;
  });
});
