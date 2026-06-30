import { useEffect, useMemo, useState } from 'react';
import {
  X, Save, Trash2, Loader2, ShieldCheck, Star, Music2, Film, AlertTriangle, Mail,
} from 'lucide-react';
import { useAdminUser } from './useAdminUser';
import { AvatarFrame, FRAME_IDS, FRAME_LABELS, type FrameId } from '../account/components/AvatarFrame';
import { getFvTracks } from '../music/data/loadSongs';
import {
  ROLE_OPTIONS, BADGE_OPTIONS, ROLE_DEFS, BADGE_DEFS, RoleBadgeChips,
} from '../account/roleBadge';

const IMG = 'https://image.tmdb.org/t/p/w92';
interface Props { userId: string; onClose: () => void; onDeleted?: () => void; }

export function UserDetailPanel({ userId, onClose, onDeleted }: Props) {
  const a = useAdminUser(userId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const [frame, setFrame] = useState('none');
  const [role, setRole] = useState('');
  const [badge, setBadge] = useState('');
  const [note, setNote] = useState('');

  const p = a.data?.profile as (typeof a.data extends null ? never : any) | undefined;

  // hydrate local editable copies once data arrives
  useEffect(() => {
    if (p) {
      setFrame(p.frame ?? 'none');
      setRole(p.role ?? '');
      setBadge(p.badge ?? '');
      setNote(p.admin_note ?? '');
    }
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // song_id -> "Title — Artist" (names, no cover)
  const songNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of getFvTracks()) m.set(t.id, `${t.title} — ${t.artist}`);
    return m;
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  };

  return (
    <div className="udp-overlay" onClick={onClose}>
      <div className="udp-panel" onClick={(e) => e.stopPropagation()}>
        <header className="udp-head">
          <h3><ShieldCheck size={18} /> لوحة التحكّم بالمستخدم</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>

        {a.loading && !a.data && <div className="udp-loading"><Loader2 className="spin" size={22} /></div>}
        {(err || a.error) && <p className="profile-section-error"><AlertTriangle size={14} /> {err || a.error}</p>}

        {p && (
          <div className="udp-body">
            <section className="udp-identity">
              <AvatarFrame frame={p.frame} size={96}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <span className="udp-noavatar">NL</span>}
              </AvatarFrame>
              <div>
                <div className="udp-name">{p.display_name || 'بلا اسم'}</div>
                <div className="udp-email"><Mail size={12} /> {p.email ?? '—'}</div>
                <div className="udp-id">{p.id}</div>
                <RoleBadgeChips role={role || p.role} badge={badge || p.badge} />
              </div>
            </section>

            <section className="udp-stats">
              <span><Music2 size={14} /> {a.data!.stats.song_count} أغنية</span>
              <span><Film size={14} /> {a.data!.stats.movie_count} فيلم/مسلسل</span>
              <span><Star size={14} /> {a.data!.stats.play_count} تشغيل</span>
            </section>

            <section className="udp-controls">
              <label>الإطار
                <select value={frame} onChange={(e) => setFrame(e.target.value)}>
                  {FRAME_IDS.map((f: FrameId) => <option key={f} value={f}>{FRAME_LABELS[f]}</option>)}
                </select>
              </label>
              <label>الرتبة (role)
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">— بلا رتبة —</option>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_DEFS[r].label}</option>)}
                </select>
              </label>
              <label>الوسام (badge)
                <select value={badge} onChange={(e) => setBadge(e.target.value)}>
                  <option value="">— بلا وسام —</option>
                  {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{BADGE_DEFS[b].label}</option>)}
                </select>
              </label>
              <button className="btn-accent" disabled={busy}
                onClick={() => run(() => a.setFrame(frame, role || null, badge || null))}>
                {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} حفظ الإطار/الرتبة
              </button>
            </section>

            <section className="udp-note">
              <label>رسالة للمستخدم (تصله في بروفايله)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="اكتب رسالة تظهر للمستخدم…" />
              </label>
              <button className="btn-ghost" disabled={busy} onClick={() => run(() => a.setNote(note))}>حفظ الرسالة</button>
            </section>

            <section className="udp-fav">
              <h4><Music2 size={15} /> الأغاني ({a.data!.song_favorites.length})</h4>
              <ul>
                {a.data!.song_favorites.map((s) => (
                  <li key={s.song_id}>
                    <span>{songNames.get(s.song_id) ?? s.song_id}</span>
                    <button className="icon-btn danger" disabled={busy} onClick={() => run(() => a.deleteSong(s.song_id))} aria-label="حذف"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="udp-fav">
              <h4><Film size={15} /> الأفلام/المسلسلات ({a.data!.movie_items.length})</h4>
              <ul>
                {a.data!.movie_items.map((m) => (
                  <li key={`${m.tmdb_id}-${m.media_type}-${m.status}`}>
                    {m.poster_path && <img src={`${IMG}${m.poster_path}`} alt="" className="udp-thumb" />}
                    <span>{m.title} <em>({m.status})</em></span>
                    <button className="icon-btn danger" disabled={busy}
                      onClick={() => run(() => a.deleteMovie({ tmdb_id: m.tmdb_id, media_type: m.media_type, status: m.status }))}
                      aria-label="حذف"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="udp-danger">
              <h4><AlertTriangle size={15} /> منطقة الخطر</h4>
              {!confirmDel ? (
                <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 size={16} /> حذف المستخدم بالكامل</button>
              ) : (
                <div className="udp-confirm">
                  <span>تأكيد الحذف النهائي؟</span>
                  <button className="btn-ghost" disabled={busy} onClick={() => setConfirmDel(false)}>تراجع</button>
                  <button className="btn-danger" disabled={busy}
                    onClick={() => run(async () => { await a.deleteUser(true); onDeleted?.(); onClose(); })}>
                    {busy ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />} حذف نهائي
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
