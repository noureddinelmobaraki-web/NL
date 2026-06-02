import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ScrollProgress } from "../ScrollProgress";
import { NowPlayingBar } from "../NowPlaying/NowPlayingBar";
import { ActiveSong } from "../../types";
import { useButtonContext } from "./ButtonOrchestrator";
import type { Theme } from "../../utils/userPrefs";
import { getLocalAssetUrl } from "../../constants/assets";
import { useBarOrchestrator } from '../../hooks/useBarOrchestrator';
import { motion, AnimatePresence } from "framer-motion";

const THEME_LABELS: Record<string, string> = {
  dark:     'Dark',
  light:    'Light',
  bit:      'Bit',
  midnight: 'Midnight',
  lite:     'Lite',
  retro:    'Retro',
};

const themeIconUrl = (t: Theme) =>
  t === 'retro'
    ? 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/retro.svg'
    : getLocalAssetUrl(
        t === 'dark' ? 'dark-mode.svg' :
        t === 'light' ? 'light-mode.svg' :
        t === 'bit' ? 'bit_mode.svg' :
        t === 'lite' ? 'lite_mode.svg' :
        'midnight_mode.svg'
      );

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
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const isMobileOrTablet = isMobile || isTablet;

  // Close the mobile theme menu whenever the theme actually changes or the page is scrolled
  useEffect(() => { setIsThemeOpen(false); }, [theme]);
  useEffect(() => {
    if (!isThemeOpen) return;
    const onScroll = () => setIsThemeOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isThemeOpen]);

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
      render: () => {
        // ─────────────── DESKTOP: keep the existing horizontal strip ───────────────
        if (!isMobileOrTablet) {
          return (
            <div 
              className="flex items-center gap-1.5 p-1.5 rounded-full shadow-lg backdrop-blur-md" 
              style={{ 
                pointerEvents: 'auto',
                background: 'var(--bg-glass-strong, rgba(0,0,0,0.3))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                width: '229.065px',
                height: '39.0645px',
                backgroundColor: '#464646',
                borderWidth: '-7.96774px'
              }}
            >
              {(['dark', 'light', 'midnight', 'bit', 'lite', 'retro'] as Theme[]).map(t => {
                const isActive = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => onThemeChange(t)}
                    aria-label={THEME_LABELS[t] ?? 'Change theme'}
                    title={`${THEME_LABELS[t]} — Click to switch`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                      isActive
                        ? 'border shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-110 opacity-100 z-10'
                        : 'border border-transparent opacity-60 hover:opacity-100 hover:scale-105 z-0'
                    }`}
                    style={{
                      background: isActive ? 'var(--bg-glass-strong, rgba(255,255,255,0.2))' : 'transparent',
                      borderColor: isActive ? 'var(--border-subtle, rgba(255,255,255,0.5))' : 'transparent',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span className="sr-only">{THEME_LABELS[t] ?? t}</span>
                    <img 
                      src={themeIconUrl(t)} 
                      alt={`${THEME_LABELS[t] ?? t} icon`}
                      className={`w-4 h-4 object-contain transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}
                      style={{ 
                        filter: t === 'light' ? 'none' : 'invert(1) brightness(2)',
                        ...(t === 'retro' ? {
                          backgroundColor: '#f6f6f6',
                          borderColor: '#dadbe6'
                        } : {})
                      }}
                    />
                  </button>
                );
              })}
            </div>
          );
        }

        // ─────────────── MOBILE / TABLET: collapsed FAB + animated menu ─────────────
        const MOBILE_THEMES: Theme[] = ['dark', 'light', 'midnight', 'bit', 'lite', 'retro'];
        return (
          <div style={{ position: 'relative', pointerEvents: 'auto' }}>
            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setIsThemeOpen(v => !v)}
              aria-expanded={isThemeOpen}
              aria-haspopup="menu"
              aria-label={`Change theme. Current: ${THEME_LABELS[theme] ?? theme}`}
              className="fab-button"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                background: 'var(--bg-glass-strong, rgba(0,0,0,0.45))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                transition: 'transform 200ms ease',
                transform: isThemeOpen ? 'rotate(90deg) scale(1.05)' : 'rotate(0deg) scale(1)',
              }}
            >
              <img
                src={themeIconUrl(theme)}
                alt=""
                aria-hidden="true"
                style={{
                  width: 20,
                  height: 20,
                  objectFit: 'contain',
                  filter: theme === 'light' ? 'none' : 'invert(1) brightness(2)',
                }}
              />
            </button>

            {/* Vertical menu — animated via Framer Motion */}
            <AnimatePresence>
              {isThemeOpen && (
                <>
                  {/* Backdrop to close on outside-tap */}
                  <motion.div
                    key="theme-bd"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsThemeOpen(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      zIndex: 9990,
                      touchAction: 'manipulation',
                    }}
                  />
                  {/* Menu container — positioned below the trigger */}
                  <motion.div
                    key="theme-menu"
                    role="menu"
                    initial={{ opacity: 0, y: -8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.92 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: 8,
                      background: 'var(--bg-glass-strong, rgba(15,15,20,0.92))',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                      borderRadius: 16,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      zIndex: 9991,
                    }}
                  >
                    {MOBILE_THEMES.map((t, idx) => {
                      const isActive = theme === t;
                      return (
                        <motion.button
                          key={t}
                          role="menuitemradio"
                          aria-checked={isActive}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.035 }}
                          onClick={() => { onThemeChange(t); setIsThemeOpen(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minHeight: 44,
                            padding: '6px 12px 6px 8px',
                            borderRadius: 12,
                            background: isActive ? 'var(--bg-glass-strong, rgba(255,255,255,0.12))' : 'transparent',
                            border: isActive
                              ? '1px solid var(--border-subtle, rgba(255,255,255,0.4))'
                              : '1px solid transparent',
                            color: 'var(--text-primary, #fff)',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'right',
                          }}
                        >
                          <span style={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--bg-glass-strong, rgba(255,255,255,0.08))',
                            flexShrink: 0,
                          }}>
                            <img
                              src={themeIconUrl(t)}
                              alt=""
                              aria-hidden="true"
                              style={{
                                width: 14,
                                height: 14,
                                objectFit: 'contain',
                                filter: t === 'light' ? 'none' : 'invert(1) brightness(2)',
                              }}
                            />
                          </span>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            color: 'var(--text-primary, #fff)',
                            whiteSpace: 'nowrap',
                          }}>
                            {THEME_LABELS[t] ?? t}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      }
    });
    return () => unregisterButton('theme');
  }, [theme, onThemeChange, registerButton, unregisterButton, isMobileOrTablet, isThemeOpen]);

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
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
          style={{ fontFamily: 'var(--font-manga)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
