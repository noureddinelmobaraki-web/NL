import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Share2, Send, Music, Disc3 } from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../config/supabase';
import { invalidateProfile } from '../../accounts/profileCache';
import { shareSong } from '../data/shareSong';
import { fetchOdesliLinks, type OdesliTrackLinks } from '../utils/odesli';
import type { Track } from '../engine/types';
import {
  StatusFeedbackModal,
  LoginPromptModal,
  PlaylistPickerModal,
  SendSongModal,
  OdesliPlatformsModal,
} from './NowPlayingModals';

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

  const [activeModal, setActiveModal] = useState<'playlist' | 'send' | 'login-prompt' | 'odesli' | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [odesliLinks, setOdesliLinks] = useState<OdesliTrackLinks | null>(null);
  const [loadingOdesli, setLoadingOdesli] = useState(false);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sending, setSending] = useState(false);

  const showSuccess = (msg: string) => setStatusMsg({ type: 'success', text: msg });
  const showError = (msg: string) => setStatusMsg({ type: 'error', text: msg });

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

  const handleShareSong = async () => {
    const res = await shareSong(track);
    if (res === 'copied' || res === 'shared') {
      showSuccess('Link copied to clipboard!');
    } else {
      showError('Failed to copy link.');
    }
  };

  const handleAddToPlaylist = (playlistId: string) => {
    actions.addToPlaylist(playlistId, track.id);
    showSuccess('Added to playlist successfully!');
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const plId = actions.createPlaylist(newPlaylistName.trim());
    actions.addToPlaylist(plId, track.id);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    showSuccess('Created playlist and added song!');
  };

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

  useEffect(() => {
    if (activeModal !== 'odesli') return;
    let cancelled = false;
    setLoadingOdesli(true);
    fetchOdesliLinks(track)
      .then((res) => {
        if (!cancelled) setOdesliLinks(res);
      })
      .finally(() => {
        if (!cancelled) setLoadingOdesli(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeModal, track]);

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
    { id: 'odesli', label: 'Stream on Platforms (Odesli)', icon: Disc3, action: () => setActiveModal('odesli') },
    { id: 'share', label: 'Share', icon: Share2, action: handleShareSong },
    { id: 'profile', label: 'Add to Profile', icon: Music, action: handleSetProfileSong },
    { id: 'send', label: 'Send', icon: Send, action: () => { if (user) setActiveModal('send'); else setActiveModal('login-prompt'); } },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end p-6 pb-16 select-none">
      <div className="absolute inset-0 bg-black/15 backdrop-blur-[2px]" onClick={onClose} />

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

      <AnimatePresence>
        {statusMsg && (
          <StatusFeedbackModal
            statusMsg={statusMsg}
            onDismiss={() => setStatusMsg(null)}
            onSuccessClose={onClose}
          />
        )}

        {activeModal === 'login-prompt' && !statusMsg && (
          <LoginPromptModal
            onCloseModal={() => setActiveModal(null)}
            onConfirmLogin={() => {
              setActiveModal(null);
              onClose();
              openAuthModal();
            }}
          />
        )}

        {activeModal === 'playlist' && !statusMsg && (
          <PlaylistPickerModal
            trackId={track.id}
            playlists={playlists}
            isCreatingPlaylist={isCreatingPlaylist}
            newPlaylistName={newPlaylistName}
            onSetIsCreatingPlaylist={setIsCreatingPlaylist}
            onChangeNewPlaylistName={setNewPlaylistName}
            onCreatePlaylist={handleCreatePlaylist}
            onAddToPlaylist={handleAddToPlaylist}
            onCloseModal={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'send' && !statusMsg && (
          <SendSongModal
            userSearch={userSearch}
            users={users}
            loadingUsers={loadingUsers}
            selectedUser={selectedUser}
            sending={sending}
            onChangeSearch={setUserSearch}
            onSelectUser={setSelectedUser}
            onSendSong={handleSendSong}
            onCloseModal={() => {
              setActiveModal(null);
              setSelectedUser(null);
            }}
          />
        )}

        {activeModal === 'odesli' && !statusMsg && (
          <OdesliPlatformsModal
            track={track}
            loadingOdesli={loadingOdesli}
            odesliLinks={odesliLinks}
            onCloseModal={() => setActiveModal(null)}
            onCopySuccess={showSuccess}
            onCopyError={showError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
