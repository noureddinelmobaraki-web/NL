import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMusicStore } from '../store/musicStore';
import { Plus, Check, X } from 'lucide-react';

export function AddToPlaylistModal({
  open, trackIds, onClose, onDone,
}: {
  open: boolean;
  trackIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const playlists = useMusicStore(useShallow((s) => s.playlists));
  const actions = useMusicStore((s) => s.actions);
  const [newName, setNewName] = useState('');

  if (!open) return null;

  const addExisting = (id: string) => {
    actions.addManyToPlaylist(id, trackIds);
    onDone();
  };
  const createAndAdd = () => {
    const name = newName.trim();
    if (!name) return;
    actions.addTracksToNewPlaylist(name, trackIds);
    setNewName('');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-slate-900">Add {trackIds.length} song(s)</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd(); }}
            placeholder="New playlist..."
            className="flex-1 bg-slate-100 rounded-2xl px-3 py-2 text-sm text-slate-800 placeholder-slate-500 outline-none focus:ring-2 ring-[#FF7A1A]"
          />
          <button onClick={createAndAdd} className="p-2 rounded-2xl bg-[#FF7A1A] text-white"><Plus size={18} /></button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No playlists yet. Create one above.</p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => addExisting(pl.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 text-left transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{pl.name}</p>
                  <p className="text-xs text-slate-500">{pl.trackIds.length} songs</p>
                </div>
                <Check size={16} className="text-[#00C853]" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
