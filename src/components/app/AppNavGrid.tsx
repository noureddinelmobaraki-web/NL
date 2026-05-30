import { motion } from 'framer-motion';
import { Camera, Music2, Pencil, Aperture } from 'lucide-react';
import { NavButton } from '../NavButton';
import { audioManager } from '../../audio/audioManager';
import { itemVariants } from './appConstants';

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
  return (
    <motion.div 
      variants={itemVariants} 
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-5 md:gap-6 mb-4"
    >
      <NavButton 
        icon={Camera} 
        label="ME BIT" 
        onClick={() => onScrollToSection('me-bit-gallery')} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Music2} 
        label="MY SONGS" 
        onClick={() => onScrollToSection('my-songs-section')} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Pencil} 
        label="MY DRAWINGS" 
        onClick={() => onScrollToSection('drawings-section')} 
        theme={resolvedTheme} 
      />
      <NavButton 
        icon={Aperture} 
        label="LENS" 
        onClick={() => { 
          audioManager.play('lens'); 
          onOpenLens(); 
        }} 
        theme={resolvedTheme} 
      />
    </motion.div>
  );
}
