import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../config/supabase';

export interface DirectoryRow {
  id: string; display_name: string | null; avatar_url: string | null; bio: string | null;
  frame: string | null; role: string | null; badge: string | null; created_at: string;
  star_count: number; starred_by_me: boolean;
}

export function useAccountsDirectory() {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc('list_profiles', { p_search: q || null, p_limit: 80, p_offset: 0 });
    if (error) setError(error.message);
    else setRows((data ?? []) as DirectoryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(''); }, [load]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(search.trim()), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search, load]);

  return { rows, loading, error, search, setSearch, reload: () => load(search.trim()) };
}
