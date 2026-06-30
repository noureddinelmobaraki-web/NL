import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { X, Search, Check, ListMusic, Music2, Play, Pause } from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { selectDisplayTracks } from '../store/selectors';
import { useSongPreview } from '../hooks/useSongPreview';
import { getInitials } from '../utils/cover';
import type { Track } from '../engine/types';
import '../../../styles/components/create-playlist.css';

export function CreatePlaylistModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated?: (id: string) => void;
}) {
  const displayTracks = useMusicStore(useShallow(selectDisplayTracks));
  const actions = useMusicStore((s) => s.actions);
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const preview = useSongPreview();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return displayTracks;
    return displayTracks.filter((t) =>
      t.title.toLowerCase().includes(term) || (t.artist ?? '').toLowerCase().includes(term));
  }, [displayTracks, q]);

  if (!open) return null;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = () => {
    const finalName = name.trim() || `بلاي ليست ${Date.now() % 1000}`;
    let id: string;
    if (picked.length > 0) {
      id = actions.createPlaylist(finalName);
      actions.addManyToPlaylist(id, picked);
    } else {
      id = actions.createPlaylist(finalName);
    }
    setName(''); setQ(''); setPicked([]);
    preview.stop();
    onCreated?.(id);
    onClose();
  };

  const handleClose = () => {
    preview.stop();
    onClose();
  };

  return createPortal(
    <div className="nl-cpl-overlay" onMouseDown={handleClose}>
      <div className="nl-cpl" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <header className="nl-cpl__head">
          <h3><ListMusic size={18} /> إنشاء بلاي ليست</h3>
          <button className="nl-cpl__x" onClick={handleClose} aria-label="إغلاق"><X size={18} /></button>
        </header>

        <input
          className="nl-cpl__name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم البلاي ليست..."
        />

        <label className="nl-cpl__search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن أغنية..." />
        </label>

        <div className="nl-cpl__count">{picked.length} مختارة</div>

        <div className="nl-cpl__list">
          {filtered.map((t: Track) => {
            const on = picked.includes(t.id);
            const isPlaying = preview.isPlaying(t.id);
            return (
              <div key={t.id} className={`nl-cpl__row${on ? ' is-on' : ''}`} onClick={() => toggle(t.id)}>
                {/* Preview Button */}
                <button
                  type="button"
                  className="nl-cpl-prev"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row selection toggle
                    preview.toggle(t);
                  }}
                  aria-label="معاينة"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>

                <span className="nl-cpl__cover" style={{ background: t.coverColor }}>
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span>{getInitials(t.title)}</span>
                  )}
                </span>

                <span className="nl-cpl__meta">
                  <span className="nl-cpl__title">{t.title}</span>
                  <span className="nl-cpl__artist">{t.artist}</span>
                </span>

                <span className={`nl-cpl__check${on ? ' is-on' : ''}`}>
                  {on ? <Check size={15} /> : <Music2 size={15} />}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="nl-cpl__empty">لا نتائج.</p>}
        </div>

        <footer className="nl-cpl__foot">
          <button className="nl-cpl__cancel" onClick={handleClose}>إلغاء</button>
          <button className="nl-cpl__create" onClick={submit}>
            إنشاء {picked.length > 0 ? `(${picked.length})` : ''}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
