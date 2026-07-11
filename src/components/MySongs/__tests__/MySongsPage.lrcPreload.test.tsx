import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  prefetchLrc: vi.fn(),
  setContext: vi.fn(),
  enterSurface: vi.fn(() => vi.fn()),
  song: {
    id: 1,
    title: 'Test Song',
    url: 'https://example.test/song/index.m3u8',
    lrc: '/NL/lrc/test-song.lrc',
    backgroundImage: 'https://example.test/song.webp',
  },
}));

vi.mock('../../../audio/songSurfaceBus', () => ({
  songSurfaceBus: { enter: testState.enterSurface },
}));

vi.mock('../../layout/ButtonOrchestrator', () => ({
  useButtonContext: () => ({ setContext: testState.setContext }),
}));

vi.mock('../hooks/useLrcHoverPreload', () => ({
  useLrcHoverPreload: () => ({ prefetchLrc: testState.prefetchLrc }),
}));

vi.mock('../hooks/useMySongsState', () => ({
  useMySongsState: () => ({
    songs: [testState.song],
    activeId: null,
    setActiveId: vi.fn(),
    currentSong: null,
    volume: 1,
    setVolume: vi.fn(),
    lyricsOpen: false,
    setLyricsOpen: vi.fn(),
    karaokeMode: false,
    setKaraokeMode: vi.fn(),
    isDismissed: false,
    setIsDismissed: vi.fn(),
    isShuffle: false,
    setIsShuffle: vi.fn(),
    repeatMode: 'off',
    setRepeatMode: vi.fn(),
    ambientColor: '20, 20, 30',
    durationCache: {},
    lrcCache: {},
    error: false,
    retry: vi.fn(),
  }),
}));

vi.mock('../hooks/useMySongsPlayback', () => ({
  useMySongsPlayback: () => ({
    audioTagRef: { current: null },
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    audioStatus: 'idle',
    currentLyricLine: null,
    handleSeek: vi.fn(),
    handlePlayToggle: vi.fn(),
    handlePlayPause: vi.fn(),
    handlePrev: vi.fn(),
    handleNext: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useMediaSession', () => ({ useMediaSession: vi.fn() }));
vi.mock('../../../hooks/useStructuredData', () => ({ useStructuredData: vi.fn() }));
vi.mock('../../../hooks/useIsDesktop', () => ({ useIsDesktop: () => false }));

vi.mock('../MySongsList', () => ({
  MySongsList: (props: {
    onCardRevealed?: (id: number | string) => void;
    onHoverPrefetchLrc?: (id: number) => void;
  }) => (
    <div>
      <button type="button" onClick={() => props.onCardRevealed?.(1)}>
        Reveal card
      </button>
      <button type="button" onClick={() => props.onHoverPrefetchLrc?.(1)}>
        Pointer intent
      </button>
    </div>
  ),
}));

import { MySongs } from '../MySongsPage';

function renderMySongs() {
  render(
    <MySongs
      onSongPlay={vi.fn()}
      onSongStop={vi.fn()}
      onActiveSongChange={vi.fn()}
      onAmbientColorChange={vi.fn()}
    />,
  );
}

describe('MySongs LRC preload intent boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not prefetch LRC when a card is merely revealed', () => {
    renderMySongs();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal card' }));

    expect(testState.prefetchLrc).not.toHaveBeenCalled();
  });

  it('keeps LRC prefetch available for explicit pointer intent', () => {
    renderMySongs();

    fireEvent.click(screen.getByRole('button', { name: 'Pointer intent' }));

    expect(testState.prefetchLrc).toHaveBeenCalledTimes(1);
    expect(testState.prefetchLrc).toHaveBeenCalledWith(1);
  });
});
