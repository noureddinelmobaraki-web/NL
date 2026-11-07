/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { m } from 'framer-motion';
import { useState, Suspense, lazy } from 'react';
import { SectionErrorBoundary } from '../SectionErrorBoundary';
import { LoadingScreen } from '../Loading/LoadingScreen';
import { SkeletonSection } from '../SkeletonSection';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import {
  CONFIG_ASSETS,
  containerVariants,
  ME_BIT_IMAGES,
} from './appConstants';
import { AppBackgroundFx } from './AppBackgroundFx';
import { AppNavGrid } from './AppNavGrid';
import { AppMobileNav } from './AppMobileNav';
import { LAUNCHER_ENABLED } from '../launcher/launcher.config';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useKeyboardDetection } from '../../hooks/useKeyboardDetection';
import { useParallax } from '../../hooks/useParallax';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useGalleryState } from '../../hooks/useGalleryState';
import { useAudioController } from '../../hooks/useAudioController';
import { useFadeInOnView } from '../../hooks/useFadeInOnView';
import { useAppBootEffects } from '../../hooks/useAppBootEffects';
import { AeroImageViewer } from '../AeroGallery/viewer/AeroImageViewer';
import { AeroGalleryHub, type AeroAlbum } from '../AeroGallery/AeroGalleryHub';
import { ButtonProvider } from '../layout/ButtonOrchestrator';
import { HeroSection } from '../sections/HeroSection';
import { HighlightsSection } from '../sections/HighlightsSection';
import { useTubeStore } from '../../features/youtube/tubeStore';
import SongVideoTether from '../../features/songVideo/SongVideoTether';
import { SongLyricsTether } from '../../features/songLyrics';
import { HomeInteractiveMap } from '../../home/HomeInteractiveMap';
import { StationLattice, type LatticeItem } from '../../home/StationLattice';
import { STREAMING_PLATFORMS, SOCIAL_CHANNELS } from '../../config/streaming';
import { SOCIAL_ICON_URLS } from '../../config/socialIcons';
import { getThemedImage, ASSETS } from '../../constants/assets';
import { audioManager } from '../../audio/audioManager';
import { OsClockDisplay } from '../OsWindow';
import { FloatingControls } from '../layout/FloatingControls';
import { useAppContext } from '../../context/AppContext';
import { isAutomatedEnv } from '../../utils/env';
import { MobileQAOverlay } from '../dev/MobileQAOverlay';
import SearchOverlay from '../../features/search/SearchOverlay';
import { useNavigationAudioRecovery } from '../../hooks/useNavigationAudioRecovery';
import { useNavigateSection } from '../../hooks/useNavigateSection';
import { usePlaybackHotkeys } from '../../hooks/usePlaybackHotkeys';

const MySongs = lazyWithRetry(
  () => import('../MySongs/MySongsPage').then((m) => ({ default: m.MySongs })),
  'MySongsPage',
);
const DrawingsPage = lazyWithRetry(
  () => import('../Drawings/DrawingsPage').then((m) => ({ default: m.DrawingsPage })),
  'DrawingsPage',
);
const ContactForm = lazyWithRetry(
  () => import('../Contact/ContactForm').then((m) => ({ default: m.ContactForm })),
  'ContactForm',
);
const LauncherPage = lazyWithRetry(
  () => import('../launcher/LauncherPage').then((m) => ({ default: m.default })),
  'LauncherPage',
);
const GallerySection = lazyWithRetry(
  () => import('../layout/GallerySection').then((m) => ({ default: m.GallerySection })),
  'GallerySection',
);
const YouTubePortal = lazy(() => import('../../features/youtube/YouTubePortal'));

