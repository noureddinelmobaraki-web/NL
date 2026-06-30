import { supabase } from '../../config/supabase';

type Entry = { data: any; ts: number };
const TTL = 60_000;
const mem = new Map<string, Entry>();
const KEY = (id: string) => `nl_pp_${id}`;

export interface NormalizedPublicProfile {
  profile: any | null;
  songs: Array<{ song_id: string }>;
  movies: Array<{ tmdb_id: number; media_type: string; title: string; poster_path: string }>;
}

/** يحصّن الواجهة ضد اختلاف أسماء الحقول في رد get_public_profile. */
function normalizePublicProfile(raw: any): NormalizedPublicProfile {
  if (!raw || typeof raw !== 'object') return { profile: null, songs: [], movies: [] };
  const profile = raw.profile ?? raw.user ?? raw;
  const rawSongs =
    raw.songs ?? raw.featured_songs ?? raw.featuredSongs ?? raw.featured ?? raw.top_songs ?? [];
  const songs = (Array.isArray(rawSongs) ? rawSongs : [])
    .map((s: any) =>
      typeof s === 'string'
        ? { song_id: s }
        : { song_id: String(s?.song_id ?? s?.id ?? s?.songId ?? '') },
    )
    .filter((s) => s.song_id);
  const rawMovies = raw.movies ?? raw.favorite_movies ?? raw.featured_movies ?? [];
  const movies = (Array.isArray(rawMovies) ? rawMovies : []).map((m: any) => ({
    tmdb_id: Number(m?.tmdb_id ?? m?.id ?? 0),
    media_type: String(m?.media_type ?? 'movie'),
    title: String(m?.title ?? ''),
    poster_path: String(m?.poster_path ?? ''),
  }));
  return { profile, songs, movies };
}

function readSession(id: string): Entry | null {
  try {
    const r = sessionStorage.getItem(KEY(id));
    return r ? (JSON.parse(r) as Entry) : null;
  } catch {
    return null;
  }
}

function writeSession(id: string, e: Entry) {
  try {
    sessionStorage.setItem(KEY(id), JSON.stringify(e));
  } catch {}
}

export function getCachedProfile(id: string): any | null {
  const e = mem.get(id) ?? readSession(id);
  if (e) {
    mem.set(id, e);
    return e.data;
  }
  return null;
}

export async function fetchPublicProfile(id: string, opts?: { force?: boolean }): Promise<any> {
  const cached = mem.get(id) ?? readSession(id);
  const fresh = cached && Date.now() - cached.ts < TTL;
  if (cached && fresh && !opts?.force) {
    return cached.data;
  }

  // SWR: لو عندنا قديم، أرجعه فوراً وحدّث بالخلفية
  const revalidate = (async () => {
    const { data, error } = await supabase.rpc('get_public_profile', { target: id });
    if (error) throw error;
    const normalized = normalizePublicProfile(data);
    const e: Entry = { data: normalized, ts: Date.now() };
    mem.set(id, e);
    writeSession(id, e);
    return normalized;
  })();

  if (cached && !opts?.force) {
    revalidate.catch(() => {});
    return cached.data;
  }
  return revalidate;
}

export function invalidateProfile(id: string) {
  mem.delete(id);
  try {
    sessionStorage.removeItem(KEY(id));
  } catch {}
}
