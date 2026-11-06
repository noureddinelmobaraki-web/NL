import React from 'react';
import { m } from 'framer-motion';
import {
  Plus,
  Check,
  Send,
  Search,
  Loader2,
  X,
  User,
  ExternalLink,
} from 'lucide-react';
import type { OdesliTrackLinks } from '../utils/odesli';
import type { Track } from '../engine/types';
import type { Playlist } from '../store/musicStore';

export interface StatusModalProps {
  statusMsg: { type: 'success' | 'error'; text: string };
  onDismiss: () => void;
  onSuccessClose: () => void;
}

export function StatusFeedbackModal({
  statusMsg,
  onDismiss,
  onSuccessClose,
}: StatusModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 flex flex-col justify-between text-white relative shadow-2xl"
      >
        <button
          onClick={onDismiss}
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
            onDismiss();
            if (statusMsg.type === 'success') {
              onSuccessClose();
            }
          }}
          className="w-full py-3 bg-white/10 hover:bg-white/15 active:scale-[0.98] rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          OK
        </button>
      </m.div>
    </div>
  );
}

export interface LoginPromptModalProps {
  onCloseModal: () => void;
  onConfirmLogin: () => void;
}

export function LoginPromptModal({ onCloseModal, onConfirmLogin }: LoginPromptModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 flex flex-col justify-between text-white relative shadow-2xl"
      >
        <button
          onClick={onCloseModal}
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
          onClick={onConfirmLogin}
          className="w-full py-3 bg-gradient-to-r from-[#FF7A1A] to-[#00E676] rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          Log In
        </button>
      </m.div>
    </div>
  );
}

export interface PlaylistPickerModalProps {
  trackId: string;
  playlists: Playlist[];
  isCreatingPlaylist: boolean;
  newPlaylistName: string;
  onSetIsCreatingPlaylist: (v: boolean) => void;
  onChangeNewPlaylistName: (v: string) => void;
  onCreatePlaylist: (e: React.FormEvent) => void;
  onAddToPlaylist: (playlistId: string) => void;
  onCloseModal: () => void;
}

export function PlaylistPickerModal({
  trackId,
  playlists,
  isCreatingPlaylist,
  newPlaylistName,
  onSetIsCreatingPlaylist,
  onChangeNewPlaylistName,
  onCreatePlaylist,
  onAddToPlaylist,
  onCloseModal,
}: PlaylistPickerModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 flex flex-col justify-between text-white relative shadow-2xl"
      >
        <button
          onClick={onCloseModal}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex-grow flex flex-col overflow-hidden">
          <h4 className="text-sm font-bold tracking-wide border-b border-white/10 pb-2 mb-3 text-emerald-400">
            Add to Playlist
          </h4>

          {isCreatingPlaylist ? (
            <form
              onSubmit={onCreatePlaylist}
              className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shrink-0 mb-3"
            >
              <input
                autoFocus
                value={newPlaylistName}
                onChange={(e) => onChangeNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                maxLength={32}
                className="flex-grow bg-transparent text-[11px] px-2 outline-none border-none placeholder-white/40 text-white"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => onSetIsCreatingPlaylist(false)}
                className="px-1 text-slate-400 hover:text-white text-[10px] cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => onSetIsCreatingPlaylist(true)}
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
                const alreadyHas = pl.trackIds.includes(trackId);
                return (
                  <button
                    key={pl.id}
                    disabled={alreadyHas}
                    onClick={() => onAddToPlaylist(pl.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                      alreadyHas
                        ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/5 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white cursor-pointer'
                    }`}
                  >
                    <span className="font-semibold truncate max-w-[140px]">{pl.name}</span>
                    {alreadyHas ? (
                      <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/40">
                        Already added
                      </span>
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
  );
}

export interface SendSongModalProps {
  userSearch: string;
  users: any[];
  loadingUsers: boolean;
  selectedUser: any | null;
  sending: boolean;
  onChangeSearch: (v: string) => void;
  onSelectUser: (u: any | null) => void;
  onSendSong: () => void;
  onCloseModal: () => void;
}

export function SendSongModal({
  userSearch,
  users,
  loadingUsers,
  selectedUser,
  sending,
  onChangeSearch,
  onSelectUser,
  onSendSong,
  onCloseModal,
}: SendSongModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[85%] max-w-xs aspect-square bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 flex flex-col justify-between text-white relative shadow-2xl"
      >
        <button
          onClick={onCloseModal}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex-grow flex flex-col overflow-hidden">
          <h4 className="text-sm font-bold tracking-wide border-b border-white/10 pb-2 mb-3 text-sky-400">
            Send to User
          </h4>

          {!selectedUser ? (
            <>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 mb-2">
                <Search size={12} className="text-white/40" />
                <input
                  value={userSearch}
                  onChange={(e) => onChangeSearch(e.target.value)}
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
                      onClick={() => onSelectUser(u)}
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
                        <div className="font-bold text-xs text-white truncate">
                          {u.display_name || 'User'}
                        </div>
                      </div>
                      <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                        Select
                      </span>
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
                    onClick={() => onSelectUser(null)}
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
                  <div className="font-bold text-xs text-white truncate">
                    {selectedUser.display_name}
                  </div>
                </div>
              </div>

              <button
                onClick={onSendSong}
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
  );
}

export interface OdesliPlatformsModalProps {
  track: Track;
  loadingOdesli: boolean;
  odesliLinks: OdesliTrackLinks | null;
  onCloseModal: () => void;
  onCopySuccess: (msg: string) => void;
  onCopyError: (msg: string) => void;
}

export function OdesliPlatformsModal({
  track,
  loadingOdesli,
  odesliLinks,
  onCloseModal,
  onCopySuccess,
  onCopyError,
}: OdesliPlatformsModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md">
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[88%] max-w-xs bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 flex flex-col justify-between text-white relative shadow-2xl"
      >
        <button
          onClick={onCloseModal}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Close platforms modal"
        >
          <X size={16} />
        </button>

        <div>
          <h4 className="text-sm font-bold tracking-wide border-b border-white/10 pb-2 mb-3 text-emerald-400">
            Stream on Platforms
          </h4>
          <p className="text-[11px] text-white/60 mb-3 truncate">
            {track.title} {track.artist ? `— ${track.artist}` : ''}
          </p>

          {loadingOdesli || !odesliLinks ? (
            <div className="flex items-center justify-center py-8 text-white/60 text-xs gap-2">
              <Loader2 size={14} className="animate-spin" /> Resolving Odesli smart links...
            </div>
          ) : (
            <div className="space-y-2">
              {odesliLinks.platforms.map((platform) => (
                <a
                  key={platform.id}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: platform.accent }}
                    />
                    {platform.label}
                  </span>
                  <ExternalLink size={13} className="text-white/60" />
                </a>
              ))}

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(odesliLinks.pageUrl);
                    onCopySuccess('Universal Song.link copied!');
                  } catch {
                    onCopyError('Could not copy Song.link');
                  }
                }}
                className="w-full mt-2 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
              >
                Copy Universal Song.link
              </button>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
