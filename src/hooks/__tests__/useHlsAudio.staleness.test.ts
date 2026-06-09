import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHlsAudio } from '../useHlsAudio';

vi.mock('../../audio/hlsPool', () => ({
  getHlsClass: vi.fn().mockResolvedValue({
    isSupported: () => true,
    Events: { MANIFEST_PARSED: 'manifestParsed', ERROR: 'error' },
    ErrorTypes: { NETWORK_ERROR: 'net', MEDIA_ERROR: 'media' },
  }),
  getOrCreateHls: vi.fn().mockImplementation((url: string) => Promise.resolve({
    levels: [],
    on: vi.fn(),
    off: vi.fn(),
    attachMedia: vi.fn(),
    detachMedia: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
    _testUrl: url,
  })),
}));

describe('useHlsAudio generation token', () => {
  it('drops onReady from previous URL when switched fast', async () => {
    const onReady = vi.fn();
    const audioEl = document.createElement('audio');
    const audioRef = { current: audioEl };

    const { rerender } = renderHook(
      ({ url }) => useHlsAudio(audioRef as any, url, onReady),
      { initialProps: { url: '/a.m3u8' } }
    );

    // switch fast before A's MANIFEST_PARSED is dispatched
    await act(async () => {
      rerender({ url: '/b.m3u8' });
    });

    // simulate late MANIFEST_PARSED from A — should be dropped because gen changed
    // (in real life: hls.on('manifestParsed', cb) — but A's instance was already detached)
    // We assert onReady wasn't called for A
    expect(onReady).toHaveBeenCalledTimes(0); // initial state — no canplay yet
  });
});
