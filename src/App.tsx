/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Instagram, 
  Facebook, 
  Music2, 
  Disc, 
  Cloud, 
  Video, 
  ExternalLink,
  Youtube,
  Mail,
  MessageCircle,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import React from 'react';
import { LoadingScreen } from "./components/LoadingScreen";
const MySongsPage = lazy(() => import('./components/MySongsPage').then(m => ({default: m.MySongs})));
const DrawingsPage = lazy(() => import('./components/DrawingsPage').then(m => ({default: m.DrawingsPage})));
import { GameShell } from './games/GameShell';
import { GameSelector } from './games/GameSelector';
import { TetrisGame } from './games/tetris/TetrisGame';
import { SnakeGame } from './games/snake/SnakeGame';
import { BreakoutGame } from './games/breakout/BreakoutGame';
import { RacingGame } from './games/racing/RacingGame';
import { TankGame } from './games/tank/TankGame';
import { FroggerGame } from './games/frogger/FroggerGame';
import { useDeviceType } from "./hooks/useDeviceType";
import { useParallax } from "./hooks/useParallax";
import { useFocusTrap } from "./hooks/useFocusTrap";
const Sarahni = lazy(() => import('./components/Sarahni').then(m => ({default: m.Sarahni})));
import { NowPlayingBar } from "./components/NowPlayingBar";
import { MobileNavBar } from "./components/MobileNavBar";
import { CustomCursor } from "./components/CustomCursor";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { isLowEndDevice, prefersReducedMotion } from "./utils/perf";
import { 
  ActiveSong, 
  ContactMethod, 
  StreamingPlatform, 
  SocialChannel 
} from "./types";
import { ScrollProgress } from "./components/ScrollProgress";
import { ResponsiveImage } from "./components/ResponsiveImage";

const CONFIG_ASSETS = {
  mainBackground: "/images/hero_bg.jpg",
  nameHeaderBg: "/images/header_bg.gif",
  footerDecoration: "/images/footer_deco.gif",
  spotifyIcon: "https://img.icons8.com/plasticine/1200/spotify--v2.jpg",
  profileImg: "/images/profile_img.jpg",
  vaultPlaylistCover: "/images/playlist_cover.jpg",
  youtubeHighlightsBg: "/images/yt_highlights.gif",
  gmailBg: "/images/gmail_bg.gif",
  whatsappBg: "/images/whatsapp_bg.gif",
  telegramBg: "/images/telegram_bg.gif"
};

const STREAMING_PLATFORMS: StreamingPlatform[] = [
  {
    name: "Spotify",
    url: "https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u",
    icon: Music2,
    color: "#1DB954",
    isSpotify: true,
  },
  {
    name: "Apple Music",
    url: "https://music.apple.com/us/artist/nl/1535833912",
    icon: Music2,
    color: "#FA243C",
  },
  {
    name: "Deezer",
    url: "https://www.deezer.com/en/artist/362375722",
    icon: Disc,
    color: "#FF0000",
  },
  {
    name: "Amazon Music",
    url: "https://music.amazon.fr/artists/B0025ODH90/nl",
    icon: Music2,
    color: "#00A8E1",
  },
  {
    name: "Anghami",
    url: "https://play.anghami.com/artist/1430009",
    icon: Music2,
    color: "#ED1B24",
  },
  {
    name: "SoundCloud",
    url: "https://on.soundcloud.com/Ok8zBgOjCPqjvStEA",
    icon: Cloud,
    color: "#FF3300",
  },
];

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/nordine_el_mobaraki/",
    icon: Instagram,
    color: "#E4405F",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@nourdine_el_mobaraki",
    icon: Video,
    color: "#000000",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61558584390374",
    icon: Facebook,
    color: "#1877F2",
  },
];

const CONTACT_METHODS: ContactMethod[] = [
  {
    name: "Gmail",
    value: "noureddinelmobaraki@gmail.com",
    url: "mailto:noureddinelmobaraki@gmail.com",
    icon: Mail,
    bg: "images/gmail_bg.gif",
    color: "#EA4335"
  },
  {
    name: "WhatsApp",
    value: "+212 612-806932",
    url: "https://wa.me/212612806932",
    icon: MessageCircle,
    bg: "images/whatsapp_bg.gif",
    color: "#25D366"
  },
  {
    name: "Telegram",
    value: "+212 612 806932",
    url: "https://t.me/212612806932",
    icon: Send,
    bg: "images/telegram_bg.gif",
    color: "#0088CC"
  }
];

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

