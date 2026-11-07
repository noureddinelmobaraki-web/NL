/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../config/supabase';
import { useAdminStats } from './useAdminStats';
import { useMusicStore } from '../music/store/musicStore';

export type AdminTab = 'overview' | 'users' | 'activity' | 'top' | 'suggestions' | 'listening';

export interface SuggestionRow {
  id: string;
  text: string;
  status: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export function useAdminDashboardState() {
  const { stats, topSongs = [], topMovies = [], users = [], activity = [], loading, error, refresh } = useAdminStats();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [listeningOverview, setListeningOverview] = useState<any[]>([]);
  const [listeningLoading, setListeningLoading] = useState(false);

  const fetchListeningStats = async () => {
    setListeningLoading(true);
    const { data, error } = await supabase.rpc('admin_listening_overview');
    if (error) {
      console.error('admin_listening_overview failed:', error.message);
    } else if (data) {
      setListeningOverview(data as any[]);
    }
    setListeningLoading(false);
  };

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    const { data, error } = await supabase.rpc('admin_list_song_suggestions');
    if (error) console.error('admin_list_song_suggestions failed:', error.message);
    if (!error && data) setSuggestions(data as SuggestionRow[]);
    setSuggestionsLoading(false);
  };

  const deleteSuggestion = async (id: string) => {
    if (!window.confirm('Delete this suggestion?')) return;
    const { error } = await supabase.rpc('admin_delete_suggestion', { p_id: id });
    if (error) {
      console.error('admin_delete_suggestion failed:', error.message);
      return;
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  useEffect(() => {
    if (tab === 'suggestions') {
      void fetchSuggestions();
    }
    if (tab === 'listening') {
      void fetchListeningStats();
    }
  }, [tab]);

  const allTracks = useMusicStore((s) => s.tracks);
  const songNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTracks) m.set(t.id, `${t.title} — ${t.artist}`);
    return m;
  }, [allTracks]);

  const ov = {
    total_users: stats?.total_users ?? users.length,
    total_song_favorites: stats?.total_song_favorites ?? users.reduce((s, u) => s + (u.song_favorites ?? 0), 0),
    total_movie_favorites: stats?.total_movie_favorites ?? users.reduce((s, u) => s + (u.movie_favorites ?? 0), 0),
    total_watched: stats?.total_watched ?? users.reduce((s, u) => s + (u.watched ?? 0), 0),
    total_watchlist: stats?.total_watchlist ?? users.reduce((s, u) => s + (u.watchlist ?? 0), 0),
    total_playlists: stats?.total_playlists ?? users.reduce((s, u) => s + (u.playlists ?? 0), 0),
  };

  return {
    tab,
    setTab,
    selectedUserId,
    setSelectedUserId,
    topSongs,
    topMovies,
    users,
    activity,
    loading,
    error,
    refresh,
    suggestions,
    suggestionsLoading,
    deleteSuggestion,
    listeningOverview,
    listeningLoading,
    fetchListeningStats,
    songNames,
    ov,
  };
}
