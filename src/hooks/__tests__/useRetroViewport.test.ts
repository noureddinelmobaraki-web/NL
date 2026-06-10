import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '../__test-utils__/renderHook';
import { useRetroViewport } from '../useRetroViewport';

// Mock AppContext so that it doesn't fail
vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({ theme: 'retro' }),
}));

describe('useRetroViewport', () => {
  let originalMatchMedia: any;
  let headElement: HTMLHeadElement;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    headElement = document.head;
    
    // Mock viewport tag if it doesn't exist
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      headElement.appendChild(viewport);
    }
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    // Clean up any remaining meta tags
    document.querySelectorAll('meta[data-retro-viewport]').forEach(tag => tag.remove());
    document.querySelectorAll('meta[data-original-viewport]').forEach(tag => tag.remove());
    document.documentElement?.classList.remove('retro-desktop-mode');
    document.body?.classList.remove('retro-desktop-mode');
  });

  it('acts on mobile and applies classes and viewport', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useRetroViewport(1024, true));

    // Assert that the classes are appended
    expect(document.documentElement?.classList.contains('retro-desktop-mode')).toBe(true);
    expect(document.body?.classList.contains('retro-desktop-mode')).toBe(true);

    // Assert that the retro viewport is set
    const retroTag = headElement.querySelector('meta[data-retro-viewport]');
    expect(retroTag).not.toBeNull();
    expect(retroTag?.getAttribute('content')).toContain('width=1024');

    // Upon unmount, they should be cleaned up and original restored
    unmount();
    expect(document.documentElement?.classList.contains('retro-desktop-mode')).toBe(false);
    expect(document.body?.classList.contains('retro-desktop-mode')).toBe(false);
    expect(headElement.querySelector('meta[data-retro-viewport]')).toBeNull();
  });

  it('is a no-op on desktop', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useRetroViewport(1024, true));

    // Assert that retro class is NOT added on desktop
    expect(document.documentElement?.classList.contains('retro-desktop-mode')).toBe(false);
    expect(document.body?.classList.contains('retro-desktop-mode')).toBe(false);
    expect(headElement.querySelector('meta[data-retro-viewport]')).toBeNull();

    unmount();
  });
});
