import { useCallback } from 'react';
import { supabase } from '../../config/supabase';

export function useProfileRating() {
  const toggle = useCallback(async (target: string) => {
    const { data, error } = await supabase.rpc('toggle_profile_star', { target });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return row as { star_count: number; starred_by_me: boolean };
  }, []);
  const adminSet = useCallback(async (target: string, n: number) => {
    const { error } = await supabase.rpc('admin_set_star_bonus', { target, n });
    if (error) throw new Error(error.message);
  }, []);
  return { toggle, adminSet };
}
