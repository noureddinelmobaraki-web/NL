import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const initialPrefs = loadPrefs();
  
  const [theme, setTheme] = useState<Theme>(initialPrefs.theme);
  // FIX: respect user's prior choice. The 'needsUserGesture' flag is what
  // guards autoplay — see useAudioController's audioIntent+loaded effect.
  const [audioIntent, setAudioIntent] = useState<AudioIntent>(initialPrefs.audioIntent);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const isAutomatedCtx = isAutomatedEnv();
  const [loaded, setLoaded] = useState(isAutomatedCtx);
  const [currentPage, setCurrentPage] = useState('home');

  const returnToWelcome = useCallback(() => {
    try { ['bg','song','lens','mebit','video','intro'].forEach((s) => audioManager.stop(s as any)); } catch {}
    setLoaded(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        audioIntent,
        setAudioIntent,
        ambientColor,
        setAmbientColor,
        activeSong,
        setActiveSong,
        loaded,
        setLoaded,
        currentPage,
        setCurrentPage,
        returnToWelcome,
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
