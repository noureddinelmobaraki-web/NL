import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Spies shared with the mocked hls.js module.
const ctor = vi.fn();
const loadSource = vi.fn();
const attachMedia = vi.fn();
const on = vi.fn();
const stopLoad = vi.fn();
const detachMedia = vi.fn();
const destroy = vi.fn();

vi.mock('hls.js', () => {
  class MockHls {
    static isSupported() {
      return true;
    }
    static Events = { ERROR: 'hlsError', MANIFEST_PARSED: 'hlsManifestParsed' };
    constructor(config?: unknown) {
      ctor(config);
    }
    loadSource = loadSource;
    attachMedia = attachMedia;
    on = on;
    stopLoad = stopLoad;
    detachMedia = detachMedia;
    destroy = destroy;
  }
  return { default: MockHls };
});

// Imported AFTER the mock is registered.
import { useSharedBackgroundMusic } from './useSharedBackgroundMusic';

// A macro-task wait is needed to resolve the mocked dynamic import.
const flush = async () => {
  await new Promise(r => setTimeout(r, 100));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSharedBackgroundMusic — lazy hls.js', () => {
  it('dynamically imports hls.js and wires the stream after mount', async () => {
    const url = 'https://example.test/stream/index.m3u8';
    const { unmount } = renderHook(() =>
      useSharedBackgroundMusic(false, { key: 'bg', url, volume: 0.6 }),
    );

    await flush();

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith({ startPosition: -1 });
    expect(loadSource).toHaveBeenCalledWith(url);
    expect(attachMedia).toHaveBeenCalledTimes(1);

    unmount();
    await flush();

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
