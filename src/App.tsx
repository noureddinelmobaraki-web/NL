/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Camera,
  Music2,
  Pencil,
  Aperture,
  Volume2,
  VolumeX,
  Maximize2
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { loadPrefs, savePrefs } from './utils/userPrefs';
import type { Theme, AudioIntent } from './utils/userPrefs';
import { LoadingScreen } from "./components/LoadingScreen";
import { MySongs } from './components/MySongsPage';
import { DrawingsPage } from './components/DrawingsPage';
import { ContactForm } from './components/ContactForm';
import { LensGallery } from './components/LensGallery';
import { SkeletonSection } from './components/SkeletonSection';
import { useDeviceType } from "./hooks/useDeviceType";
import { useParallax } from "./hooks/useParallax";
import { MeBitGallery } from './components/MeBitGallery';
import { NowPlayingBar } from "./components/NowPlayingBar";
import { MobileNavBar } from "./components/MobileNavBar";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { isLowEndDevice, prefersReducedMotion } from "./utils/perf";
import { HeroSection } from './components/sections/HeroSection';
import { ContactSection } from './components/sections/ContactSection';
import { StreamingSection } from './components/sections/StreamingSection';
import { HighlightsSection } from './components/sections/HighlightsSection';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { 
  ActiveSong, 
} from "./types";
import { ScrollProgress } from "./components/ScrollProgress";
import { ResponsiveImage } from "./components/ResponsiveImage";
import { ASSETS } from "./constants/assets";
import { audioManager } from "./audio/audioManager";
import { getOrCreateHls } from './audio/hlsPool';
import Hls from 'hls.js';

