import { vi } from 'vitest';
import type { Track } from '../../features/music/engine/types';

export const MOCK_TRACKS: Track[] = [
  { id: 'fv-001', title: 'Test One', artist: 'Tester', coverColor: '#123456' } as Track,
  { id: 'fv-002', title: 'Test Two', artist: 'Tester', coverColor: '#654321' } as Track,
];

/**
 * محاكاة تحاكي شكل zustand الحقيقي: دالة تقبل محدّداً
 * وعليها getState / setState / subscribe.
 * R01 أزال اعتماد المكوّنات على getState، لكننا نوفّرها
 * لأن المتجر نفسه يستعملها داخلياً في actions.
 */
export function makeMusicStoreMock(overrides: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = {
    tracks: MOCK_TRACKS,
    displayOrder: MOCK_TRACKS.map((t) => t.id),
    status: 'ready',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    queue: [],
    queueIndex: -1,
    favorites: [],
    playlists: [],
    history: [],
    playCounts: {},
    hydrateTracks: vi.fn().mockResolvedValue(undefined),
    actions: {
      playTrack: vi.fn().mockResolvedValue(undefined),
      setQueue: vi.fn(),
      setTracks: vi.fn(),
      setStatus: vi.fn(),
    },
    ...overrides,
  };

  const store = ((selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state) as unknown as {
      (selector?: (s: typeof state) => unknown): unknown;
      getState: () => typeof state;
      setState: (patch: Partial<typeof state>) => void;
      subscribe: () => () => void;
      getInitialState: () => typeof state;
    };

  store.getState = () => state;
  store.setState = (patch) => Object.assign(state, patch);
  store.subscribe = () => () => {};
  store.getInitialState = () => state;
  return store;
}
