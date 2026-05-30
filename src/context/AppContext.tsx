import { createContext, useContext, useState, ReactNode } from 'react';
import type { Theme, AudioIntent } from '../utils/userPrefs';
import { loadPrefs } from '../utils/userPrefs';
import { ActiveSong } from '../types';

interface AppContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  audioIntent: AudioIntent;
  setAudioIntent: (intent: AudioIntent) => void;
  ambientColor: string | null;
  setAmbientColor: (color: string | null) => void;
  activeSong: ActiveSong | null;
  setActiveSong: (song: ActiveSong | null) => void;
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const initialPrefs = loadPrefs();
  
  const [theme, setTheme] = useState<Theme>(initialPrefs.theme);
  const [audioIntent, setAudioIntent] = useState<AudioIntent>(
    initialPrefs.audioIntent === 'user-playing' ? 'initial' : initialPrefs.audioIntent
  );
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

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
