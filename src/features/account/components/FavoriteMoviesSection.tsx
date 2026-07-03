import { useEffect, useState } from 'react';
import { Film, Star } from 'lucide-react';
import { fetchMovieFavorites, type MovieFavRow } from '../profileFeatured';

const IMG = 'https://image.tmdb.org/t/p/w342';
interface Props { userId: string; }

export function FavoriteMoviesSection({ userId }: Props) {
  const [rows, setRows] = useState<MovieFavRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMovieFavorites(userId)
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(String(e?.message ?? e)); });
    return () => { alive = false; };
  }, [userId]);

  if (error) return <p className="profile-section-error">{error}</p>;
  if (rows === null) return <div className="profile-skeleton-grid" aria-busy="true" />;
  if (rows.length === 0)
    return (
      <div className="profile-empty">
        <Film size={26} />
        <span>No favorite movies or series yet</span>
      </div>
    );

  return (
    <div className="fav-grid">
      {rows.map((r) => (
        <div key={`${r.tmdb_id}-${r.media_type}`} className="fav-card fav-card--poster" title={r.title}>
          <span className="fav-poster">
            {r.poster_path
              ? <img src={`${IMG}${r.poster_path}`} alt={r.title} loading="lazy" />
              : <span className="fav-initials"><Film size={22} /></span>}
            {r.is_featured && <span className="fav-star"><Star size={12} /></span>}
            <span className="fav-badge">{r.media_type === 'tv' ? 'Series' : 'Movie'}</span>
          </span>
          <span className="fav-meta"><span className="fav-title">{r.title}</span></span>
        </div>
      ))}
    </div>
  );
}