const CONFIG_ASSETS = {
  mainBackground: ASSETS.profile.heroBg,
  nameHeaderBg: ASSETS.profile.headerBg,
  footerDecoration: ASSETS.profile.footerDeco,
  profileImg: ASSETS.profile.main,
  vaultPlaylistCover: ASSETS.songs.playlistCover,
  youtubeHighlightsBg: ASSETS.songs.ytHighlights,
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
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
  const parallaxRef = useParallax(isMobile ? 0 : 20);
  const audioRef = useRef<HTMLAudioElement>(null);
  const meBitAudioRef = useRef<HTMLAudioElement | null>(null);
  const meBitHlsAttached = useRef(false);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLensGalleryOpen, setIsLensGalleryOpen] = useState(false);
  const [isMeBitPlaying, setIsMeBitPlaying] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [audioIntent, setAudioIntent] = useState<AudioIntent>(
    initialPrefs.audioIntent === 'user-playing' ? 'initial' : initialPrefs.audioIntent
  );
  const [theme, setTheme] = useState<Theme>(initialPrefs.theme);

  // Audio lifecycle for persistent sources
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Register immediately with AudioManager
    audioManager.register('bg', audio, 0.7);
    audioManager.setStateCallback((playing) => setIsPlaying(playing));

    const url = ASSETS.media.music;

    // Safari: native HLS support
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      audio.load();
    } else if (Hls.isSupported()) {
      // Chrome/Android/Firefox: use hls.js
      const hls = getOrCreateHls(url);
      hls.attachMedia(audio);
      const errHandler = (_: any, data: any) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      };
      hls.on(Hls.Events.ERROR, errHandler);
      
      // We don't cleanup hls here because it's shared in pool
    }

    // Lens
    const lensAudio = new Audio(ASSETS.media.lensMusic);
    lensAudio.crossOrigin = "anonymous";
    lensAudio.loop = true;
    lensAudio.preload = 'auto';
    audioManager.register('lens', lensAudio, 0.7);

    // ME bit (Pre-initialize for instant playback)
    const meBitAudio = new Audio();
    meBitAudio.crossOrigin = "anonymous";
    meBitAudio.loop = true;
    meBitAudio.preload = 'auto';
    meBitAudio.volume = 0;
    meBitAudioRef.current = meBitAudio;
    audioManager.register('mebit', meBitAudio, 0.6);

    const meBitUrl = ASSETS.media.meBitMusic;
    if (meBitAudio.canPlayType('application/vnd.apple.mpegurl')) {
      meBitAudio.src = meBitUrl;
      meBitAudio.load();
    } else if (Hls.isSupported()) {
      const hls = getOrCreateHls(meBitUrl);
      hls.attachMedia(meBitAudio);
      meBitHlsAttached.current = true;
    }

    return () => {
      audioManager.pause('lens');
      audioManager.pause('mebit');
    };
  }, []); // runs once on mount

  useEffect(() => {
    const resolved = theme === 'dark' ? 'dark' 
      : theme === 'light' ? 'manga-paper' 
      : 'midnight'; // system → always midnight
    document.documentElement.setAttribute('data-theme', resolved);
    savePrefs({ theme });
  }, [theme]);

  useEffect(() => {
    if (isLensGalleryOpen) {
      audioManager.suppressBg('lens_open');
    } else {
      audioManager.releaseBg('lens_open');
    }
  }, [isLensGalleryOpen]);

  useEffect(() => {
    if (isGalleryOpen) {
      audioManager.suppressBg('mebit_open');
    } else {
      audioManager.releaseBg('mebit_open');
    }
  }, [isGalleryOpen]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGalleryOpen = useCallback((index = 0) => {
    audioManager.play('mebit');
    setIsGalleryOpen(true);
    setSelectedImageIndex(index);
    setIsMeBitPlaying(true);
  }, []);

  const handleGalleryClose = useCallback(() => {
    audioManager.pause('mebit');
    setIsGalleryOpen(false);
    setIsMeBitPlaying(false);
  }, []);

  const toggleMeBitAudio = () => {
    if (!meBitAudioRef.current) return;
    if (isMeBitPlaying) {
      audioManager.pause('mebit');
      setIsMeBitPlaying(false);
    } else {
      audioManager.play('mebit');
      setIsMeBitPlaying(true);
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'songs') {
      scrollToSection('my-songs-section');
    } else if (page === 'drawings') {
      scrollToSection('drawings-section');
    }
  };

  const nextImage = useCallback(() => {
    setSelectedImageIndex(prev => (prev !== null ? (prev < ME_BIT_IMAGES.length - 1 ? prev + 1 : 0) : 0));
  }, []);

  const prevImage = useCallback(() => {
    setSelectedImageIndex(prev => (prev !== null ? (prev > 0 ? prev - 1 : ME_BIT_IMAGES.length - 1) : ME_BIT_IMAGES.length - 1));
  }, []);

  useEffect(() => {
    // Performance class
    if (isLowEndDevice() || prefersReducedMotion()) {
      document.body.classList.add('low-perf');
    }
  }, []);

  useEffect(() => {
    if (audioRef.current && loaded) {
      const audio = audioRef.current;
      if (audioIntent === 'user-playing') {
        audioManager.unpauseBg();
      } else if (audioIntent === 'initial') {
        const onInteraction = () => {
          audio.muted = false;
          setAudioIntent('user-playing');
          audioManager.unpauseBg();
          window.removeEventListener('click', onInteraction);
          window.removeEventListener('scroll', onInteraction);
        };
        window.addEventListener('click', onInteraction, { once: true });
        window.addEventListener('scroll', onInteraction, { once: true, passive: true });
      }
    }
  }, [audioIntent, loaded]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioManager.pause('bg');
      setIsPlaying(false);
      setAudioIntent('user-paused');
      savePrefs({ audioIntent: 'user-paused' });
    } else {
      audioManager.unpauseBg();
      setIsPlaying(true);
      setAudioIntent('user-playing');
      savePrefs({ audioIntent: 'user-playing' });
    }
  };

  const handleSongPlay = useCallback(() => {
    // Unconditionally pause gallery audio before song starts
    audioManager.pause('lens');
    audioManager.pause('mebit');
    // We just update the UI state.
    setIsPlaying(false);
  }, []);

  const handleSongStop = useCallback(() => {
    if (isLensGalleryOpen) {
      audioManager.play('lens');
    }
    if (isGalleryOpen) {
      audioManager.play('mebit');
    }
  }, [isLensGalleryOpen, isGalleryOpen]);

  const handleLensClose = useCallback(() => {
    audioManager.pause('lens');
    setIsLensGalleryOpen(false);
  }, []);


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
      <ScrollProgress />
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
      <div 
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 500ms ease-in' }}
      >
        <div 
          className="min-h-screen w-full relative flex flex-col items-center py-10 px-4 sm:px-8 md:px-10 lg:px-10 overflow-x-hidden"
        >
      {/* Combined Background Layer - optimized */}
      <div 
        ref={parallaxRef}
        className="fixed inset-[-5%] z-[-2] bg-cover bg-center"
        style={{ 
          backgroundImage: `url('${CONFIG_ASSETS.mainBackground}')`,
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
      }} />      {/* Background Audio */}
      <audio 
        id="bg-audio" 
        ref={audioRef}
        loop 
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* MeBit Gallery Modal */}
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

      {/* Floating Audio Control Button - Small & Elegant */}
      <button
        onClick={toggleAudio}
        className="fixed z-[9000] backdrop-blur-lg border p-2.5 rounded-full transition-all hover:scale-105 active:scale-90 shadow-xl group border-dashed"
        style={{
          bottom: (isMobile || isTablet) ? 'calc(60px + env(safe-area-inset-bottom) + 16px)' : '16px',
          right: '16px',
          background: 'var(--bg-glass-strong)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)'
        }}
        aria-label="Toggle Background Music"
      >
        {isPlaying ? (
          <Volume2 className="w-4 h-4 group-hover:animate-pulse" aria-hidden="true" />
        ) : (
          <VolumeX className="w-4 h-4 text-zinc-500" aria-hidden="true" />
        )}
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[10px] font-mono tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5 uppercase">
          {isPlaying ? 'Sound On' : 'Sound Off'}
        </div>
      </button>

      {/* Main Content Wrapper */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        lang="en"
        dir="ltr"
        className="relative z-10 w-full max-w-5xl flex flex-col gap-14"
        style={{ paddingBottom: (isMobile || isTablet) ? '80px' : undefined }}
      >
        {/* Navigation Tabs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center sm:justify-start gap-5 md:gap-6 mb-4"
        >
          <button 
            onClick={() => scrollToSection('me-bit-gallery')}
            className="manga-paper-tab"
          >
            <Camera className="w-5 h-5" style={{ filter: 'url(#rough)' }} />
            ME BIT
          </button>
          <button 
            onClick={() => scrollToSection('my-songs-section')}
            className="manga-paper-tab"
          >
            <Music2 className="w-5 h-5" style={{ filter: 'url(#rough)' }} />
            MY SONGS
          </button>
          <button 
            onClick={() => scrollToSection('drawings-section')}
            className="manga-paper-tab"
          >
            <Pencil className="w-5 h-5" style={{ filter: 'url(#rough)' }} />
            MY DRAWINGS
          </button>
          <button
            onClick={() => {
              audioManager.play('lens');
              setIsLensGalleryOpen(true);
            }}
            className="manga-paper-tab"
          >
            <Aperture className="w-5 h-5" style={{ filter: 'url(#rough)' }} />
            LENS
          </button>
        </motion.div>

        <div className="flex flex-col gap-14">
          {/* Editorial Header Section */}
          <HeroSection />

          <StreamingSection />

          <div className="manga-divider opacity-30" />

          {/* Highlights Section - Spotify Vault & YouTube */}
          <div className="mt-2">
            <HighlightsSection 
              vaultPlaylistCoverUrl={CONFIG_ASSETS.vaultPlaylistCover}
              youtubeHighlightsBgUrl={CONFIG_ASSETS.youtubeHighlightsBg}
            />
          </div>

        {/* ME bit Interactive Gallery - Moved out of grid to be more prominent */}
        <motion.section 
          variants={itemVariants}
          className="flex flex-col gap-4 mt-8"
          id="me-bit-gallery"
        >
          <div className="flex justify-between items-end">
            <h2 className="font-manga text-fluid-section font-bold text-[var(--text-primary)] text-left tracking-wider">
              ME bit
            </h2>
            <span className="font-hand text-[var(--text-muted)] text-sm italic mb-1">Click to enter theater mode</span>
          </div>
          <div className="manga-divider" />
          
          <div 
            onClick={() => handleGalleryOpen()}
            className="relative w-full border-[4px] border-[var(--ink-color)] bg-[var(--paper-color)] p-[10px] overflow-hidden group cursor-[zoom-in] shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[220px] sm:h-[260px] md:h-[280px] manga-panel"
          >
            <div className="me-bit-track flex gap-[10px]">
              {[...ME_BIT_IMAGES, ...ME_BIT_IMAGES].map((src, idx) => (
                <button 
                  type="button"
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGalleryOpen(idx % ME_BIT_IMAGES.length);
                  }}
                  className="inline-block h-[200px] sm:h-[240px] md:h-[250px] w-auto aspect-[3/4] shrink-0 border-[2px] border-black overflow-hidden relative group/item"
                  aria-label={`Open photo ${idx + 1}`}
                >
                  <ResponsiveImage 
                    src={src}
                    alt={`Me bit ${idx}`}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                    loading={idx >= ME_BIT_IMAGES.length ? "lazy" : "eager"}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors" />
                </button>
              ))}
            </div>
            
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="p-4 manga-border flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform shadow-[5px_5px_0_var(--ink-color)]" style={{ background: 'var(--paper-color)', color: 'var(--ink-color)', borderColor: 'var(--ink-color)' }}>
                <Maximize2 className="w-6 h-6" aria-hidden="true" />
                <span className="font-manga text-xl font-bold">OPEN GALLERY</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          className="flex flex-col gap-4 mt-4"
          id="lens-section"
        >
          <div className="flex justify-between items-end">
            <h2 className="font-manga text-fluid-section font-bold text-[var(--text-primary)] tracking-wider">
              THROUGH THE LENS
            </h2>
          </div>
          <div className="manga-divider" />

          {/* Thumbnail trigger */}
          <div
            onClick={() => {
              audioManager.play('lens');
              setIsLensGalleryOpen(true);
            }}
            className="relative w-full border-[4px] border-[var(--ink-color)] bg-black overflow-hidden group cursor-pointer shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[160px] sm:h-[200px]"
            role="button"
            aria-label="Open photography gallery"
            tabIndex={0}
            onKeyDown={e => { 
              if (e.key === 'Enter') {
                audioManager.play('lens');
                setIsLensGalleryOpen(true);
              }
            }}
          >
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-110 opacity-50 group-hover:opacity-70"
              style={{ backgroundImage: `url('${ASSETS.profile.photo}')` }}
            />

            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1]" />

            {/* Always-visible CTA — center of the card */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-[2]">
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/40 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 shadow-lg">
                <span className="text-2xl" aria-hidden="true">📷</span>
              </div>
              <span className="font-manga text-white text-xl tracking-widest uppercase" style={{ textShadow: '2px 2px 0 #000' }}>
                Open Gallery
              </span>
              <span className="font-hand text-white/60 text-sm tracking-wider">
                {ASSETS.profile.lens.length} photos
              </span>
            </div>

            {/* Corner hint for desktop */}
            <div className="absolute bottom-3 right-4 z-[2] hidden sm:flex items-center gap-1 text-white/40 text-xs font-mono">
              <span>click to view</span>
            </div>
          </div>
        </motion.section>

        {/* My Songs Section - Now right after Me bit */}
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

          {/* Contact Form Section */}
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

          {/* My Drawings Section */}
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

          {/* Contact Section */}
          <ContactSection />
      </div>

      {/* Editorial Footer */}
        <motion.footer 
          variants={itemVariants}
          className="mt-10 flex flex-col items-center gap-8 border-t-4 border-[var(--ink-color)] pt-10 pb-20 retro-shadow-white"
        >
          {/* Footer Decoration Image with Float Animation */}
          <ResponsiveImage 
            src={CONFIG_ASSETS.footerDecoration}
            alt="Footer Decoration"
            className="w-full max-w-[600px] border-[3px] border-[var(--ink-color)] shadow-[10px_10px_0px_var(--manga-shadow-color)] rounded-xl hover:scale-[1.02] transition-transform animate-float"
            loading="lazy"
          />

          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
            <div className="flex gap-4">
              <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
              <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
              <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
            </div>
            <p className="font-manga text-2xl text-[var(--text-primary)] bg-[var(--paper-color)] px-6 py-1 manga-border -rotate-1 shadow-[4px_4px_0px_var(--manga-shadow-color)] italic text-center md:text-left">
              NL // NOURDINE GB © 2026
            </p>
          </div>
        </motion.footer>
      </motion.div>
        </div>
      </div>
      <NowPlayingBar 
        activeSong={activeSong}
        onClose={() => activeSong?.onDismiss?.()}
      />
      <LensGallery
        isOpen={isLensGalleryOpen}
        onClose={handleLensClose}
      />
      <button
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        style={{ fontFamily: 'var(--font-manga)' }}
      >
        ↑
      </button>
        <button
          onClick={() => {
            const next = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
            setTheme(next);
          }}
          className="fixed z-[9000] border p-2.5 rounded-full transition-all hover:scale-105 active:scale-90 shadow-xl"
          style={{
            top: 'calc(env(safe-area-inset-top) + 20px)',
            right: '20px',
            fontSize: '16px',
            background: 'var(--bg-glass-strong)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
          aria-label="Toggle theme"
        >
          {theme === 'system' ? '🌓' : theme === 'dark' ? '🌑' : '☀️'}
        </button>
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
