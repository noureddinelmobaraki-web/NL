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
  // ── الأفلام ──────────────────────────────────────────────────────
  isMoviesOpen: boolean;
  openMovies: () => void;
  closeMovies: () => void;
  isMovieActive: boolean;
  setMovieActive: (v: boolean) => void;
  registerMovieBack: (fn: () => void) => void;
  callMovieBack: () => void;
  // ── المسلسلات ────────────────────────────────────────────────────
  isSeriesOpen: boolean;
  openSeries: () => void;
  closeSeries: () => void;
  isSeriesActive: boolean;
  setSeriesActive: (v: boolean) => void;
  registerSeriesBack: (fn: () => void) => void;
  callSeriesBack: () => void;
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

  const [isMoviesOpen, setIsMoviesOpen] = useState(false);
  const [isMovieActive, setMovieActive] = useState(false);
  const movieBackRef = useRef<(() => void) | null>(null);

  const [isSeriesOpen, setIsSeriesOpen] = useState(false);
  const [isSeriesActive, setSeriesActive] = useState(false);
  const seriesBackRef = useRef<(() => void) | null>(null);

  const registerGameBack = useCallback((fn: () => void) => {
    gameBackRef.current = fn;
  }, []);

  const callGameBack = useCallback(() => {
    gameBackRef.current?.();
  }, []);

  const registerMovieBack = useCallback((fn: () => void) => {
    movieBackRef.current = fn;
  }, []);

  const callMovieBack = useCallback(() => {
    movieBackRef.current?.();
  }, []);

  const registerSeriesBack = useCallback((fn: () => void) => {
    seriesBackRef.current = fn;
  }, []);

  const callSeriesBack = useCallback(() => {
    seriesBackRef.current?.();
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

  const openMovies = useCallback(() => {
    try { audioManager.stop('bg'); } catch {}
    try { audioManager.suppressBg('movies_mode'); } catch {}
    setIsMoviesOpen(true);
  }, []);

  const closeMovies = useCallback(() => {
    movieBackRef.current = null;
    setMovieActive(false);
    try { audioManager.releaseBg('movies_mode'); } catch {}
    setIsMoviesOpen(false);
  }, []);

  const openSeries = useCallback(() => {
    try { audioManager.stop('bg'); } catch {}
    try { audioManager.suppressBg('series_mode'); } catch {}
    setIsSeriesOpen(true);
  }, []);

  const closeSeries = useCallback(() => {
    seriesBackRef.current = null;
    setSeriesActive(false);
    try { audioManager.releaseBg('series_mode'); } catch {}
    setIsSeriesOpen(false);
  }, []);

  const returnToWelcome = useCallback(() => {
    gameBackRef.current = null;
    setGameActive(false);
    movieBackRef.current = null;
    setMovieActive(false);
    seriesBackRef.current = null;
    setSeriesActive(false);
    try {
      ['bg', 'song', 'lens', 'mebit', 'video', 'intro', 'games', 'movies', 'series'].forEach(
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
        isMoviesOpen, openMovies, closeMovies,
        isMovieActive, setMovieActive,
        registerMovieBack, callMovieBack,
        isSeriesOpen, openSeries, closeSeries,
        isSeriesActive, setSeriesActive,
        registerSeriesBack, callSeriesBack,
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