export function MainHomeScreen() {
  const { isMobile, isTablet } = useDeviceType();
  useKeyboardDetection();
  useNavigationAudioRecovery();
  const {
    loaded,
    setLoaded,
    activeSong,
    setActiveSong,
    currentPage,
    ambientColor,
    setAmbientColor,
    audioIntent,
    setAudioIntent,
    theme,
    setTheme,
    openGames,
    openMovies,
    openTv,
    openRetro,
    openXp,
    openMusic,
    openAccounts,
  } = useAppContext();

  const navigateSection = useNavigateSection();
  const tubeOpen = useTubeStore((s) => s.open);
  const tubeVideoId = useTubeStore((s) => s.videoId);
  const openTube = useTubeStore((s) => s.openTube);
  const closeTube = useTubeStore((s) => s.closeTube);

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
    openLens,
    closeLens,
    getActiveContext,
  } = useGalleryState();
  const [hubAlbum, setHubAlbum] = useState<AeroAlbum | null>(null);

  const activeModalContext = getActiveContext() || 'page';
  const isAnyModalOpen = getActiveContext() !== null;
  const isAutomated = isAutomatedEnv();

  const {
    audioRef,
    isPlaying,
    toggleAudio,
    handleSongPlay,
    handleSongStop,
    handleGalleryOpen,
    handleGalleryClose,
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

  usePlaybackHotkeys(toggleAudio, activeSong);
  const { scrollToSection } = useAppBootEffects(isMobile);

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

  const streamingItems: LatticeItem[] = STREAMING_PLATFORMS.map((p) => ({
    id: p.id,
    label: p.name,
    href: p.url,
    color: p.color,
    content: (
      <img
        className="nl-lattice-img"
        src={SOCIAL_ICON_URLS[p.id]}
        alt=""
        width={250}
        height={250}
        loading="lazy"
        decoding="async"
      />
    ),
  }));
  const socialItems: LatticeItem[] = SOCIAL_CHANNELS.map((s) => ({
    id: s.id,
    label: s.name,
    href: s.url,
    color: s.color,
    content: (
      <img
        className="nl-lattice-img"
        src={SOCIAL_ICON_URLS[s.id]}
        alt=""
        width={250}
        height={250}
        loading="lazy"
        decoding="async"
      />
    ),
  }));

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

      {loaded && (
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
      )}

      {!loaded &&
        (LAUNCHER_ENABLED ? (
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
        ))}

      <div
        style={{
          opacity: loaded ? 1 : 0,
          visibility: loaded ? 'visible' : 'hidden',
          transition: isAutomated ? 'none' : 'opacity 500ms ease-in',
        }}
      >
        {renderClock()}
        <div className="min-h-screen w-full relative flex flex-col items-center py-10 px-4 sm:px-8 md:px-10 lg:px-10 overflow-x-hidden">
          <audio id="bg-audio" ref={audioRef} loop preload="auto" crossOrigin="anonymous" aria-hidden="true" />

          <AeroImageViewer
            open={isGalleryOpen || isLensGalleryOpen}
            album={isLensGalleryOpen ? 'lens' : 'mebit'}
            images={isLensGalleryOpen ? ASSETS.profile.lens : ME_BIT_IMAGES}
            startIndex={selectedImageIndex ?? 0}
            onClose={() => {
              if (isLensGalleryOpen) closeLens();
              else handleGalleryClose();
            }}
          />

          <AeroGalleryHub
            album={hubAlbum}
            meBitImages={ME_BIT_IMAGES}
            lensImages={ASSETS.profile.lens}
            isGalleryOpen={isGalleryOpen}
            isLensGalleryOpen={isLensGalleryOpen}
            onSwitchAlbum={setHubAlbum}
            onClose={() => {
              setHubAlbum(null);
              handleGalleryClose();
              closeLens();
            }}
            onOpenMeBit={handleGalleryOpen}
            onOpenLens={(index?: number) => openLens(index ?? 0)}
            onPrefetchMeBit={ensureMeBitLoaded}
          />

          <m.div
            variants={containerVariants}
            initial={isAutomated ? 'visible' : 'hidden'}
            animate="visible"
            className="relative z-10 w-full max-w-7xl flex flex-col gap-14"
            style={{ paddingBottom: isMobile || isTablet ? '80px' : undefined }}
          >
            {!isMobile && (
              <AppNavGrid
                resolvedTheme={resolvedTheme}
                onScrollToSection={scrollToSection}
                onOpenLens={() => setHubAlbum('lens')}
              />
            )}

            <div id="main-content" className="flex flex-col gap-14" tabIndex={-1}>
              <HomeInteractiveMap
                stations={[
                  { id: 'profile', node: <HeroSection /> },
                  {
                    id: 'streaming',
                    node: (
                      <div className="nl-home-hub">
                        <StationLattice items={streamingItems} lite={false} cordId="streaming-hub" />
                        <StationLattice items={socialItems} lite={false} cordId="social-hub" />
                      </div>
                    ),
                  },
                  {
                    id: 'highlights',
                    node: (
                      <HighlightsSection
                        vaultPlaylistCoverUrl={CONFIG_ASSETS.vaultPlaylistCover}
                        youtubeHighlightsBgUrl={CONFIG_ASSETS.youtubeHighlightsBg}
                        onOpenTube={() => openTube()}
                      />
                    ),
                  },
                  {
                    id: 'gallery',
                    node: (
                      <div className="nl-home-hub">
                        <Suspense fallback={<SkeletonSection type="drawings" />}>
                          <GallerySection
                            resolvedTheme={resolvedTheme}
                            onGalleryOpen={() => setHubAlbum('mebit')}
                            onLensOpen={() => setHubAlbum('lens')}
                            onPrefetchMeBit={ensureMeBitLoaded}
                          />
                        </Suspense>
                      </div>
                    ),
                  },
                  {
                    id: 'songs',
                    node: (
                      <section ref={songsRef} className="fade-in-section nl-home-songs" aria-label="My Favorite Songs">
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
                      </section>
                    ),
                  },
                  {
                    id: 'contact',
                    node: (
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
                    ),
                  },
                  {
                    id: 'drawings',
                    bare: true,
                    node: (
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
                    ),
                  },
                ]}
              />
            </div>
          </m.div>
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
        />
      )}
      {tubeOpen ? (
        <Suspense fallback={null}>
          <YouTubePortal open={tubeOpen} initialVideoId={tubeVideoId ?? undefined} onClose={closeTube} />
        </Suspense>
      ) : null}
      <SongVideoTether />
      <SongLyricsTether />
      {new URLSearchParams(window.location.search).has('q') ? (
        <SearchOverlay
          onClose={() => {
            const p = new URLSearchParams(window.location.search);
            p.delete('q');
            const qs = p.toString();
            window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
            window.dispatchEvent(new Event('popstate'));
          }}
        />
      ) : null}
      {import.meta.env.DEV && <MobileQAOverlay />}
    </ButtonProvider>
  );
}
