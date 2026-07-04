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

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, Suspense, useCallback, useRef } from "react";
import { savePrefs, trackVisit } from './utils/userPrefs';
import { applyTheme as applyThemeUtil } from './utils/themeSwitcher';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { LoadingScreen } from "./components/Loading/LoadingScreen";
import { SkeletonSection } from './components/SkeletonSection';
import { PageLoader } from "./components/layout/PageLoader";
import { lazyWithRetry } from './utils/lazyWithRetry';

import { 
  CONFIG_ASSETS, 
  containerVariants, 
  ME_BIT_IMAGES 
} from "./components/app/appConstants";
import { AppBackgroundFx } from "./components/app/AppBackgroundFx";
import { AppNavGrid } from "./components/app/AppNavGrid";
import { AppMobileNav } from "./components/app/AppMobileNav";

const MySongs = lazyWithRetry(
  () => import('./components/MySongs/MySongsPage').then(m => ({ default: m.MySongs })),
  'MySongsPage',
);
const DrawingsPage = lazyWithRetry(
  () => import('./components/Drawings/DrawingsPage').then(m => ({ default: m.DrawingsPage })),
  'DrawingsPage',
);
const ContactForm = lazyWithRetry(
  () => import('./components/Contact/ContactForm').then(m => ({ default: m.ContactForm })),
  'ContactForm',
);
const RetroWorldPage = lazyWithRetry(
  () => import('./components/RetroWorld/RetroWorldPage').then(m => ({ default: m.RetroWorldPage })),
  'RetroWorldPage',
);
const GamesPage = lazyWithRetry(
  () => import('./components/Games/GamesPage').then(m => ({ default: m.GamesPage })),
  'GamesPage',
);
const MoviesPage = lazyWithRetry(
  () => import('./components/Movies/MoviesPage').then(m => ({ default: m.MoviesPage })),
  'MoviesPage',
);
const NlTvPage = lazyWithRetry(
  () => import('./components/NlTv/NlTvPage').then(m => ({ default: m.default })),
  'NlTvPage',
);
const WindowsXpPage = lazyWithRetry(
  () => import('./components/WindowsXp/WindowsXpPage').then(m => ({ default: m.WindowsXpPage })),
  'WindowsXpPage',
);
const MusicPage = lazyWithRetry(
  () => import('./features/music/MusicPage').then(m => ({ default: m.default })),
  'MusicPage',
);
const AccountsPage = lazyWithRetry(
  () => import('./features/accounts/AccountsPage').then(m => ({ default: m.default })),
  'AccountsPage',
);
const LauncherPage = lazyWithRetry(
  () => import('./components/launcher/LauncherPage').then(m => ({ default: m.default })),
  'LauncherPage',
);
import { LAUNCHER_ENABLED } from './components/launcher/launcher.config';
import { useDeviceType } from "./hooks/useDeviceType";
import { useKeyboardDetection } from "./hooks/useKeyboardDetection";
import { useParallax } from "./hooks/useParallax";
import { useResolvedTheme } from "./hooks/useResolvedTheme";
import { useGalleryState } from "./hooks/useGalleryState";
import { useAudioController } from "./hooks/useAudioController";
import { useFadeInOnView } from "./hooks/useFadeInOnView";
import { MeBitGallery } from './components/MeBit/MeBitGallery';
import { ButtonProvider } from "./components/layout/ButtonOrchestrator";
const AudioVisualizer = lazyWithRetry(
  () => import('./components/AudioVisualizer').then(m => ({ default: m.AudioVisualizer })),
  'AudioVisualizer',
);
import { isLowEndDevice, prefersReducedMotion } from "./utils/perf";
import { HeroSection } from './components/sections/HeroSection';
import { StreamingSection } from './components/sections/StreamingSection';
import { HighlightsSection } from './components/sections/HighlightsSection';
import { getThemedImage } from "./constants/assets";
import { audioManager } from "./audio/audioManager";
import { OsClockDisplay } from "./components/OsWindow";
import { FloatingControls } from "./components/layout/FloatingControls";
import { GlassModeSwitcher } from "./components/layout/GlassModeSwitcher";
import { NowPlayingBridge } from './audio/NowPlayingBridge';
const GallerySection = lazyWithRetry(
  () => import('./components/layout/GallerySection').then(m => ({ default: m.GallerySection })),
  'GallerySection',
);

