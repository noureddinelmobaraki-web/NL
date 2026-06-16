import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import type { Theme, AudioIntent } from '../utils/userPrefs';
import { loadPrefs } from '../utils/userPrefs';
import { ActiveSong } from '../types';
import { isAutomatedEnv } from '../utils/env';
import { audioManager } from '../audio/audioManager';

interface AppContextType {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  audioIntent: AudioIntent;
  setAudioIntent: React.Dispatch<React.SetStateAction<AudioIntent>>;
  ambientColor: string | null;
  setAmbientColor: (color: string | null) => void;
  activeSong: ActiveSong | null;
  setActiveSong: (song: ActiveSong | null) => void;
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  returnToWelcome: () => void;
  // ── الألعاب ──────────────────────────────────────────────────────
  isGamesOpen: boolean;
  openGames: () => void;
  closeGames: () => void;
  /** true حين تكون لعبة مختارة وقيد التشغيل (selectedId !== null) */
  isGameActive: boolean;
  setGameActive: (v: boolean) => void;
  /**
   * تُسجّل GamesPage دالة تعود للقائمة (setSelectedId(null)).
   * تستخدمها GlassModeSwitcher لزر "إغلاق اللعبة".
   */
  registerGameBack: (fn: () => void) => void;
  /** يُستدعى من GlassModeSwitcher لإغلاق اللعبة والعودة للقائمة */
  callGameBack: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const initialPrefs = loadPrefs();

  const [theme, setTheme] = useState<Theme>(initialPrefs.theme);
  const [audioIntent, setAudioIntent] = useState<AudioIntent>(initialPrefs.audioIntent);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const isAutomatedCtx = isAutomatedEnv();
  const [loaded, setLoaded] = useState(isAutomatedCtx);
  const [currentPage, setCurrentPage] = useState('home');
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isGameActive, setGameActive] = useState(false);
  const gameBackRef = useRef<(() => void) | null>(null);

  const registerGameBack = useCallback((fn: () => void) => {
    gameBackRef.current = fn;
  }, []);

  const callGameBack = useCallback(() => {
    gameBackRef.current?.();
  }, []);

  const openGames = useCallback(() => {
    // إيقاف bg فوراً لمنع تسرّب صوت midnight وغيرها
    try { audioManager.stop('bg'); } catch {}
    // طبقة أمان إضافية لمنع الاستئناف التلقائي
    try { audioManager.suppressBg('games_mode'); } catch {}
    
    setIsGamesOpen(true);
  }, []);

  const closeGames = useCallback(() => {
    gameBackRef.current = null;
    setGameActive(false);
    try { audioManager.releaseBg('games_mode'); } catch {}
    setIsGamesOpen(false);
  }, []);

  const returnToWelcome = useCallback(() => {
    gameBackRef.current = null;
    setGameActive(false);
    try {
      ['bg', 'song', 'lens', 'mebit', 'video', 'intro', 'games'].forEach(
        (s) => audioManager.stop(s as any),
      );
    } catch {}
    setLoaded(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme, setTheme,
        audioIntent, setAudioIntent,
        ambientColor, setAmbientColor,
        activeSong, setActiveSong,
        loaded, setLoaded,
        currentPage, setCurrentPage,
        returnToWelcome,
        isGamesOpen, openGames, closeGames,
        isGameActive, setGameActive,
        registerGameBack, callGameBack,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
