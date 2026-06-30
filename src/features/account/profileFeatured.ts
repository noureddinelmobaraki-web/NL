import { supabase } from '../../config/supabase';

export const FEATURED_MAX = 10;

export interface SongFavRow {
  song_id: string;
  added_at: string;
  is_featured: boolean;
  featured_rank: number | null;
}

export interface MovieFavRow {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  status: 'favorite' | 'watched' | 'watchlist';
  title: string;
  poster_path: string;
  is_featured: boolean;
  featured_rank: number | null;
}

/** All song favorites for a user, featured first (by rank), then newest. */
export async function fetchSongFavorites(userId: string): Promise<SongFavRow[]> {
  const { data, error } = await supabase
    .from('song_favorites')
    .select('song_id, added_at, is_featured, featured_rank')
    .eq('user_id', userId)
    .order('featured_rank', { ascending: true })
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SongFavRow[];
}

/** All movie favorites (status = 'favorite') for a user. */
export async function fetchMovieFavorites(userId: string): Promise<MovieFavRow[]> {
  const { data, error } = await supabase
    .from('movie_items')
    .select('tmdb_id, media_type, status, title, poster_path, is_featured, featured_rank')
    .eq('user_id', userId)
    .eq('status', 'favorite')
    .order('featured_rank', { ascending: true })
    .order('title', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MovieFavRow[];
}

/** Set/clear a featured rank (null clears). Unique partial index enforces 1 row per rank. */
export async function setSongFeatured(userId: string, songId: string, rank: number | null) {
  const { error } = await supabase
    .from('song_favorites')
    .update({ is_featured: rank != null, featured_rank: rank })
    .eq('user_id', userId)
    .eq('song_id', songId);
  if (error) throw error;
}

export async function setMovieFeatured(
  userId: string,
  key: { tmdb_id: number; media_type: 'movie' | 'tv'; status: string },
  rank: number | null,
) {
  const { error } = await supabase
    .from('movie_items')
    .update({ is_featured: rank != null, featured_rank: rank })
    .eq('user_id', userId)
    .eq('tmdb_id', key.tmdb_id)
    .eq('media_type', key.media_type)
    .eq('status', key.status);
  if (error) throw error;
}
