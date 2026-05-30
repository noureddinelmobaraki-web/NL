import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { audioManager } from '../../audio/audioManager';
import { VideoData } from './types';
import { VideoPreview } from './VideoPreview';
import { DrawingsCarousel } from './DrawingsCarousel';
import { DrawingsFullscreen } from './DrawingsFullscreen';

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
          <DrawingsCarousel
            videos={videos}
            activeIndex={activeIndex}
            isMuted={isMuted}
            onClose={() => setIsOpen(false)}
            onToggleMute={toggleMute}
            onNext={nextVideo}
            onPrev={prevVideo}
            onRef={(el, i) => videoRefs.current[i] = el}
          />
        )}
      </div>

      {/* ── MOBILE/TABLET open state: true fullscreen ─────────────────────────── */}
      {isOpen && isMobileView && (
        <DrawingsFullscreen
          videos={videos}
          activeIndex={activeIndex}
          isMuted={isMuted}
          onClose={() => setIsOpen(false)}
          onToggleMute={toggleMute}
          onNext={nextVideo}
          onPrev={prevVideo}
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
          onRef={(el, i) => videoRefs.current[i] = el}
        />
      )}
    </section>
  );
};
