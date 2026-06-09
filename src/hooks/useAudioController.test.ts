import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAudioController } from './useAudioController';
import { audioManager } from '../audio/audioManager';

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock('../audio/hlsPool', () => ({
  getHlsClass: vi.fn(async () => ({
    isSupported: () => true,
    Events: { MANIFEST_PARSED: 'manifestParsed', ERROR: 'error' },
    ErrorTypes: { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' },
  })),
  getOrCreateHls: vi.fn(async () => ({
    attachMedia: vi.fn(),
    detachMedia: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
  })),
  safeDetach: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────
function makeProps(overrides: any = {}) {
  return {
    isLensGalleryOpen: false,
    isGalleryOpen: false,
    theme: 'midnight' as const,
    audioIntent: 'initial' as const,
    setAudioIntent: vi.fn(),
    loaded: true,
    ...overrides,
  };
}

// Inject fake audioRef
function wrapHook(props: any) {
  return renderHook((p: any) => useAudioController(p), { initialProps: props });
}

beforeEach(() => {
  (audioManager as any).registry = new Map();
  (audioManager as any).bgSuppressors = new Map();
  (audioManager as any).bgUserPaused = false;
  (audioManager as any).active = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────
describe('useAudioController — race fixes', () => {
  it('Race 1: rapid theme switch (5 changes in 200ms) never leaves bg paused', async () => {
    const { rerender } = wrapHook(makeProps({ theme: 'midnight' }));
    const themes = ['dark', 'light', 'bit', 'lite', 'midnight'] as const;
    themes.forEach((t, i) => {
      setTimeout(() => rerender(makeProps({ theme: t })), i * 30);
    });
    await new Promise(r => setTimeout(r, 1500));
    expect((audioManager as any).bgUserPaused).toBe(false);
  });

  it('Race 2: changing audioIntent does NOT re-run theme-swap effect', async () => {
    const { rerender } = wrapHook(makeProps({ theme: 'dark', audioIntent: 'initial' }));
    await new Promise(r => setTimeout(r, 50));
    const pauseSpy = vi.spyOn(audioManager, 'pause');
    rerender(makeProps({ theme: 'dark', audioIntent: 'user-playing' }));  // theme unchanged
    await new Promise(r => setTimeout(r, 100));
    expect(pauseSpy).not.toHaveBeenCalledWith('bg');
  });

  it.skip('Race 3: abort mid-swap calls safeDetach for the aborted URL', async () => {
    const { safeDetach } = await import('../audio/hlsPool');
    const { rerender } = wrapHook(makeProps({ theme: 'midnight' }));
    await new Promise(r => setTimeout(r, 50));
    rerender(makeProps({ theme: 'dark' }));
    // immediately switch again before the dark swap finishes
    rerender(makeProps({ theme: 'light' }));
    await new Promise(r => setTimeout(r, 600));
    expect(safeDetach).toHaveBeenCalled();
  });

  it('G4: unmount mid-swap leaves bgUserPaused=false', async () => {
    const { rerender, unmount } = wrapHook(makeProps({ theme: 'midnight' }));
    rerender(makeProps({ theme: 'dark' }));
    await new Promise(r => setTimeout(r, 50));
    unmount();
    expect((audioManager as any).bgUserPaused).toBe(false);
  });

  it.skip('G5: visibility hidden→visible triggers recoverAudio after debounce', async () => {
    const recoverSpy = vi.fn();
    (audioManager as any).recoverAudio = recoverSpy;
    wrapHook(makeProps());
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 350));
    expect(recoverSpy).toHaveBeenCalledTimes(1);
  });

  it('G7: ping-pong theme settles on final URL only', async () => {
    const { rerender } = wrapHook(makeProps({ theme: 'midnight' }));
    await new Promise(r => setTimeout(r, 50));
    rerender(makeProps({ theme: 'dark' }));
    rerender(makeProps({ theme: 'light' }));
    rerender(makeProps({ theme: 'dark' }));
    await new Promise(r => setTimeout(r, 700));
    // No assertion on currentBgUrlRef directly (private), but pauseCount must equal
    // unpauseCount + (no leftover suppressors).
    expect((audioManager as any).bgSuppressors.size).toBe(0);
  });

  it('lens open → close releases suppressor symmetrically', () => {
    const { rerender } = wrapHook(makeProps({ isLensGalleryOpen: false }));
    rerender(makeProps({ isLensGalleryOpen: true }));
    expect((audioManager as any).bgSuppressors.has('lens_open')).toBe(true);
    rerender(makeProps({ isLensGalleryOpen: false }));
    expect((audioManager as any).bgSuppressors.has('lens_open')).toBe(false);
  });

  it.skip('mebit suppression is symmetric with release', () => {
    const { rerender } = wrapHook(makeProps({ isGalleryOpen: false }));
    rerender(makeProps({ isGalleryOpen: true }));
    expect((audioManager as any).bgSuppressors.has('mebit_open')).toBe(true);
    rerender(makeProps({ isGalleryOpen: false }));
    expect((audioManager as any).bgSuppressors.has('mebit_open')).toBe(false);
  });
});
