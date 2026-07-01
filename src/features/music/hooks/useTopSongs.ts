import { useEffect, useState } from 'react';
import { supabase } from '../../../config/supabase';

export function useTopSongs(limit = 50): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void supabase
      .from('top_items')
      .select('item_id, rank')
      .eq('item_type', 'song')
      .order('rank', { ascending: true })
      .limit(limit)
      .then(({ data }) => { if (alive && data) setIds(data.map((r: { item_id: string }) => r.item_id)); });
    return () => { alive = false; };
  }, [limit]);
  return ids;
}
