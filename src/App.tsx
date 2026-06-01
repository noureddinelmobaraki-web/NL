/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "framer-motion";
import React, { useEffect, Suspense } from "react";
import { savePrefs, trackVisit } from './utils/userPrefs';
import { applyTheme as applyThemeUtil } from './utils/themeSwitcher';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { LoadingScreen } from "./components/Loading/LoadingScreen";
import { SkeletonSection } from './components/SkeletonSection';

import { 
  CONFIG_ASSETS, 
  containerVariants, 
  itemVariants, 
  ME_BIT_IMAGES 
} from "./components/app/appConstants";
import { AppBackgroundFx } from "./components/app/AppBackgroundFx";
import { AppNavGrid } from "./components/app/AppNavGrid";
import { AppFooter } from "./components/app/AppFooter";
import { AppMobileNav } from "./components/app/AppMobileNav";

const MySongs = React.lazy(() => import('./components/MySongs/MySongsPage').then(m => ({ default: m.MySongs })));
const DrawingsPage = React.lazy(() => import('./components/Drawings/DrawingsPage').then(m => ({ default: m.DrawingsPage })));
const ContactForm = React.lazy(() => import('./components/Contact/ContactForm').then(m => ({ default: m.ContactForm })));
const RetroWorldPage = React.lazy(() =>
  import('./components/RetroWorld/RetroWorldPage').then(m => ({ default: m.RetroWorldPage }))
);
import { useDeviceType } from "./hooks/useDeviceType";
import { useParallax } from "./hooks/useParallax";
import { useResolvedTheme } from "./hooks/useResolvedTheme";
import { useGalleryState } from "./hooks/useGalleryState";
import { useAudioController } from "./hooks/useAudioController";
import { MeBitGallery } from './components/MeBit/MeBitGallery';
import { ButtonProvider } from "./components/layout/ButtonOrchestrator";
const AudioVisualizer = React.lazy(() => 
  import('./components/AudioVisualizer').then(m => ({ default: m.AudioVisualizer }))
);
import { isLowEndDevice, prefersReducedMotion } from "./utils/perf";
import { HeroSection } from './components/sections/HeroSection';
import { StreamingSection } from './components/sections/StreamingSection';
import { HighlightsSection } from './components/sections/HighlightsSection';
import { getThemedImage } from "./constants/assets";
import { audioManager } from "./audio/audioManager";
import { OsClockDisplay } from "./components/OsWindow";
import { FloatingControls } from "./components/layout/FloatingControls";
const GallerySection = React.lazy(() => 
  import('./components/layout/GallerySection').then(m => ({ default: m.GallerySection }))
);

import { AppProvider, useAppContext } from './context/AppContext';

function AppInner() {
  const { theme } = useAppContext();

  if (theme === 'retro') {
    return (
      <Suspense fallback={<div style={{ background: '#000', color: '#0ff', padding: 40 }}>Loading retro world…</div>}>
        <RetroWorldPage />
      </Suspense>
    );
  }

  return <MainApp />;
}

function MainApp() {
  const { isMobile, isTablet } = useDeviceType();
  const {
    loaded, setLoaded,
    activeSong, setActiveSong,
    currentPage, setCurrentPage,
    ambientColor, setAmbientColor,
    audioIntent, setAudioIntent,
    theme, setTheme
  } = useAppContext();

  const resolvedTheme = useResolvedTheme();
  const parallaxRef = useParallax(isMobile ? 0 : 20);

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
    getActiveContext,
  } = useGalleryState();

  const activeModalContext = getActiveContext() || "page";
  const isAnyModalOpen = getActiveContext() !== null;
  const isAutomated = typeof navigator !== 'undefined' && (navigator as any).webdriver === true;

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
        className="fixed top-4 right-4 z-[var(--z-toast)]"
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
    applyThemeUtil(theme);
    savePrefs({ theme });
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
    trackVisit();
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
    <ButtonProvider>
      <AppBackgroundFx
        resolvedTheme={resolvedTheme}
        ambientColor={ambientColor}
        parallaxRef={parallaxRef}
        heroBgUrl={getThemedImage('heroBg', resolvedTheme)}
      />

      <a href="#main-content" className="skip-to-content">
        <span lang="ar">تخطي إلى المحتوى</span> / <span lang="en">Skip to main content</span>
      </a>
      
      <Suspense fallback={null}>
        <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />
      </Suspense>

      <FloatingControls
        isPlaying={isPlaying}
        isMobile={isMobile}
        isTablet={isTablet}
        theme={theme}
        activeSong={activeSong}
        activeCardId={activeSong?.id ?? null}
        onToggleAudio={toggleAudio}
        onThemeChange={setTheme}
        isAnyModalOpen={isAnyModalOpen}
        activeModalContext={activeModalContext}
      />

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

      <div style={{ 
        opacity: loaded ? 1 : 0, 
        visibility: loaded ? 'visible' : 'hidden',
        transition: isAutomated ? 'none' : 'opacity 500ms ease-in' 
      }}>
        {renderClock()}
        <div className="min-h-screen w-full relative flex flex-col items-center py-10 px-4 sm:px-8 md:px-10 lg:px-10 overflow-x-hidden">
          <audio id="bg-audio" ref={audioRef} loop preload="auto" crossOrigin="anonymous" aria-hidden="true" />

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
            initial={isAutomated ? "visible" : "hidden"}
            animate="visible"
            lang="en"
            dir="ltr"
            className="relative z-10 w-full max-w-7xl flex flex-col gap-14"
            style={{ paddingBottom: (isMobile || isTablet) ? '80px' : undefined }}
          >
            <AppNavGrid
              resolvedTheme={resolvedTheme}
              onScrollToSection={scrollToSection}
              onOpenLens={openLens}
            />

            <div id="main-content" className="flex flex-col gap-14" tabIndex={-1}>
              <HeroSection />
              <StreamingSection />
              <div className="manga-divider opacity-30" />
              <div className="mt-2">
                <HighlightsSection 
                  vaultPlaylistCoverUrl={CONFIG_ASSETS.vaultPlaylistCover}
                  youtubeHighlightsBgUrl={CONFIG_ASSETS.youtubeHighlightsBg}
                />
              </div>

              <Suspense fallback={<SkeletonSection type="drawings" />}>
                <GallerySection 
                  resolvedTheme={resolvedTheme}
                  isLensGalleryOpen={isLensGalleryOpen}
                  onGalleryOpen={handleGalleryOpen}
                  onLensOpen={openLens}
                  onLensClose={closeLens}
                />
              </Suspense>

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
            </div>

            <AppFooter footerDecorationUrl={CONFIG_ASSETS.footerDecoration} />
          </motion.div>
        </div>
      </div>

      <AppMobileNav
        isMobile={isMobile}
        isTablet={isTablet}
        currentPage={currentPage}
        isBgPlaying={isPlaying}
        onNavigate={handleNavigate}
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
    </ButtonProvider>
  );

}

export default function App() {
  return (
    <SectionErrorBoundary sectionName="App">
      <AppProvider>
        <AppInner />
      </AppProvider>
    </SectionErrorBoundary>
  );
}
