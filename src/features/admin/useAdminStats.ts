import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth }   from '../../context/AuthContext';
import { isAdmin }   from '../../config/admin';

export interface AdminStats {
  total_users: number; total_song_favorites: number; total_movie_favorites: number;
  total_watched: number; total_watchlist: number; total_playlists: number;
}
export interface TopSong  { song_id: string;  favorite_count: number; }
export interface TopMovie { tmdb_id: number; media_type: string; title: string; favorite_count: number; }
export interface AdminUser {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  display_name: string | null; avatar_url: string | null; bio: string | null;
  song_favorites: number; playlists: number; movie_favorites: number; watched: number; watchlist: number;
  role: string | null; badge: string | null; frame?: string | null;
}
export interface ActivityRow { email: string; action: string; item: string; media_type: string | null; at: string; }

export function useAdminStats() {
  const { user } = useAuth();
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [topSongs, setTopSongs]   = useState<TopSong[]>([]);
  const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [activity, setActivity]   = useState<ActivityRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isAdmin(user.email)) return;
    setLoading(true); setError(null);
    const [statsRes, songsRes, moviesRes, usersRes, activityRes] = await Promise.all([
      supabase.from('admin_stats').select('*').single(),
      supabase.from('admin_top_songs').select('*'),
      supabase.from('admin_top_movies').select('*'),
      supabase.from('admin_user_list').select('*'),
      supabase.from('admin_recent_activity').select('*'),
    ]);
    if (statsRes.error) setError(statsRes.error.message); else setStats(statsRes.data as AdminStats);
    if (songsRes.data)    setTopSongs(songsRes.data   as TopSong[]);
    if (moviesRes.data)   setTopMovies(moviesRes.data as TopMovie[]);
    if (usersRes.data)    setUsers(usersRes.data      as AdminUser[]);
    if (activityRes.data) setActivity(activityRes.data as ActivityRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { stats, topSongs, topMovies, users, activity, loading, error, refresh: load };
}