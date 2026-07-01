import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

export interface TopMovieRow { tmdb_id: number; media_type: string; title: string | null; }

/** kind: 'movie' أو 'series' */
export function useTopMovies(kind: 'movie' | 'series', limit = 20): TopMovieRow[] {
  const [rows, setRows] = useState<TopMovieRow[]>([]);
  useEffect(() => {
    let alive = true;
    void supabase
      .from('top_items')
      .select('item_id, media_type, title, rank')
      .eq('item_type', kind)
      .order('rank', { ascending: true })
      .limit(limit)
      .then(({ data }) => {
        if (!alive || !data) return;
        setRows(data.map((r: { item_id: string; media_type: string | null; title: string | null }) => ({
          tmdb_id: Number(r.item_id),
          media_type: r.media_type ?? (kind === 'series' ? 'tv' : 'movie'),
          title: r.title,
        })));
      });
    return () => { alive = false; };
  }, [kind, limit]);
  return rows;
}
