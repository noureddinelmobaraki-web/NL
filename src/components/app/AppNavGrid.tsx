import { motion } from 'framer-motion';
import { Camera, Music2, Pencil, Aperture, Gamepad2, Clapperboard, Tv } from 'lucide-react';
import { NavButton } from '../NavButton';
import { audioManager } from '../../audio/audioManager';
import { itemVariants } from './appConstants';
import { useTranslation } from 'react-i18next';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { useAppContext } from '../../context/AppContext';

interface AppNavGridProps {
  resolvedTheme: string;
  onScrollToSection: (id: string) => void;
  onOpenLens: () => void;
}

export function AppNavGrid({
  resolvedTheme,
  onScrollToSection,
  onOpenLens,
}: AppNavGridProps) {
  const { t, i18n } = useTranslation();
  const { openGames, openMovies, openTv } = useAppContext();

  const moviesSeriesLabel = i18n.exists('nav.movies_and_series') ? t('nav.movies_and_series') : 
    (i18n.exists('nav.movies') && i18n.exists('nav.series') 
      ? `${t('nav.movies')} & ${t('nav.series')}` 
      : "Movies & Series");

  return (
    <motion.div 
      variants={itemVariants} 
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-5 md:gap-6 mb-4"
    >
      <NavButton 
        icon={Camera} 
        label={t('nav.mebit').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          onScrollToSection('me-bit-gallery');
        }} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Music2} 
        label={t('nav.songs').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          onScrollToSection('my-songs-section');
        }} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Pencil} 
        label={t('nav.drawings').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          onScrollToSection('drawings-section');
        }} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Aperture} 
        label={t('nav.lens').toUpperCase()} 
        onClick={(e) => { 
          setGenieOriginFromElement(e.currentTarget);
          audioManager.play('lens'); 
          onOpenLens(); 
        }} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Gamepad2} 
        label={t('nav.games').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          openGames();
        }} 
        onMouseEnter={() => {
          import('../Games/GamesPage').catch(() => {});
        }}
        onPointerDown={() => {
          import('../Games/GamesPage').catch(() => {});
        }}
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Clapperboard} 
        label={moviesSeriesLabel.toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          openMovies();
        }} 
        onMouseEnter={() => {
          import('../Movies/MoviesPage').catch(() => {});
        }}
        onPointerDown={() => {
          import('../Movies/MoviesPage').catch(() => {});
        }}
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Tv} 
        label={t('nav.nltv').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          openTv();
        }} 
        onMouseEnter={() => {
          import('../NlTv/NlTvPage').catch(() => {});
        }}
        onPointerDown={() => {
          import('../NlTv/NlTvPage').catch(() => {});
        }}
        theme={resolvedTheme} 
      />
    </motion.div>
  );
}
