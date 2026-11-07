/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, Save, Loader2, Star, Clock, ShieldCheck, Trash2, LogOut, Music2, Bell,
} from 'lucide-react';
import { AvatarFrame } from './components/AvatarFrame';
import { FavoriteSongsSection } from './components/FavoriteSongsSection';
import { FavoriteMoviesSection } from './components/FavoriteMoviesSection';
import { FeaturedPicker } from './components/FeaturedPicker';
import { DeleteAccountModal } from './DeleteAccountModal';
import { RoleBadgeChips } from './roleBadge';
import { ThemeSongBar } from './components/ThemeSongBar';
import { ThemeSongPicker } from './components/ThemeSongPicker';
import { InboxPanel } from './components/InboxPanel';
import { AvatarCropModal } from './components/AvatarCropModal';
import { AvatarPickerModal } from './components/AvatarPickerModal';
import { ProfileActivityReport } from './components/ProfileActivityReport';
import { useProfilePageState, BIO_MAX, AVATAR_TYPES } from './useProfilePageState';
import '../../styles/components/profile-page.css';

const AdminDashboard = lazy(() =>
  import('../admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);

export default function ProfilePage() {
  const {
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
  } = useProfilePageState();

  if (!user) return null;

  return createPortal(
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <div className="profile-shell">
        <button className="icon-btn profile-close" onClick={closeProfile} aria-label="Close"><X size={20} /></button>
        <button 
          type="button"
          className="icon-btn absolute top-[16px] start-[16px]" 
          onClick={() => setInboxOpen(true)}
          aria-label="Suggestion Box"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-lg shadow-red-500/30">
              {unreadCount}
            </span>
          )}
        </button>
        <span className="sr-only">{user.email}</span>

        {loading ? (
          <p className="profile-loading"><Loader2 className="spin" size={20} /> Loading...…</p>
        ) : (
          <>
            <form className="profile-card" onSubmit={handleSave}>
              {themeSong ? (
                <ThemeSongBar
                  songId={themeSong}
                  start={themeSongStart}
                  end={themeSongEnd}
                  canRemove={true}
                  onRemove={handleRemoveThemeSong}
                />
              ) : null}
              <button type="button" className="profile-theme-edit" onClick={() => setSongPickerOpen(true)}>
                <Music2 size={14} /> {themeSong ? 'Change profile song' : 'Choose a song for your profile'}
              </button>
              {songPickerOpen && (
                <ThemeSongPicker
                  open={songPickerOpen}
                  onClose={() => setSongPickerOpen(false)}
                  onSaved={fetchProfile}
                />
              )}

              {adminNote && (
                <div className="profile-admin-msg">
                  <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Message from Admin</strong>
                    <p>{adminNote}</p>
                    {adminNoteAt && <time>{new Date(adminNoteAt).toLocaleDateString()}</time>}
                  </div>
                </div>
              )}

              <div className="profile-avatar-wrap">
                <AvatarFrame frame={frame} size={132}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" />
                    : <span className="profile-noavatar">{(displayName || 'NL').slice(0, 2).toUpperCase()}</span>}
                </AvatarFrame>
                <button type="button" className="profile-cam" onClick={() => setAvatarPickerOpen(true)} disabled={uploading} aria-label="Change picture">
                  {uploading ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
                </button>
                <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} className="profile-avatar__input" hidden onChange={handleAvatarChange} />
              </div>

              <RoleBadgeChips role={role} badge={badge} />

              <p className="profile-email text-xs text-zinc-400 -mt-1">{user.email}</p>

              <label className="profile-field">Display Name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} disabled={locked} placeholder="Your display name" />
              </label>
              {locked && (
                <p className="profile-name-lock"><Clock size={13} /> You can change name after {daysLeft} day.</p>
              )}

              <label className="profile-field">About
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} placeholder="Introduce yourself…" />
                <span className="profile-counter">{bio.length}/{BIO_MAX}</span>
              </label>

              <div className="flex gap-6 justify-center w-full max-w-[420px] my-2 bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex-1 text-center">
                  <span className="block text-lg font-bold text-white">{musicStoreFavoritesCount}</span>
                  <span className="text-[11px] text-zinc-400">Favorite Song</span>
                </div>
                <div className="flex-1 text-center border-x border-white/10">
                  <span className="block text-lg font-bold text-white">{musicStorePlaylistsCount}</span>
                  <span className="text-[11px] text-zinc-400">Playlist</span>
                </div>
                <div className="flex-1 text-center">
                  <span className="block text-lg font-bold text-white">{movieFavoritesCount}</span>
                  <span className="text-[11px] text-zinc-400">Favorite Movie</span>
                </div>
              </div>

              {error && <p className="profile-section-error">{error}</p>}
              {notice && <p className="profile-notice">{notice}</p>}

              <div className="profile-actions">
                <button type="submit" className="btn-accent" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Save
                </button>
                <button type="button" className="btn-ghost" onClick={() => setPickerOpen(true)}>
                  <Star size={16} /> Featured
                </button>
              </div>
            </form>

            <section className="profile-section">
              <h3><Star size={16} /> Favorite Songs</h3>
              <FavoriteSongsSection userId={user.id} />
            </section>

            <section className="profile-section">
              <h3><Star size={16} /> Movies & Series</h3>
              <FavoriteMoviesSection userId={user.id} />
            </section>

            <ProfileActivityReport listeningReport={listeningReport} />

            {admin && (
              <section className="profile-section">
                <button className="btn-accent profile-admin-btn" onClick={() => setAdminOpen(true)}>
                  <ShieldCheck size={16} /> Admin Panel
                </button>
              </section>
            )}

            <section className="profile-section profile-danger">
              <h3><Trash2 size={16} /> Danger Zone</h3>
              <div className="profile-danger-row">
                <button className="btn-ghost" onClick={() => { signOut(); closeProfile(); }}><LogOut size={16} /> Log Out</button>
                <button className="btn-danger" onClick={() => setDeleteModalOpen(true)}><Trash2 size={16} /> Delete Account</button>
              </div>
            </section>
          </>
        )}

        {inboxOpen && (
          <InboxPanel 
            onClose={() => setInboxOpen(false)} 
            onRefreshCount={fetchUnreadCount} 
          />
        )}
      </div>

      {pickerOpen && <FeaturedPicker userId={user.id} onClose={() => setPickerOpen(false)} />}
      {adminOpen && (
        <Suspense fallback={null}>
          <AdminDashboard onClose={() => setAdminOpen(false)} />
        </Suspense>
      )}
      {deleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => { setDeleteModalOpen(false); closeProfile(); } }
        />
      )}

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={handleCroppedBlob}
        />
      )}

      {avatarPickerOpen && (
        <AvatarPickerModal
          onClose={() => setAvatarPickerOpen(false)}
          onPickDefault={applyDefaultAvatar}
          onUploadClick={() => { setAvatarPickerOpen(false); fileRef.current?.click(); }}
        />
      )}
    </div>,
    document.body,
  );
}
