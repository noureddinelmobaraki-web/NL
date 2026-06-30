import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

export interface AdminUserDetail {
  profile: {
    id: string; display_name: string | null; avatar_url: string | null;
    bio: string | null; created_at: string; frame: string; role: string | null;
    badge: string | null; admin_note: string | null; display_name_changed_at: string | null;
    email: string | null; admin_note_updated_at: string | null;
  };
  song_favorites: Array<{ song_id: string; added_at: string; is_featured: boolean; featured_rank: number | null }>;
  movie_items: Array<{ tmdb_id: number; media_type: string; status: string; title: string; poster_path: string }>;
  stats: { song_count: number; movie_count: number; play_count: number };
}

export function useAdminUser(targetId: string | null) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!targetId) return;
    setLoading(true); setError(null);
    const { data: res, error } = await supabase.rpc('admin_user_detail', { target: targetId });
    if (error) setError(error.message);
    else setData(res as AdminUserDetail);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { void reload(); }, [reload]);

  // ---- mutations (all RPC, server-guarded) ----
  const call = useCallback(async (fn: string, args: Record<string, unknown>) => {
    const { error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    await reload();
  }, [reload]);

  const setFrame = (frame: string, role: string | null, badge: string | null) =>
    call('admin_set_frame', { target: targetId, p_frame: frame, p_role: role, p_badge: badge });
  const setNote = (note: string) =>
    call('admin_set_note', { target: targetId, p_note: note });
  const updateProfile = (p: { display_name?: string; bio?: string; avatar_url?: string; frame?: string; role?: string; badge?: string; admin_note?: string }) =>
    call('admin_update_profile', {
      target: targetId,
      p_display_name: p.display_name ?? null, p_bio: p.bio ?? null, p_avatar_url: p.avatar_url ?? null,
      p_frame: p.frame ?? null, p_role: p.role ?? null, p_badge: p.badge ?? null, p_admin_note: p.admin_note ?? null,
    });
  const deleteSong = (songId: string) =>
    call('admin_delete_song_favorite', { target: targetId, p_song_id: songId });
  const deleteMovie = (k: { tmdb_id: number; media_type: string; status: string }) =>
    call('admin_delete_movie_item', { target: targetId, p_tmdb: k.tmdb_id, p_media: k.media_type, p_status: k.status });
  const deleteUser = (purgeAuth: boolean) =>
    call('admin_delete_user', { target: targetId, p_purge_auth: purgeAuth });

  return { data, loading, error, reload, setFrame, setNote, updateProfile, deleteSong, deleteMovie, deleteUser };
}
