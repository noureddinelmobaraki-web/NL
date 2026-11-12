/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { useMusicStore } from '../music/store/musicStore';
import { useMovieItems } from './useMovieItems';
import { uploadAvatarBlob, deleteOldAvatarIfOwned } from './utils/avatarStorage';

export const BIO_MAX = 280;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const AVATAR_MAX = 2 * 1024 * 1024;

export interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  frame: string | null;
  role: string | null;
  badge: string | null;
  admin_note: string | null;
  admin_note_updated_at: string | null;
  display_name_changed_at: string | null;
  theme_song_id: string | null;
  theme_song_autoplay: boolean | null;
  theme_song_start: number | null;
  theme_song_end: number | null;
}

export function useProfilePageState() {
  const { user, closeProfile, signOut } = useAuth();
  const admin = isAdmin(user?.email);

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [frame, setFrame] = useState<string>('none');
  const [role, setRole] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [adminNoteAt, setAdminNoteAt] = useState<string | null>(null);
  const [nameLockUntil, setNameLockUntil] = useState<Date | null>(null);
  const [themeSong, setThemeSong] = useState<string | null>(null);
  const [themeSongStart, setThemeSongStart] = useState<number | null>(null);
  const [themeSongEnd, setThemeSongEnd] = useState<number | null>(null);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('nl-modal-open');
    return () => {
      document.documentElement.classList.remove('nl-modal-open');
    };
  }, []);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [listeningReport, setListeningReport] = useState<any>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user || typeof supabase.rpc !== 'function') return;
    try {
      const { data, error } = await supabase.rpc('my_suggestions_unread_count');
      if (!error && data !== null) {
        setUnreadCount(Number(data));
      }
    } catch (e) {
      console.warn('Could not fetch unread count', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchUnreadCount();
    const t = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(t);
    };
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (!user || typeof supabase.rpc !== 'function') return;
    let cancelled = false;
    const fetchListeningReport = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_user_report', { p_user_id: user.id });
        if (!cancelled && !error && data) {
          setListeningReport(data);
        }
      } catch (e) {
        console.warn('Could not fetch user report', e);
      }
    };
    void fetchListeningReport();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const musicStorePlaylistsCount = useMusicStore((s) => s.playlists?.length ?? 0);
  const musicStoreFavoritesCount = useMusicStore((s) => s.favorites?.length ?? 0);
  const { favoriteCount: movieFavoritesCount } = useMovieItems();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'display_name, avatar_url, bio, frame, role, badge, admin_note, admin_note_updated_at, display_name_changed_at, theme_song_id, theme_song_autoplay, theme_song_start, theme_song_end',
      )
      .eq('id', user.id)
      .single<ProfileRow>();

    if (error) {
      setError(error.message);
    } else if (data) {
      setDisplayName(data.display_name ?? '');
      setBio(data.bio ?? '');
      setAvatarUrl(data.avatar_url);
      setFrame(data.frame ?? 'none');
      setRole(data.role);
      setBadge(data.badge);
      setAdminNote(data.admin_note);
      setAdminNoteAt(data.admin_note_updated_at);
      setThemeSong(data.theme_song_id);
      setThemeSongStart(data.theme_song_start);
      setThemeSongEnd(data.theme_song_end);
      if (data.display_name_changed_at) {
        const next = new Date(new Date(data.display_name_changed_at).getTime() + 7 * 864e5);
        if (next > new Date()) setNameLockUntil(next);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchProfile();
    }
  }, [user, fetchProfile]);

  const handleRemoveThemeSong = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        theme_song_id: null,
        theme_song_start: null,
        theme_song_end: null,
        theme_song_autoplay: null,
      })
      .eq('id', user.id);
    void fetchProfile();
  };

  const locked = !!nameLockUntil && !admin;
  const daysLeft = nameLockUntil
    ? Math.max(1, Math.ceil((nameLockUntil.getTime() - Date.now()) / 864e5))
    : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: bioErr } = await supabase
        .from('profiles')
        .update({ bio: bio.trim().slice(0, BIO_MAX) })
        .eq('id', user.id);
      if (bioErr) throw new Error(bioErr.message);

      const { data: res, error: rpcErr } = await supabase.rpc('set_display_name', {
        p_name: displayName.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message);
      const r = res as { ok: boolean; error?: string; next_allowed_at?: string };
      if (r.ok === false) {
        if (r.error === 'rate_limited' && r.next_allowed_at) {
          setNameLockUntil(new Date(r.next_allowed_at));
          setError('You can change the name only once a week.');
        } else if (r.error === 'invalid_name') {
          setError('Name is too short (min 2 characters).');
        } else {
          setError('Failed to save name.');
        }
      } else {
        setNotice('Saved');
        if (!admin) {
          const next = new Date(Date.now() + 7 * 864e5);
          setNameLockUntil(next);
        }
      }
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setError('Unsupported format.');
      return;
    }
    if (file.size > AVATAR_MAX) {
      setError('Maximum 2MB.');
      return;
    }
    setError(null);
    setCropFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCroppedBlob = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const prev = avatarUrl;
      const publicUrl = await uploadAvatarBlob(user.id, blob);
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updErr) throw new Error(updErr.message);
      setAvatarUrl(publicUrl);
      setNotice('Image updated');
      void deleteOldAvatarIfOwned(prev);
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setUploading(false);
      setCropFile(null);
    }
  };

  const applyDefaultAvatar = async (webpUrl: string) => {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const prev = avatarUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: webpUrl })
        .eq('id', user.id);
      if (updErr) throw new Error(updErr.message);
      setAvatarUrl(webpUrl);
      setNotice('Image updated');
      setAvatarPickerOpen(false);
      void deleteOldAvatarIfOwned(prev);
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setUploading(false);
    }
  };

  return {
    user,
    closeProfile,
    signOut,
    admin,
    loading,
    displayName,
    setDisplayName,
    bio,
    setBio,
    avatarUrl,
    frame,
    role,
    badge,
    adminNote,
    adminNoteAt,
    themeSong,
    themeSongStart,
    themeSongEnd,
    songPickerOpen,
    setSongPickerOpen,
    cropFile,
    setCropFile,
    avatarPickerOpen,
    setAvatarPickerOpen,
    saving,
    uploading,
    notice,
    error,
    unreadCount,
    inboxOpen,
    setInboxOpen,
    pickerOpen,
    setPickerOpen,
    adminOpen,
    setAdminOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    fileRef,
    listeningReport,
    musicStorePlaylistsCount,
    musicStoreFavoritesCount,
    movieFavoritesCount,
    fetchUnreadCount,
    fetchProfile,
    handleRemoveThemeSong,
    locked,
    daysLeft,
    handleSave,
    handleAvatarChange,
    handleCroppedBlob,
    applyDefaultAvatar,
  };
}
