import { useState, useRef, useEffect } from 'react';
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

const STYLES_REFACTORED = {
  CONTAINER_STYLE: {
    border: 'var(--window-border)',
    boxShadow: 'var(--window-shadow)',
    backgroundColor: 'var(--window-bg)',
  },
  TITLE_BAR_DOTS_LEFT: { display: 'flex', gap: '4px', alignItems: 'center' },
  TITLE_BAR_DOT_RED: { width: 8, height: 8, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E' },
  TITLE_BAR_DOT_YELLOW: { width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' },
  TITLE_BAR_DOT_GREEN: { width: 8, height: 8, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' },
  TITLE_BAR_CONTROLS: { fontFamily: 'Geneva, monospace', fontSize: '10px', fontWeight: 'bold' as const, color: '#555', marginLeft: '2px', cursor: 'pointer', display: 'flex', gap: '3px' },
  TITLE_BAR_TEXT: {
    fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#000',
    flex: 1,
    textAlign: 'center' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const
  },
  TITLE_BAR_MAIN: {
    display: 'var(--window-chrome-display)',
    background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
    borderBottom: '1px solid #999',
    padding: '3px 6.5px',
    alignItems: 'center',
    gap: '6px',
    userSelect: 'none' as const,
    height: '24px',
    flexShrink: 0,
  },
  MENU_BAR_STYLE: {
    display: 'var(--window-chrome-display)',
    height: '18px',
    backgroundColor: '#E0E0E0',
    borderBottom: '1px solid #999',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '8px',
    userSelect: 'none' as const,
    fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#000',
  },
  HEADER_CARD_STYLE: {
    backgroundColor: 'var(--hero-card-bg)',
    border: 'var(--hero-card-border)',
    boxShadow: 'var(--hero-card-shadow)',
  },
  HERO_TITLE_STYLE: { 
    textShadow: 'var(--hero-title-shadow)',
    fontStyle: 'var(--hero-title-style)',
    fontSize: 'var(--hero-title-size)',
    textTransform: 'var(--hero-title-transform)' as any,
    lineHeight: 'var(--hero-title-lines)',
  },
  HERO_BIO_STYLE: {
    fontSize: 'var(--hero-bio-size)',
    fontFamily: 'var(--hero-bio-font)',
    textShadow: 'var(--hero-bio-shadow)',
    filter: 'var(--hero-bio-filter)',
    fontStyle: 'var(--hero-bio-style)',
  },
  STATUS_BAR_STYLE: {
    display: 'var(--window-chrome-display)',
    height: '16px',
    background: 'linear-gradient(180deg, #BBBBBB 0%, #999999 100%)',
    borderTop: '1px solid #888',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '6px',
    paddingRight: '22px',
    userSelect: 'none' as const,
    fontSize: '9px',
    fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
    color: '#000',
    flexShrink: 0,
    position: 'relative' as const
  },
  RESIZE_GRIP_STYLE: {
    position: 'absolute' as const,
    right: '2px',
    bottom: '1px',
    width: '12px',
    height: '12px',
    background: 'linear-gradient(135deg, transparent 45%, #777 45%, #777 55%, transparent 55%, transparent 70%, #777 70%, #777 80%, transparent 80%, transparent 95%, #777 95%, #777 100%)',
    pointerEvents: 'none' as const,
  }
};

export const HeroSection = () => {
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
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
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
        className="flex-1 w-full flex flex-col overflow-hidden"
        style={STYLES_REFACTORED.CONTAINER_STYLE}
      >
        {/* Title Bar */}
        <div style={STYLES_REFACTORED.TITLE_BAR_MAIN}>
          <div style={STYLES_REFACTORED.TITLE_BAR_DOTS_LEFT}>
            <div style={STYLES_REFACTORED.TITLE_BAR_DOT_RED} />
            <div style={STYLES_REFACTORED.TITLE_BAR_DOT_YELLOW} />
            <div style={STYLES_REFACTORED.TITLE_BAR_DOT_GREEN} />
            <span style={STYLES_REFACTORED.TITLE_BAR_CONTROLS}>
              <span title="Minimize" className="hover:text-black">─</span>
              <span title="Maximize" className="hover:text-black">□</span>
            </span>
          </div>
          <span style={STYLES_REFACTORED.TITLE_BAR_TEXT}>
            noureddin_el_mobaraki.profile
          </span>
        </div>

        {/* Menu Bar */}
        <div style={STYLES_REFACTORED.MENU_BAR_STYLE}>
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
          className="p-4 sm:p-6 md:p-8 flex-1 relative group overflow-hidden transition-all duration-500 hover:scale-[1.01] halftone-bg-refactored"
          id="header-card"
          style={STYLES_REFACTORED.HEADER_CARD_STYLE}
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
              className="hero-title-refactored font-[var(--hero-title-font)] font-[var(--hero-title-weight)] tracking-tight text-[var(--hero-title-color)] select-none"
              style={STYLES_REFACTORED.HERO_TITLE_STYLE}
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
              {siteData.aliases.map((a, i) => (
                <span key={i}>{a}{i < siteData.aliases.length - 1 ? ' | ' : ''}</span>
              ))}
            </span>
          </div>

          {/* BIO Paragraph */}
          <p 
            lang="en"
            className="mt-4 hero-bio-refactored text-[var(--text-primary)] leading-tight max-w-xl"
            style={STYLES_REFACTORED.HERO_BIO_STYLE}
          >
            {siteData.bio}
          </p>
        </div>

        {/* Status Bar */}
        <div style={STYLES_REFACTORED.STATUS_BAR_STYLE}>
          <span>Ready</span>
          <div style={STYLES_REFACTORED.RESIZE_GRIP_STYLE} />
        </div>
      </div>

      {/* Unified Profile Card Element */}
      <div className="hero-profile-container">
        <ResponsiveImage 
          src={activeProfileImg} 
          alt="Profile" 
          className="w-full h-full object-cover" 
          loading="lazy"
        />
      </div>
    </motion.header>
  );
};
