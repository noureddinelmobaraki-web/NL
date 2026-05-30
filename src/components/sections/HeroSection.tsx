import { useState, useRef, useEffect, memo } from 'react';
import { motion, Variants } from "framer-motion";
import { getThemedImage, LIGHT_PROFILE_OPENING, LIGHT_PROFILE_MAIN } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";

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

export const HeroSection = memo(() => {
  const resolvedTheme = useResolvedTheme();

  // Light theme profile switching logic
  const [lightProfileSrc, setLightProfileSrc] = useState<string>(LIGHT_PROFILE_OPENING);
  const lightProfileInitializedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (resolvedTheme.startsWith('light')) {
      setLightProfileSrc(LIGHT_PROFILE_OPENING);
      lightProfileInitializedRef.current = false;
      timer = setTimeout(() => {
        setLightProfileSrc(LIGHT_PROFILE_MAIN);
        lightProfileInitializedRef.current = true;
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resolvedTheme]);

  // Dev runtime CSS variable integration check
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const REQUIRED_HERO_VARS = [
        '--window-chrome-display',
        '--window-border',
        '--window-shadow',
        '--window-bg',
        '--hero-header-align',
        '--hero-card-bg',
        '--hero-card-border',
        '--hero-card-shadow',
        '--hero-bg-image-url',
        '--hero-bg-filter',
        '--hero-bg-opacity',
        '--hero-bg-blend',
        '--hero-overlay-bg',
        '--hero-title-font',
        '--hero-title-weight',
        '--hero-title-color',
        '--hero-title-size',
        '--hero-title-shadow',
        '--hero-title-style',
        '--hero-title-lines',
        '--hero-title-transform',
        '--hero-divider-top',
        '--hero-divider-style',
        '--hero-loc-font',
        '--hero-loc-size',
        '--hero-loc-weight',
        '--hero-loc-shadow',
        '--hero-loc-prefix',
        '--hero-loc-suffix',
        '--hero-alias-bg',
        '--hero-alias-border',
        '--hero-alias-color',
        '--hero-alias-size',
        '--hero-alias-tracking',
        '--hero-alias-transform',
        '--hero-alias-font',
        '--hero-alias-deco',
        '--hero-alias-padding',
        '--hero-bio-font',
        '--hero-bio-size',
        '--hero-bio-shadow',
        '--hero-bio-filter',
        '--hero-bio-style',
        '--hero-profile-width',
        '--hero-profile-border',
        '--hero-profile-shadow',
        '--hero-profile-transform',
        '--hero-profile-hover-transform',
        '--hero-profile-display'
      ];
      const style = getComputedStyle(document.documentElement);
      REQUIRED_HERO_VARS.forEach((v) => {
        const value = style.getPropertyValue(v).trim();
        if (!value) {
          console.warn(`[Theme Check] Warning: Required CSS variable "${v}" is not resolved in active theme.`);
        }
      });
    }
  }, [resolvedTheme]);

  const profileImages: Record<string, string> = {
    light: lightProfileSrc,
    dark: getThemedImage('profile', 'dark'),
    midnight: getThemedImage('profile', 'midnight'),
    bit: getThemedImage('profile', 'bit'),
  };
  const activeProfileImg = profileImages[resolvedTheme] || profileImages['dark'];

  return (
    <motion.header 
      variants={itemVariants}
      className="flex flex-col md:flex-row justify-between gap-6 w-full items-[var(--hero-header-align)]"
    >
      {/* Outer wrapper playing container chrome */}
      <div 
        className="hero-window flex-1 w-full flex flex-col overflow-hidden"
      >
        {/* Title Bar */}
        <div className="hero-titlebar-main">
          <div className="hero-titlebar-dots">
            <div className="hero-titlebar-dot red" />
            <div className="hero-titlebar-dot yellow" />
            <div className="hero-titlebar-dot green" />
            <span className="hero-titlebar-controls" aria-hidden="true">
              <span title="Minimize" className="hover:text-black">─</span>
              <span title="Maximize" className="hover:text-black">□</span>
            </span>
          </div>
          <span className="hero-titlebar-text">
            noureddin_el_mobaraki.profile
          </span>
        </div>

        {/* Menu Bar */}
        <div className="hero-menubar">
          {['File', 'Edit', 'View'].map((item) => (
            <span 
              key={item} 
              className="px-1.5 h-full flex items-center transition-colors hover:bg-[#000080] hover:text-white cursor-pointer"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Content Area / Hero ContentCard */}
        <div 
          lang="en"
          className="hero-header-card p-4 sm:p-6 md:p-8 flex-1 relative group overflow-hidden transition-all duration-500 hover:scale-[1.01] halftone-bg-refactored"
          id="header-card"
        >
          {/* Header Background Image with Zoom & Pan Hover Effect */}
          <div 
            className="absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%] hero-bg-image-refactored"
            style={{ backgroundImage: 'var(--hero-bg-image-url)' }}
          />

          {/* Dark Overlay for Text Legibility */}
          <div className="absolute inset-0 z-[-1] transition-opacity group-hover:opacity-30 hero-overlay-element" />
          
          {/* Stable Native Hero Title animation envelope */}
          <motion.div
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <h1 
              className="hero-title hero-title-refactored font-[var(--hero-title-font)] font-[var(--hero-title-weight)] tracking-tight text-[var(--hero-title-color)] select-none"
              data-text={siteData.fullName}
            >
              {siteData.fullName}
            </h1>
          </motion.div>
          
          {/* Divider and Location Block */}
          <div className="mt-6 flex items-center gap-4 text-[var(--text-primary)] font-bold uppercase divider-top-refactored pt-4">
            <span className="hero-location-text text-[var(--hero-loc-size)] font-[var(--hero-loc-font)] font-bold tracking-tight" style={{ textShadow: 'var(--hero-loc-shadow)' }}>
              {siteData.location}
            </span>
            <span className="px-3 py-1 truncate hero-alias-refactored">
              {siteData.aliases.map((a: string, i: number) => (
                <span key={i}>{a}{i < siteData.aliases.length - 1 ? ' | ' : ''}</span>
              ))}
            </span>
          </div>

          {/* BIO Paragraph */}
          <p 
            lang="en"
            className="hero-bio mt-4 hero-bio-refactored text-[var(--text-primary)] leading-tight max-w-xl"
          >
            {siteData.bio}
          </p>
        </div>

        {/* Status Bar */}
        <div className="hero-statusbar">
          <span>Ready</span>
          <div className="hero-resize-grip" />
        </div>
      </div>

      {/* Unified Profile Card Element */}
      <div className="hero-profile-container">
        <ResponsiveImage 
          src={activeProfileImg} 
          alt={`${siteData.fullName} — ${siteData.location} based rap artist (${siteData.aliases.join(' / ')})`} 
          width={400}
          height={400}
          className="w-full h-full object-cover" 
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </motion.header>
  );
});
