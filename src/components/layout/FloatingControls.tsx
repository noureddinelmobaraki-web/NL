import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ScrollProgress } from "../ScrollProgress";
import { NowPlayingBar } from "../NowPlayingBar";
import { ActiveSong } from "../../types";
import type { Theme } from "../../utils/userPrefs";

const THEME_LABELS: Record<string, string> = {
  system:   'ثيم: تلقائي',
  dark:     'ثيم: مظلم',
  light:    'ثيم: كلاسيكي',
  bit:      'ثيم: بيكسل',
};
const THEME_NEXT: Record<string, string> = {
  system: 'dark', dark: 'light', light: 'bit', bit: 'system',
};

export interface FloatingControlsProps {
  isPlaying: boolean;
  isMobile: boolean;
  isTablet: boolean;
  theme: Theme;
  activeSong: ActiveSong | null;
  onToggleAudio: () => void;
  onThemeChange: (newTheme: Theme) => void;
}

export const FloatingControls = ({
  isPlaying,
  isMobile,
  isTablet,
  theme,
  activeSong,
  onToggleAudio,
  onThemeChange,
}: FloatingControlsProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <ScrollProgress />

      {/* Floating Audio Control Button - Small & Elegant */}
      <button
        onClick={onToggleAudio}
        className="fixed z-[9000] backdrop-blur-lg border p-2.5 rounded-full transition-all hover:scale-105 active:scale-90 shadow-xl group border-dashed"
        style={{
          top: (isMobile || isTablet) ? 'calc(env(safe-area-inset-top) + 72px)' : 'auto',
          bottom: (isMobile || isTablet) ? 'auto' : '16px',
          right: '16px',
          background: 'var(--bg-glass-strong)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)'
        }}
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

      <NowPlayingBar 
        activeSong={activeSong}
        onClose={() => activeSong?.onDismiss?.()}
      />

      <button
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        style={{ fontFamily: 'var(--font-manga)' }}
      >
        ↑
      </button>

      <button
        onClick={() => onThemeChange(THEME_NEXT[theme] as Theme)}
        aria-label={THEME_LABELS[theme] ?? 'تغيير الثيم'}
        title={`${THEME_LABELS[theme]} — اضغط للتبديل`}
        className="fixed z-[9000] border p-2.5 rounded-full transition-all hover:scale-105 active:scale-90 shadow-xl"
        style={{
          top:   'calc(env(safe-area-inset-top) + 20px)',
          right: '20px',
          background:   'var(--bg-glass-strong)',
          borderColor:  'var(--border-subtle)',
          color:        'var(--text-secondary)',
        }}
      >
        <span className="hidden sm:inline text-[9px] font-mono mr-1 opacity-60">
          {theme === 'system' ? 'AUTO' : theme.toUpperCase()}
        </span>
        {theme === 'system' ? '🌓' : theme === 'dark' ? '🌑' : theme === 'light' ? '☀️' : '👾'}
      </button>
    </>
  );
};

export default FloatingControls;
