import { useState, useEffect, type MouseEvent } from "react";
import { useDeviceType } from "../hooks/useDeviceType";
import { Home, Music2, Camera, Aperture, Pause, Play, Gamepad2, Film, Monitor, AudioLines, Users, LayoutGrid, X } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { setGenieOriginFromElement } from "../transitions/genieOrigin";
import { useAppContext } from '../context/AppContext';

interface MobileNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isBgPlaying: boolean;
  onToggleBg: () => void;
}

interface NavTabItem {
  id: string;
  Icon: typeof Home;
  label: string;
  isGames?: boolean;
  isMovies?: boolean;
  isXp?: boolean;
  isMusic?: boolean;
  isAccounts?: boolean;
  isAction?: boolean;
  isMore?: boolean;
}

export const MobileNavBar = ({
  currentPage,
  onNavigate,
  isBgPlaying,
  onToggleBg,
}: MobileNavBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const { t, i18n } = useTranslation();
  const { openGames, openMovies, openXp, openMusic, openAccounts } = useAppContext();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMoreOpen]);

  if (!isMobile && !isTablet) return null;

  const MusicIcon = isBgPlaying ? Pause : Play;
  const lang = i18n.resolvedLanguage || i18n.language || 'en';
  const moreLabel = i18n.exists('nav.more')
    ? t('nav.more')
    : lang.startsWith('ar')
      ? 'الأقسام'
      : lang.startsWith('fr')
        ? 'Plus'
        : 'More';

  const primaryTabs: NavTabItem[] = [
    { id: 'home', Icon: Home, label: t('nav.home') },
    { id: 'songs', Icon: Music2, label: t('nav.songs') },
    {
      id: 'movies',
      Icon: Film,
      label: i18n.exists('nav.movies_and_series')
        ? t('nav.movies_and_series')
        : i18n.exists('nav.movies') && i18n.exists('nav.series')
          ? `${t('nav.movies')} & ${t('nav.series')}`
          : 'Movies & Series',
      isMovies: true,
    },
    { id: 'music', Icon: AudioLines, label: t('nav.music'), isMusic: true },
    {
      id: 'music-toggle',
      Icon: MusicIcon,
      label: isBgPlaying ? t('nav.pause') : t('nav.play'),
      isAction: true,
    },
    { id: 'more', Icon: LayoutGrid, label: moreLabel, isMore: true },
  ];

  const secondaryTabs: NavTabItem[] = [
    { id: 'games', Icon: Gamepad2, label: t('nav.games'), isGames: true },
    { id: 'mebit', Icon: Camera, label: t('nav.mebit') },
    { id: 'lens', Icon: Aperture, label: t('nav.lens') },
    { id: 'xp', Icon: Monitor, label: t('xp.nav'), isXp: true },
    {
      id: 'accounts',
      Icon: Users,
      label: i18n.exists('nav.accounts') ? t('nav.accounts') : 'Accounts',
      isAccounts: true,
    },
  ];

  const isSecondaryActive = secondaryTabs.some((tab) => tab.id === currentPage);

  const handleTabActivate = (tab: NavTabItem, e: MouseEvent<HTMLButtonElement>) => {
    setGenieOriginFromElement(e.currentTarget);
    if (tab.isMore) {
      setIsMoreOpen((prev) => !prev);
      return;
    }
    setIsMoreOpen(false);
    if (tab.isAction) onToggleBg();
    else if (tab.isGames) openGames();
    else if (tab.isMovies) openMovies();
    else if (tab.isXp) openXp();
    else if (tab.isMusic) openMusic();
    else if (tab.isAccounts) openAccounts();
    else onNavigate(tab.id);
  };

  return (
    <>
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-[8990] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setIsMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={moreLabel}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-t border-white/15 bg-zinc-950/90 backdrop-blur-xl px-4 pt-4 pb-24 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {moreLabel}
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Close menu"
                className="min-h-[48px] min-w-[48px] inline-flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {secondaryTabs.map((tab) => {
                const isActive = currentPage === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => handleTabActivate(tab, e)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-h-[64px] min-w-[48px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-cyan-400/50 bg-cyan-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/85 hover:bg-white/10'
                    }`}
                  >
                    <tab.Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                    <span className="truncate max-w-full">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="nl-bottom-nav" lang={lang} aria-label="Mobile Navigation">
        <div className="nl-bottom-nav__rail">
          {primaryTabs.map((tab) => {
            const isActive = tab.isMore ? isMoreOpen || isSecondaryActive : currentPage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => handleTabActivate(tab, e)}
                aria-current={isActive && !tab.isMore ? 'page' : undefined}
                aria-expanded={tab.isMore ? isMoreOpen : undefined}
                aria-label={tab.label}
                className={`nl-bottom-nav__item min-h-[48px] min-w-[48px] ${isActive ? 'is-active' : ''} ${tab.isAction ? 'is-music-toggle' : ''}`}
              >
                <div className="nl-bottom-nav__icon">
                  <tab.Icon size={isActive ? 20 : 19} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                </div>
                <span className="nl-bottom-nav__label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

