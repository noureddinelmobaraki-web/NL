const PREFS_KEY = 'nl-prefs-v1';

export type RepeatMode = 'off' | 'all' | 'one';
export type Theme = 'dark' | 'light' | 'bit' | 'midnight' | 'lite';
export type AudioIntent = 'user-paused' | 'user-playing' | 'initial';

interface NLPrefs {
  theme: Theme;
  audioIntent: AudioIntent;
  lastVolume: number;          // 0-1
  lastSongId: number | null;   // ID of last played song
  lastSongTime: number;        // playback position in seconds
  isShuffle: boolean;
  repeatMode: RepeatMode;
  hasInteracted: boolean;      // true if user has ever clicked
  visitCount: number;
  lastVisit: number;           // timestamp
}

const DEFAULTS: NLPrefs = {
  theme: 'midnight',
  audioIntent: 'initial',
  lastVolume: 0.7,
  lastSongId: null,
  lastSongTime: 0,
  isShuffle: false,
  repeatMode: 'off',
  hasInteracted: false,
  visitCount: 0,
  lastVisit: 0,
};

export function loadPrefs(): NLPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw) as Partial<NLPrefs>;
    if (saved && (saved.theme === ('system' as any) || saved.theme === ('retro' as any) || !['dark', 'light', 'bit', 'midnight', 'lite'].includes(saved.theme as any))) {
      saved.theme = 'midnight';
    }
    return { 
      ...DEFAULTS, 
      ...saved
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function trackVisit(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<NLPrefs>) : null;
    const prefs = { 
      ...DEFAULTS, 
      ...saved,
      visitCount: ((saved && saved.visitCount) || 0) + 1,
      lastVisit: Date.now()
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function savePrefs(patch: Partial<NLPrefs>): void {
  try {
    const current = loadPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {} 
}

export function clearPrefs(): void {
  try { localStorage.removeItem(PREFS_KEY); } catch {}
}

/**
 * Derived helper: does the user need to perform a gesture before audio can play?
 * Returns true if browser autoplay policy will likely block play(),
 * AND the saved intent is 'user-playing' (so we need to wait for a click).
 *
 * Browsers grant "autoplay permission" after the first user interaction in
 * the session OR if media-engagement-index is high. This helper is best-effort.
 */
export function needsUserGesture(): boolean {
  try {
    const prefs = loadPrefs();
    if (prefs.audioIntent !== 'user-playing') return false;
    // hasInteracted is persisted across sessions (visit count > 1 = trusted).
    if (prefs.hasInteracted && prefs.visitCount > 1) return false;
    return true;
  } catch {
    return true;
  }
}

