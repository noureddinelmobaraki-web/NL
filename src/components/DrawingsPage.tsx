import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import { useDeviceType } from '../hooks/useDeviceType';
import { ASSETS } from '../constants/assets';
import { audioManager } from '../audio/audioManager';

interface VideoData {
  id: string;
  src: string;
  poster: string;
  hls: string;
  duration: number;
}

// ─── CrossfadeImage: alternates DRAW.webp ↔ DRAW2.webp as thumbnail poster ───
const CrossfadeImage = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActive(p => p === 0 ? 1 : 0), 2000);
    return () => clearInterval(interval);
  }, []);
  const images = [ASSETS.gallery.draw1, ASSETS.gallery.draw2];
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
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', borderRadius: '8px',
            opacity: active === i ? 1 : 0,
            transition: 'opacity 1000ms ease-in-out',
          }}
        />
      ))}
    </div>
  );
};

// ─── VideoPreview: closed-state thumbnail card ────────────────────────────────
const VideoPreview = memo(({ index }: { index: number }) => (
  <div className="w-full aspect-[9/16] bg-[var(--bg-glass)] cursor-pointer relative group overflow-hidden rounded-[8px]">
    <CrossfadeImage />
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7) 100%)',
      pointerEvents: 'none'
    }} />
    <div className="absolute bottom-2 left-3">
      <span className="text-white text-[10px] font-mono font-bold tracking-widest opacity-80">
        {(index + 1).toString().padStart(2, '0')}
      </span>
    </div>
  </div>
));

