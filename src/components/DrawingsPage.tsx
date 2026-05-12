import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import { useDeviceType } from '../hooks/useDeviceType';

interface VideoData {
  id: string;
  src: string;
  poster: string;
  hls: string;
  duration: number;
}

const VideoCard = memo(({ 
  video, 
  index, 
  activeIndex, 
  isMobile, 
  isMuted,
  total,
  onRef 
}: { 
  video: VideoData;
  index: number; 
  activeIndex: number; 
  isMobile: boolean; 
  isMuted: boolean;
  total: number;
  onRef: (el: HTMLVideoElement | null, idx: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isActive = index === activeIndex;
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    
    const videoEl = videoRef.current;
    const source = video.hls || video.src;

    if (Hls.isSupported() && source.includes('.m3u8')) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true
      });
      hls.loadSource(source);
      hls.attachMedia(videoEl);
      hlsRef.current = hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = source;
    } else {
      videoEl.src = video.src; // Fallback to mp4
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [shouldLoad, video.src, video.hls]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div 
      ref={containerRef}
      className={`${isActive ? (isMobile ? 'relative w-full' : 'relative') : 'absolute top-0'} left-0 w-full flex items-center justify-center transition-all duration-500 ease-out pointer-events-none`}
      style={{
        transform: isMobile ? `translateX(${(index - activeIndex) * 100}%)` : `translateX(${(index - activeIndex) * 102}%)`,
        zIndex: isActive ? 10 : 5,
        opacity: isMobile ? (isActive ? 1 : 0) : (Math.abs(index - activeIndex) > 1 ? 0.05 : activeIndex === index ? 1 : 0.4)
      }}
    >
      <div 
        className="relative shadow-2xl transition-all duration-500 bg-black flex-shrink-0"
        style={{
          width: isMobile ? '100vw' : 'min(340px, 85vw)',
          height: isMobile ? 'calc(100dvh - var(--safe-top) - var(--safe-bottom))' : 'auto',
          aspectRatio: isMobile ? 'auto' : '9 / 16',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: isMobile ? '0' : '16px',
          background: '#000',
          transform: isActive ? 'scale(1)' : 'scale(0.85)',
          pointerEvents: 'auto'
        }}
      >
        <video
          ref={(el) => {
            videoRef.current = el;
            onRef(el, index);
          }}
          poster={video.poster.startsWith('/images/posters/') ? '/images/me_bit_1.jpg' : video.poster}
          aria-label={`Drawing work ${index + 1} of ${total}`}
          playsInline
          loop
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
});

