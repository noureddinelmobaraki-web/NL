import { useEffect, useMemo, useState } from 'react';
import { Play, Music2, Star } from 'lucide-react';
import { useMusicStore } from '../../music/store/musicStore';
import { getFvTracks } from '../../music/data/loadSongs';
import { getInitials } from '../../music/utils/cover';
import { fetchSongFavorites, type SongFavRow } from '../profileFeatured';
import type { Track } from '../../music/engine/types';

interface Props { userId: string; }

export function FavoriteSongsSection({ userId }: Props) {
  const [rows, setRows] = useState<SongFavRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = useMusicStore((s) => s.actions.playTrack);
  const setQueue = useMusicStore((s) => s.actions.setQueue);

  // Local catalog map: song_id -> Track
  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of getFvTracks()) m.set(t.id, t);
    return m;
  }, []);

  useEffect(() => {
    let alive = true;
    fetchSongFavorites(userId)
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(String(e?.message ?? e)); });
    return () => { alive = false; };
  }, [userId]);

  const tracks = useMemo(
    () => (rows ?? []).map((r) => catalog.get(r.song_id)).filter((t): t is Track => !!t),
    [rows, catalog],
  );
  const featuredIds = useMemo(
    () => new Set((rows ?? []).filter((r) => r.is_featured).map((r) => r.song_id)),
    [rows],
  );

  const playFrom = (index: number) => {
    setQueue(tracks.map((t) => t.id), index);
    void playTrack(tracks[index].id, true);
  };

  if (error) return <p className="profile-section-error">{error}</p>;
  if (rows === null) return <div className="profile-skeleton-grid" aria-busy="true" />;
  if (tracks.length === 0)
    return (
      <div className="profile-empty">
        <Music2 size={26} />
        <span>No favorite songs yet</span>
      </div>
    );

  return (
    <div className="fav-grid">
      {tracks.map((t, i) => (
        <button key={t.id} className="fav-card" onClick={() => playFrom(i)} title={`${t.title} — ${t.artist}`}>
          <span className="fav-cover" style={ { background: t.coverColor } }>
            {t.coverUrl
              ? <img src={t.coverUrl} alt="" loading="lazy" />
              : <span className="fav-initials">{getInitials(t.title)}</span>}
            <span className="fav-play"><Play size={18} /></span>
            {featuredIds.has(t.id) && <span className="fav-star"><Star size={12} /></span>}
          </span>
          <span className="fav-meta">
            <span className="fav-title">{t.title}</span>
            <span className="fav-artist">{t.artist}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
