import { useState, useRef, useEffect } from 'react';
import { motion, Variants } from "framer-motion";
import { getThemedImage, LIGHT_PROFILE_OPENING, LIGHT_PROFILE_MAIN } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";

import { useDeviceType } from '../../hooks/useDeviceType';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import siteData from '../../../metadata.json';
import { OsWindow } from '../OsWindow';

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

  // Light theme profile: show opening image for 1500ms, then switch to main
  const [lightProfileSrc, setLightProfileSrc] = useState<string>(LIGHT_PROFILE_OPENING);
  const lightProfileInitializedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (resolvedTheme === 'light') {
      // Reset to opening image every time we enter light theme
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

  const renderHeroContent = () => {
    return (
      <div 
        lang="en"
        className={`${resolvedTheme === 'light' ? '' : (resolvedTheme === 'dark' ? 'halftone-bg' : 'manga-border border-[4px] halftone-bg border-[var(--ink-color)]')} p-4 sm:p-6 md:p-8 flex-1 min-w-[60%] relative group overflow-hidden transition-all duration-500 hover:scale-[1.01]`}
        id="header-card"
        style={resolvedTheme === 'dark' ? {
          backgroundColor: 'rgba(0,0,0,0.92)',
          border: '1px solid rgba(184,255,63,0.2)',
          boxShadow: '0 0 40px rgba(184,255,63,0.05), inset 0 0 30px rgba(0,0,0,0.5)',
        } : {}}
      >
        {/* Header Background Image with Zoom & Pan Hover Effect */}
        <div 
          className={`absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%] ${resolvedTheme === 'dark' ? 'grayscale contrast-110 mix-blend-luminosity opacity-40' : ''} ${resolvedTheme === 'light' ? 'opacity-30 mix-blend-multiply grayscale' : ''}`}
          style={{ backgroundImage: `url('${getThemedImage('headerBg', resolvedTheme)}')` }}
        />
        {/* Dark Overlay for Text Legibility */}
        <div className={`absolute inset-0 z-[-1] transition-opacity group-hover:opacity-30 ${resolvedTheme === 'dark' ? 'bg-black/60' : (resolvedTheme === 'light' ? 'bg-transparent' : 'bg-[var(--bg-page)]/40')}`} />
        
        {resolvedTheme === 'dark' ? (
          <motion.div
             initial={{ opacity: 0, y: 60, skewY: 3 }}
             animate={{ opacity: 1, y: 0, skewY: 0 }}
             transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <h1 
              className="font-['Playfair_Display',serif] italic font-black leading-[0.9] tracking-tight text-white text-[clamp(2.5rem,11vw,3.75rem)] md:text-8xl lg:text-[8rem]"
              data-text={siteData.fullName}
              style={{ textShadow: '0 0 30px rgba(184,255,63,0.4), 0 0 60px rgba(184,255,63,0.2), 4px 4px 0px rgba(0,0,0,0.8)' }}
            >
              {siteData.fullName}
            </h1>
          </motion.div>
        ) : resolvedTheme === 'light' ? (
          <h1 className="font-['Geneva','Lucida_Sans_Unicode',sans-serif] font-bold text-black text-3xl md:text-5xl lg:text-6xl leading-snug tracking-tight">
            {siteData.fullName}
          </h1>
        ) : (
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
        )}
        
        <div className={`mt-6 flex items-center gap-4 text-[var(--text-primary)] font-bold uppercase ${resolvedTheme === 'light' ? 'border-t border-[#999]' : 'italic border-t-2 border-[var(--border-subtle)]'} pt-4`}>
          <span className={`text-xl ${resolvedTheme === 'dark' ? 'font-mono' : (resolvedTheme === 'light' ? 'font-["Geneva",sans-serif] text-base font-bold' : 'font-manga')}`} style={resolvedTheme === 'dark' || resolvedTheme === 'light' ? {} : STYLES.SHADOW_BLACK_SM}>
            {resolvedTheme === 'light' ? `🖥️ ${siteData.location}` : `${siteData.location} 📍`}
          </span>
          <span className={`px-3 py-1 truncate ${resolvedTheme === 'dark' ? 'bg-transparent border border-[#B8FF3F] text-[#B8FF3F] text-[0.6rem] tracking-[0.2em] uppercase font-mono' : (resolvedTheme === 'light' ? 'bg-white border border-[#999] text-[#0000CC] text-[0.65rem] font-["Geneva",sans-serif] underline px-2 py-0.5' : 'text-sm bg-[var(--ink-color)] text-[var(--text-inverse)] manga-border border-[var(--border-subtle)]')}`}>
            {siteData.aliases.map((a, i) => (
              <span key={i}>{a}{i < siteData.aliases.length - 1 ? ' | ' : ''}</span>
            ))}
          </span>
        </div>
        <p 
          lang="en"
          className={`mt-4 ${resolvedTheme === 'light' ? 'font-["Geneva",sans-serif] text-sm md:text-base italic opacity-80 os-terminal-blink' : 'font-hand text-2xl'} text-[var(--text-primary)] leading-tight max-w-xl`}
          style={resolvedTheme === 'light' ? {} : { 
            textShadow: '2px 2px 4px var(--manga-shadow-color), 0 0 20px var(--lyric-active-shadow)',
            filter: 'drop-shadow(2px 2px 2px var(--manga-shadow-color))'
          }}
        >
          {siteData.bio}
        </p>
      </div>
    );
  };

  return (
    <motion.header 
      variants={itemVariants}
      className={`flex flex-col md:flex-row ${resolvedTheme === 'light' ? 'items-start' : 'items-end'} justify-between gap-6 w-full`}
    >
      {resolvedTheme === 'light' ? (
        <OsWindow title="noureddin_el_mobaraki.profile" className="flex-1 w-full" contentPadding={0}>
          {/* Menu Bar */}
          <div 
            style={{
              height: '18px',
              backgroundColor: '#E0E0E0',
              borderBottom: '1px solid #999',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingLeft: '8px',
              userSelect: 'none',
              fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#000',
            }}
          >
            {['File', 'Edit', 'View'].map((item) => (
              <span 
                key={item} 
                className="px-1.5 h-full flex items-center transition-colors hover:bg-[#000080] hover:text-white cursor-pointer"
              >
                {item}
              </span>
            ))}
          </div>
          {renderHeroContent()}
        </OsWindow>
      ) : (
        renderHeroContent()
      )}

      {resolvedTheme === 'light' && (
        <div
          style={{
            width: '200px',
            minWidth: '180px',
            aspectRatio: '1 / 1',
            border: '1px solid #999',
            boxShadow: '2px 2px 0px #999, 4px 4px 0px #777',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={lightProfileSrc}
            alt="Profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Profile Image Square Box */}
      <div 
        className={`${resolvedTheme === 'light' ? 'hidden' : 'manga-card hidden md:flex rotate-2 hover:rotate-0 border-[3px] border-[var(--ink-color)]'} p-0 flex flex-col items-center justify-center ${isTablet ? 'w-40 h-40' : 'w-48'} aspect-square transition-transform overflow-hidden`}
        style={{ background: 'var(--paper-color)' }}
      >
        <ResponsiveImage 
          src={resolvedTheme === 'light' ? lightProfileSrc : getThemedImage('profile', resolvedTheme)} 
          alt="Profile" 
          className="w-full h-full object-cover" 
          loading="lazy"
        />
      </div>

    </motion.header>
  );
};
