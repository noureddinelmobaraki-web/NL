import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMusicStore } from '../store/musicStore';
import { Track } from '../engine/types';
import { Plus, Trash2, Shuffle, DownloadCloud, ChevronLeft, X, Music2 } from 'lucide-react';
import { CreatePlaylistModal } from './CreatePlaylistModal';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

export function PlaylistsPanel({ onOpenPlayer, online }: { onOpenPlayer?: () => void; online: boolean }) {
  const playlists = useMusicStore(useShallow((s) => s.playlists));
  const downloaded = useMusicStore(useShallow((s) => s.downloaded));
  const currentId = useMusicStore((s) => s.currentId);
  const actions = useMusicStore((s) => s.actions);

  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dlAll, setDlAll] = useState<'idle' | 'busy' | 'done'>('idle');

  const dlSet = useMemo(() => new Set(downloaded), [downloaded]);

  // Resolve a playlist's track IDs into Track objects (reactive to playlist edits).
  const tracksFor = useMemo(() => {
    return (id: string): Track[] => {
      const st = useMusicStore.getState();
      const map = new Map(st.tracks.map((t) => [t.id, t] as const));
      const pl = st.playlists.find((p) => p.id === id);
      if (!pl) return [];
      return pl.trackIds.map((tid) => map.get(tid)).filter((t): t is Track => !!t);
    };
  }, []);

  const openPlaylist = playlists.find((p) => p.id === openId) || null;
  const openTracks = useMemo(
    () => {
      // reference playlists to satisfy dependency checklist
      void playlists;
      return openId ? tracksFor(openId) : [];
    },
    [openId, playlists, tracksFor],
  );
  const visibleTracks = useMemo(
    () => (online ? openTracks : openTracks.filter((t) => dlSet.has(t.id))),
    [online, openTracks, dlSet],
  );

  const playShuffled = (list: Track[]) => {
    if (list.length === 0) return;
    const order = shuffle(list).map((t) => t.id);
    actions.setQueue(order, 0);
    actions.playTrack(order[0]);
    onOpenPlayer?.();
  };

  const downloadAll = async (list: Track[]) => {
    setDlAll('busy');
    await actions.saveManyOffline(list);
    setDlAll('done');
    setTimeout(() => setDlAll('idle'), 1500);
  };

  // ---------- Detail view ----------
  if (openPlaylist) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-2 px-1 pb-2">
          <button onClick={() => setOpenId(null)} className="p-1.5 rounded-full hover:bg-white/60 text-slate-700">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-base font-extrabold text-slate-900 truncate flex-1">{openPlaylist.name}</h3>
          <span className="text-xs text-slate-600">{openPlaylist.trackIds.length} songs</span>
        </div>
        <div className="flex items-center gap-2 px-1 pb-2">
          <button
            onClick={() => playShuffled(visibleTracks)}
            disabled={visibleTracks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF7A1A] text-white text-sm font-bold disabled:opacity-40 hover:brightness-105"
          >
            <Shuffle size={16} /> Shuffle play
          </button>
          {online && (
            <button
              onClick={() => downloadAll(openTracks)}
              disabled={dlAll === 'busy' || openTracks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00E676] text-slate-900 text-sm font-bold disabled:opacity-40 hover:brightness-105"
            >
              <DownloadCloud size={16} /> {dlAll === 'busy' ? 'Saving...' : dlAll === 'done' ? 'Saved' : 'Download all'}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {visibleTracks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 px-6 text-center">
              {online ? 'This playlist is empty. Add songs from the list using Select.' : 'No downloaded songs in this playlist.'}
            </div>
          ) : (
            visibleTracks.map((t) => {
              const saved = dlSet.has(t.id);
              const isCur = t.id === currentId;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    const order = visibleTracks.map((x) => x.id);
                    actions.setQueue(order, order.indexOf(t.id));
                    actions.playTrack(t.id);
                    onOpenPlayer?.();
                  }}
                  className={'group flex items-center gap-3 p-3 mx-1 my-0.5 rounded-2xl cursor-pointer transition-colors ' + (isCur ? 'bg-white/80 border border-[#34E89E]/60' : 'hover:bg-white/40 border border-transparent')}
                >
                  <Music2 size={16} className={saved ? 'text-[#00E676] shrink-0' : 'text-slate-400 shrink-0'} />
                  <div className="flex-1 overflow-hidden">
                    <p className={'text-sm font-bold truncate ' + (saved ? 'text-[#00B894]' : 'text-slate-800')}>{t.title}</p>
                    <p className="text-xs text-slate-600 truncate">{t.artist}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); actions.removeFromPlaylist(openPlaylist.id, t.id); }}
                    className="p-1.5 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                    title="Remove from playlist"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ---------- Index view ----------
  return (
    <div className="flex flex-col h-full min-h-0">
      {online && (
        <div className="flex items-center gap-2 px-1 pb-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#00E676] text-white text-sm font-bold hover:brightness-105"
          >
            <Plus size={18} /> Create Playlist
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {playlists.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 px-6 text-center">
            No playlists yet. Create one above, then add songs with the Select button.
          </div>
        ) : (
          playlists.map((pl) => {
            const savedCount = pl.trackIds.filter((id) => dlSet.has(id)).length;
            return (
              <div
                key={pl.id}
                onClick={() => setOpenId(pl.id)}
                className="group flex items-center gap-3 p-3 mx-1 my-0.5 rounded-2xl cursor-pointer hover:bg-white/40 border border-transparent transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7A1A] to-[#00E676] flex items-center justify-center text-white shrink-0">
                  <Music2 size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 truncate">{pl.name}</p>
                  <p className="text-xs text-slate-600 truncate">{pl.trackIds.length} songs · {savedCount} offline</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); const ts = tracksFor(pl.id); playShuffled(online ? ts : ts.filter((t) => dlSet.has(t.id))); }}
                  className="p-2 rounded-full text-slate-600 opacity-0 group-hover:opacity-100 hover:text-[#FF7A1A] transition"
                  title="Shuffle play"
                >
                  <Shuffle size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this playlist?')) actions.deletePlaylist(pl.id); }}
                  className="p-2 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                  title="Delete playlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setOpenId(id)} />
    </div>
  );
}
