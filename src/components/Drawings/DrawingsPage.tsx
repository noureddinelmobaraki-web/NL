import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { audioManager } from '../../audio/audioManager';
import { VideoData } from './types';
import { VideoPreview } from './VideoPreview';
import { DrawingsCarousel } from './DrawingsCarousel';
import { DrawingsFullscreen } from './DrawingsFullscreen';
import { useButtonContext } from '../layout/ButtonOrchestrator';

export const DrawingsPage = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const { isMobile, isTablet } = useDeviceType();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const { setContext } = useButtonContext();

  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const posterRef = useRef<HTMLDivElement>(null);

  // true when we should use fullscreen mobile layout
  const isMobileView = isMobile || isTablet;

  // Sync button orchestrator context to hide FAB controls on mobile/tablet when fullscreen is open
  useEffect(() => {
    if (isOpen && isMobileView) {
      setContext('mebit');
    } else {
      setContext('page');
    }
    return () => {
      setContext('page');
    };
  }, [isOpen, isMobileView, setContext]);

  useEffect(() => {
    setError(false);
    const base = import.meta.env.BASE_URL || './';
    const fetchUrl = (base.endsWith('/') ? base : base + '/') + 'data/videos.json';
    fetch(fetchUrl)
      .then(r => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.json();
      })
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
      .catch(err => {
        console.error('[DrawingsPage] fetch error:', err);
        setError(true);
      });
  }, [retryCount]);

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

  // MOBILE-ONLY: Body scroll lock
  useEffect(() => {
    if (isOpen && (isMobile || isTablet)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile, isTablet]);

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

  const handleTouchStart = () => {
    setTiltStyle({
      transform: 'perspective(600px) scale(0.98)',
      transition: 'transform 150ms ease-out'
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!posterRef.current) return;
    const rect = posterRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;

    const rotateX = -normY * 8; // Max ±4 deg
    const rotateY = normX * 8;  // Max ±4 deg

    setTiltStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(0.98)`,
      transition: 'transform 50ms ease-out'
    });
  };

  const handleTouchEnd = () => {
    setTiltStyle({
      transform: 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 300ms ease-out'
    });
  };

  if (error) {
    return (
      <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">تعذّر تحميل الرسومات</h2>
          <p className="text-[var(--text-muted)]">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-8 py-3 bg-[var(--accent-red)] text-white rounded-full font-bold transition-all shadow-lg shadow-red-500/20"
          >
            إعادة المحاولة
          </button>
        </div>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
    <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h2 className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase leading-none text-[var(--text-primary)]">
              MY DRAWINGS
            </h2>
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
            {!isMobileView ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {videos.slice(0, 6).map((video, i) => (
                    <div
                      key={video.id}
                      className="bg-[var(--bg-elevated)] rounded-[8px] overflow-hidden cursor-pointer"
                      onClick={() => openGallery(i)}
                    >
                      <VideoPreview video={video} index={i} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openGallery(0)}
                  className="manga-button !py-4 !px-8 text-xl bg-[var(--paper-color)] text-[var(--text-primary)] shadow-[8px_8px_0px_var(--manga-shadow-color)] hover:shadow-[12px_12px_0px_var(--manga-shadow-color)] transition-all w-full sm:w-auto"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>▶</span>
                  <span>VIEW ALL {videos.length} STORIES</span>
                  <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>→</span>
                </button>
              </>
            ) : (
              <div
                ref={posterRef}
                onClick={() => openGallery(0)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="relative aspect-[4/5] max-h-[70vh] w-full rounded-[24px] overflow-hidden cursor-pointer shadow-lg select-none"
                style={{
                  ...tiltStyle,
                  willChange: 'transform',
                }}
              >
                {/* Background Image */}
                <img
                  src={videos[0]?.poster}
                  alt="Drawings Feed Cover"
                  className="w-full h-full object-cover select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {/* Dark Gradient Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                  }}
                />

                {/* Centered CTA */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 px-6 py-3 rounded-full text-white font-bold tracking-wide shadow-md active:scale-95 transition-transform"
                  >
                    <span>▶ Open Feed</span>
                  </div>
                </div>

                {/* Bottom-left text */}
                <div className="absolute bottom-6 left-6 text-left flex flex-col pointer-events-none">
                  <span className="font-bold text-white uppercase text-[22px] tracking-tight leading-tight">
                    MY DRAWINGS
                  </span>
                  <span className="font-mono text-xs text-white/60 tracking-wider mt-1">
                    {videos.length} WORKS
                  </span>
                </div>
              </div>
            )}
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
          onIndexChange={setActiveIndex} // MOBILE-ONLY
          isMuted={isMuted}
          onClose={() => setIsOpen(false)}
          onToggleMute={toggleMute}
          onNext={() => {}} // MOBILE-ONLY
          onPrev={() => {}} // MOBILE-ONLY
          onTouchStart={() => {}} // MOBILE-ONLY
          onTouchEnd={() => {}} // MOBILE-ONLY
          onRef={(el, i) => videoRefs.current[i] = el}
        />
      )}
    </section>
  );
};
