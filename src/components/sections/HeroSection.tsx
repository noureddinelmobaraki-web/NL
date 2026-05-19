import { motion, Variants } from "framer-motion";
import { getThemedImage } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";

import { useDeviceType } from '../../hooks/useDeviceType';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import siteData from '../../../metadata.json';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const STYLES = {
  SHADOW_BLACK_LG: { textShadow: '4px 4px 0px var(--manga-shadow-color)' },
  SHADOW_BLACK_SM: { textShadow: '2px 2px 0px var(--manga-shadow-color)' },
};

export const HeroSection = () => {
  const { isTablet } = useDeviceType();
  const resolvedTheme = useResolvedTheme();
  return (
    <motion.header 
      variants={itemVariants}
      className="flex flex-col md:flex-row items-end justify-between gap-6 w-full"
    >
      <div 
        lang="en"
        className="manga-border p-8 flex-1 min-w-[60%] relative group overflow-hidden border-[4px] border-[var(--ink-color)] transition-all duration-500 hover:scale-[1.01] halftone-bg"
        id="header-card"
      >
        {/* Header Background Image with Zoom & Pan Hover Effect */}
        <div 
          className="absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%]"
          style={{ backgroundImage: `url('${getThemedImage('headerBg', resolvedTheme)}')` }}
        />
        {/* Dark Overlay for Text Legibility */}
        <div className="absolute inset-0 z-[-1] bg-[var(--bg-page)]/40 transition-opacity group-hover:opacity-30" />
        
        <h1 
          className="font-manga font-black uppercase tracking-tight text-[var(--text-primary)] leading-none glitch-text"
          style={{ 
            fontSize: 'clamp(2rem, 6vw, 5rem)',
            ...STYLES.SHADOW_BLACK_LG 
          }}
          data-text={siteData.fullName}
        >
          {siteData.fullName}
        </h1>
        
        <div className="mt-6 flex items-center gap-4 text-[var(--text-primary)] font-bold uppercase italic border-t-2 border-[var(--border-subtle)] pt-4">
          <span className="text-xl font-manga" style={STYLES.SHADOW_BLACK_SM}>{siteData.location} 📍</span>
          <span className="text-sm bg-[var(--ink-color)] text-[var(--text-inverse)] px-3 py-1 manga-border border-[var(--border-subtle)] truncate">
            {siteData.aliases.map((a, i) => (
              <span key={i}>{a}{i < siteData.aliases.length - 1 ? ' | ' : ''}</span>
            ))}
          </span>
        </div>
        <p 
          lang="en"
          className={`mt-4 font-hand ${isTablet ? 'text-xl' : 'text-2xl'} text-[var(--text-primary)] leading-tight max-w-xl`}
          style={{ 
            textShadow: '2px 2px 4px var(--manga-shadow-color), 0 0 20px var(--lyric-active-shadow)',
            filter: 'drop-shadow(2px 2px 2px var(--manga-shadow-color))'
          }}
        >
          {siteData.bio}
        </p>
      </div>

      {/* Profile Image Square Box */}
      <div 
        className={`manga-card p-0 flex flex-col items-center justify-center ${isTablet ? 'w-40 h-40' : 'w-48'} aspect-square hidden md:flex rotate-2 hover:rotate-0 transition-transform overflow-hidden border-[3px] border-[var(--ink-color)]`}
        style={{ background: 'var(--paper-color)' }}
      >
        <ResponsiveImage 
          src={getThemedImage('profile', resolvedTheme)} 
          alt="Profile" 
          className="w-full h-full object-cover" 
          loading="lazy"
        />
      </div>

    </motion.header>
  );
};