const ME_BIT_IMAGES = [
  "/images/me_bit_1.jpg",
  "/images/me_bit_2.jpg",
  "/images/me_bit_3.jpg",
  "/images/me_bit_4.jpg",
  "/images/me_bit_5.jpg",
  "/images/me_bit_6.jpg",
  "/images/me_bit_7.jpg",
  "/images/me_bit_8.jpg",
  "/images/me_bit_9.jpg"
];

const STYLES = {
  SHADOW_WHITE: { textShadow: '2px 2px 0px rgba(255,255,255,0.8)' },
  SHADOW_BLACK_LG: { textShadow: '4px 4px 0px rgba(0,0,0,0.8)' },
  SHADOW_BLACK_SM: { textShadow: '2px 2px 0px rgba(0,0,0,0.5)' },
  SHADOW_BLACK_SOLID: { textShadow: '2px 2px 0 #000' },
  CIRCLE: { borderRadius: '50%' }
};

export default function App() {
  const { isMobile } = useDeviceType();
  const parallaxRef = useParallax(isMobile ? 0 : 20);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const galleryRef = useFocusTrap(isGalleryOpen);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioIntent, setAudioIntent] = useState<'initial' | 'user-paused' | 'user-playing'>('initial');
  const audioRef = useRef<HTMLAudioElement>(null);

  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState('home');

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

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'tetris':   return <TetrisGame />;
      case 'snake':    return <SnakeGame />;
      case 'breakout': return <BreakoutGame />;
      case 'racing':   return <RacingGame />;
      case 'tank':     return <TankGame />;
      case 'frogger':  return <FroggerGame />;
      default:         return null;
    }
  };

  const gameShellStyle: React.CSSProperties = isMobile && activeGame !== null ? {
    position: 'fixed',
    inset: 0,
    zIndex: 9500,
    borderRadius: 0,
    maxWidth: '100%',
    height: '100dvh', // Use dynamic viewport height for mobile
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#000',
  } : {};

  useEffect(() => {
    // Performance class
    if (isLowEndDevice() || prefersReducedMotion()) {
      document.body.classList.add('low-perf');
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = ['null', window.location.origin];
      if (!allowedOrigins.includes(event.origin)) return;

      // SEC-002: Strict postMessage protocol
      if (!event.data || typeof event.data !== 'object') return;
      if (!['GET_BEST_SCORE', 'SET_BEST_SCORE', 'READY'].includes(event.data.type)) return;
      
      const { type, data } = event.data;
      
      if (type === 'GET_BEST_SCORE') {
        const bestScore = localStorage.getItem('lumenfall_best') || '0';
        // When sandbox="allow-scripts" is used without allow-same-origin, 
        // the iframe origin is "null".
        (event.source as WindowProxy)?.postMessage({ 
          type: 'BEST_SCORE_DATA', 
          data: { score: parseInt(bestScore, 10) } 
        }, { targetOrigin: '*' });
      } else if (type === 'SET_BEST_SCORE') {
        const newScore = parseInt(data.score, 10);
        if (isNaN(newScore)) return;
        
        const currentBest = parseInt(localStorage.getItem('lumenfall_best') || '0', 10);
        if (newScore > currentBest) {
          localStorage.setItem('lumenfall_best', newScore.toString());
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioIntent === 'user-paused') return;

    // Consolidated Play Logic (Autoplay + Loaded Transition)
    // Runs when intent is 'initial' (autoplay) or 'user-playing' (manual)
    const canTryPlay = audioIntent === 'user-playing' || (audioIntent === 'initial' && loaded);
    if (!canTryPlay) {
      if (audioIntent !== 'initial') return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    // Complex Autoplay Strategy
    audio.muted = true;
    audio.play().then(() => {
      const timeoutId = setTimeout(() => {
        // Only proceed if the effect hasn't been cleaned up (signal aborted)
        if (!signal.aborted) {
          audio.muted = false;
          setIsPlaying(true);
        }
      }, 300);
      signal.addEventListener('abort', () => clearTimeout(timeoutId));
    }).catch(() => {
      const handlers = ['scroll', 'click', 'keydown', 'touchstart', 'mousemove', 'wheel'];
      const once = () => {
        if (!signal.aborted) {
          audio.play().then(() => {
            setIsPlaying(true);
            handlers.forEach(e => document.removeEventListener(e, once));
          }).catch(() => {});
        }
      };
      handlers.forEach(e => document.addEventListener(e, once, { passive: true, signal }));
    });

    return () => abortController.abort();
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
      audioRef.current.pause();
      setIsPlaying(false);
      setAudioIntent('user-paused');
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setAudioIntent('user-playing');
      }).catch(() => {});
    }
  };

  const handleSongPlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setAudioIntent('user-paused');
    }
  }, []);


  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <CustomCursor />
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
      <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 500ms ease-in' }}>
        <div 
          className="min-h-screen w-full relative flex flex-col items-center py-10 px-6 sm:px-10 overflow-x-hidden"
        >
      {/* Retro Overlays */}
      <div className="noise-overlay" />
      <div className="scanline" />

      {/* Global Background Image Layer with Parallax */}
      <div 
        ref={parallaxRef}
        className="fixed inset-[-5%] z-[-2] bg-cover bg-center bg-fixed"
        style={{ 
          backgroundImage: `url('${CONFIG_ASSETS.mainBackground}')`,
          filter: 'blur(4px) brightness(0.7)',
        }}
      />
      
      {/* Backdrop Tint Layer */}
      <div className="fixed inset-0 z-[-1] bg-[#121212]/40" />

      {/* Grid Pattern Layer (Editorial Aesthetic) */}
      <div 
        className="fixed inset-0 opacity-15 z-0 pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Background Audio */}
      <audio 
        id="bg-audio" 
        ref={audioRef}
        loop 
        preload="auto"
      >
        <source src="music.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Floating Audio Control Button - Small & Elegant */}
      <button
        onClick={toggleAudio}
        className="fixed bottom-4 right-4 z-[120] bg-black/30 backdrop-blur-lg border border-white/10 p-2.5 rounded-full text-white/80 hover:text-white hover:bg-black/50 transition-all hover:scale-105 active:scale-90 shadow-xl group border-dashed"
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

            <div className={`relative w-full h-full flex flex-col z-[105] overflow-hidden ${isMobile ? 'pt-[calc(var(--safe-top)+60px)]' : 'gap-6'}`}>
              {/* Gallery Content */}
              <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isMobile ? '' : 'gap-6'}`}>
                
                {/* Main View Area */}
                <div className={`${isMobile ? 'order-1' : 'flex-1'} glass-morphism rounded-3xl relative flex items-center justify-center overflow-hidden shadow-inner group`}>
                  {selectedImageIndex !== null ? (
                    <motion.div
                      key={selectedImageIndex}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className={`w-full h-full flex items-center justify-center cursor-zoom-in ${isMobile ? 'p-0' : 'p-4 sm:p-8'}`}
                    >
                      <ResponsiveImage 
                        src={ME_BIT_IMAGES[selectedImageIndex] || ""}
                        alt="Selected Shot"
                        className={`${isMobile ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'} shadow-[0_0_80px_rgba(255,255,255,0.08)] rounded-sm transition-transform duration-700 hover:scale-110`}
                        loading="lazy"
                      />
                      
                      {/* Navigation Controls on Main View */}
                      {!isMobile && (
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

                {/* Thumbnails Sidebar - Desktop only */}
                {!isMobile && (
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
              {!isMobile && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-white p-8 manga-border border-black shadow-[12px_12px_0px_#fff] flex flex-col md:flex-row justify-between items-center gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-black text-white rounded-2xl shadow-lg -rotate-3 group-hover:rotate-0 transition-transform">
                      <Maximize2 className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-manga text-3xl font-black uppercase text-black leading-none tracking-tight">Theater Mode</h4>
                      <p className="font-hand text-zinc-500 text-xl mt-1">Curated photography and sketches from Noordine's private collection.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-zinc-400 font-mono text-xs uppercase tracking-widest">
                      <span>Arrows to navigate</span>
                      <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                      <span>ESC to close</span>
                    </div>
                    <button 
                      onClick={() => setIsGalleryOpen(false)}
                      className="manga-button bg-black text-white px-10 py-3 font-manga text-2xl hover:bg-zinc-800 tracking-tighter"
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
        style={{ paddingBottom: isMobile ? '80px' : undefined }}
      >
        {/* Navigation Tabs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center sm:justify-start gap-4 mb-4"
        >
          <button 
            onClick={() => scrollToSection('me-bit-gallery')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            ME BIT
          </button>
          <button 
            onClick={() => scrollToSection('my-songs-section')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            MY SONGS
          </button>
          <button 
            onClick={() => scrollToSection('drawings-section')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[8px_8px_0px_rgba(255,255,255,0.2)] hover:shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            MY DRAWINGS
          </button>
        </motion.div>

        <div className="flex flex-col gap-14">
            {/* Top Contact Section */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full"
            >
            {CONTACT_METHODS.map((method) => (
              <a
                key={method.name}
                href={method.url}
                target="_blank"
                rel="noreferrer"
                className="manga-border group relative flex flex-col items-center justify-center p-6 border-[4px] border-black overflow-hidden bg-white transition-all duration-300 hover:scale-[1.05] hover:-rotate-1 active:scale-95 shadow-[8px_8px_0px_#000]"
              >
                {/* GIF Background */}
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500 group-hover:scale-110 opacity-30 blur-[2px] group-hover:blur-0"
                  style={{ backgroundImage: `url('${method.bg}')` }}
                />
                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div 
                    className="p-3 bg-black text-white manga-border border-white/20 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] group-hover:bg-white group-hover:text-black transition-colors"
                    style={STYLES.CIRCLE}
                  >
                    <method.icon className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <span className="font-manga text-2xl font-black text-black uppercase tracking-tighter" style={STYLES.SHADOW_WHITE}>
                    {method.name}
                  </span>
                  <span className="text-xs font-bold text-black/70 bg-white/80 px-2 py-0.5 manga-border border-black truncate max-w-full">
                    {method.value}
                  </span>
                </div>
              </a>
            ))}
          </motion.div>
          
          {/* Editorial Header Section */}
          <motion.header 
            variants={itemVariants}
            className="flex flex-col md:flex-row items-end justify-between gap-6 w-full"
          >
            <div 
              lang="en"
              className="manga-border p-8 flex-1 min-w-[60%] relative group overflow-hidden border-[4px] border-black transition-all duration-500 hover:scale-[1.01]"
              id="header-card"
            >
              {/* Header Background Image with Zoom & Pan Hover Effect */}
              <div 
                className="absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%]"
                style={{ backgroundImage: `url('${CONFIG_ASSETS.nameHeaderBg}')` }}
              />
              {/* Dark Overlay for Text Legibility */}
              <div className="absolute inset-0 z-[-1] bg-black/40 transition-opacity group-hover:opacity-30" />
              
              <h1 
                className="font-manga text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-none"
                style={STYLES.SHADOW_BLACK_LG}
              >
                Noureddin El Mobaraki
              </h1>
              
              <div className="mt-6 flex items-center gap-4 text-white font-bold uppercase italic border-t-2 border-white/50 pt-4">
                <span className="text-xl font-manga" style={STYLES.SHADOW_BLACK_SM}>Casablanca 📍</span>
                <span className="text-sm bg-black text-white px-3 py-1 manga-border border-white/30 truncate">
                  "NL" | "Nordine GB"
                </span>
              </div>
              <p 
                lang="en"
                className="mt-4 font-hand text-2xl text-white leading-tight max-w-xl"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.1)',
                  filter: 'drop-shadow(2px 2px 2px #000)'
                }}
              >
                <span className="text-yellow-400">“24 years old.</span> Just a simple <span className="text-zinc-400">5/10</span> kind of person. I’m into <span className="border-b-2 border-dashed border-red-500">drawing</span>, cooking for fun, and overthinking <span className="text-cyan-300">random stuff</span> that probably helps nobody. That’s pretty much it.”
              </p>
            </div>

            {/* Profile Image Square Box */}
            <div 
              className="manga-card bg-white p-0 flex flex-col items-center justify-center w-48 aspect-square hidden md:flex rotate-2 hover:rotate-0 transition-transform overflow-hidden border-[3px] border-black"
            >
              <img 
                src={CONFIG_ASSETS.profileImg} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>

          </motion.header>

          {/* Highlights Section - Spotify Vault & YouTube */}
          <motion.section 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* The Vault - Playlist Section */}
            <div className="flex flex-col gap-4">
              <h3 lang="en" className="font-manga text-xl font-bold bg-white text-black inline-block px-4 py-1 manga-border w-fit -rotate-2 shadow-[3px_3px_0px_#000]">
                ■ THE VAULT
              </h3>
              <a 
                href="https://open.spotify.com/playlist/2NdDhxkVxypu1MkuVRCgId?si=R2iXNEuyQxOHwRwPPs_t7w"
                target="_blank"
                rel="noreferrer"
                id="vault-playlist"
                className="group relative overflow-hidden border-[3px] border-black transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
                style={{ borderRadius: '12px 5px 18px 8px / 8px 18px 5px 12px' }}
              >
                <ResponsiveImage 
                  src={CONFIG_ASSETS.vaultPlaylistCover} 
                  alt="NL fv songs of all time" 
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                  <span className="font-hand text-3xl text-white">NL fv songs of all time</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Music2 className="w-5 h-5 text-[#1DB954]" />
                    <span className="text-sm text-zinc-300 uppercase font-manga tracking-widest">Listen on Spotify</span>
                  </div>
                </div>
              </a>
            </div>

            {/* YouTube Highlights Section */}
            <div className="flex flex-col gap-4">
              <h3 lang="en" className="font-manga text-xl font-bold bg-black text-white inline-block px-4 py-1 manga-border w-fit rotate-1 shadow-[3px_3px_0px_#fff] border-white">
                ■ HIGHLIGHTS
              </h3>
              <a 
                href="https://www.youtube.com/@nourdin_el_mobaraki"
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden border-[3px] border-black transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
                style={{ borderRadius: '5px 15px 8px 20px / 15px 8px 20px 5px' }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                  style={{ backgroundImage: `url('${CONFIG_ASSETS.youtubeHighlightsBg}')` }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Youtube className="w-16 h-16 text-white drop-shadow-[0_0_15px_red] mb-2" />
                  <span className="font-manga text-3xl text-white uppercase tracking-tighter" style={STYLES.SHADOW_BLACK_SOLID}>
                    Watch on YouTube
                  </span>
                </div>
              </a>
            </div>
          </motion.section>

          <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Streaming Platforms Section */}
            <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
              <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit -rotate-1 shadow-[4px_4px_0px_#000]">
                ■ STREAMING PLATFORMS
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {STREAMING_PLATFORMS.map((platform, idx) => (
                  <div
                    key={platform.name}
                    id={`stream-${idx}`}
                  >
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`manga-button flex items-center gap-3 group ${platform.isSpotify ? 'spotify-king' : ''}`}
                    >
                      {platform.isSpotify ? (
                        <img src={CONFIG_ASSETS.spotifyIcon} alt="Spotify" className="w-8 h-8 shrink-0 object-contain drop-shadow-[0_0_8px_#1DB954]" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <platform.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                      )}
                      <span className="text-base sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis">{platform.name}</span>
                    </a>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Social Channels Section */}
            <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
              <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit rotate-1 shadow-[4px_4px_0px_#000]">
                ■ SOCIAL CHANNELS
              </h2>
            
            <div className="flex flex-col gap-5">
              {SOCIAL_CHANNELS.map((channel, idx) => (
                <a
                  key={channel.name}
                  id={`social-${idx}`}
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="manga-button flex justify-between items-center group overflow-hidden"
                  style={{ 
                    transform: `rotate(${idx % 2 === 0 ? '-0.5deg' : '0.5deg'})`,
                    borderRadius: '8px 15px 5px 22px / 22px 5px 15px 8px'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <channel.icon className="w-6 h-6" aria-hidden="true" />
                    <span className="text-xl">{channel.name}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                </a>
              ))}
            </div>
          </motion.section>
        </main>

        {/* ME bit Interactive Gallery - Moved out of grid to be more prominent */}
        <motion.section 
          variants={itemVariants}
          className="flex flex-col gap-4 mt-8"
          id="me-bit-gallery"
        >
          <div className="flex justify-between items-end">
            <h2 className="font-manga text-3xl font-bold text-white text-left tracking-wider">
              ME bit
            </h2>
            <span className="font-hand text-zinc-400 text-sm italic mb-1">Click to enter theater mode</span>
          </div>
          
          <div 
            onClick={() => {
              setIsGalleryOpen(true);
              if (selectedImageIndex === null) setSelectedImageIndex(0);
            }}
            className="relative w-full border-[4px] border-black bg-white p-[10px] overflow-hidden group cursor-[zoom-in] shadow-[10px_10px_0px_rgba(0,0,0,0.8)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] transition-all h-[280px]"
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
                  className="inline-block h-[250px] w-auto aspect-[3/4] shrink-0 border-[2px] border-black overflow-hidden relative group/item"
                  aria-label={`Open photo ${idx + 1}`}
                >
                  <ResponsiveImage 
                    src={src}
                    alt={`Me bit ${idx}`}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors" />
                </button>
              ))}
            </div>
            
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="bg-white text-black p-4 manga-border border-black flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform shadow-[5px_5px_0_black]">
                <Maximize2 className="w-6 h-6" aria-hidden="true" />
                <span className="font-manga text-xl font-bold">OPEN GALLERY</span>
              </div>
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
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>...</div>}>
            <MySongsPage 
              onSongPlay={handleSongPlay} 
              onActiveSongChange={setActiveSong}
            />
          </Suspense>
          </motion.div>

          {/* Sarahni Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
          <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>...</div>}>
            <Sarahni />
          </Suspense>
          </motion.div>

          {/* My Drawings Section */}
          <motion.div
            id="drawings-section"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>...</div>}>
            <DrawingsPage onSongPlay={handleSongPlay} />
          </Suspense>
          </motion.div>

        {/* THE GAME BOX Section */}
        <motion.section 
          variants={itemVariants}
          className="mt-10 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4 relative">
            <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit -rotate-1 shadow-[4px_4px_0px_#000]">
              ■ THE GAME BOX
            </h2>
            
            <div 
              className="relative border-[5px] border-black shadow-[12px_12px_0px_#000] rounded-none overflow-hidden group min-h-[440px] flex items-center justify-center"
              style={{
                backgroundImage: `url('${import.meta.env.BASE_URL}images/game Background.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
              
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                {activeGame === null ? (
                  <GameSelector onSelect={(id) => {
                    if (isPlaying && audioRef.current) {
                      audioRef.current.pause();
                      setIsPlaying(false);
                    }
                    setActiveGame(id);
                  }} />
                ) : (
                  <GameShell
                    title={activeGame.toUpperCase()}
                    onClose={() => {
                      setActiveGame(null);
                      if (audioIntent !== 'user-paused' && audioRef.current) {
                        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                      }
                    }}
                    style={gameShellStyle}
                  >
                    {renderActiveGame()}
                  </GameShell>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Editorial Footer */}
        <motion.footer 
          variants={itemVariants}
          className="mt-10 flex flex-col items-center gap-8 border-t-4 border-black pt-10 pb-20"
        >
          {/* Footer Decoration Image with Float Animation */}
          <ResponsiveImage 
            src={CONFIG_ASSETS.footerDecoration}
            alt="Footer Decoration"
            className="w-full max-w-[600px] border-[3px] border-black shadow-[10px_10px_0px_#000] rounded-xl hover:scale-[1.02] transition-transform animate-float"
            loading="lazy"
          />

          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
            <div className="flex gap-4">
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
            </div>
            <p className="font-manga text-2xl text-black bg-white px-6 py-1 manga-border -rotate-1 shadow-[4px_4px_0px_#000] italic">
              NL // NOURDINE GB © 2026
            </p>
          </div>
        </motion.footer>
      </motion.div>
        </div>
      </div>
      <NowPlayingBar 
        activeSong={activeSong}
        onClose={() => {
          if (activeSong?.audioRef.current) {
            activeSong.audioRef.current.pause();
          }
          setActiveSong(null);
        }}
      />
      {isMobile && <MobileNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
    </>
  );
}
