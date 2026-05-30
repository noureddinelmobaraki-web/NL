import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ScrollProgress } from "../ScrollProgress";
import { NowPlayingBar } from "../NowPlaying/NowPlayingBar";
import { ActiveSong } from "../../types";
import { useButtonContext } from "./ButtonOrchestrator";
import type { Theme } from "../../utils/userPrefs";
import { getLocalAssetUrl } from "../../constants/assets";
import { useBarOrchestrator } from '../../hooks/useBarOrchestrator';

const THEME_LABELS: Record<string, string> = {
  dark:     'ثيم: مظلم',
  light:    'ثيم: كلاسيكي',
  bit:      'ثيم: بيكسل',
  midnight: 'ثيم: منتصف الليل',
};
const THEME_NEXT: Record<string, string> = {
  dark: 'light', light: 'bit', bit: 'midnight', midnight: 'dark',
};

export interface FloatingControlsProps {
  isPlaying: boolean;
  isMobile: boolean;
  isTablet: boolean;
  theme: Theme;
  activeSong: ActiveSong | null;
  activeCardId: number | null;
  onToggleAudio: () => void;
  onThemeChange: (newTheme: Theme) => void;
  isAnyModalOpen?: boolean;
  activeModalContext?: 'page' | 'lens' | 'mebit' | 'songs-modal' | null;
}

export const FloatingControls = ({
  isPlaying,
  isMobile,
  isTablet,
  theme,
  activeSong,
  activeCardId,
  onToggleAudio,
  onThemeChange,
  activeModalContext,
}: FloatingControlsProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { registerButton, unregisterButton } = useButtonContext();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Theme Switcher Button registration
  useEffect(() => {
    registerButton({
      id: 'theme',
      priority: 1,
      allowedContexts: ['page'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={() => onThemeChange((THEME_NEXT[theme] ?? 'dark') as Theme)}
          aria-label={(THEME_LABELS[theme] ?? THEME_LABELS.midnight) ?? 'تغيير الثيم'}
          title={`${(THEME_LABELS[theme] ?? THEME_LABELS.midnight)} — اضغط للتبديل`}
          className="fab-button flex items-center justify-center"
        >
          <img 
            src={getLocalAssetUrl(theme === 'dark' ? 'dark-mode.svg' : theme === 'light' ? 'light-mode.svg' : theme === 'bit' ? 'bit_mode.svg' : 'midnight_mode.svg')} 
            alt={`${THEME_LABELS[theme] ?? theme} icon`}
            className="w-4 h-4 object-contain"
            style={{ 
              filter: theme === 'light' ? 'none' : 'invert(1) brightness(2)'
            }}
          />
        </button>
      )
    });
    return () => unregisterButton('theme');
  }, [theme, onThemeChange, registerButton, unregisterButton]);

  // Background Audio Controller Button registration
  useEffect(() => {
    registerButton({
      id: 'bgMusic',
      priority: 1,
      allowedContexts: ['page'],
      slot: 'topRight2',
      render: () => (
        <button
          onClick={onToggleAudio}
          className="fab-button border-dashed group relative"
          aria-label="Toggle Background Music"
        >
          {isPlaying ? (
            <Volume2 className="w-4 h-4 group-hover:animate-pulse" aria-hidden="true" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          )}
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[10px] font-mono tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5 uppercase">
            {isPlaying ? 'Sound On' : 'Sound Off'}
          </div>
        </button>
      )
    });
    return () => unregisterButton('bgMusic');
  }, [isPlaying, onToggleAudio, registerButton, unregisterButton]);

  // Scroll to Top Button registration
  useEffect(() => {
    registerButton({
      id: 'scrollTop',
      priority: 1,
      allowedContexts: ['page'],
      slot: 'bottomRight',
      render: () => (
        <button
          className={`fab-button ${showScrollTop ? '' : 'fab-hidden'}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          style={{ fontFamily: 'var(--font-manga)' }}
        >
          ↑
        </button>
      )
    });
    return () => unregisterButton('scrollTop');
  }, [showScrollTop, registerButton, unregisterButton]);

  const { isBarVisible, geometry } = useBarOrchestrator({
    activeCardId,
    activeModalContext: activeModalContext ?? 'page',
    isMobile,
    isTablet,
    suppressMiniBar: activeSong?.suppressMiniBar ?? false,
  });

  return (
    <>
      <ScrollProgress />

      <NowPlayingBar 
        activeSong={activeSong}
        isBarVisible={isBarVisible}
        geometry={geometry}
        onClose={() => activeSong?.onDismiss?.()}
      />
    </>
  );
};

export default FloatingControls;
