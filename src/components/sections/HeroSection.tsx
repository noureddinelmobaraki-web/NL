import { memo } from 'react';
import { m } from "framer-motion";
import { getThemedImage } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";

import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY
import { useFadeInOnView } from '../../hooks/useFadeInOnView';
import { useDevCSSVarCheck } from '../../utils/dev/cssVarCheck';
import { REQUIRED_HERO_VARS } from '../../constants/cssVarLists';
import { useLightProfileImage } from '../../hooks/useLightProfileImage';
import { useAppContext } from '../../context/AppContext';
import siteData from '../../../metadata.json';

import { isAutomatedEnv } from '../../utils/env';

export const HeroSection = memo(() => {
  const { openPortrait } = useAppContext();
  const resolvedTheme = useResolvedTheme();
  const { isMobile } = useDeviceType(); // MOBILE-ONLY
  const isAutomated = isAutomatedEnv();
  const headerRef = useFadeInOnView<HTMLElement>();

  // Light theme profile switching logic
  const lightProfileSrc = useLightProfileImage(resolvedTheme);

  // Dev runtime CSS variable integration check
  useDevCSSVarCheck(REQUIRED_HERO_VARS, resolvedTheme, 'Hero Check');

  const profileImages: Record<string, string> = {
    light: lightProfileSrc,
    dark: getThemedImage('profile', 'dark'),
    midnight: getThemedImage('profile', 'midnight'),
    bit: getThemedImage('profile', 'bit'),
    lite: getThemedImage('profile', 'lite'),
    retro: getThemedImage('profile', 'retro'),
  };
  const activeProfileImg = profileImages[resolvedTheme] || profileImages['dark'];

  return (
    <header 
      ref={headerRef}
      className={`fade-in-section w-full items-[var(--hero-header-align)] hero-layout-grid ${
        isMobile 
          ? 'flex flex-col-reverse gap-[1.5rem]' // MOBILE-ONLY
          : 'flex flex-col-reverse gap-6'
      }`}
    >
      {/* Outer wrapper playing container chrome */}
      <div 
        className="hero-window flex-1 w-full flex flex-col overflow-hidden" data-cord-id="hero-window"
      >
        {/* Title Bar */}
        <div className="hero-titlebar-main">
          <div className="hero-titlebar-dots">
            <div className="hero-titlebar-dot red" />
            <div className="hero-titlebar-dot yellow" />
            <div className="hero-titlebar-dot green" />
            <span className="hero-titlebar-controls" aria-hidden="true">
              <span title="Minimize" className={isMobile ? 'active:text-black' : 'hover:text-black'}>─</span>
              <span title="Maximize" className={isMobile ? 'active:text-black' : 'hover:text-black'}>□</span>
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
              className={`px-1.5 h-full flex items-center transition-colors cursor-pointer ${
                isMobile 
                  ? 'active:bg-[#000080] active:text-white' // MOBILE-ONLY
                  : 'hover:bg-[#000080] hover:text-white'
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        {/* Content Area / Hero ContentCard */}
        <div 
          lang="en"
          className={`hero-header-card p-4 sm:p-6 md:p-8 flex-1 relative group overflow-hidden transition-all duration-500 halftone-bg-refactored ${
            isMobile ? 'active:scale-[1.01]' : 'hover:scale-[1.01]' // MOBILE-ONLY
          }`}
          id="header-card"
        >
          {/* Header Background Image with Zoom & Pan Hover Effect */}
          <div 
            className={`absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] hero-bg-image-refactored ${
              isMobile 
                ? 'group-active:blur-0 group-active:scale-125 group-active:translate-y-[-10%]' // MOBILE-ONLY
                : 'group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%]'
            }`}
            style={{ backgroundImage: 'var(--hero-bg-image-url)' }}
          />

          {/* Dark Overlay for Text Legibility */}
          <div className={`absolute inset-0 z-[-1] transition-opacity hero-overlay-element ${
            isMobile ? 'group-active:opacity-30' : 'group-hover:opacity-30' // MOBILE-ONLY
          }`} />
          
          {/* Stable Native Hero Title animation envelope */}
          <m.div
             initial={isAutomated ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: isAutomated ? 0 : 0.6, ease: [0.16, 1, 0.3, 1], delay: isAutomated ? 0 : 0.1 }}
          >
            <h1 
              className="hero-title hero-title-refactored font-[var(--hero-title-font)] font-[var(--hero-title-weight)] tracking-tight text-[var(--hero-title-color)] select-none"
              data-text={siteData.fullName}
            >
              {siteData.fullName}
            </h1>
          </m.div>
          
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
            className="hero-bio mt-4 hero-bio-refactored hero-bio-text text-[var(--text-primary)] leading-tight max-w-xl"
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
      <div
        className="hero-profile-container hero-profile-image nl-hero-open"
        data-cord-id="hero-profile"
        role="button"
        tabIndex={0}
        aria-label="Open portrait"
        onClick={openPortrait}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPortrait();
          }
        }}
      >
        {/* Inner wrapper carries the scale so the container's measured box
            stays put and the rope renderer does not follow the hover. */}
        <span className="nl-hero-open__inner">
          <ResponsiveImage
            src={activeProfileImg}
            alt={`${siteData.fullName} — ${siteData.location} based rap artist (${siteData.aliases.join(' / ')})`}
            width={400}
            height={400}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <span className="nl-hero-open__veil" aria-hidden="true" />
          <span className="nl-hero-open__label" aria-hidden="true">open</span>
        </span>
      </div>
    </header>
  );
});
