/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { X, Users, Heart, ListMusic, RefreshCw, Activity, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { UserDetailPanel } from './UserDetailPanel';
import { useAdminDashboardState } from './useAdminDashboardState';
import { AdminTabPanels, TabButton } from './AdminTabPanels';

export interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const { user } = useAuth();
  const {
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
  } = useAdminDashboardState();

  if (!user || !isAdmin(user.email)) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin Dashboard"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white tracking-tight">Admin Dashboard</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh data"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<LayoutGrid size={14} />} label="Overview" />
          <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={14} />} label={`Users${users.length ? ` (${users.length})` : ''}`} />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity size={14} />} label="Activity" />
          <TabButton active={tab === 'top'} onClick={() => setTab('top')} icon={<Heart size={14} />} label="Top" />
          <TabButton active={tab === 'suggestions'} onClick={() => setTab('suggestions')} icon={<ListMusic size={14} />} label="Suggestions" />
          <TabButton active={tab === 'listening'} onClick={() => setTab('listening')} icon={<Activity size={14} />} label="Listening Stats" />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <p className="text-zinc-500 text-sm text-center py-12">Loading...</p>}
          {error && <p className="text-red-400 text-sm text-center py-4">{error}</p>}
          {!loading && !error && (
            <AdminTabPanels
              tab={tab}
              ov={ov}
              users={users}
              activity={activity}
              topSongs={topSongs}
              topMovies={topMovies}
              songNames={songNames}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              deleteSuggestion={deleteSuggestion}
              listeningOverview={listeningOverview}
              listeningLoading={listeningLoading}
              fetchListeningStats={fetchListeningStats}
              onSelectUser={setSelectedUserId}
            />
          )}
        </div>
      </div>
      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onDeleted={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;