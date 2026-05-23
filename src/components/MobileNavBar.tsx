import { useDeviceType } from "../hooks/useDeviceType";
import { Home, Music2, Camera, Aperture, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isBgPlaying: boolean;
  onToggleBg: () => void;
}

export const MobileNavBar = ({
  currentPage,
  onNavigate,
  isBgPlaying,
  onToggleBg,
}: MobileNavBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  if (!isMobile && !isTablet) return null;

  const MusicIcon = isBgPlaying ? Pause : Play;

  const tabs = [
    { id: 'home',         Icon: Home,      label: 'الرئيسية' },
    { id: 'songs',        Icon: Music2,    label: 'أغاني'    },
    { id: 'mebit',        Icon: Camera,    label: 'صوري'     },
    { id: 'lens',         Icon: Aperture,  label: 'LENS'     },
    {
      id: 'music-toggle',
      Icon: MusicIcon,
      label: isBgPlaying ? 'إيقاف' : 'موسيقى',
      isAction: true
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        paddingTop: '8px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-subtle)',
        zIndex: 7000,
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentPage === tab.id;
        const isMusic = tab.isAction;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => isMusic ? onToggleBg() : onNavigate(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '44px',
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
            <tab.Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.5}
              aria-hidden="true"
            />
            <span style={{ fontSize: '9px', fontWeight: isActive ? 'bold' : 'normal' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
