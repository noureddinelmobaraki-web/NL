import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Loader2 } from 'lucide-react';
import { getFvTracks } from '../../music/data/loadSongs';
import { getInitials } from '../../music/utils/cover';
import {
  FEATURED_MAX, fetchSongFavorites, setSongFeatured, type SongFavRow,
} from '../profileFeatured';
import type { Track } from '../../music/engine/types';

interface Props { userId: string; onClose: () => void; onSaved?: () => void; }

export function FeaturedPicker({ userId, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<SongFavRow[] | null>(null);
  const [order, setOrder] = useState<string[]>([]); // ordered featured song_ids
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of getFvTracks()) m.set(t.id, t);
    return m;
  }, []);

  useEffect(() => {
    fetchSongFavorites(userId)
      .then((r) => {
        setRows(r);
        setOrder(
          r.filter((x) => x.is_featured && x.featured_rank != null)
            .sort((a, b) => (a.featured_rank! - b.featured_rank!))
            .map((x) => x.song_id),
        );
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, [userId]);

  const toggle = (songId: string) => {
    setOrder((prev) => {
      if (prev.includes(songId)) return prev.filter((id) => id !== songId);
      if (prev.length >= FEATURED_MAX) return prev; // cap at 10
      return [...prev, songId];
    });
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true); setError(null);
    try {
      // 1) clear everything first to avoid unique-rank collisions
      for (const r of rows) if (r.is_featured) await setSongFeatured(userId, r.song_id, null);
      // 2) write new ranks 1..N in chosen order
      for (let i = 0; i < order.length; i++) await setSongFeatured(userId, order[i], i + 1);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const list = (rows ?? []).map((r) => catalog.get(r.song_id)).filter((t): t is Track => !!t);

  return createPortal(
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-panel" onClick={(e) => e.stopPropagation()}>
        <header className="picker-head">
          <h3><Star size={18} /> Choose Featured ({order.length}/{FEATURED_MAX})</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {error && <p className="profile-section-error">{error}</p>}
        <div className="picker-grid">
          {list.map((t) => {
            const idx = order.indexOf(t.id);
            const on = idx !== -1;
            return (
              <button key={t.id} className={`picker-card${on ? ' is-on' : ''}`} onClick={() => toggle(t.id)}>
                <span className="fav-cover" style={ { background: t.coverColor } }>
                  {t.coverUrl ? <img src={t.coverUrl} alt="" loading="lazy" /> : <span className="fav-initials">{getInitials(t.title)}</span>}
                  {on && <span className="picker-rank">{idx + 1}</span>}
                </span>
                <span className="fav-title">{t.title}</span>
              </button>
            );
          })}
        </div>
        <footer className="picker-foot">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-accent" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="spin" size={16} /> : <Star size={16} />} Save
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
