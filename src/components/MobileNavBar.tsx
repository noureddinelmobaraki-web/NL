import { useRef } from "react";
import { useDeviceType } from "../hooks/useDeviceType";
import { Home, Music2, Camera, Aperture, Pause, Play, Gamepad2, Film, Monitor, AudioLines, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { setGenieOriginFromElement } from "../transitions/genieOrigin";
import { useAppContext } from '../context/AppContext';

interface MobileNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isBgPlaying: boolean;
  onToggleBg: () => void;
  onMoodTrigger?: () => void; // FIXED: Added onMoodTrigger prop
}

export const MobileNavBar = ({
  currentPage,
  onNavigate,
  isBgPlaying,
  onToggleBg,
  onMoodTrigger,
}: MobileNavBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const { t, i18n } = useTranslation();
  const { openGames, openMovies, openXp, openMusic, openAccounts } = useAppContext();
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isMobile && !isTablet) return null;

  const MusicIcon = isBgPlaying ? Pause : Play;

  const handleStart = () => {
    longPressTimeout.current = setTimeout(() => {
      // FIXED: Use onMoodTrigger instead of fragile DOM query
      onMoodTrigger?.();
    }, 600);
  };

  const handleEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const tabs = [
    { id: 'home',         Icon: Home,      label: t('nav.home') },
    { id: 'songs',        Icon: Music2,    label: t('nav.songs') },
    { id: 'mebit',        Icon: Camera,    label: t('nav.mebit') },
    { id: 'lens',         Icon: Aperture,  label: t('nav.lens') },
    { id: 'games',        Icon: Gamepad2,  label: t('nav.games'), isGames: true },
    {
      id: 'movies',
      Icon: Film,
      label: i18n.exists('nav.movies_and_series') ? t('nav.movies_and_series') : 
        (i18n.exists('nav.movies') && i18n.exists('nav.series') 
          ? `${t('nav.movies')} & ${t('nav.series')}` 
          : "Movies & Series"),
      isMovies: true
    },
    { id: 'xp',           Icon: Monitor,   label: t('xp.nav'), isXp: true },
    { id: 'music',        Icon: AudioLines,label: t('nav.music'), isMusic: true },
    { id: 'accounts',     Icon: Users,     label: i18n.exists('nav.accounts') ? t('nav.accounts') : 'Accounts', isAccounts: true },
    {
      id: 'music-toggle',
      Icon: MusicIcon,
      label: isBgPlaying ? t('nav.pause') : t('nav.play'),
      isAction: true
    },
  ];

  return (
    <nav
      className="mid-nav"
      lang={i18n.resolvedLanguage || i18n.language || 'en'}
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        paddingTop: '4px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)',
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        zIndex: 7000,
        height: 'var(--mobile-nav-height, 64px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentPage === tab.id;
        const isMusic = tab.isAction;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              setGenieOriginFromElement(e.currentTarget);
              if (tab.isAction) { onToggleBg(); }
              else if (tab.isGames) { openGames(); }
              else if (tab.isMovies) { openMovies(); }
              else if (tab.isXp) { openXp(); }
              else if (tab.isMusic) { openMusic(); }
              else if (tab.isAccounts) { openAccounts(); }
              else { onNavigate(tab.id); }
            }}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            onMouseDown={isMusic ? handleStart : undefined}
            onMouseUp={isMusic ? handleEnd : undefined}
            onMouseLeave={isMusic ? handleEnd : undefined}
            onTouchStart={isMusic ? handleStart : undefined}
            onTouchEnd={isMusic ? handleEnd : undefined}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              minHeight: '48px',
              background: 'none',
              border: 'none',
              padding: '0 4px',
              cursor: 'pointer',
              color: isMusic
                ? (isBgPlaying ? 'var(--accent)' : 'var(--accent-red, #ff2d78)')
                : isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}
          >
            {/* Active indicator line */}
            {isActive && !isMusic && (
              <motion.div
                layoutId="nav-active-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: '2px',
                  background: 'var(--text-primary)',
                  borderRadius: '0 0 2px 2px',
                }}
              />
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <tab.Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 1.5}
                aria-hidden="true"
              />
            </div>
            <span style={{ 
              fontSize: '9px', 
              fontWeight: isActive ? '700' : '500',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
