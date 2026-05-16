// Session-only state — lost on tab close, kept on navigation/refresh
const SESSION_KEY = 'nl-session-v1';

interface NLSession {
  songsLoaded: boolean;        // songs.json was fetched this session
  hlsPreloaded: string[];      // URLs already preloaded this session  
  dominantColors: Record<string, string>; // imageUrl → rgb string cache
  lrcCache: Record<number, any[]>;       // songId → parsed LyricLine array
  durationCache: Record<number, number>;  // songId → duration in seconds
}

const SESSION_DEFAULTS: NLSession = {
  songsLoaded: false,
  hlsPreloaded: [],
  dominantColors: {},
  lrcCache: {},
  durationCache: {},
};

export function loadSession(): NLSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? { ...SESSION_DEFAULTS, ...JSON.parse(raw) } : { ...SESSION_DEFAULTS };
  } catch {
    return { ...SESSION_DEFAULTS };
  }
}

export function saveSession(patch: Partial<NLSession>): void {
  try {
    const current = loadSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}
