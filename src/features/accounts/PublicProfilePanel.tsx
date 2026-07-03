import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Loader2, ShieldCheck, Play, Pause } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { AvatarFrame } from '../account/components/AvatarFrame';
import { RoleBadgeChips } from '../account/roleBadge';
import { useProfileRating } from './useProfileRating';
import { getFvTracks } from '../music/data/loadSongs';
import { getInitials } from '../music/utils/cover';
import { ThemeSongBar } from '../account/components/ThemeSongBar';
import { fetchPublicProfile, invalidateProfile } from './profileCache';
import { useSongPreview } from '../music/hooks/useSongPreview';

interface PubProfile {
  id: string; display_name: string | null; avatar_url: string | null; bio: string | null;
  frame: string | null; role: string | null; badge: string | null; created_at: string;
  star_count: number; starred_by_me: boolean;
  theme_song_id: string | null; theme_song_autoplay: boolean;
  theme_song_start: number | null; theme_song_end: number | null;
}

interface Pub {
  profile: PubProfile | null;
  songs: Array<{ song_id: string }>;
  movies: Array<{ tmdb_id: number; media_type: string; title: string; poster_path: string }>;
}

const first3Words = (title: string) =>
  title.trim().split(/\s+/).slice(0, 3).join(' ');

export function PublicProfilePanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const { user } = useAuth();
  const admin = isAdmin(user?.email);
  const { toggle, adminSet } = useProfileRating();
  const [data, setData] = useState<Pub | null>(null);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bonus, setBonus] = useState('');
  const preview = useSongPreview();

  useEffect(() => {
    document.documentElement.classList.add('nl-modal-open');
    return () => {
      document.documentElement.classList.remove('nl-modal-open');
    };
  }, []);

  const songMap = useMemo(() => {
    const m = new Map<string, { title: string; artist: string }>();
    try {
      for (const t of getFvTracks()) m.set(t.id, { title: t.title, artist: t.artist });
    } catch { /* ignore */ }
    return m;
  }, []);

  const fetchProfile = useCallback(async (force = false) => {
    try {
      const d = await fetchPublicProfile(id, { force });
      if (d) {
        const parsed = d as Pub;
        setData(parsed);
        setCount(parsed.profile?.star_count ?? 0);
        setMine(parsed.profile?.starred_by_me ?? false);
      }
    } catch (err) {
      console.error('[PublicProfilePanel] fetch failed', err);
    }
  }, [id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const onStar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await toggle(id);
      setCount(r.star_count);
      setMine(r.starred_by_me);
      await fetchProfile(true); // Force fresh cache update
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const onAdminSet = async () => {
    const n = parseInt(bonus, 10);
    if (Number.isNaN(n)) return;
    await adminSet(id, n);
    setBonus('');
    await fetchProfile(true); // Force fresh cache update
    onChanged?.();
  };

  const handleClose = () => {
    preview.stop();
    onClose();
  };

  const p = data?.profile;

  return createPortal(
    <div className="nl-pub-overlay" onMouseDown={handleClose}>
      <div className="nl-pub nl-public-card" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="nl-pub__close" onClick={handleClose} aria-label="Close"><X size={20} /></button>
        {!p ? (
          <p className="nl-pub__loading"><Loader2 className="spin" size={18} /> ...Loading...</p>
        ) : (
          <>
            <div className="nl-pub-header">
              <AvatarFrame frame={p.frame} size={110}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" decoding="async" />
                ) : (
                  <span className="nl-pub__ph">{(p.display_name || 'NL').slice(0, 2).toUpperCase()}</span>
                )}
              </AvatarFrame>
              <h2 className="nl-pub__name">{p.display_name || 'User'}</h2>
              <RoleBadgeChips role={p.role} badge={p.badge} />
            </div>

            {p.bio && (
              <div className="nl-pub__bio-box">
                <span className="nl-pub__quote-open">“</span>
                <p className="nl-pub__bio">{p.bio}</p>
                <span className="nl-pub__quote-close">”</span>
              </div>
            )}

            {p.theme_song_id && (
              <ThemeSongBar
                songId={p.theme_song_id}
                start={p.theme_song_start}
                end={p.theme_song_end}
                canRemove={admin}
                onRemove={admin ? async () => {
                  await supabase.rpc('admin_clear_theme_song', { target: id });
                  await fetchProfile(true);
                } : undefined}
              />
            )}

            <button type="button" className={`nl-pub__star${mine ? ' is-on' : ''}`} onClick={onStar} disabled={busy}>
              <Star size={20} fill={mine ? 'currentColor' : 'none'} />
              <span>{count}</span>
            </button>

            {admin && (
              <div className="nl-pub__admin">
                <ShieldCheck size={14} /> <span>Manage Stars (Admin)</span>
                <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
                <button type="button" onClick={onAdminSet}>Apply</button>
                <button
                  type="button"
                  className="nl-pub__admin-clear"
                  onClick={async () => {
                    if (!window.confirm("Clear this user's picture?")) return;
                    const { error } = await supabase.rpc('admin_clear_avatar', { target: id });
                    if (error) {
                      console.error('[admin_clear_avatar] failed', error);
                      window.alert('Failed to remove picture: ' + (error.message || 'unknown error'));
                      return;
                    }
                    invalidateProfile(id);
                    await fetchProfile(true);
                    onChanged?.();
                  }}
                >
                  Remove Picture (Censorship)
                </button>
              </div>
            )}

            <div className="nl-pub__sec">
              <h3>Featured Songs</h3>
              {(data?.songs?.length ?? 0) > 0 ? (
                <div className="nl-pub__songs-grid">
                  {data!.songs.map((s) => {
                    const trackObj = getFvTracks().find((t) => t.id === s.song_id);
                    const isPlaying = trackObj ? preview.isPlaying(trackObj.id) : false;
                    const meta = songMap.get(s.song_id);
                    return (
                      <div key={s.song_id} className={`nl-pub-song-card${isPlaying ? ' is-playing' : ''}`}>
                        <span className="nl-pub-song-cover">
                          {trackObj?.coverUrl ? (
                            <img src={trackObj.coverUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span>{getInitials(meta ? meta.title : s.song_id)}</span>
                          )}
                          {trackObj && (
                            <button
                              type="button"
                              className="nl-pub-song-play"
                              onClick={() => preview.toggle(trackObj)}
                              aria-label={isPlaying ? 'Pause' : 'Listen'}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                        </span>
                        <span className="nl-pub-song-title" title={meta ? meta.title : s.song_id}>
                          {first3Words(meta ? meta.title : s.song_id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="nl-pub__sec-empty">No featured songs yet.</p>
              )}
            </div>

            {data!.movies.length > 0 && (
              <div className="nl-pub__movies-sec">
                <h3>Favorite Movies & Series</h3>
                <div className="nl-pub__movies-grid">
                  {data!.movies.map((m) => (
                    <div key={`${m.media_type}-${m.tmdb_id}`} className="nl-pub-movie-wrapper">
                      <img
                        src={`https://image.tmdb.org/t/p/w154${m.poster_path}`}
                        alt={m.title}
                        title={m.title}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
