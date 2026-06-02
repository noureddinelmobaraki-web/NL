/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * MOBILE QA CHECKLIST — Verify before each release:
 * 
 * [ ] Hero section: profile image stacks above bio on phone, fits without horizontal scroll
 * [ ] Streaming icons: 2-col grid on small phone, no overflow
 * [ ] MeBit gallery: opens in fullscreen, pinch-zoom works, thumbnails auto-scroll
 * [ ] Lens gallery: swipe nav, double-tap zoom, exits on swipe-down
 * [ ] Drawings: vertical TikTok-style scroll-snap, tap to pause, mute toggle
 * [ ] MySongs: cards compact, lyrics open as bottom sheet, drag-down closes
 * [ ] Music Mood: black hole transition smooth, particles react to music, dice rolls cleanly
 * [ ] MobileNavBar: 5 tabs visible, no overlap with notch/island, no overlap with Now Playing
 * [ ] Theme switch: works on all themes (light/dark/midnight/bit/lite) without layout shift
 * [ ] Rotation: portrait ↔ landscape transitions cleanly in all modals
 * [ ] Standalone PWA mode: safe-area respected on iPhone notch + Android gesture bar
 * [ ] Soft keyboard: ContactForm inputs scroll into view, controls move up
 * [ ] Browser chrome appearing/disappearing: layout stays stable (100dvh used everywhere)
 * [ ] No ghost clicks after swipes
 * [ ] All buttons ≥ 44×44px tap target
 * [ ] No hover-stuck states on touch
 */

import { motion } from "framer-motion";
import React, { useEffect, Suspense, useCallback, useRef } from "react";
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
import { useKeyboardDetection } from "./hooks/useKeyboardDetection";
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
import { MobileQAOverlay } from "./components/dev/MobileQAOverlay";

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
  useKeyboardDetection();
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

  // FIXED: Issue #1 — Shared mood trigger state
  const moodTriggerRef = useRef<(() => void) | null>(null);
  const handleRegisterMoodTrigger = useCallback((fn: () => void) => {
    moodTriggerRef.current = fn;
  }, []);
  const handleMoodTrigger = useCallback(() => {
    moodTriggerRef.current?.();
  }, []);

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

    if (!isMobile) return;

    let lastTouch = 0;
    const handler = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    };
    document.addEventListener('touchend', handler, { passive: false });
    return () => document.removeEventListener('touchend', handler);
  }, [isMobile]);

  // FIXED: Issue #4 — Move background pause logic to stable useCallback
  const handleBackgroundPause = useCallback(() => {
    const channels = ['bg', 'song', 'mebit', 'lens', 'video'] as const;
    channels.forEach(ch => { 
      try { audioManager.pause(ch); } catch (_) {} 
    });
    
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
      try { el.pause(); } catch (_) {}
    });
  }, []);

  useEffect(() => {
    // PWA Standalone app mode detection
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        document.body.classList.add('standalone-app');
      } else {
        document.body.classList.remove('standalone-app');
      }
    };
    checkStandalone();

    window.addEventListener('pagehide', handleBackgroundPause);
    document.addEventListener('visibilitychange', handleBackgroundPause);
    return () => {
      window.removeEventListener('pagehide', handleBackgroundPause);
      document.removeEventListener('visibilitychange', handleBackgroundPause);
    };
  }, [handleBackgroundPause]);

  // FIXED: Issue #3 — Robust scrollToSection with cancellation
  const scrollToSection = useCallback((id: string) => {
    let cancelled = false;
    const timerIds: ReturnType<typeof setTimeout>[] = [];
    
    const attempt = (tries: number) => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries < 6) {
        const t = setTimeout(() => attempt(tries + 1), 150);
        timerIds.push(t);
      }
    };
    attempt(0);
    
    return () => {
      cancelled = true;
      timerIds.forEach(clearTimeout);
    };
  }, []);

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

              <motion.section 
                variants={itemVariants} 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                id="my-songs-section"
                aria-label="أغانيّ المفضلة"
              >
                <SectionErrorBoundary sectionName="MySongs">
                  <Suspense fallback={<SkeletonSection type="songs" />}>
                    <MySongs 
                      onSongPlay={handleSongPlay} 
                      onSongStop={handleSongStop}
                      onActiveSongChange={setActiveSong}
                      onAmbientColorChange={setAmbientColor}
                      onRegisterMoodTrigger={handleRegisterMoodTrigger}
                    />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.section>

              <motion.section
                id="contact-section"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
                aria-label="اتصل بي"
              >
                <SectionErrorBoundary sectionName="ContactForm">
                  <Suspense fallback={<SkeletonSection type="contact" />}>
                    <ContactForm />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.section>

              <motion.section
                id="drawings-section"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}
                aria-label="رسوماتي"
              >
                <SectionErrorBoundary sectionName="DrawingsPage">
                  <Suspense fallback={<SkeletonSection type="drawings" />}>
                    <DrawingsPage onSongPlay={handleSongPlay} />
                  </Suspense>
                </SectionErrorBoundary>
              </motion.section>
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
        onMoodTrigger={handleMoodTrigger}
      />
      <MobileQAOverlay />
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
