/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Camera,
  Music2,
  Pencil,
  Aperture
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { MySongs } from './components/MySongsPage';
import { DrawingsPage } from './components/DrawingsPage';
import { Sarahni } from './components/Sarahni';
import { LensGallery } from './components/LensGallery';
import { SkeletonSection } from './components/SkeletonSection';
import { useDeviceType } from "./hooks/useDeviceType";
import { useParallax } from "./hooks/useParallax";
import { useFocusTrap } from "./hooks/useFocusTrap";
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

export default function App() {
  const { isMobile, isTablet } = useDeviceType();
  const parallaxRef = useParallax(isMobile ? 0 : 20);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLensGalleryOpen, setIsLensGalleryOpen] = useState(false);
  const [isMeBitPlaying, setIsMeBitPlaying] = useState(false);
  const meBitAudioRef = useRef<HTMLAudioElement | null>(null);
  const galleryRef = useFocusTrap(isGalleryOpen);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioIntent, setAudioIntent] = useState<'initial' | 'user-paused' | 'user-playing'>('initial');
  const audioRef = useRef<HTMLAudioElement>(null);

  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    try {
      return (localStorage.getItem('nl-theme') as 'dark' | 'light' | 'system') || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'manga-paper')
      : (theme === 'dark' ? 'dark' : 'manga-paper');
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      localStorage.setItem('nl-theme', theme);
    } catch {}
  }, [theme]);

  // Also listen to system changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'manga-paper');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (isGalleryOpen) {
      if (!meBitAudioRef.current) {
        const audio = new Audio(ASSETS.media.meBitMusic);
        audio.loop = true;
        audio.preload = 'auto';
        meBitAudioRef.current = audio;
        audioManager.register('mebit', audio, 0.6);
      }
      audioManager.play('mebit');
      setIsMeBitPlaying(true);
    } else {
      if (meBitAudioRef.current) {
        audioManager.pause('mebit');
        setIsMeBitPlaying(false);
      }
    }
  }, [isGalleryOpen]);

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
    if (!isGalleryOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') setIsGalleryOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isGalleryOpen, nextImage, prevImage]);

  useEffect(() => {
    // Performance class
    if (isLowEndDevice() || prefersReducedMotion()) {
      document.body.classList.add('low-perf');
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioManager.register('bg', audioRef.current, 0.7);
      audioManager.setStateCallback((playing) => {
        setIsPlaying(playing);
      });

      const audio = audioRef.current;
      if (audioIntent !== 'user-paused') {
        const canTryPlay = audioIntent === 'user-playing' || (audioIntent === 'initial' && loaded);
        if (canTryPlay) {
          if (audioIntent === 'user-playing') {
            audioManager.unpauseBg();
          } else if (audioIntent === 'initial' && loaded) {
            audio.muted = true;
            audioManager.unpauseBg();

            const onInteraction = () => {
              audio.muted = false;
              setIsPlaying(true);
              setAudioIntent('user-playing');
              window.removeEventListener('click', onInteraction);
              window.removeEventListener('scroll', onInteraction);
            };
            window.addEventListener('click', onInteraction, { once: true });
            window.addEventListener('scroll', onInteraction, { once: true, passive: true });
          }
        }
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
    } else {
      audioManager.unpauseBg();
      setIsPlaying(true);
      setAudioIntent('user-playing');
    }
  };

  const handleSongPlay = useCallback(() => {
    // We just update the UI state. AudioManager handles the actual audio background suspension.
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const onOpen = () => audioManager.play('lens');
    const onClose = () => audioManager.pause('lens');
    window.addEventListener('gallery:open', onOpen);
    window.addEventListener('gallery:close', onClose);
    return () => {
      window.removeEventListener('gallery:open', onOpen);
      window.removeEventListener('gallery:close', onClose);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
      }} />

      {/* Background Audio */}
      <audio 
        id="bg-audio" 
        ref={audioRef}
        loop 
        preload="none"
      >
        <source src={ASSETS.media.music} />
        Your browser does not support the audio element.
      </audio>

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

      {/* Professional Gallery Modal */}
      <AnimatePresence mode="wait">
        {isGalleryOpen && (
          <motion.div 
            ref={galleryRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 md:p-14"
          >
            {/* Backdrop Blur */}
            <div 
              className="absolute inset-0 bg-black/95 backdrop-blur-3xl cursor-crosshair"
              onClick={() => setIsGalleryOpen(false)}
            />
            
            {/* Close Button */}
            <button
              onClick={toggleMeBitAudio}
              className="absolute z-[110] bg-black/50 backdrop-blur-md border border-white/20 p-2.5 rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-all shadow-xl"
              style={{
                top: isMobile ? 'calc(var(--safe-top) + 12px)' : '10rem',
                left: isMobile ? '16px' : '6rem',
              }}
              aria-label="Toggle Gallery Music"
            >
              {isMeBitPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
            </button>

            {isMobile ? (
              <button 
                className="mobile-back-btn" 
                onClick={() => setIsGalleryOpen(false)}
                aria-label="Back to main page"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" /> Back
              </button>
            ) : (
              <motion.button 
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                onClick={() => setIsGalleryOpen(false)}
                className="absolute top-6 right-6 sm:top-10 sm:right-10 z-[110] text-white hover:text-white hover:bg-red-600 transition-all bg-black/50 p-3 rounded-full border border-white/20 shadow-xl"
                aria-label="Close gallery"
              >
                <X className="w-8 h-8" aria-hidden="true" />
              </motion.button>
            )}

            <div className={`relative w-full h-full flex flex-col z-[105] overflow-hidden ${(isMobile || isTablet) ? 'pt-[calc(var(--safe-top)+60px)]' : 'gap-6'}`}>
              {/* Gallery Content */}
              <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${(isMobile || isTablet) ? '' : 'gap-6'}`}>
                
                {/* Main View Area */}
                <div className={`${(isMobile || isTablet) ? 'order-1' : 'flex-1'} glass-morphism rounded-3xl relative flex items-center justify-center overflow-hidden shadow-inner group`}>
                  {selectedImageIndex !== null ? (
                    <motion.div
                      key={selectedImageIndex}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className={`w-full h-full flex items-center justify-center cursor-zoom-in ${(isMobile || isTablet) ? 'p-0' : 'p-4 sm:p-8'}`}
                    >
                      <ResponsiveImage 
                        src={ME_BIT_IMAGES[selectedImageIndex] || ""}
                        alt="Selected Shot"
                        className={`${(isMobile || isTablet) ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'} shadow-[0_0_80px_rgba(255,255,255,0.08)] rounded-sm transition-transform duration-700 hover:scale-110`}
                        loading="lazy"
                      />
                      
                      {/* Navigation Controls on Main View */}
                      {!isMobile && !isTablet && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage();
                            }}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-10 h-10" aria-hidden="true" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage();
                            }}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-10 h-10" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="text-zinc-600 font-manga text-3xl animate-pulse tracking-widest">
                      SELECT A MOMENT
                    </div>
                  )}
                </div>

                {/* Thumbnails Interaction for Mobile */}
                {isMobile && (
                  <div className="order-2 w-full h-[100px] overflow-x-auto flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md">
                    {ME_BIT_IMAGES.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`
                          relative h-full aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all duration-300 shrink-0
                          ${selectedImageIndex === idx 
                            ? 'border-white scale-95' 
                            : 'border-transparent opacity-50'}
                        `}
                        aria-label={`View moment ${idx + 1}`}
                      >
                        <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Thumbnails Interaction for Tablet */}
                {isTablet && (
                  <div className="order-2 w-full h-[120px] overflow-x-auto flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-black/50">
                    {ME_BIT_IMAGES.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`
                          relative h-full aspect-square rounded-xl border-2 overflow-hidden shrink-0 transition-all
                          ${selectedImageIndex === idx ? 'border-white scale-95' : 'border-transparent opacity-50 hover:opacity-80'}
                        `}
                        aria-label={`View moment ${idx + 1}`}
                      >
                        <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Thumbnails Sidebar - Desktop only */}
                {!isMobile && !isTablet && (
                  <div className="w-full md:w-96 flex flex-col gap-6 glass-morphism p-6 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="flex flex-col">
                        <h3 className="font-manga text-white text-2xl tracking-tight leading-none uppercase">Shot Archive</h3>
                        <span className="font-hand text-zinc-400 text-sm mt-1 italic">Moments in time</span>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-zinc-100 font-mono text-xs">
                        {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} / {ME_BIT_IMAGES.length}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto grid grid-cols-5 md:grid-cols-2 gap-3 pr-2 custom-scrollbar pb-4 content-start">
                      {ME_BIT_IMAGES.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`
                            relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 transform
                            ${selectedImageIndex === idx 
                              ? 'border-white scale-95 shadow-[0_0_20px_white/20] ring-4 ring-white/10' 
                              : 'border-transparent hover:border-white/30 opacity-40 hover:opacity-100 hover:scale-[1.02]'}
                          `}
                          aria-label={`Select archive moment ${idx + 1}`}
                        >
                          <ResponsiveImage 
                            src={src} 
                            alt={`Moment ${idx + 1}`} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {selectedImageIndex === idx && (
                            <div className="absolute inset-0 bg-white/10 backdrop-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Info Footer - Desktop only */}
              {!isMobile && !isTablet && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-8 manga-border border-[var(--ink-color)] shadow-[12px_12px_0px_var(--manga-shadow-color)] flex flex-col md:flex-row justify-between items-center gap-6"
                  style={{ background: 'var(--paper-color)' }}
                >
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-[var(--ink-color)] text-[var(--text-inverse)] rounded-2xl shadow-lg -rotate-3 group-hover:rotate-0 transition-transform">
                      <Maximize2 className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-manga text-3xl font-black uppercase text-[var(--ink-color)] leading-none tracking-tight">Theater Mode</h4>
                      <p className="font-hand text-[var(--text-muted)] text-xl mt-1">Curated photography and sketches from Noordine's private collection.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--bg-glass)] rounded-full text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">
                      <span>Arrows to navigate</span>
                      <div className="w-1 h-1 bg-[var(--border-subtle)] rounded-full" />
                      <span>ESC to close</span>
                    </div>
                    <button 
                      onClick={() => setIsGalleryOpen(false)}
                      className="manga-button bg-[var(--ink-color)] text-[var(--text-inverse)] px-10 py-3 font-manga text-2xl hover:opacity-90 tracking-tighter"
                    >
                      LEAVE THEATER
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setIsLensGalleryOpen(true)}
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
            onClick={() => {
              setIsGalleryOpen(true);
              if (selectedImageIndex === null) setSelectedImageIndex(0);
            }}
            className="relative w-full border-[4px] border-[var(--ink-color)] bg-[var(--paper-color)] p-[10px] overflow-hidden group cursor-[zoom-in] shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[220px] sm:h-[260px] md:h-[280px] manga-panel"
          >
            <div className="me-bit-track flex gap-[10px]">
              {[...ME_BIT_IMAGES, ...ME_BIT_IMAGES].map((src, idx) => (
                <button 
                  type="button"
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx % ME_BIT_IMAGES.length);
                    setIsGalleryOpen(true);
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
            onClick={() => setIsLensGalleryOpen(true)}
            className="relative w-full border-[4px] border-[var(--ink-color)] bg-black overflow-hidden group cursor-pointer shadow-[10px_10px_0px_var(--manga-shadow-color)] hover:shadow-[14px_14px_0px_var(--manga-shadow-color)] transition-all h-[160px] sm:h-[200px]"
            role="button"
            aria-label="Open photography gallery"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') setIsLensGalleryOpen(true); }}
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
              onActiveSongChange={setActiveSong}
              onAmbientColorChange={setAmbientColor}
            />
          </Suspense>
          </SectionErrorBoundary>
          </motion.div>

          {/* Sarahni Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
          >
          <SectionErrorBoundary sectionName="Sarahni">
          <Suspense fallback={<SkeletonSection type="contact" />}>
            <Sarahni />
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
        onClose={() => setIsLensGalleryOpen(false)}
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
