import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSongPlayer } from '../SongPlayer';
import { audioManager } from '../../../audio/audioManager';

vi.mock('../../../hooks/useHlsAudio', () => ({
  useHlsAudio: vi.fn(),
}));

describe('SongPlayer lifecycle', () => {
  beforeEach(() => {
    vi.spyOn(audioManager, 'releaseBg');
    vi.spyOn(audioManager, 'stop');
    vi.spyOn(audioManager, 'onSongEnd');
  });

  it('releases active_song suppressor on unmount', () => {
    const { unmount } = renderHook(() =>
      useSongPlayer({
        currentSong: { id: 1, title: 't', url: '/x.m3u8' } as any,
        onSongEnd: vi.fn(),
        onTimeUpdate: vi.fn(),
        onPlay: vi.fn(),
        onPause: vi.fn(),
      })
    );

    unmount();

    expect(audioManager.stop).toHaveBeenCalledWith('song');
    expect(audioManager.releaseBg).toHaveBeenCalledWith('active_song');
  });

  it('calls onSongEnd() on ended event before propagating', () => {
    const userOnSongEnd = vi.fn();
    const { result, rerender } = renderHook(
      ({ song }) =>
        useSongPlayer({
          currentSong: song,
          onSongEnd: userOnSongEnd,
          onTimeUpdate: vi.fn(),
          onPlay: vi.fn(),
          onPause: vi.fn(),
        }),
      {
        initialProps: {
          song: { id: 1, title: 't', url: '/x.m3u8' } as any,
        },
      }
    );

    // Populate ref and rerender to trigger the event listener registration in useEffect
    const mockAudio = document.createElement('audio');
    result.current.audioTagRef.current = mockAudio;
    
    rerender({ song: { id: 2, title: 't2', url: '/y.m3u8' } as any });

    // simulate ended event
    act(() => {
      mockAudio.dispatchEvent(new Event('ended'));
    });

    expect(audioManager.onSongEnd).toHaveBeenCalled();
    expect(userOnSongEnd).toHaveBeenCalled();
    // ترتيب: onSongEnd الداخلي قبل callback المستخدم
    const internalCall = (audioManager.onSongEnd as any).mock.invocationCallOrder[0];
    const userCall = userOnSongEnd.mock.invocationCallOrder[0];
    expect(internalCall).toBeLessThan(userCall);
  });
});