// ─── VideoCard: the actual video player inside the carousel ──────────────────
// isMobileView = true means fullscreen mobile/tablet mode
const VideoCard = memo(({
  video, index, activeIndex, isMobileView, isMuted, total, onRef
}: {
  video: VideoData;
  index: number;
  activeIndex: number;
  isMobileView: boolean;
  isMuted: boolean;
  total: number;
  onRef: (el: HTMLVideoElement | null, idx: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isActive = index === activeIndex;
  const [shouldLoad, setShouldLoad] = useState(false);

  // Lazy load: only initialize HLS when card is near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) { setShouldLoad(true); observer.disconnect(); } },
      { rootMargin: '400px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const videoEl = videoRef.current;
    const source = video.hls || video.src;
    if (Hls.isSupported() && source.includes('.m3u8')) {
      const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hls.loadSource(source);
      hls.attachMedia(videoEl);
      hlsRef.current = hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = source;
    } else {
      videoEl.src = video.src;
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [shouldLoad, video.src, video.hls]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // ── MOBILE/TABLET FULLSCREEN LAYOUT ──────────────────────────────────────
  // Each card is absolutely positioned and translated horizontally.
  // The container is 100vw × 100dvh, video uses object-contain (NO CROPPING).
  if (isMobileView) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center bg-black"
        style={{
          width: '100vw',
          height: '100dvh',
          transform: `translateX(${(index - activeIndex) * 100}%)`,
          transition: 'transform 300ms ease-out',
          willChange: 'transform',
        }}
      >
        <video
          ref={el => { videoRef.current = el; onRef(el, index); }}
          poster={video.poster.startsWith('/images/posters/') ? ASSETS.profile.me_bits[0] : video.poster}
          aria-label={`Drawing work ${index + 1} of ${total}`}
          playsInline
          loop
          muted={isMuted}
          // object-contain = full 9:16 video visible, black bars if screen ratio differs
          // This is the fix: NO CROPPING of the vertical video
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: 'black',
          }}
        />
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  // Peek-a-boo carousel: active at center scale(1), neighbors visible at scale(0.85)
  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateX(${(index - activeIndex) * 102}%)`,
        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isActive ? 10 : 5,
        opacity: Math.abs(index - activeIndex) > 1 ? 0.05 : isActive ? 1 : 0.4,
      }}
    >
      <div
        style={{
          // Desktop: fixed width, 9:16 aspect ratio card
          width: 'min(320px, 80vw)',
          aspectRatio: '9 / 16',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--bg-elevated)',
          transform: isActive ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 400ms ease',
          boxShadow: isActive ? '0 32px 80px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        <video
          ref={el => { videoRef.current = el; onRef(el, index); }}
          poster={video.poster.startsWith('/images/posters/') ? ASSETS.profile.me_bits[0] : video.poster}
          aria-label={`Drawing work ${index + 1} of ${total}`}
          playsInline
          loop
          muted={isMuted}
          // Desktop: object-cover is fine because container is exactly 9:16
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
});

// ─── Main DrawingsPage component ──────────────────────────────────────────────
export const DrawingsPage = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const { isMobile, isTablet } = useDeviceType();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Touch swipe tracking (mobile/tablet only)
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  // true when we should use fullscreen mobile layout
  const isMobileView = isMobile || isTablet;

  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    const fetchUrl = (base.endsWith('/') ? base : base + '/') + 'data/videos.json';
    fetch(fetchUrl)
      .then(r => r.json())
      .then(data => {
        const resolved = data.map((v: any) => ({
          ...v,
          poster: v.poster.startsWith('/')
            ? (base.endsWith('/') ? base : base + '/') + v.poster.slice(1)
            : v.poster
        }));
        setVideos(resolved);
        videoRefs.current = new Array(resolved.length).fill(null);
      })
      .catch(console.error);
  }, []);

  const playVideo = useCallback((index: number) => {
    const v = videoRefs.current[index];
    if (!v) return;
    if (!isMuted) {
      audioManager.register('video', v, 1.0);
      audioManager.play('video');
    } else {
      audioManager.pause('video');
      v.play().catch(() => {});
    }
  }, [isMuted]);

  useEffect(() => {
    if (!isOpen || videos.length === 0) return;
    playVideo(activeIndex);
    onSongPlay();
    videoRefs.current.forEach((v, i) => { if (i !== activeIndex && v) v.pause(); });
  }, [activeIndex, isOpen, playVideo, onSongPlay, videos.length]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    const v = videoRefs.current[activeIndex];
    if (v) {
      if (!next) { audioManager.register('video', v, 1.0); audioManager.play('video'); }
      else { audioManager.pause('video'); }
    }
  }, [isMuted, activeIndex]);

  const nextVideo = useCallback(() =>
    setActiveIndex(p => Math.min(p + 1, videos.length - 1)), [videos.length]);
  const prevVideo = useCallback(() =>
    setActiveIndex(p => Math.max(p - 1, 0)), []);

  const openGallery = useCallback((index = 0) => {
    setActiveIndex(index);
    setIsOpen(true);
  }, []);

  if (videos.length === 0) return null;

  return (
    <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase leading-none text-[var(--text-primary)]">
              MY DRAWINGS
            </h1>
          </div>
          <div className="h-px flex-1 bg-[var(--border-subtle)] hidden sm:block mx-12 mb-4" />
          <div className="text-right">
            <span className="text-[var(--accent-red)] font-mono text-xl">{videos.length}</span>
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-widest ml-2">Works total</span>
          </div>
        </header>

        {/* Closed state: 6-card grid + "View All" button */}
        {!isOpen && (
          <div className="space-y-8 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
              {videos.slice(0, 6).map((video, i) => (
                <div
                  key={video.id}
                  className="bg-[var(--bg-elevated)] rounded-[8px] overflow-hidden cursor-pointer"
                  onClick={() => openGallery(i)}
                >
                  <VideoPreview index={i} />
                </div>
              ))}
            </div>
            <button
              onClick={() => openGallery(0)}
              className="manga-button !py-4 !px-8 text-xl bg-[var(--paper-color)] text-[var(--text-primary)] shadow-[8px_8px_0px_var(--manga-shadow-color)] hover:shadow-[12px_12px_0px_var(--manga-shadow-color)] transition-all"
            >
              VIEW ALL {videos.length} →
            </button>
          </div>
        )}

        {/* ── DESKTOP open state: inline glass carousel ──────────────────────── */}
        {isOpen && !isMobileView && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative w-full mt-5"
            >
              <div
                className="relative w-full bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
                style={{ padding: '20px 0' }}
              >
                {/* Top bar */}
                <div className="flex justify-between items-center px-4 py-3">
                  <button
                    className="text-[var(--text-inverse)] bg-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/70 p-2.5 rounded-full backdrop-blur-md"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close drawings"
                  >
                    <X size={24} />
                  </button>
                  <button
                    className="text-[var(--text-inverse)] bg-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/70 p-2.5 rounded-full backdrop-blur-md"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                </div>

                {/* Carousel area — 70vh, clips overflow so neighbor cards peek in */}
                <div className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden">
                  {videos.map((video, idx) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      index={idx}
                      activeIndex={activeIndex}
                      isMobileView={false}
                      isMuted={isMuted}
                      total={videos.length}
                      onRef={(el, i) => videoRefs.current[i] = el}
                    />
                  ))}

                  {/* Desktop arrows */}
                  <button
                    className="absolute left-6 top-1/2 -translate-y-1/2 z-[100] text-white bg-white/20 hover:bg-white/40 p-4 rounded-full disabled:opacity-0 transition-all backdrop-blur-md"
                    onClick={prevVideo}
                    disabled={activeIndex === 0}
                    aria-label="Previous work"
                  >
                    <ChevronLeft size={36} />
                  </button>
                  <button
                    className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] text-white bg-white/20 hover:bg-white/40 p-4 rounded-full disabled:opacity-0 transition-all backdrop-blur-md"
                    onClick={nextVideo}
                    disabled={activeIndex === videos.length - 1}
                    aria-label="Next work"
                  >
                    <ChevronRight size={36} />
                  </button>
                </div>

                {/* Counter */}
                <div className="p-6 text-center">
                  <span className="text-[var(--text-muted)] font-mono tracking-widest">
                    {activeIndex + 1} / {videos.length}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── MOBILE/TABLET open state: true fullscreen ─────────────────────────── */}
      {/* Rendered outside the max-w container so it can truly cover the screen */}
      {isOpen && isMobileView && (
        <div
          className="fixed inset-0 bg-black overflow-hidden"
          style={{ zIndex: 9010 }}
          onTouchStart={e => {
            swipeStartX.current = e.touches[0].clientX;
            swipeStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={e => {
            const dx = swipeStartX.current - e.changedTouches[0].clientX;
            const dy = swipeStartY.current - e.changedTouches[0].clientY;
            // Only trigger horizontal swipe if X movement > Y movement and > 50px
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
              if (dx > 0 && activeIndex < videos.length - 1) nextVideo();
              else if (dx < 0 && activeIndex > 0) prevVideo();
            }
          }}
        >
          {/* Video cards — each is a full 100vw × 100dvh layer */}
          <div className="relative w-full h-full" style={{ touchAction: 'pan-y' }}>
            {videos.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                index={idx}
                activeIndex={activeIndex}
                isMobileView={true}
                isMuted={isMuted}
                total={videos.length}
                onRef={(el, i) => videoRefs.current[i] = el}
              />
            ))}
          </div>

          {/* Top bar: close + counter + mute */}
          <div
            className="absolute top-0 left-0 right-0 z-[200] flex justify-between items-center px-4"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="text-white bg-black/50 backdrop-blur-md p-2.5 rounded-full border border-white/20"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            <span className="text-white/70 font-mono text-sm bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
              {activeIndex + 1} / {videos.length}
            </span>

            <button
              onClick={toggleMute}
              className="text-white bg-black/50 backdrop-blur-md p-2.5 rounded-full border border-white/20"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
          </div>

          {/* Invisible tap zones for prev/next (left 30% / right 30%) */}
          <div
            className="absolute left-0 z-[100] cursor-pointer"
            style={{ top: '20%', bottom: '20%', width: '30%' }}
            onClick={() => { if (activeIndex > 0) prevVideo(); }}
            aria-label="Previous"
          />
          <div
            className="absolute right-0 z-[100] cursor-pointer"
            style={{ top: '20%', bottom: '20%', width: '30%' }}
            onClick={() => { if (activeIndex < videos.length - 1) nextVideo(); }}
            aria-label="Next"
          />

          {/* Progress dots at bottom */}
          <div
            className="absolute left-0 right-0 z-[200] flex justify-center gap-1.5"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            {videos.slice(
              Math.max(0, activeIndex - 3),
              Math.min(videos.length, activeIndex + 4)
            ).map((_, i) => {
              const realIdx = Math.max(0, activeIndex - 3) + i;
              return (
                <div
                  key={realIdx}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: realIdx === activeIndex ? '18px' : '6px',
                    height: '6px',
                    background: realIdx === activeIndex
                      ? 'white'
                      : 'rgba(255,255,255,0.35)',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
