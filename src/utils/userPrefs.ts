const PREFS_KEY = 'nl-prefs-v1';

export type RepeatMode = 'off' | 'all' | 'one';
export type Theme = 'dark' | 'light' | 'bit' | 'midnight';
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

function loadPrefsRaw(): NLPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.theme === 'system' || !['dark', 'light', 'bit', 'midnight'].includes(parsed.theme))) {
      parsed.theme = 'midnight';
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function loadPrefs(): NLPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS, visitCount: 1, lastVisit: Date.now() };
    const saved = JSON.parse(raw) as Partial<NLPrefs>;
    if (saved && (saved.theme === ('system' as any) || !['dark', 'light', 'bit', 'midnight'].includes(saved.theme as any))) {
      saved.theme = 'midnight';
    }
    const prefs = { 
      ...DEFAULTS, 
      ...saved,
      visitCount: (saved.visitCount || 0) + 1,
      lastVisit: Date.now()
    };
    // Persist the updated visit count immediately
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return prefs;
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(patch: Partial<NLPrefs>): void {
  try {
    const current = loadPrefsRaw();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {} 
}

export function clearPrefs(): void {
  try { localStorage.removeItem(PREFS_KEY); } catch {}
}
