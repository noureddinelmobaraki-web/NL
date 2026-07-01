import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, Save, Loader2, Star, Clock, ShieldCheck, Trash2, LogOut, Music2,
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { AvatarFrame } from './components/AvatarFrame';
import { FavoriteSongsSection } from './components/FavoriteSongsSection';
import { FavoriteMoviesSection } from './components/FavoriteMoviesSection';
import { FeaturedPicker } from './components/FeaturedPicker';
import { AdminDashboard } from '../admin/AdminDashboard';
import { DeleteAccountModal } from './DeleteAccountModal';
import { RoleBadgeChips } from './roleBadge';
import { useMusicStore } from '../music/store/musicStore';
import { useMovieItems } from './useMovieItems';
import { ThemeSongBar } from './components/ThemeSongBar';
import { ThemeSongPicker } from './components/ThemeSongPicker';
import '../../styles/components/profile-page.css';

const BIO_MAX = 280;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_MAX = 2 * 1024 * 1024;

interface ProfileRow {
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

export default function ProfilePage() {
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

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchListeningReport = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_user_report', { p_user_id: user.id });
        if (!cancelled && !error && data) {
          setListeningReport(data);
        }
      } catch (e) {
        console.warn("Could not fetch user report", e);
      }
    };
    void fetchListeningReport();
    return () => { cancelled = true; };
  }, [user]);

  const musicStorePlaylistsCount = useMusicStore((s) => s.playlists?.length ?? 0);
  const musicStoreFavoritesCount = useMusicStore((s) => s.favorites?.length ?? 0);
  const { favoriteCount: movieFavoritesCount } = useMovieItems();

  // ---- load profile ----
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, bio, frame, role, badge, admin_note, admin_note_updated_at, display_name_changed_at, theme_song_id, theme_song_autoplay, theme_song_start, theme_song_end')
      .eq('id', user.id)
      .single<ProfileRow>();
    
    if (error) { setError(error.message); }
    else if (data) {
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
    await supabase.from('profiles').update({
      theme_song_id: null,
      theme_song_start: null,
      theme_song_end: null,
      theme_song_autoplay: null
    }).eq('id', user.id);
    void fetchProfile();
  };

  const locked = !!nameLockUntil && !admin;
  const daysLeft = nameLockUntil
    ? Math.max(1, Math.ceil((nameLockUntil.getTime() - Date.now()) / 864e5))
    : 0;

  // ---- save (bio direct; name via rate-limited RPC) ----
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      // bio (always allowed)
      const { error: bioErr } = await supabase
        .from('profiles')
        .update({ bio: bio.trim().slice(0, BIO_MAX) })
        .eq('id', user.id);
      if (bioErr) throw new Error(bioErr.message);

      // name via RPC (weekly rule, admin exempt)
      const { data: res, error: rpcErr } = await supabase.rpc('set_display_name', {
        p_name: displayName.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message);
      const r = res as { ok: boolean; error?: string; next_allowed_at?: string };
      if (r.ok === false) {
        if (r.error === 'rate_limited' && r.next_allowed_at) {
          setNameLockUntil(new Date(r.next_allowed_at));
          setError('يمكنك تغيير الاسم مرة واحدة كل أسبوع فقط.');
        } else if (r.error === 'invalid_name') {
          setError('الاسم قصير جدًّا (حرفان على الأقل).');
        } else {
          setError('تعذّر حفظ الاسم.');
        }
      } else {
        setNotice('تم الحفظ ✓');
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

  // ---- avatar upload ----
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!AVATAR_TYPES.includes(file.type)) { setError('صيغة غير مدعومة.'); return; }
    if (file.size > AVATAR_MAX) { setError('الحد الأقصى 2MB.'); return; }
    setUploading(true); setError(null);
    try {
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', user.id);
      if (updErr) throw new Error(updErr.message);
      setAvatarUrl(pub.publicUrl);
      setNotice('تم تحديث الصورة ✓');
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!user) return null;

  return createPortal(
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <div className="profile-shell">
        <button className="icon-btn profile-close" onClick={closeProfile} aria-label="إغلاق"><X size={20} /></button>
        <span className="sr-only">{user.email}</span>

        {loading ? (
          <p className="profile-loading"><Loader2 className="spin" size={20} /> جارٍ التحميل…</p>
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
                <Music2 size={14} /> {themeSong ? 'تغيير أغنية البروفايل' : 'اختر أغنية لبروفايلك'}
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
                    <strong>رسالة من الإدارة</strong>
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
                <button type="button" className="profile-cam" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="تغيير الصورة">
                  {uploading ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
                </button>
                <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} className="profile-avatar__input" hidden onChange={handleAvatarChange} />
              </div>

              <RoleBadgeChips role={role} badge={badge} />

              <p className="profile-email text-xs text-zinc-400 -mt-1">{user.email}</p>

              <label className="profile-field">الاسم الظاهر
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} disabled={locked} placeholder="اسمك الظاهر" />
              </label>
              {locked && (
                <p className="profile-name-lock"><Clock size={13} /> يمكنك تغيير الاسم بعد {daysLeft} يوم.</p>
              )}

              <label className="profile-field">نبذة
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} placeholder="عرّف بنفسك…" />
                <span className="profile-counter">{bio.length}/{BIO_MAX}</span>
              </label>

              <div className="flex gap-6 justify-center w-full max-w-[420px] my-2 bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex-1 text-center">
                  <span className="block text-lg font-bold text-white">{musicStoreFavoritesCount}</span>
                  <span className="text-[11px] text-zinc-400">أغنية مفضلة</span>
                </div>
                <div className="flex-1 text-center border-x border-white/10">
                  <span className="block text-lg font-bold text-white">{musicStorePlaylistsCount}</span>
                  <span className="text-[11px] text-zinc-400">قائمة تشغيل</span>
                </div>
                <div className="flex-1 text-center">
                  <span className="block text-lg font-bold text-white">{movieFavoritesCount}</span>
                  <span className="text-[11px] text-zinc-400">فيلم مفضل</span>
                </div>
              </div>

              {error && <p className="profile-section-error">{error}</p>}
              {notice && <p className="profile-notice">{notice}</p>}

              <div className="profile-actions">
                <button type="submit" className="btn-accent" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} حفظ
                </button>
                <button type="button" className="btn-ghost" onClick={() => setPickerOpen(true)}>
                  <Star size={16} /> المميّزة
                </button>
              </div>
            </form>

            <section className="profile-section">
              <h3><Star size={16} /> الأغاني المفضّلة</h3>
              <FavoriteSongsSection userId={user.id} />
            </section>

            <section className="profile-section">
              <h3><Star size={16} /> الأفلام والمسلسلات</h3>
              <FavoriteMoviesSection userId={user.id} />
            </section>

            {listeningReport && (
              <section className="profile-section">
                <h3 className="flex items-center gap-2" style={{ direction: 'rtl' }}><Clock size={16} /> إحصائيات النشاط (Activity Stats)</h3>
                <div className="grid grid-cols-3 gap-3 my-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="block text-md font-bold text-sky-400">
                      {listeningReport.song_plays ?? listeningReport.songs_played ?? listeningReport.songs_count ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">استماع للأغاني</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center border-x border-white/10">
                    <span className="block text-md font-bold text-red-400">
                      {listeningReport.movie_plays ?? listeningReport.movies_played ?? listeningReport.movies_count ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">مشاهدة الأفلام</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="block text-md font-bold text-purple-400">
                      {listeningReport.series_plays ?? listeningReport.series_played ?? listeningReport.series_count ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">مشاهدة المسلسلات</span>
                  </div>
                </div>

                {Array.isArray(listeningReport.recent_plays) && listeningReport.recent_plays.length > 0 && (
                  <div className="mt-4 space-y-2 text-right" style={{ direction: 'rtl' }}>
                    <h4 className="text-xs font-bold text-zinc-300">أحدث النشاطات (Recent Activity)</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                      {listeningReport.recent_plays.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 text-[11px]">
                          <span className="text-zinc-200 font-medium truncate max-w-[180px]">{p.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 uppercase">
                            {p.media_type === 'tv' ? 'Series' : p.media_type === 'movie' ? 'Movie' : 'Song'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {admin && (
              <section className="profile-section">
                <button className="btn-accent profile-admin-btn" onClick={() => setAdminOpen(true)}>
                  <ShieldCheck size={16} /> لوحة الأدمن
                </button>
              </section>
            )}

            <section className="profile-section profile-danger">
              <h3><Trash2 size={16} /> منطقة الخطر</h3>
              <div className="profile-danger-row">
                <button className="btn-ghost" onClick={() => { signOut(); closeProfile(); }}><LogOut size={16} /> تسجيل الخروج</button>
                <button className="btn-danger" onClick={() => setDeleteModalOpen(true)}><Trash2 size={16} /> حذف الحساب</button>
              </div>
            </section>
          </>
        )}
      </div>

      {pickerOpen && <FeaturedPicker userId={user.id} onClose={() => setPickerOpen(false)} />}
      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {deleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => { setDeleteModalOpen(false); closeProfile(); } }
        />
      )}
    </div>,
    document.body,
  );
}
