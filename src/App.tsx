/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Camera,
  Music2,
  Pencil,
  Aperture,
  Monitor
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import React, { useState, useEffect, Suspense } from "react";
import { loadPrefs, savePrefs } from './utils/userPrefs';
import type { Theme, AudioIntent } from './utils/userPrefs';
import { LoadingScreen } from "./components/LoadingScreen";
import { SkeletonSection } from './components/SkeletonSection';

const MySongs = React.lazy(() => import('./components/MySongsPage').then(m => ({ default: m.MySongs })));
const DrawingsPage = React.lazy(() => import('./components/DrawingsPage').then(m => ({ default: m.DrawingsPage })));
const ContactForm = React.lazy(() => import('./components/ContactForm').then(m => ({ default: m.ContactForm })));
import { useDeviceType } from "./hooks/useDeviceType";
import { useParallax } from "./hooks/useParallax";
import { useResolvedTheme } from "./hooks/useResolvedTheme";
import { useGalleryState } from "./hooks/useGalleryState";
import { useAudioController } from "./hooks/useAudioController";
import { NavButton } from "./components/NavButton";
import { MeBitGallery } from './components/MeBitGallery';
import { MobileNavBar } from "./components/MobileNavBar";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { isLowEndDevice, prefersReducedMotion } from "./utils/perf";
import { HeroSection } from './components/sections/HeroSection';
import { StreamingSection } from './components/sections/StreamingSection';
import { Win12Section } from './components/sections/Win12Section';
import { HighlightsSection } from './components/sections/HighlightsSection';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { ActiveSong } from "./types";
import { ResponsiveImage } from "./components/ResponsiveImage";
import { ASSETS, getThemedImage } from "./constants/assets";
import { audioManager } from "./audio/audioManager";
import { OsClockDisplay } from "./components/OsWindow";
import { FloatingControls } from "./components/layout/FloatingControls";
import { GallerySection } from "./components/layout/GallerySection";

const CONFIG_ASSETS = {
  mainBackground: ASSETS.profile.heroBg,
  nameHeaderBg: ASSETS.profile.headerBg,
  footerDecoration: ASSETS.profile.footerDeco,
  profileImg: ASSETS.profile.main,
  vaultPlaylistCover: ASSETS.songs.playlistCover,
  youtubeHighlightsBg: ASSETS.songs.ytHighlights,
};

const IptvSection = React.lazy(() => import('./components/sections/IptvSection'));

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const ME_BIT_IMAGES = ASSETS.profile.me_bits;
const initialPrefs = loadPrefs();

