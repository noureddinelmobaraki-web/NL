import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, Camera, Film, ListMusic, LogOut, Music2, Shield, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMusicStore } from '../music/store/musicStore'
import { useMovieItems } from './useMovieItems'
import { isAdmin } from '../../config/admin'
import { AdminDashboard } from '../admin/AdminDashboard'
import { DeleteAccountModal } from './DeleteAccountModal'
import '../../styles/components/profile-page.css'

interface ProfileRow {
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

const BIO_MAX = 200
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ProfilePage() {
  const { user, closeProfile, signOut } = useAuth()
  const favCount = useMusicStore((s) => s.favorites.length)
  const plCount = useMusicStore((s) => s.playlists.length)
  const { favoriteCount } = useMovieItems()

  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // إغلاق بمفتاح Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProfile()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeProfile])

  // جلب صف الملف الشخصي
  useEffect(() => {
    if (!user) return
    let mounted = true
    void (async () => {
      try {
        const { supabase } = await import('../../config/supabase')
        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bio')
          .eq('id', user.id)
          .single<ProfileRow>()
        if (!mounted) return
        if (qErr) {
          setError('تعذّر تحميل بيانات الملف الشخصي.')
        } else if (data) {
          setDisplayName(data.display_name ?? '')
          setBio(data.bio ?? '')
          setAvatarUrl(data.avatar_url ?? null)
        }
      } catch {
        if (mounted) setError('تعذّر الاتصال بالخادم.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [user])

  if (!user) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || saving) return
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const { supabase } = await import('../../config/supabase')
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim(), bio: bio.trim().slice(0, BIO_MAX) })
        .eq('id', user.id)
      if (uErr) {
        setError('تعذّر الحفظ. حاول مجددًا.')
      } else {
        setNotice('تمّ الحفظ')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // إتاحة اختيار نفس الملف
    if (!file || !user) return
    setError('')
    setNotice('')
    if (!AVATAR_TYPES.includes(file.type)) {
      setError('الصيغة غير مدعومة. استخدم JPG أو PNG أو WEBP أو GIF.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('حجم الصورة يتجاوز 2 ميغابايت.')
      return
    }
    setUploading(true)
    try {
      const { supabase } = await import('../../config/supabase')
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type })
      if (upErr) {
        setError('تعذّر رفع الصورة. حاول مجددًا.')
        return
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub.publicUrl
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (uErr) {
        setError('تم الرفع لكن تعذّر حفظ الرابط.')
        return
      }
      setAvatarUrl(publicUrl)
      setNotice('تم تحديث الصورة.')
    } catch {
      setError('تعذّر الاتصال بالخادم.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    closeProfile()
  }

  const initial = (displayName || user.email || '?').trim().charAt(0).toUpperCase()
  const busy = saving || uploading

  return createPortal(
    <div className="profile-overlay" role="dialog" aria-modal="true" aria-label="البروفيل" onMouseDown={closeProfile}>
      <div className="profile-page" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="profile-close" onClick={closeProfile} aria-label="إغلاق">×</button>
        <div className="profile-banner" aria-hidden="true" />

        <header className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="profile-avatar__initial">{initial}</span>}
            </div>
            <button
              type="button"
              className="profile-avatar__edit"
              onClick={() => fileRef.current?.click()}
              aria-label="تغيير الصورة"
              disabled={busy}
            >
              <Camera size={14} aria-hidden="true" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="profile-avatar__input"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="profile-identity">
            <h2 className="profile-name">{displayName || 'مستخدم NL'}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </header>

        {loading ? (
          <p className="profile-loading" style={{ textAlign: 'center', padding: '32px', color: '#a8a8b3' }}>...جارٍ التحميل</p>
        ) : (
          <>
            <section className="profile-section">
              <div className="profile-section__head">
                <BarChart3 size={16} aria-hidden="true" />
                <h3>الإحصائيات</h3>
              </div>
              <div className="profile-stats">
                {/* الإحصائية 1: الأغاني المفضلة */}
                {/* المصدر: useMusicStore.favorites — متزامن مع song_favorites في Supabase */}
                <div className="profile-stat">
                  <div className="profile-stat__icon"><Music2 size={18} aria-hidden="true" /></div>
                  <div className="profile-stat__num">{favCount}</div>
                  <div className="profile-stat__lbl">أغنية مفضلة</div>
                </div>

                {/* الإحصائية 2: قوائم التشغيل */}
                {/* المصدر: useMusicStore.playlists — متزامن مع music_playlists في Supabase */}
                <div className="profile-stat">
                  <div className="profile-stat__icon"><ListMusic size={18} aria-hidden="true" /></div>
                  <div className="profile-stat__num">{plCount}</div>
                  <div className="profile-stat__lbl">قائمة تشغيل</div>
                </div>

                {/* الإحصائية 3: أفلام مفضلة — placeholder حتى P8 */}
                {/* سيُربط بجدول movie_items عند إنشائه في P8 */}
                <div className="profile-stat">
                  <div className="profile-stat__icon"><Film size={18} aria-hidden="true" /></div>
                  <div className="profile-stat__num">{favoriteCount}</div>
                  <div className="profile-stat__lbl">فيلم مفضل</div>
                </div>
              </div>
            </section>

            <form className="profile-form" onSubmit={handleSave}>
              <div className="profile-field">
                <label htmlFor="profile-displayname">الاسم الظاهر</label>
                <input
                  id="profile-displayname"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  autoComplete="nickname"
                  disabled={busy}
                />
              </div>
              <div className="profile-field">
                <label htmlFor="profile-bio">نبذة (200 حرف كحد أقصى)</label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  maxLength={BIO_MAX}
                  disabled={busy}
                />
                <span className="profile-counter">{bio.length} / {BIO_MAX}</span>
              </div>
              <button type="submit" className="profile-save" disabled={busy}>حفظ</button>
            </form>

            {error && (
              <p className="profile-msg profile-msg--err" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="profile-msg profile-msg--ok">
                {notice}
              </p>
            )}

            <section className="profile-section">
              <div className="profile-section__head">
                <Music2 size={16} aria-hidden="true" />
                <h3>الأغاني المفضلة</h3>
              </div>
              <div className="profile-empty">
                <div className="profile-empty__icon"><Music2 size={22} aria-hidden="true" /></div>
                <p>لم تُضف أي أغنية للمفضلة بعد.</p>
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section__head">
                <Film size={16} aria-hidden="true" />
                <h3>الأفلام والمسلسلات</h3>
              </div>
              <div className="profile-empty">
                <div className="profile-empty__icon"><Film size={22} aria-hidden="true" /></div>
                <p>لم تُضف أي عنصر بعد.</p>
              </div>
            </section>

            {isAdmin(user.email) && (
              <>
                <button
                  type="button"
                  onClick={() => setAdminOpen(true)}
                  aria-label="Open admin dashboard"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-3 w-full rounded-lg mb-2 text-sm font-semibold border cursor-pointer transition-all bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-purple-500 hover:text-purple-400"
                >
                  <Shield size={16} strokeWidth={2} />
                  Admin Dashboard
                </button>
                {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
              </>
            )}

            <button type="button" className="profile-signout" onClick={handleSignOut} disabled={busy}>
              <LogOut size={15} aria-hidden="true" />
              <span>تسجيل الخروج</span>
            </button>

            {/* ── Danger Zone ─────────────────────────────────── */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">
                Danger Zone
              </p>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                aria-label="Delete your account permanently"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 w-full rounded-lg
                           text-sm font-semibold border cursor-pointer transition-all
                           bg-transparent border-red-900/60 text-red-500
                           hover:bg-red-900/20 hover:border-red-700 hover:text-red-400"
              >
                <Trash2 size={14} strokeWidth={2} />
                Delete Account
              </button>
            </div>

            {/* Delete account modal */}
            {deleteModalOpen && (
              <DeleteAccountModal
                onClose={() => setDeleteModalOpen(false)}
                onDeleted={() => {
                  // Close the profile modal and return to homepage
                  setDeleteModalOpen(false);
                  // Call the existing closeProfile prop of ProfilePage to close the profile panel
                  closeProfile();
                }}
              />
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
