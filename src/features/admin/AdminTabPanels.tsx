/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { X, Users, Heart, Eye, Bookmark, ListMusic, Music, Film } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { RoleBadgeChips } from '../account/roleBadge';
import type { AdminTab, SuggestionRow } from './useAdminDashboardState';

type Color = 'blue' | 'red' | 'purple' | 'emerald' | 'amber' | 'sky';
const colorMap: Record<Color, string> = {
  blue: 'text-blue-400 bg-blue-900/20 border-blue-800/50',
  red: 'text-red-400 bg-red-900/20 border-red-800/50',
  purple: 'text-purple-400 bg-purple-900/20 border-purple-800/50',
  emerald: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50',
  amber: 'text-amber-400 bg-amber-900/20 border-amber-800/50',
  sky: 'text-sky-400 bg-sky-900/20 border-sky-800/50',
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | undefined; color: Color }) {
  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 opacity-80">{icon}<span className="text-xs">{label}</span></div>
      <span className="text-2xl font-bold tracking-tight">{(value ?? 0).toLocaleString()}</span>
    </div>
  );
}

const actionColor: Record<string, string> = {
  song_favorite: 'text-red-400 bg-red-900/20',
  favorite: 'text-purple-400 bg-purple-900/20',
  watched: 'text-emerald-400 bg-emerald-900/20',
  watchlist: 'text-amber-400 bg-amber-900/20',
};

function ActionBadge({ action }: { action: string }) {
  const cls = actionColor[action] ?? 'text-zinc-400 bg-zinc-800';
  const label = action === 'song_favorite' ? 'song' : action;
  return <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}

export function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${active ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
    >
      {icon}{label}
    </button>
  );
}

interface AdminTabPanelsProps {
  tab: AdminTab;
  ov: Record<string, number>;
  users: any[];
  activity: any[];
  topSongs: any[];
  topMovies: any[];
  songNames: Map<string, string>;
  suggestions: SuggestionRow[];
  suggestionsLoading: boolean;
  deleteSuggestion: (id: string) => void;
  listeningOverview: any[];
  listeningLoading: boolean;
  fetchListeningStats: () => Promise<void>;
  onSelectUser: (id: string) => void;
}

