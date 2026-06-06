import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { audioManager } from '../../audio/audioManager';
import { VideoData } from './types';
import { VideoPreview } from './VideoPreview';
import { DrawingsFullscreen } from './DrawingsFullscreen';
import { useButtonContext } from '../layout/ButtonOrchestrator';

export const DrawingsPage = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const { setContext } = useButtonContext();

  // FIXED: Save scroll position via useRef instead of polluting DOM with dataset
  const savedScrollY = useRef(0);

  // Hide FAB buttons on ALL viewports when gallery/fullscreen is open
  useEffect(() => {
    if (isOpen) {
      setContext('mebit'); // 'mebit' = hide all FABs (works for mobile AND desktop)
    } else {
      setContext('page');
    }
    return () => {
      setContext('page');
    };
  }, [isOpen, setContext]);

  useEffect(() => {
    setError(false);
    const base = import.meta.env.BASE_URL || './';
    const fetchUrl = (base.endsWith('/') ? base : base + '/') + 'data/videos.json';
    fetch(fetchUrl)
      .then(r => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('videos.json expected an array');

        interface VideoApiRow extends VideoData {}

        const rows = data as VideoApiRow[];
        const resolved = rows.map((v) => ({
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

  // FIXED: Body scroll lock with proper save/restore pattern (2025 best practice)
  // - Uses useRef instead of body.dataset (cleaner, no DOM pollution)
  // - Restores via requestAnimationFrame to avoid iOS Safari flicker
  // - DrawingsFullscreen does NOT touch body.style (single source of truth)
  useEffect(() => {
    if (isOpen) {
      savedScrollY.current = window.scrollY;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (savedScrollY.current > 0) {
        const y = savedScrollY.current;
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }
    return () => {
      // Safety cleanup — only restore if currently locked
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
        if (savedScrollY.current > 0) {
          const y = savedScrollY.current;
          requestAnimationFrame(() => window.scrollTo(0, y));
        }
      }
    };
  }, [isOpen]);

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
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
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

        {/* Closed state: 3-card grid with 9:16 TikTok ratio */}
        {!isOpen && (
          <div className="space-y-8 mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl mx-auto justify-center">
              {videos.slice(0, 3).map((video, i) => (
                <div
                  key={video.id}
                  className="w-full max-w-[320px] mx-auto cursor-pointer relative group overflow-hidden bg-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
                  style={{
                    aspectRatio: '9 / 16',
                    borderRadius: '16px',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  }}
                  onClick={() => openGallery(i)}
                >
                  <VideoPreview video={video} index={i} />
                </div>
              ))}
            </div>

            <div className="text-center pt-4">
              <button
                onClick={() => openGallery(0)}
                className="manga-button !py-4 !px-8 text-xl bg-[var(--paper-color)] text-[var(--text-primary)] shadow-[8px_8px_0px_var(--manga-shadow-color)] hover:shadow-[12px_12px_0px_var(--manga-shadow-color)] transition-all w-full sm:w-auto"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
              >
                <span style={{ fontSize: '1.2rem' }}>▶</span>
                <span>VIEW ALL {videos.length} STORIES</span>
                <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Vertical Fullscreen Snap Scroll Gallery (TikTok-style) ─────────────────────────── */}
        {isOpen && createPortal(
          <DrawingsFullscreen
            videos={videos}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
            isMuted={isMuted}
            onClose={() => setIsOpen(false)}
            onToggleMute={toggleMute}
            onNext={nextVideo}
            onPrev={prevVideo}
            onTouchStart={() => {}}
            onTouchEnd={() => {}}
            onRef={(el, i) => videoRefs.current[i] = el}
          />,
          document.body
        )}
      </div>
    </section>
  );
};
