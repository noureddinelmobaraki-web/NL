import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { X, Search, Play, Pause, Check } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../context/AuthContext';
import { invalidateProfile } from '../../accounts/profileCache';
import { useMusicStore } from '../../music/store/musicStore';
import { selectDisplayTracks } from '../../music/store/selectors';
import { getInitials } from '../../music/utils/cover';
import { useSongPreview } from '../../music/hooks/useSongPreview';
import type { Track } from '../../music/engine/types';
import '../../../styles/components/theme-song-picker.css';

export function ThemeSongPicker({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved?: () => void;
}) {
  const tracks = useMusicStore(useShallow(selectDisplayTracks)); // same random order as NL Music
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const preview = useSongPreview();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tracks;
    return tracks.filter((t) => t.title.toLowerCase().includes(term) || (t.artist ?? '').toLowerCase().includes(term));
  }, [tracks, q]);

  if (!open) return null;

  const close = () => {
    preview.stop();
    setQ('');
    setSavingId(null);
    onClose();
  };

  // «اختيار» = حفظ الأغنية كاملة مباشرة (بدون تحديد مقطع). p_end:0 ⇒ كامل الأغنية.
  const choose = async (t: Track) => {
    if (!user || savingId) return;
    setSavingId(t.id);
    preview.stop();
    try {
      const { error } = await supabase.rpc('set_theme_song', {
        p_song_id: t.id,
        p_start: 0,
        p_end: 0,
      });
      if (error) throw error;
      invalidateProfile(user.id);
      onSaved?.();
      close();
    } catch (err) {
      console.error('[ThemeSongPicker] save failed', err);
      setSavingId(null);
    }
  };

  return createPortal(
    <div className="nl-tsp-overlay" onMouseDown={close}>
      <div className="nl-tsp" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <header className="nl-tsp__head">
          <h3>أغنية البروفايل</h3>
          <button className="nl-tsp__x" onClick={close} aria-label="إغلاق"><X size={18} /></button>
        </header>

        <label className="nl-tsp__search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن أغنية..." />
        </label>
        <div className="nl-tsp__list">
          {filtered.map((t) => {
            const isPlaying = preview.isPlaying(t.id);
            const isSaving = savingId === t.id;
            return (
              <div key={t.id} className="nl-tsp__row">
                <button
                  type="button"
                  className="nl-tsp__play"
                  onClick={() => preview.toggle(t)}
                  aria-label={isPlaying ? 'إيقاف' : 'استماع'}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <span className="nl-tsp__cover">
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span>{getInitials(t.title)}</span>
                  )}
                </span>
                <span className="nl-tsp__meta">
                  <span className="nl-tsp__title">{t.title}</span>
                  <span className="nl-tsp__artist">{t.artist}</span>
                </span>
                <button
                  type="button"
                  className="nl-tsp__choose"
                  onClick={() => choose(t)}
                  disabled={isSaving}
                  aria-label="اختيار"
                >
                  {isSaving ? '...' : <>اختيار <Check size={15} /></>}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="nl-tsp__empty">لا نتائج.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