export function AdminTabPanels({
  tab,
  ov,
  users,
  activity,
  topSongs,
  topMovies,
  songNames,
  suggestions,
  suggestionsLoading,
  deleteSuggestion,
  listeningOverview,
  listeningLoading,
  fetchListeningStats,
  onSelectUser,
}: AdminTabPanelsProps) {
  return (
    <>
      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={<Users size={16} />} label="Total Users" value={ov.total_users} color="blue" />
          <StatCard icon={<Heart size={16} />} label="Song Favorites" value={ov.total_song_favorites} color="red" />
          <StatCard icon={<Film size={16} />} label="Movie Favorites" value={ov.total_movie_favorites} color="purple" />
          <StatCard icon={<Eye size={16} />} label="Watched" value={ov.total_watched} color="emerald" />
          <StatCard icon={<Bookmark size={16} />} label="Watchlist" value={ov.total_watchlist} color="amber" />
          <StatCard icon={<ListMusic size={16} />} label="Playlists" value={ov.total_playlists} color="sky" />
        </div>
      )}
      {tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 px-2 font-semibold text-center" title="Song favorites"><Music size={12} className="inline" /></th>
                <th className="py-2 px-2 font-semibold text-center" title="Playlists"><ListMusic size={12} className="inline" /></th>
                <th className="py-2 px-2 font-semibold text-center" title="Movie favorites"><Film size={12} className="inline" /></th>
                <th className="py-2 px-2 font-semibold text-center" title="Watched"><Eye size={12} className="inline" /></th>
                <th className="py-2 px-2 font-semibold text-center" title="Watchlist"><Bookmark size={12} className="inline" /></th>
                <th className="py-2 pl-2 font-semibold text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => onSelectUser(u.id)} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer">
                  <td className="py-2 pr-3">
                    <div className="flex flex-col">
                      <span className="text-zinc-200 font-medium">{u.display_name || '—'}</span>
                      <span className="text-[11px] text-zinc-500">{u.email}</span>
                      <RoleBadgeChips role={u.role} badge={u.badge} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300">{u.song_favorites}</td>
                  <td className="py-2 px-2 text-center text-zinc-300">{u.playlists}</td>
                  <td className="py-2 px-2 text-center text-zinc-300">{u.movie_favorites}</td>
                  <td className="py-2 px-2 text-center text-zinc-300">{u.watched}</td>
                  <td className="py-2 px-2 text-center text-zinc-300">{u.watchlist}</td>
                  <td className="py-2 pl-2 text-right text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-zinc-600">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'activity' && (
        <div className="space-y-1.5">
          {activity.map((a, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <ActionBadge action={a.action} />
                <span className="text-xs text-zinc-300 truncate">{a.item}</span>
                {a.media_type && <span className="text-[10px] text-zinc-600 uppercase">{a.media_type}</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-zinc-500">{a.email}</span>
                <span className="text-[11px] text-zinc-600">{new Date(a.at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {activity.length === 0 && <p className="py-8 text-center text-zinc-600 text-sm">No activity yet.</p>}
        </div>
      )}
      {tab === 'top' && (
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"><Music size={14} /> Top Favorited Songs</h3>
            <div className="space-y-1.5">
              {topSongs.map((s, i) => (
                <div key={s.song_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <span className="text-xs text-zinc-300"><span className="text-zinc-600 mr-2 font-mono">{i + 1}.</span>{songNames.get(s.song_id) ?? s.song_id}</span>
                  <span className="text-xs font-bold text-red-400">{s.favorite_count}</span>
                </div>
              ))}
              {topSongs.length === 0 && <p className="text-zinc-600 text-xs py-4">No data.</p>}
            </div>
          </section>
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"><Film size={14} /> Top Favorited Movies</h3>
            <div className="space-y-1.5">
              {topMovies.map((m, i) => (
                <div key={`${m.tmdb_id}-${m.media_type}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-zinc-600 font-mono">{i + 1}.</span>
                    <span className="text-xs text-zinc-300 truncate">{m.title}</span>
                    <span className="text-[10px] text-zinc-600 uppercase">{m.media_type}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-400">{m.favorite_count}</span>
                </div>
              ))}
              {topMovies.length === 0 && <p className="text-zinc-600 text-xs py-4">No data.</p>}
            </div>
          </section>
        </div>
      )}
      {tab === 'suggestions' && (
        <div className="space-y-3">
          {suggestionsLoading && <p className="text-zinc-500 text-xs text-center py-4">Loading suggestions...</p>}
          {!suggestionsLoading && suggestions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/40 relative group">
              <button
                onClick={() => deleteSuggestion(s.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Suggestion"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">{s.display_name ?? 'User'}</span>
                <span className="text-[10px] text-zinc-500">{s.email ?? ''}</span>
                <span className="text-[10px] text-zinc-600 mr-auto">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-zinc-300 bg-black/25 p-3 rounded-lg border border-white/5 white-space-pre-wrap">{s.text}</p>
            </div>
          ))}
          {!suggestionsLoading && suggestions.length === 0 && (
            <p className="py-8 text-center text-zinc-600 text-xs">No current suggestions.</p>
          )}
        </div>
      )}
      {tab === 'listening' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
            <div>
              <h4 className="text-xs font-bold text-zinc-300">Manage Stats (Stats Controls)</h4>
              <p className="text-[10px] text-zinc-500">Platform-wide Actions</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to send the report?')) return;
                  const { error } = await supabase.rpc('admin_send_report');
                  if (error) {
                    alert('Failed to send report: ' + error.message);
                  } else {
                    alert('Report sent successfully!');
                  }
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold text-[11px] cursor-pointer"
              >
                Send Report (Send Report)
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Warning: Are you sure you want to reset all stats for all users? This cannot be undone.')) return;
                  const { error } = await supabase.rpc('admin_reset_all_stats');
                  if (error) {
                    alert('Failed to reset: ' + error.message);
                  } else {
                    alert('All stats reset successfully!');
                    void fetchListeningStats();
                  }
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[11px] cursor-pointer"
              >
                Reset All (Reset All Stats)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-3 font-semibold text-right">User (User)</th>
                  <th className="py-2 px-2 font-semibold text-center">Songs (Songs)</th>
                  <th className="py-2 px-2 font-semibold text-center">Movies (Movies)</th>
                  <th className="py-2 px-2 font-semibold text-center">Series (Series)</th>
                  <th className="py-2 pl-2 font-semibold text-left">Actions (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {listeningLoading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">Loading......</td>
                  </tr>
                )}
                {!listeningLoading && listeningOverview.map((row, i) => {
                  const songsCount = row.song_plays ?? row.songs_played ?? row.songs_count ?? 0;
                  const moviesCount = row.movie_plays ?? row.movies_played ?? row.movies_count ?? 0;
                  const seriesCount = row.series_plays ?? row.series_played ?? row.series_count ?? 0;
                  const rowUserId = row.user_id ?? row.id ?? `user-${i}`;

                  return (
                    <tr key={rowUserId} className="border-b border-zinc-800/50 hover:bg-zinc-800/40">
                      <td className="py-2 pr-3 text-right">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-medium">{row.display_name || '—'}</span>
                          <span className="text-[11px] text-zinc-500">{row.email || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center text-zinc-300 font-mono">{songsCount}</td>
                      <td className="py-2 px-2 text-center text-zinc-300 font-mono">{moviesCount}</td>
                      <td className="py-2 px-2 text-center text-zinc-300 font-mono">{seriesCount}</td>
                      <td className="py-2 pl-2 text-left">
                        <div className="flex justify-start gap-1.5">
                          <button
                            onClick={async () => {
                              const { data, error } = await supabase.rpc('admin_user_report', { p_user_id: rowUserId });
                              if (error) {
                                alert('Failed to fetch report: ' + error.message);
                              } else {
                                alert('User Report:\n' + JSON.stringify(data, null, 2));
                              }
                            }}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer"
                            title="Single User Report"
                          >
                            Report (Report)
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`هل أنت متأكد من حذف إحصائيات الاستماع للمستخدم ${row.display_name || ''}؟`)) return;
                              const { error } = await supabase.rpc('admin_delete_user_stats', { p_user_id: rowUserId });
                              if (error) {
                                alert('Failed to delete: ' + error.message);
                              } else {
                                alert('User stats deleted successfully!');
                                void fetchListeningStats();
                              }
                            }}
                            className="px-2 py-1 bg-red-900/50 hover:bg-red-800 border border-red-800/40 text-red-200 rounded text-[10px] cursor-pointer"
                            title="Delete specific user"
                          >
                            Delete (Delete)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!listeningLoading && listeningOverview.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-600 text-xs">No listening stats yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
