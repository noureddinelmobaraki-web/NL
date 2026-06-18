import { motion } from 'framer-motion';
import { Camera, Music2, Pencil, Aperture, Gamepad2, Clapperboard } from 'lucide-react';
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
  const { t } = useTranslation();
  const { openGames, openMovies } = useAppContext();

  const moviesSeriesLabel = t('nav.movies_and_series') || 
    (t('nav.movies') && t('nav.series') 
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
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Clapperboard} 
        label={moviesSeriesLabel.toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          openMovies();
        }} 
        theme={resolvedTheme} 
      />
    </motion.div>
  );
}
