import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { audioManager } from '../../audio/audioManager';
import { VideoData } from './types';
import { DrawingsWindow } from './DrawingsWindow';
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Failed to load drawings</h2>
          <p className="text-[var(--text-muted)]">Please check your internet connection and try again</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-8 py-3 bg-[var(--accent-red)] text-white rounded-full font-bold transition-all shadow-lg shadow-red-500/20"
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
    <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {!isOpen && (
          <DrawingsWindow
            sources={videos.map((v) => v.src)}
            onOpen={() => openGallery(0)}
          />
        )}

        {/* Fullscreen vertical TikTok-style gallery */}
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
