import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect, useReducer } from 'react';
import type { Theme, AudioIntent } from '../utils/userPrefs';
import { loadPrefs } from '../utils/userPrefs';
import { ActiveSong } from '../types';
import { isAutomatedEnv } from '../utils/env';
import { audioManager } from '../audio/audioManager';
import { navReducer, initialNavState, type PageId, type CinemaTab } from './navigationController';

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
  navigateTo: (page: PageId, cinemaTab?: CinemaTab) => void;
  endTransition: () => void;
  isTransitioning: boolean;
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
  // ── التلفزيون NL TV ──────────────────────────────────────────────
  isTvOpen: boolean;
  openTv: () => void;
  closeTv: () => void;
  isTvActive: boolean;
  setTvActive: (v: boolean) => void;
  registerTvBack: (fn: () => void) => void;
  callTvBack: () => void;
  // ── ريترو ────────────────────────────────────────────────────────
  isRetroOpen: boolean;
  openRetro: () => void;
  closeRetro: () => void;
  // ── ويندوز XP ────────────────────────────────────────────────────
  isXpOpen: boolean;
  openXp: () => void;
  closeXp: () => void;
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

  const [nav, dispatch] = useReducer(navReducer, initialNavState);

  const isGamesOpen  = nav.activePage === 'games';
  const isMoviesOpen = nav.activePage === 'cinema' && nav.cinemaTab === 'movies';
  const isSeriesOpen = nav.activePage === 'cinema' && nav.cinemaTab === 'series';
  const isTvOpen     = nav.activePage === 'tv';
  const isRetroOpen  = nav.activePage === 'retro';
  const isXpOpen     = nav.activePage === 'xp';

  const [isGameActive, setGameActive] = useState(false);
  const gameBackRef = useRef<(() => void) | null>(null);

  const [isMovieActive, setMovieActive] = useState(false);
  const movieBackRef = useRef<(() => void) | null>(null);

  const [isSeriesActive, setSeriesActive] = useState(false);
  const seriesBackRef = useRef<(() => void) | null>(null);

  const [isTvActive, setTvActive] = useState(false);
  const tvBackRef = useRef<(() => void) | null>(null);

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

  const registerTvBack = useCallback((fn: () => void) => {
    tvBackRef.current = fn;
  }, []);

  const callTvBack = useCallback(() => {
    tvBackRef.current?.();
  }, []);

  const prevPageRef = useRef<PageId>('home');

  const navigateTo = useCallback((page: PageId, cinemaTab?: CinemaTab) => {
    dispatch({ type: 'NAVIGATE', page, cinemaTab });
  }, []);

  useEffect(() => {
    const page = nav.activePage;
    const prev = prevPageRef.current;
    if (page === prev) return;

    // مغادرة الصفحة السابقة: حرّر الـ suppressor + أوقف قناتها + صفّر مراجع back
    if (prev === 'games')  { gameBackRef.current = null; setGameActive(false); try { audioManager.releaseBg('games_mode'); } catch {} }
    if (prev === 'cinema') { movieBackRef.current = null; setMovieActive(false); seriesBackRef.current = null; setSeriesActive(false); try { audioManager.releaseBg('movies_mode'); audioManager.releaseBg('series_mode'); } catch {} }
    if (prev === 'tv')     { tvBackRef.current = null; setTvActive(false); try { audioManager.releaseBg('tv_mode'); audioManager.stop('tv'); } catch {} }
    if (prev === 'retro')  { try { audioManager.releaseBg('retro_mode'); audioManager.stop('retro'); } catch {} }
    if (prev === 'xp')     { try { audioManager.releaseBg('xp_mode'); audioManager.stop('xp'); } catch {} }

    // دخول صفحة جديدة: أوقف موسيقى الثيم (bg) + علّقها
    if (page !== 'home') {
      try { audioManager.stop('bg'); } catch {}
      const reason = page === 'cinema'
        ? (nav.cinemaTab === 'series' ? 'series_mode' : 'movies_mode')
        : `${page}_mode`;
      try { audioManager.suppressBg(reason); } catch {}
    }

    prevPageRef.current = page;
  }, [nav.activePage, nav.cinemaTab]);

  const endTransition = useCallback(() => dispatch({ type: 'TRANSITION_END' }), []);

  useEffect(() => {
    if (!nav.transitioning) return;
    const t = setTimeout(() => dispatch({ type: 'TRANSITION_END' }), 500); // fallback أمان
    return () => clearTimeout(t);
  }, [nav.transitioning]);

  const openGames   = useCallback(() => navigateTo('games'), [navigateTo]);
  const closeGames  = useCallback(() => navigateTo('home'), [navigateTo]);
  const openMovies  = useCallback(() => navigateTo('cinema', 'movies'), [navigateTo]);
  const closeMovies = useCallback(() => navigateTo('home'), [navigateTo]);
  const openSeries  = useCallback(() => navigateTo('cinema', 'series'), [navigateTo]);
  const closeSeries = useCallback(() => navigateTo('home'), [navigateTo]);
  const openTv      = useCallback(() => navigateTo('tv'), [navigateTo]);
  const closeTv     = useCallback(() => navigateTo('home'), [navigateTo]);
  const openRetro   = useCallback(() => navigateTo('retro'), [navigateTo]);
  const closeRetro  = useCallback(() => navigateTo('home'), [navigateTo]);
  const openXp      = useCallback(() => navigateTo('xp'), [navigateTo]);
  const closeXp     = useCallback(() => navigateTo('home'), [navigateTo]);

  const returnToWelcome = useCallback(() => {
    gameBackRef.current = null;  setGameActive(false);
    movieBackRef.current = null; setMovieActive(false);
    seriesBackRef.current = null; setSeriesActive(false);
    tvBackRef.current = null;    setTvActive(false);
    dispatch({ type: 'RESET' });
    prevPageRef.current = 'home';
    try {
      ['bg','song','lens','mebit','video','intro','games','movies','series','tv','retro','xp'].forEach(
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
        navigateTo, endTransition, isTransitioning: nav.transitioning,
        isGamesOpen, openGames, closeGames,
        isGameActive, setGameActive,
        registerGameBack, callGameBack,
        isMoviesOpen, openMovies, closeMovies,
        isMovieActive, setMovieActive,
        registerMovieBack, callMovieBack,
        isSeriesOpen, openSeries, closeSeries,
        isSeriesActive, setSeriesActive,
        registerSeriesBack, callSeriesBack,
        isTvOpen, openTv, closeTv,
        isTvActive, setTvActive,
        registerTvBack, callTvBack,
        isRetroOpen, openRetro, closeRetro,
        isXpOpen, openXp, closeXp,
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

