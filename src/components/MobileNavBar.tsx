import { useDeviceType } from "../hooks/useDeviceType";
import { Home, Music2, Camera, Aperture, Pause, Play, Gamepad2, Film, Monitor, AudioLines, Users } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { setGenieOriginFromElement } from "../transitions/genieOrigin";
import { useAppContext } from '../context/AppContext';

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
  const { t, i18n } = useTranslation();
  const { openGames, openMovies, openXp, openMusic, openAccounts } = useAppContext();

  if (!isMobile && !isTablet) return null;

  const MusicIcon = isBgPlaying ? Pause : Play;

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
      className="nl-bottom-nav"
      lang={i18n.resolvedLanguage || i18n.language || 'en'}
      aria-label="Mobile Navigation"
    >
      <div className="nl-bottom-nav__rail">
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
              className={`nl-bottom-nav__item ${isActive ? 'is-active' : ''} ${isMusic ? 'is-music-toggle' : ''}`}
            >
              <div className="nl-bottom-nav__icon">
                <tab.Icon
                  size={isActive ? 20 : 19}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
              </div>
              <span className="nl-bottom-nav__label">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
