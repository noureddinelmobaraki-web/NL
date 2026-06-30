import React, { useState } from 'react';
import { X, Users, Heart, Eye, Bookmark, ListMusic, Music, Film, RefreshCw, Activity, LayoutGrid } from 'lucide-react';
import { useAdminStats } from './useAdminStats';
import { useAuth }       from '../../context/AuthContext';
import { isAdmin }       from '../../config/admin';

interface AdminDashboardProps { onClose: () => void; }
type Tab = 'overview' | 'users' | 'activity' | 'top';

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const { user } = useAuth();
  const { stats, topSongs, topMovies, users, activity, loading, error, refresh } = useAdminStats();
  const [tab, setTab] = useState<Tab>('overview');
  if (!user || !isAdmin(user.email)) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Admin Dashboard"
         className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white tracking-tight">Admin Dashboard</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void refresh()} aria-label="Refresh data"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer">
              <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close admin dashboard"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer">
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
          <TabButton active={tab==='overview'} onClick={()=>setTab('overview')} icon={<LayoutGrid size={14}/>} label="Overview" />
          <TabButton active={tab==='users'}    onClick={()=>setTab('users')}    icon={<Users size={14}/>}      label={`Users${users.length?` (${users.length})`:''}`} />
          <TabButton active={tab==='activity'} onClick={()=>setTab('activity')} icon={<Activity size={14}/>}   label="Activity" />
          <TabButton active={tab==='top'}      onClick={()=>setTab('top')}      icon={<Heart size={14}/>}      label="Top" />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <p className="text-zinc-500 text-sm text-center py-12">Loading...</p>}
          {error   && <p className="text-red-400 text-sm text-center py-4">{error}</p>}
          {!loading && !error && (<>
            {tab==='overview' && stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard icon={<Users size={16}/>}     label="Total Users"     value={stats.total_users}           color="blue" />
                <StatCard icon={<Heart size={16}/>}     label="Song Favorites"  value={stats.total_song_favorites}  color="red" />
                <StatCard icon={<Film size={16}/>}      label="Movie Favorites" value={stats.total_movie_favorites} color="purple" />
                <StatCard icon={<Eye size={16}/>}       label="Watched"         value={stats.total_watched}         color="emerald" />
                <StatCard icon={<Bookmark size={16}/>}  label="Watchlist"       value={stats.total_watchlist}       color="amber" />
                <StatCard icon={<ListMusic size={16}/>} label="Playlists"       value={stats.total_playlists}       color="sky" />
              </div>
            )}
            {tab==='users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="py-2 pr-3 font-semibold">User</th>
                    <th className="py-2 px-2 font-semibold text-center" title="Song favorites"><Music size={12} className="inline"/></th>
                    <th className="py-2 px-2 font-semibold text-center" title="Playlists"><ListMusic size={12} className="inline"/></th>
                    <th className="py-2 px-2 font-semibold text-center" title="Movie favorites"><Film size={12} className="inline"/></th>
                    <th className="py-2 px-2 font-semibold text-center" title="Watched"><Eye size={12} className="inline"/></th>
                    <th className="py-2 px-2 font-semibold text-center" title="Watchlist"><Bookmark size={12} className="inline"/></th>
                    <th className="py-2 pl-2 font-semibold text-right">Joined</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u)=>(
                      <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40">
                        <td className="py-2 pr-3"><div className="flex flex-col">
                          <span className="text-zinc-200 font-medium">{u.display_name || '—'}</span>
                          <span className="text-[11px] text-zinc-500">{u.email}</span>
                        </div></td>
                        <td className="py-2 px-2 text-center text-zinc-300">{u.song_favorites}</td>
                        <td className="py-2 px-2 text-center text-zinc-300">{u.playlists}</td>
                        <td className="py-2 px-2 text-center text-zinc-300">{u.movie_favorites}</td>
                        <td className="py-2 px-2 text-center text-zinc-300">{u.watched}</td>
                        <td className="py-2 px-2 text-center text-zinc-300">{u.watchlist}</td>
                        <td className="py-2 pl-2 text-right text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {users.length===0 && <tr><td colSpan={7} className="py-8 text-center text-zinc-600">No users yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {tab==='activity' && (
              <div className="space-y-1.5">
                {activity.map((a,i)=>(
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
                {activity.length===0 && <p className="py-8 text-center text-zinc-600 text-sm">No activity yet.</p>}
              </div>
            )}
            {tab==='top' && (
              <div className="grid md:grid-cols-2 gap-6">
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"><Music size={14}/> Top Favorited Songs</h3>
                  <div className="space-y-1.5">
                    {topSongs.map((s,i)=>(
                      <div key={s.song_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                        <span className="text-xs text-zinc-400 font-mono"><span className="text-zinc-600 mr-2">{i+1}.</span>{s.song_id}</span>
                        <span className="text-xs font-bold text-red-400">{s.favorite_count}</span>
                      </div>
                    ))}
                    {topSongs.length===0 && <p className="text-zinc-600 text-xs py-4">No data.</p>}
                  </div>
                </section>
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"><Film size={14}/> Top Favorited Movies</h3>
                  <div className="space-y-1.5">
                    {topMovies.map((m,i)=>(
                      <div key={`${m.tmdb_id}-${m.media_type}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-zinc-600 font-mono">{i+1}.</span>
                          <span className="text-xs text-zinc-300 truncate">{m.title}</span>
                          <span className="text-[10px] text-zinc-600 uppercase">{m.media_type}</span>
                        </div>
                        <span className="text-xs font-bold text-purple-400">{m.favorite_count}</span>
                      </div>
                    ))}
                    {topMovies.length===0 && <p className="text-zinc-600 text-xs py-4">No data.</p>}
                  </div>
                </section>
              </div>
            )}
          </>)}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${active ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
      {icon}{label}
    </button>
  );
}

type Color = 'blue' | 'red' | 'purple' | 'emerald' | 'amber' | 'sky';
const colorMap: Record<Color, string> = {
  blue: 'text-blue-400 bg-blue-900/20 border-blue-800/50',
  red: 'text-red-400 bg-red-900/20 border-red-800/50',
  purple: 'text-purple-400 bg-purple-900/20 border-purple-800/50',
  emerald: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50',
  amber: 'text-amber-400 bg-amber-900/20 border-amber-800/50',
  sky: 'text-sky-400 bg-sky-900/20 border-sky-800/50',
};
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: Color }) {
  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 opacity-80">{icon}<span className="text-xs">{label}</span></div>
      <span className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</span>
    </div>
  );
}
const actionColor: Record<string, string> = {
  song_favorite: 'text-red-400 bg-red-900/20', favorite: 'text-purple-400 bg-purple-900/20',
  watched: 'text-emerald-400 bg-emerald-900/20', watchlist: 'text-amber-400 bg-amber-900/20',
};
function ActionBadge({ action }: { action: string }) {
  const cls = actionColor[action] ?? 'text-zinc-400 bg-zinc-800';
  const label = action === 'song_favorite' ? 'song' : action;
  return <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}