const CrossfadeImage = () => {
  const [active, setActive] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => prev === 0 ? 1 : 0);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const images = [
    '/images/DRAW.jpeg',
    '/images/DRAW2.jpeg',
  ];
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Drawing preview ${i + 1}`}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px',
            opacity: active === i ? 1 : 0,
            transition: 'opacity 1000ms ease-in-out',
          }}
        />
      ))}
    </div>
  );
};

const VideoPreview = memo(({ index }: { index: number }) => {
  return (
    <div className="w-full aspect-[9/16] bg-zinc-900 cursor-pointer relative group overflow-hidden rounded-[8px]">
      <CrossfadeImage />
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none'
        }}
      />
      <div className="absolute bottom-2 left-3">
        <span className="text-white text-[10px] font-mono font-bold tracking-widest opacity-80">
          {(index + 1).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
});

export const DrawingsPage = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const { isMobile } = useDeviceType();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    const fetchUrl = (base.endsWith('/') ? base : base + '/') + 'data/videos.json';
    
    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        const resolvedData = data.map((v: any) => ({
          ...v,
          poster: v.poster.startsWith('/') 
            ? (base.endsWith('/') ? base : base + '/') + v.poster.slice(1) 
            : v.poster
        }));
        setVideos(resolvedData);
        videoRefs.current = new Array(resolvedData.length).fill(null);
      })
      .catch(console.error);
  }, []);

  const playVideo = useCallback((index: number) => {
    const v = videoRefs.current[index];
    if (!v) return;
    
    v.play().catch(err => {
      if (err.name !== 'AbortError') console.error('Playback failed', err);
    });
  }, []);

  useEffect(() => {
    if (isOpen && videos.length > 0) {
      playVideo(activeIndex);
      onSongPlay();
      // Pause others
      videoRefs.current.forEach((v, i) => {
        if (i !== activeIndex && v) v.pause();
      });
    }
  }, [activeIndex, isOpen, playVideo, onSongPlay, videos.length]);

  const toggleMute = useCallback(() => setIsMuted(p => !p), []);

  const nextVideo = useCallback(() => setActiveIndex(p => Math.min(p + 1, videos.length - 1)), [videos.length]);
  const prevVideo = useCallback(() => setActiveIndex(p => Math.max(p - 1, 0)), []);

  const [showArrows, setShowArrows] = useState(true);
  const arrowTimeoutRef = useRef<any>(null);

  const resetArrowTimer = useCallback(() => {
    if (arrowTimeoutRef.current) clearTimeout(arrowTimeoutRef.current);
    setShowArrows(true);
    arrowTimeoutRef.current = window.setTimeout(() => {
      setShowArrows(false);
    }, 3000);
  }, []);

  if (videos.length === 0) return null;

  return (
    <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              MY DRAWINGS
            </h1>
          </div>
          <div className="h-px flex-1 bg-zinc-800 hidden sm:block mx-12 mb-4" />
          <div className="text-right">
            <span className="text-red-500 font-mono text-xl">{videos.length}</span>
            <span className="text-zinc-600 text-xs uppercase tracking-widest ml-2">Works total</span>
          </div>
        </header>

        {!isOpen && (
          <div className="space-y-8 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
              {videos.slice(0, 6).map((video, i) => (
                <div key={video.id} className="bg-[#1a1a1a] rounded-[8px] overflow-hidden" onClick={() => { setActiveIndex(i); setIsOpen(true); }}>
                  <VideoPreview index={i} />
                </div>
              ))}
            </div>
            <button onClick={() => setIsOpen(true)} className="manga-button !py-4 !px-8 text-xl bg-white text-black shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] transition-all">
              VIEW ALL {videos.length} →
            </button>
          </div>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: isMobile ? '100dvh' : 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`relative w-full ${isMobile ? 'mobile-fullscreen' : 'mt-5'}`}
              style={isMobile ? { zIndex: 9010, background: '#000' } : {}}
            >
              <div 
                className={`relative w-full ${isMobile ? '' : 'bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden'}`}
                style={{ height: isMobile ? '100%' : 'auto', padding: isMobile ? '0' : '20px 0' }}
                onTouchStart={() => { if (isMobile) resetArrowTimer(); }}
                onClick={() => { if (isMobile) resetArrowTimer(); }}
              >
                <div className="flex justify-between items-center p-4 absolute top-0 w-full z-50">
                   <button className="text-white bg-black/50 p-2 rounded-full" onClick={() => setIsOpen(false)} aria-label="Close drawings"><X size={24} /></button>
                   <button className="text-white bg-black/50 p-2 rounded-full" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                     {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                   </button>
                </div>

                <div className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden">
                  {videos.map((video, idx) => (
                    <VideoCard 
                      key={video.id} 
                      video={video} 
                      index={idx} 
                      activeIndex={activeIndex} 
                      isMobile={isMobile}
                      isMuted={isMuted}
                      total={videos.length}
                      onRef={(el, i) => videoRefs.current[i] = el}
                    />
                  ))}

                  <button 
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/20 hover:bg-black/50 p-4 rounded-full disabled:opacity-0 transition-opacity ${!showArrows && isMobile ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                    onClick={prevVideo} 
                    disabled={activeIndex === 0} 
                    aria-label="Previous work"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button 
                    className={`absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/20 hover:bg-black/50 p-4 rounded-full disabled:opacity-0 transition-opacity ${!showArrows && isMobile ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                    onClick={nextVideo} 
                    disabled={activeIndex === videos.length - 1} 
                    aria-label="Next work"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>

                <div className="p-6 text-center">
                   <span className="text-zinc-500 font-mono tracking-widest">{activeIndex + 1} / {videos.length}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
