import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSongPlayer } from '../SongPlayer';

vi.mock('../../../hooks/useHlsAudio', () => ({ useHlsAudio: vi.fn() }));

describe('SongPlayer Media Session dedup', () => {
  let setActionHandler: any;

  beforeEach(() => {
    setActionHandler = vi.fn();
    (global.navigator as any).mediaSession = {
      setActionHandler,
      metadata: null,
      playbackState: 'none',
    };
    (global as any).MediaMetadata = class { constructor(public init: any) {} };
  });

  it('registers action handlers exactly once across song changes', () => {
    const onNext = vi.fn();
    const { rerender } = renderHook(
      ({ song }) => useSongPlayer({
        currentSong: song,
        onSongEnd: vi.fn(),
        onTimeUpdate: vi.fn(),
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext,
        onPrev: vi.fn(),
      }),
      { initialProps: { song: { id: 1, title: 'A', url: '/a.m3u8' } as any } }
    );

    const initialCalls = setActionHandler.mock.calls.length;

    rerender({ song: { id: 2, title: 'B', url: '/b.m3u8' } as any });
    rerender({ song: { id: 3, title: 'C', url: '/c.m3u8' } as any });

    // لا re-register لأي action
    expect(setActionHandler.mock.calls.length).toBe(initialCalls);
  });

  it('next handler reads latest onNext via ref', () => {
    const onNextV1 = vi.fn();
    const onNextV2 = vi.fn();

    const { rerender } = renderHook(
      ({ onNext }) => useSongPlayer({
        currentSong: { id: 1, title: 't', url: '/x.m3u8' } as any,
        onSongEnd: vi.fn(),
        onTimeUpdate: vi.fn(),
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext,
        onPrev: vi.fn(),
      }),
      { initialProps: { onNext: onNextV1 } }
    );

    rerender({ onNext: onNextV2 });

    // استدعاء nexttrack handler يدوياً (آخر setActionHandler('nexttrack', fn))
    const nextCall = setActionHandler.mock.calls
      .reverse()
      .find((c: any[]) => c[0] === 'nexttrack');
    nextCall[1](); // call the registered handler

    expect(onNextV1).not.toHaveBeenCalled();
    expect(onNextV2).toHaveBeenCalledOnce();
  });
});
