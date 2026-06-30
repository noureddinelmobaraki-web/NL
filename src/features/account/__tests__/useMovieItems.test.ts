import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn()
}));

vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-uuid-001' } }),
}));

import { useMovieItems } from '../useMovieItems';

beforeEach(() => {
  mockFrom.mockReturnValue({
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    upsert:  vi.fn().mockResolvedValue({ error: null }),
    then:    vi.fn(cb => cb({ data: [], error: null })),
  });
});

describe('useMovieItems', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useMovieItems());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.favoriteCount).toBe(0);
    expect(result.current.watchedCount).toBe(0);
    expect(result.current.watchlistCount).toBe(0);
  });

  it('has() returns false for an unknown item', () => {
    const { result } = renderHook(() => useMovieItems());
    expect(result.current.has(99999, 'movie', 'favorite')).toBe(false);
  });

  it('toggle() adds item with optimistic update', async () => {
    const { result } = renderHook(() => useMovieItems());
    await act(async () => {
      await result.current.toggle(823464, 'movie', 'favorite', 'Dune: Part Two', '/poster.jpg');
    });
    expect(result.current.has(823464, 'movie', 'favorite')).toBe(true);
    expect(result.current.favoriteCount).toBe(1);
  });

  it('toggle() removes item on second call', async () => {
    const { result } = renderHook(() => useMovieItems());
    await act(async () => { await result.current.toggle(823464, 'movie', 'favorite'); });
    await act(async () => { await result.current.toggle(823464, 'movie', 'favorite'); });
    expect(result.current.has(823464, 'movie', 'favorite')).toBe(false);
    expect(result.current.favoriteCount).toBe(0);
  });

  it('statuses are independent per item', async () => {
    const { result } = renderHook(() => useMovieItems());
    await act(async () => {
      await result.current.toggle(823464, 'movie', 'favorite');
      await result.current.toggle(823464, 'movie', 'watched');
    });
    expect(result.current.has(823464, 'movie', 'favorite')).toBe(true);
    expect(result.current.has(823464, 'movie', 'watched')).toBe(true);
    expect(result.current.has(823464, 'movie', 'watchlist')).toBe(false);
  });

  it('favoriteCount excludes watched and watchlist entries', async () => {
    const { result } = renderHook(() => useMovieItems());
    await act(async () => {
      await result.current.toggle(1, 'movie',  'watched');
      await result.current.toggle(2, 'tv',     'watchlist');
      await result.current.toggle(3, 'movie',  'favorite');
    });
    expect(result.current.favoriteCount).toBe(1);
    expect(result.current.watchedCount).toBe(1);
    expect(result.current.watchlistCount).toBe(1);
  });

  it('movie and tv media_types are tracked independently', async () => {
    const { result } = renderHook(() => useMovieItems());
    await act(async () => {
      await result.current.toggle(823464, 'movie', 'favorite');
      await result.current.toggle(823464, 'tv',    'favorite');
    });
    expect(result.current.has(823464, 'movie', 'favorite')).toBe(true);
    expect(result.current.has(823464, 'tv',    'favorite')).toBe(true);
    expect(result.current.favoriteCount).toBe(2);
  });
});
