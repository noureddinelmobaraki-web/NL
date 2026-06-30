import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { X, Search, Play, Pause, ChevronRight } from 'lucide-react';
import { useMusicStore } from '../../music/store/musicStore';
import { selectDisplayTracks } from '../../music/store/selectors';
import { getInitials } from '../../music/utils/cover';
import { useSongPreview } from '../../music/hooks/useSongPreview';
import type { Track } from '../../music/engine/types';
import { ThemeSongClipSelector } from './ThemeSongClipSelector';
import '../../../styles/components/theme-song-picker.css';

export function ThemeSongPicker({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved?: () => void;
}) {
  const tracks = useMusicStore(useShallow(selectDisplayTracks)); // same random order as NL Music
  const [q, setQ] = useState('');
  const [step, setStep] = useState<'list' | 'clip'>('list');
  const [chosen, setChosen] = useState<Track | null>(null);
  const preview = useSongPreview();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tracks;
    return tracks.filter((t) => t.title.toLowerCase().includes(term) || (t.artist ?? '').toLowerCase().includes(term));
  }, [tracks, q]);

  if (!open) return null;

  const pick = (t: Track) => {
    preview.stop();
    setChosen(t);
    setStep('clip');
  };

  const close = () => {
    preview.stop();
    setStep('list');
    setChosen(null);
    setQ('');
    onClose();
  };

  return createPortal(
    <div className="nl-tsp-overlay" onMouseDown={close}>
      <div className="nl-tsp" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <header className="nl-tsp__head">
          <h3>{step === 'list' ? 'أغنية البروفايل' : 'اختر المقطع'}</h3>
          <button className="nl-tsp__x" onClick={close} aria-label="إغلاق"><X size={18} /></button>
        </header>

        {step === 'list' ? (
          <>
            <label className="nl-tsp__search">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن أغنية..." />
            </label>
            <div className="nl-tsp__list">
              {filtered.map((t) => {
                const isPlaying = preview.isPlaying(t.id);
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
                    <span className="nl-tsp__cover" style={{ background: t.coverColor }}>
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
                    <button type="button" className="nl-tsp__choose" onClick={() => pick(t)} aria-label="اختيار">
                      اختيار <ChevronRight size={15} />
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="nl-tsp__empty">لا نتائج.</p>}
            </div>
          </>
        ) : chosen ? (
          <ThemeSongClipSelector
            track={chosen}
            onBack={() => {
              setStep('list');
              setChosen(null);
            }}
            onSaved={() => {
              onSaved?.();
              close();
            }}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