import { AppProvider, useAppContext } from './context/AppContext';
import { isAutomatedEnv } from './utils/env';
import { MobileQAOverlay } from "./components/dev/MobileQAOverlay";
import { useNavigationAudioRecovery } from './hooks/useNavigationAudioRecovery';
import { useNavigateSection } from './hooks/useNavigateSection';

const PENDING_SONG_KEY = 'nl:pending-song';
function readPendingSong(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get('song');
    if (p && p.startsWith('fv-')) {
      sessionStorage.setItem(PENDING_SONG_KEY, p);
      return p;
    }
    return sessionStorage.getItem(PENDING_SONG_KEY);
  } catch { return null; }
}

function AppInner() {
  const { theme, loaded, setLoaded, isGamesOpen, closeGames, isMoviesOpen, closeMovies, isSeriesOpen, closeSeries, isTvOpen, closeTv, isRetroOpen, closeRetro, isXpOpen, closeXp, isMusicOpen, isAccountsOpen, closeAccounts, endTransition, openMusic } = useAppContext();

  useEffect(() => {
    applyThemeUtil(theme);
    savePrefs({ theme });
  }, [theme]);

  useEffect(() => {
    const pending = readPendingSong();
    if (!pending) return;
    if (!loaded) {
      setLoaded(true);
    }
    openMusic();
  }, [loaded, openMusic, setLoaded]);

  const isAnyPageActive = isGamesOpen || isTvOpen || isMoviesOpen || isSeriesOpen || isRetroOpen || isXpOpen || isMusicOpen || isAccountsOpen;

  useEffect(() => {
    if (isAnyPageActive) {
      document.documentElement.setAttribute('data-page-active', 'true');
    } else {
      document.documentElement.removeAttribute('data-page-active');
    }
  }, [isAnyPageActive]);

  // ── [P-FIX2] نظام الصفحة النشطة لزر الدخول/الفقاعة ──
  // يضبط سمة data-active-page على <html>؛ يستهلكها auth-launcher.css.
  const activePageKey = !loaded
    ? 'welcome'
    : isGamesOpen
      ? 'games'
      : isTvOpen
        ? 'tv'
        : isMoviesOpen || isSeriesOpen
          ? 'cinema'
          : isRetroOpen
            ? 'retro'
            : isXpOpen
              ? 'xp'
              : isMusicOpen
                ? 'music'
                : isAccountsOpen
                  ? 'accounts'
                  : 'home'

  useEffect(() => {
    document.documentElement.setAttribute('data-active-page', activePageKey)
  }, [activePageKey])

  return (
    <>
      {loaded && (
        <>
          <GlassModeSwitcher />
          <NowPlayingBridge />
        </>
      )}
      <AnimatePresence mode="wait" onExitComplete={endTransition}>
        {loaded && isGamesOpen ? (
          <motion.div
            key="games-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500] pointer-events-none"
          >
            <SectionErrorBoundary sectionName="games">
              <Suspense fallback={<PageLoader pageType="games" />}>
                <GamesPage onClose={closeGames} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && isTvOpen ? (
          <motion.div
            key="tv-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="tv">
              <Suspense fallback={<PageLoader pageType="tv" />}>
                <NlTvPage onClose={closeTv} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && (isMoviesOpen || isSeriesOpen) ? (
          <motion.div
            key="cinema-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500] pointer-events-none"
          >
            <SectionErrorBoundary sectionName="cinema">
              <Suspense fallback={<PageLoader pageType="cinema" />}>
                <MoviesPage
                  onClose={isSeriesOpen ? closeSeries : closeMovies}
                  initialTab={isSeriesOpen ? 'series' : 'movies'}
                />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && isRetroOpen ? (
          <motion.div
            key="retro-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="retro">
              <Suspense fallback={<PageLoader pageType="retro" />}>
                <RetroWorldPage onClose={closeRetro} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && isXpOpen ? (
          <motion.div
            key="xp-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="xp">
              <Suspense fallback={<PageLoader pageType="retro" />}>
                <WindowsXpPage onClose={closeXp} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && isMusicOpen ? (
          <motion.div
            key="music-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="music">
              <Suspense fallback={<PageLoader pageType="retro" />}>
                <MusicPage />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : loaded && isAccountsOpen ? (
          <motion.div
            key="accounts-screen"
            data-mode={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="accounts">
              <Suspense fallback={<PageLoader pageType="cinema" />}>
                <AccountsPage onClose={closeAccounts} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            key="main-app-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <MainApp />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MainApp() {
  const { isMobile, isTablet } = useDeviceType();
  useKeyboardDetection();
  useNavigationAudioRecovery();
  const {
    loaded, setLoaded,
    activeSong, setActiveSong,
    currentPage,
    ambientColor, setAmbientColor,
    audioIntent, setAudioIntent,
    theme, setTheme,
    openGames, openMovies, openTv, openRetro, openXp, openMusic, openAccounts
  } = useAppContext();

  const navigateSection = useNavigateSection();


  const resolvedTheme = useResolvedTheme();
  const parallaxRef = useParallax(isMobile ? 0 : 20);
  
  const songsRef = useFadeInOnView<HTMLElement>();
  const contactRef = useFadeInOnView<HTMLElement>();
  const drawingsRef = useFadeInOnView<HTMLElement>();

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
  const isAutomated = isAutomatedEnv();

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
    ensureMeBitLoaded,
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

  // Keyboard shortcuts for playback
  const toggleAudioRef = useRef(toggleAudio);
  const activeSongRef = useRef(activeSong);

  useEffect(() => {
    toggleAudioRef.current = toggleAudio;
    activeSongRef.current = activeSong;
  }, [toggleAudio, activeSong]);

  const onKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleAudioRef.current();
        break;
      case 'ArrowRight':
        e.preventDefault();
        activeSongRef.current?.onNext?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        activeSongRef.current?.onPrev?.();
        break;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyboardShortcut(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKeyboardShortcut]);

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

  useEffect(() => {
    // PWA Standalone app mode detection
    const mq = window.matchMedia('(display-mode: standalone)');
    
    const checkStandalone = () => {
      const isStandalone = mq.matches || window.navigator.standalone === true;
      document.body.classList.toggle('standalone-app', isStandalone);
    };
    
    checkStandalone();
    mq.addEventListener('change', checkStandalone);
    
    return () => mq.removeEventListener('change', checkStandalone);
  }, []);

  // Fixed: Issue #3 — Robust scrollToSection with cancellation
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
        <span lang="ar">Skip to content</span> / <span lang="en">Skip to main content</span>
      </a>
      
      <Suspense fallback={null}>
        <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />
      </Suspense>

      {loaded && (
        <>
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
        </>
      )}

      {!loaded && (
        LAUNCHER_ENABLED ? (
          <LauncherPage />
        ) : (
          <LoadingScreen 
            onComplete={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) {
                setAudioIntent('user-playing');
              }
              setLoaded(true);
            }}
            onEnterGames={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openGames();
            }}
            onEnterCinema={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openMovies();
            }}
            onEnterTv={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openTv();
            }}
            onEnterRetro={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openRetro();
            }}
            onEnterXp={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openXp();
            }}
            onEnterMusic={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openMusic();
            }}
            onEnterAccounts={(chosenTheme, musicConsent) => {
              setTheme(chosenTheme);
              if (musicConsent) setAudioIntent('user-playing');
              setLoaded(true);
              openAccounts();
            }}
          />
        )
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
                  onPrefetchMeBit={ensureMeBitLoaded}
                />
              </Suspense>

              <section 
                ref={songsRef} 
                className="fade-in-section"
                aria-label="My Favorite Songs"
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
              </section>

              <section
                id="contact-section"
                ref={contactRef}
                className="fade-in-section"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
                aria-label="Contact Me"
              >
                <SectionErrorBoundary sectionName="ContactForm">
                  <Suspense fallback={<SkeletonSection type="contact" />}>
                    <ContactForm />
                  </Suspense>
                </SectionErrorBoundary>
              </section>

              <section
                id="drawings-section"
                ref={drawingsRef}
                className="fade-in-section"
                aria-label="My Drawings"
              >
                <SectionErrorBoundary sectionName="DrawingsPage">
                  <Suspense fallback={<SkeletonSection type="drawings" />}>
                    <DrawingsPage onSongPlay={handleSongPlay} />
                  </Suspense>
                </SectionErrorBoundary>
              </section>
            </div>
          </motion.div>
        </div>
      </div>

      {loaded && (
        <AppMobileNav
          isMobile={isMobile}
          isTablet={isTablet}
          currentPage={currentPage}
          isBgPlaying={isPlaying}
          onNavigate={navigateSection}
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
      )}
      {import.meta.env.DEV && <MobileQAOverlay />}
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
