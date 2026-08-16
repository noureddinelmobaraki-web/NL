import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, Share2, Send, Music, Search, Loader2, X, User
} from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../config/supabase';
import { invalidateProfile } from '../../accounts/profileCache';
import { shareSong } from '../data/shareSong';
import type { Track } from '../engine/types';

interface NowPlayingMenuProps {
  track: Track;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
  exit: { opacity: 0, y: 15 }
};

export function NowPlayingMenu({ track, onClose }: NowPlayingMenuProps) {
  const { user, openAuthModal } = useAuth();
  const playlists = useMusicStore((s) => s.playlists);
  const actions = useMusicStore((s) => s.actions);

  const [activeModal, setActiveModal] = useState<'playlist' | 'send' | 'login-prompt' | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Playlists State
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Send to User State
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sending, setSending] = useState(false);

  const showSuccess = (msg: string) => {
    setStatusMsg({ type: 'success', text: msg });
  };

  const showError = (msg: string) => {
    setStatusMsg({ type: 'error', text: msg });
  };

  // 1. Set as Profile Song
  const handleSetProfileSong = async () => {
    if (!user) {
      setActiveModal('login-prompt');
      return;
    }
    try {
      const { error } = await supabase.rpc('set_theme_song', {
        p_song_id: track.id,
        p_start: 0,
        p_end: 0,
      });
      if (error) throw error;
      invalidateProfile(user.id);
      showSuccess('Successfully set as your profile song!');
    } catch (err) {
      console.error('[NowPlayingMenu] set profile song failed', err);
      showError('Failed to set profile song.');
    }
  };

  // 2. Share Song
  const handleShareSong = async () => {
    const res = await shareSong(track);
    if (res === 'copied' || res === 'shared') {
      showSuccess('Link copied to clipboard!');
    } else {
      showError('Failed to copy link.');
    }
  };

  // 3. Add to existing playlist
  const handleAddToPlaylist = (playlistId: string) => {
    actions.addToPlaylist(playlistId, track.id);
    showSuccess('Added to playlist successfully!');
  };

  // 4. Create new playlist and add track
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const plId = actions.createPlaylist(newPlaylistName.trim());
    actions.addToPlaylist(plId, track.id);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    showSuccess('Created playlist and added song!');
  };

  // 5. Fetch users for search
  useEffect(() => {
    if (activeModal !== 'send') return;
    let cancelled = false;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase.rpc('list_profiles', {
          p_search: userSearch.trim() || null,
          p_limit: 20,
          p_offset: 0
        });
        if (!cancelled && !error) {
          const filtered = (data ?? []).filter((u: any) => u.id !== user?.id);
          setUsers(filtered);
        }
      } catch (err) {
        console.warn('Error listing profiles', err);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    const t = setTimeout(fetchUsers, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [userSearch, activeModal, user]);

  // 6. Send song to selected user
  const handleSendSong = async () => {
    if (!user) {
      setActiveModal('login-prompt');
      return;
    }
    if (!selectedUser) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc('send_song', {
        p_receiver_id: selectedUser.id,
        p_song_id: track.id,
        p_title: track.title,
        p_cover_url: track.coverUrl || '',
        p_message: ''
      });

      if (error) throw error;

      showSuccess(`Song sent to ${selectedUser.display_name}!`);
      setSelectedUser(null);
    } catch (err) {
      console.error('[NowPlayingMenu] send song failed', err);
      showError('Failed to send song.');
    } finally {
      setSending(false);
    }
  };

  const BARS = [
    { id: 'playlist', label: 'Add to Playlist', icon: Plus, action: () => setActiveModal('playlist') },
    { id: 'share', label: 'Share', icon: Share2, action: handleShareSong },
    { id: 'profile', label: 'Add to Profile', icon: Music, action: handleSetProfileSong },
    { id: 'send', label: 'Send', icon: Send, action: () => { if (user) setActiveModal('send'); else setActiveModal('login-prompt'); } },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end p-6 pb-16 select-none">
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-black/15 backdrop-blur-[2px]" onClick={onClose} />

      {/* Staggered Glass Bars */}
      <m.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        className="relative z-10 w-full max-w-sm mx-auto space-y-3"
      >
        {BARS.map((bar) => (
          <m.button
            key={bar.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={bar.action}
            className="w-full h-14 flex items-center justify-between px-5 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 text-white shadow-lg transition-colors hover:bg-white/15 cursor-pointer"
          >
            <span className="font-bold text-sm tracking-wide">{bar.label}</span>
            <bar.icon size={18} className="text-white/80" />
          </m.button>
        ))}
      </m.div>

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {/* Status Feedback Modal */}
        {statusMsg && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <m.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 flex flex-col justify-between text-white relative shadow-2xl"
            >
              <button 
                onClick={() => setStatusMsg(null)} 
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="flex-grow flex flex-col items-center justify-center text-center mt-2">
                {statusMsg.type === 'success' ? (
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                    <Check size={28} />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 mb-4">
                    <X size={28} />
                  </div>
                )}
                <p className="text-white font-bold text-sm leading-relaxed px-2">{statusMsg.text}</p>
              </div>
              <button
                onClick={() => {
                  setStatusMsg(null);
                  if (statusMsg.type === 'success') {
                    onClose();
                  }
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/15 active:scale-[0.98] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                OK
              </button>
            </m.div>
          </div>
        )}

        {/* Login Prompt Modal */}
        {activeModal === 'login-prompt' && !statusMsg && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <m.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 flex flex-col justify-between text-white relative shadow-2xl"
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="flex-grow flex flex-col items-center justify-center text-center mt-2">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 mb-4">
                  <User size={26} />
                </div>
                <h4 className="text-base font-bold tracking-wide">Login Required</h4>
                <p className="text-xs text-white/70 mt-2 px-2">Please log in first to access this feature.</p>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onClose();
                  openAuthModal();
                }}
                className="w-full py-3 bg-gradient-to-r from-[#FF7A1A] to-[#00E676] rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                Log In
              </button>
            </m.div>
          </div>
        )}

        {/* Add to Playlist Modal */}
        {activeModal === 'playlist' && !statusMsg && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <m.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 flex flex-col justify-between text-white relative shadow-2xl"
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              
              <div className="flex-grow flex flex-col overflow-hidden">
                <h4 className="text-sm font-bold tracking-wide border-b border-white/10 pb-2 mb-3 text-emerald-400">Add to Playlist</h4>
                
                {isCreatingPlaylist ? (
                  <form onSubmit={handleCreatePlaylist} className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shrink-0 mb-3">
                    <input
                      autoFocus
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Playlist name..."
                      maxLength={32}
                      className="flex-grow bg-transparent text-[11px] px-2 outline-none border-none placeholder-white/40 text-white"
                    />
                    <button type="submit" className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                      Create
                    </button>
                    <button type="button" onClick={() => setIsCreatingPlaylist(false)} className="px-1 text-slate-400 hover:text-white text-[10px] cursor-pointer">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs transition-all shrink-0 mb-3 cursor-pointer"
                  >
                    <Plus size={12} /> Create New Playlist
                  </button>
                )}

                <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 scrollbar-none">
                  {playlists.length === 0 ? (
                    <p className="text-center text-[11px] text-white/50 py-8">No custom playlists yet.</p>
                  ) : (
                    playlists.map((pl) => {
                      const alreadyHas = pl.trackIds.includes(track.id);
                      return (
                        <button
                          key={pl.id}
                          disabled={alreadyHas}
                          onClick={() => handleAddToPlaylist(pl.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                            alreadyHas 
                              ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed' 
                              : 'bg-white/5 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white cursor-pointer'
                          }`}
                        >
                          <span className="font-semibold truncate max-w-[140px]">{pl.name}</span>
                          {alreadyHas ? (
                            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/40">Already added</span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold">Add +</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </m.div>
          </div>
        )}

        {/* Send Modal */}
        {activeModal === 'send' && !statusMsg && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <m.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 flex flex-col justify-between text-white relative shadow-2xl"
            >
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setSelectedUser(null);
                }} 
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex-grow flex flex-col overflow-hidden">
                <h4 className="text-sm font-bold tracking-wide border-b border-white/10 pb-2 mb-3 text-sky-400">Send to User</h4>
                
                {!selectedUser ? (
                  <>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 mb-2">
                      <Search size={12} className="text-white/40" />
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users..."
                        className="bg-transparent border-none outline-none text-xs placeholder-white/40 w-full text-white"
                      />
                    </div>

                    <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 scrollbar-none">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-8 text-white/50 text-xs gap-1.5">
                          <Loader2 size={12} className="animate-spin" /> Searching...
                        </div>
                      ) : users.length === 0 ? (
                        <p className="text-center text-[11px] text-white/50 py-8">
                          {userSearch ? 'No matching accounts.' : 'Type to search users...'}
                        </p>
                      ) : (
                        users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className="w-full flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-white/70 font-bold">
                                  {(u.display_name || 'NL').slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-white truncate">{u.display_name || 'User'}</div>
                            </div>
                            <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-bold shrink-0">Select</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col justify-between py-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/50">Recipient:</span>
                        <button 
                          onClick={() => setSelectedUser(null)}
                          className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                          {selectedUser.avatar_url ? (
                            <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/70 font-bold">
                              {(selectedUser.display_name || 'NL').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-xs text-white truncate">{selectedUser.display_name}</div>
                      </div>
                    </div>

                    <button
                      onClick={handleSendSong}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-[#FF7A1A] to-[#00E676] rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Send Now
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