export default function App() {
  const { isMobile, isTablet } = useDeviceType();
  const resolvedTheme = useResolvedTheme();
  const parallaxRef = useParallax(isMobile ? 0 : 20);

  const [loaded, setLoaded] = useState(false);
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [audioIntent, setAudioIntent] = useState<AudioIntent>(
    initialPrefs.audioIntent === 'user-playing' ? 'initial' : initialPrefs.audioIntent
  );
  const [theme, setTheme] = useState<Theme>(initialPrefs.theme);

  const {
    isGalleryOpen,
    setIsGalleryOpen,
    isLensGalleryOpen,
    selectedImageIndex,
    setSelectedImageIndex,
    nextImage,
    prevImage,
    openLens,
    closeLens,
  } = useGalleryState();

  const {
    audioRef,
    isPlaying,
    isMeBitPlaying,
    toggleAudio,
    handleSongPlay,
    handleSongStop,
    handleGalleryOpen,
    handleGalleryClose,
    toggleMeBitAudio,
  } = useAudioController({
    isLensGalleryOpen,
    isGalleryOpen,
    theme,
    audioIntent,
    setAudioIntent,
    loaded,
    setIsGalleryOpen,
    setSelectedImageIndex,
  });

  const renderClock = () => {
    if (resolvedTheme !== 'light') return null;
    return (
      <div
        className="fixed top-4 right-4 z-[10000]"
        style={{
          fontFamily: 'Geneva, "Lucida Sans Unicode", monospace',
          fontSize: '11px',
          color: '#000',
          background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
          border: '1px solid #999',
          padding: '2px 8px',
          boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555',
        }}
      >
        <OsClockDisplay />
      </div>
    );
  };

  useEffect(() => {
    const applyTheme = () => {
      let resolved = 'midnight';
      if (theme === 'dark') {
        resolved = 'dark';
      } else if (theme === 'light') {
        resolved = 'light';
      } else if (theme === 'bit') {
        resolved = 'bit';
      } else if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = isDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };

    applyTheme();
    savePrefs({ theme });

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', listener);
        } else {
          mediaQuery.removeListener(listener);
        }
      };
    }
    return () => {};
  }, [theme]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'songs') {
      scrollToSection('my-songs-section');
    } else if (page === 'drawings') {
      scrollToSection('drawings-section');
    } else if (page === 'mebit') {
      scrollToSection('me-bit-gallery');
    } else if (page === 'lens') {
      scrollToSection('lens-section');
    }
  };

  useEffect(() => {
    if (isLowEndDevice() || prefersReducedMotion()) {
      document.body.classList.add('low-perf');
    }
  }, []);

  const scrollToSection = (id: string) => {
    const attempt = (tries = 0) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tries < 5) {
        setTimeout(() => attempt(tries + 1), 150);
      }
    };
    attempt();
  };

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
          </filter>
        </defs>
      </svg>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />

      <FloatingControls
        isPlaying={isPlaying}
        isMobile={isMobile}
        isTablet={isTablet}
        theme={theme}
        activeSong={activeSong}
        onToggleAudio={toggleAudio}
        onThemeChange={setTheme}
      />

      {resolvedTheme === 'dark' && (
        <>
          <div 
            className="fixed inset-0 z-[9997] pointer-events-none" 
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)'
            }} 
          />
          <div 
            className="fixed left-0 right-0 h-px z-[9996] pointer-events-none"
            style={{
              background: 'rgba(184,255,63,0.1)', 
              animation: 'scan-line 7s linear infinite',
              boxShadow: '0 0 8px rgba(184,255,63,0.3)'
            }} 
          />
        </>
      )}

      {!loaded && (
        <LoadingScreen 
          onComplete={() => setLoaded(true)} 
          onAudioUnlock={() => {
            if (audioIntent !== 'user-paused') {
              setAudioIntent('user-playing');
            }
          }}
        />
      )}

      <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 500ms ease-in' }}>
        {renderClock()}
        <div className="min-h-screen w-full relative flex flex-col items-center py-10 px-4 sm:px-8 md:px-10 lg:px-10 overflow-x-hidden">
          <div 
            ref={parallaxRef}
            className="fixed inset-[-5%] z-[-2] bg-cover bg-center"
            style={{ 
              backgroundImage: `url('${getThemedImage('heroBg', resolvedTheme)}')`,
              filter: 'blur(4px) brightness(0.5)',
              willChange: 'transform',
            }}
          />
          <div className="fixed inset-0 z-[-1] pointer-events-none" style={{
            background: ambientColor 
              ? `linear-gradient(to bottom, ${ambientColor}18 0%, var(--hero-overlay) 40%)`
              : 'var(--hero-overlay)',
            backgroundImage: 'radial-gradient(circle at 2px 2px, var(--halftone-color) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            transition: 'background 1.5s ease',
            willChange: 'auto',
          }} />

          <audio id="bg-audio" ref={audioRef} loop preload="auto" crossOrigin="anonymous" />

          <MeBitGallery
            isOpen={isGalleryOpen}
            images={ME_BIT_IMAGES}
            selectedIndex={selectedImageIndex}
            isMeBitPlaying={isMeBitPlaying}
            isMobile={isMobile}
            isTablet={isTablet}
            onClose={handleGalleryClose}
            onNext={nextImage}
            onPrev={prevImage}
            onSelectIndex={setSelectedImageIndex}
            onToggleAudio={toggleMeBitAudio}
          />

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            lang="en"
            dir="ltr"
            className="relative z-10 w-full max-w-5xl flex flex-col gap-14"
            style={{ paddingBottom: (isMobile || isTablet) ? '80px' : undefined }}
          >
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-5 md:gap-6 mb-4">
              <NavButton icon={Camera} label="ME BIT" onClick={() => scrollToSection('me-bit-gallery')} theme={resolvedTheme} />
              <NavButton icon={Music2} label="MY SONGS" onClick={() => scrollToSection('my-songs-section')} theme={resolvedTheme} />
              <NavButton icon={Pencil} label="MY DRAWINGS" onClick={() => scrollToSection('drawings-section')} theme={resolvedTheme} />
              <NavButton icon={Aperture} label="LENS" onClick={() => { audioManager.play('lens'); openLens(); }} theme={resolvedTheme} />
              <NavButton icon={Monitor} label="WIN12 OS" onClick={() => scrollToSection('win12-launcher-section')} theme={resolvedTheme} fullWidthOnMobile />
            </motion.div>

            <div className="flex flex-col gap-14">
              <HeroSection />
              <StreamingSection />
              <div className="manga-divider opacity-30" />
              <div className="mt-2">
                <HighlightsSection 
                  vaultPlaylistCoverUrl={CONFIG_ASSETS.vaultPlaylistCover}
                  youtubeHighlightsBgUrl={CONFIG_ASSETS.youtubeHighlightsBg}
                />
              </div>

              <GallerySection 
                resolvedTheme={resolvedTheme}
                isLensGalleryOpen={isLensGalleryOpen}
                onGalleryOpen={handleGalleryOpen}
                onLensOpen={openLens}
                onLensClose={closeLens}
              />

              <motion.div 
                variants={itemVariants} 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                id="my-songs-section"
              >
                <SectionErrorBoundary sectionName="MySongs">
                  <Suspense fallback={<SkeletonSection type="songs" />}>
                    <MySongs 
                      onSongPlay={handleSongPlay} 
                      onSongStop={handleSongStop}
                      onActiveSongChange={setActiveSong}
                      onAmbientColorChange={setAmbientColor}
                    />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.div>

              <motion.div
                id="contact-section"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
              >
                <SectionErrorBoundary sectionName="ContactForm">
                  <Suspense fallback={<SkeletonSection type="contact" />}>
                    <ContactForm />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.div>

              <motion.div
                id="drawings-section"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}
              >
                <SectionErrorBoundary sectionName="DrawingsPage">
                  <Suspense fallback={<SkeletonSection type="drawings" />}>
                    <DrawingsPage onSongPlay={handleSongPlay} />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.div>

              <motion.div variants={itemVariants} id="iptv-section">
                <SectionErrorBoundary sectionName="IptvSection">
                  <Suspense fallback={<SkeletonSection type="iptv" />}>
                    <IptvSection />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.div>

              <motion.div variants={itemVariants} id="win12-launcher-section">
                <Win12Section />
              </motion.div>
            </div>

            <motion.footer 
              variants={itemVariants}
              className="mt-10 flex flex-col items-center gap-8 border-t-4 border-[var(--ink-color)] pt-10 pb-[calc(80px+env(safe-area-inset-bottom))] sm:pb-20 retro-shadow-white"
            >
              <ResponsiveImage 
                src={CONFIG_ASSETS.footerDecoration}
                alt="Footer Decoration"
                className="w-full max-w-[90%] sm:max-w-[600px] border-[3px] border-[var(--ink-color)] shadow-[10px_10px_0px_var(--manga-shadow-color)] rounded-xl hover:scale-[1.02] transition-transform animate-float"
                loading="lazy"
              />

              <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
                <div className="flex gap-4">
                  <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
                  <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
                  <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
                </div>
                <p className="font-manga text-base sm:text-2xl text-[var(--text-primary)] bg-[var(--paper-color)] px-3 sm:px-6 py-1 manga-border -rotate-1 shadow-[4px_4px_0px_var(--manga-shadow-color)] italic text-center md:text-left max-w-full break-words">
                  NL // NOUREDDIN GB © 2026
                </p>
              </div>
            </motion.footer>
          </motion.div>
        </div>
      </div>

      {(isMobile || isTablet) && (
        <MobileNavBar 
          currentPage={currentPage} 
          onNavigate={handleNavigate} 
          isBgPlaying={isPlaying}
          onToggleBg={() => {
            if (isPlaying) {
              audioManager.pause('bg');
              setAudioIntent('user-paused');
            } else {
              setAudioIntent('user-playing');
              audioManager.unpauseBg();
            }
          }}
        />
      )}
    </>
  );
}
