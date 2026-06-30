import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

export type MovieStatus = 'favorite' | 'watched' | 'watchlist';

export interface MovieItemRecord {
  tmdb_id:     number;
  media_type:  'movie' | 'tv';
  status:      MovieStatus;
  title:       string;
  poster_path: string;
}

type ItemKey = string; // ${tmdb_id}::${media_type}::${status}

function makeKey(tmdbId: number, mediaType: 'movie' | 'tv', status: MovieStatus): ItemKey {
  return `${tmdbId}::${mediaType}::${status}`;
}

export function useMovieItems() {
  const { user } = useAuth();
  const [items, setItems]     = useState<MovieItemRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // O(1) lookup map, recalculated only when items changes
  const keySet = useMemo<Set<ItemKey>>(() => {
    const s = new Set<ItemKey>();
    items.forEach(i => s.add(makeKey(i.tmdb_id, i.media_type, i.status)));
    return s;
  }, [items]);

  const has = useCallback(
    (tmdbId: number, mediaType: 'movie' | 'tv', status: MovieStatus): boolean =>
      keySet.has(makeKey(tmdbId, mediaType, status)),
    [keySet]
  );

  const toggle = useCallback(
    async (
      tmdbId:     number,
      mediaType:  'movie' | 'tv',
      status:     MovieStatus,
      title?:     string,
      posterPath?: string
    ) => {
      if (!user) return;
      const exists = keySet.has(makeKey(tmdbId, mediaType, status));

      // Optimistic update — instant UI response
      setItems(prev =>
        exists
          ? prev.filter(i => !(i.tmdb_id === tmdbId && i.media_type === mediaType && i.status === status))
          : [...prev, { tmdb_id: tmdbId, media_type: mediaType, status, title: title ?? '', poster_path: posterPath ?? '' }]
      );

      if (exists) {
        await supabase
          .from('movie_items')
          .delete()
          .eq('user_id',    user.id)
          .eq('tmdb_id',    tmdbId)
          .eq('media_type', mediaType)
          .eq('status',     status);
      } else {
        await supabase.from('movie_items').upsert({
          user_id:     user.id,
          tmdb_id:     tmdbId,
          media_type:  mediaType,
          status,
          title:       title       ?? '',
          poster_path: posterPath  ?? '',
        });
      }
    },
    [user, keySet]
  );

  // Initial load
  useEffect(() => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    supabase
      .from('movie_items')
      .select('tmdb_id, media_type, status, title, poster_path')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setItems(data as MovieItemRecord[]);
        setLoading(false);
      });
  }, [user]);

  // Realtime subscription — sync across tabs/devices
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`movie_items:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movie_items', filter: `user_id=eq.${user.id}` },
        () => {
          supabase
            .from('movie_items')
            .select('tmdb_id, media_type, status, title, poster_path')
            .eq('user_id', user.id)
            .then(({ data }) => { if (data) setItems(data as MovieItemRecord[]); });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    items,
    loading,
    has,
    toggle,
    favoriteCount:  items.filter(i => i.status === 'favorite').length,
    watchedCount:   items.filter(i => i.status === 'watched').length,
    watchlistCount: items.filter(i => i.status === 'watchlist').length,
  };
}
