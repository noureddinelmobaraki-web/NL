import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import Hls from 'hls.js';
import { ACCOUNTS_BG_HLS } from '../../config/media';
import { audioManager } from '../../audio/audioManager';
import '../../styles/aero-gallery.css';

export type AeroAlbum = 'mebit' | 'lens';

interface AeroGalleryHubProps {
  /** Active album, or null when the hub is closed. */
  album: AeroAlbum | null;
  meBitImages: readonly string[];
  lensImages: readonly string[];
  /** Live flags from useGalleryState so the hub can resume its song
   *  when a fullscreen viewer closes while the hub stays open. */
  isGalleryOpen: boolean;
  isLensGalleryOpen: boolean;
  onSwitchAlbum: (album: AeroAlbum) => void;
  onClose: () => void;
  /** Opens the existing ME bit fullscreen viewer at the given index. */
  onOpenMeBit: (index: number) => void;
  /** Opens the existing Lens fullscreen viewer at the given index. */
  onOpenLens: (index: number) => void;
  /** Lazily attaches the ME bit HLS audio (ensureMeBitLoaded). */
  onPrefetchMeBit: () => void;
}

/** Same low-power guard used by AccountsBackgroundVideo. */
function shouldSkipVideo(): boolean {
  if (typeof window === 'undefined') return true;
  const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const conn = (navigator as any).connection;
  const saveData = !!conn?.saveData;
  const slowNet = /(^|-)2g$/.test(conn?.effectiveType ?? '');
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4
    && window.matchMedia?.('(hover:none)').matches;
  return !!(rm || saveData || slowNet || weak);
}

/** Split a flat image list into increasing-width rows -> pyramid shape. */
function toPyramidRows(items: readonly string[]): string[][] {
  const rows: string[][] = [];
  let rowSize = 1;
  let i = 0;
  while (i < items.length) {
    const size = Math.min(rowSize, items.length - i);
    rows.push(items.slice(i, i + size));
    i += size;
    rowSize += 1;
  }
  return rows;
}

/* Phase 2B: staggered pyramid transition. Transform+opacity only (GPU-cheap). */
const pyramidVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.028, staggerDirection: -1 } },
};
const frameVariants: Variants = {
  hidden: (d: number) => ({ opacity: 0, y: 26, scale: 0.72, x: 26 * d }),
  show: {
    opacity: 1, y: 0, scale: 1, x: 0,
    transition: { type: 'spring', stiffness: 320, damping: 24, mass: 0.7 },
  },
  exit: (d: number) => ({
    opacity: 0, y: -18, scale: 0.7, x: -22 * d,
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
};

export function AeroGalleryHub({
  album,
  meBitImages,
  lensImages,
  isGalleryOpen,
  isLensGalleryOpen,
  onSwitchAlbum,
  onClose,
  onOpenMeBit,
  onOpenLens,
  onPrefetchMeBit,
}: AeroGalleryHubProps) {
  const open = album !== null;
  const images = album === 'lens' ? lensImages : meBitImages;
  const rows = useMemo(() => toPyramidRows(images), [images]);
  const direction = album === 'lens' ? 1 : -1;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled] = useState(() => !shouldSkipVideo());

  // Background video: same source + hls.js setup as AccountsBackgroundVideo.
  useEffect(() => {
    if (!open || !videoEnabled) return;
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    const url = ACCOUNTS_BG_HLS;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, maxBufferLength: 8, backBufferLength: 8, maxBufferSize: 0 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) { hls?.destroy(); hls = null; } });
    }
    video.play().catch(() => {/* autoplay may be blocked - fine */});
    return () => { if (hls) { hls.stopLoad(); hls.detachMedia(); hls.destroy(); } };
  }, [open, videoEnabled]);

  // Play the album song while the hub is open; pause both on close.
  useEffect(() => {
    if (!open) {
      audioManager.pause('mebit');
      audioManager.pause('lens');
      audioManager.releaseBg('aero-gallery');
      return;
    }
    audioManager.suppressBg('aero-gallery');
    if (album === 'mebit') {
      onPrefetchMeBit();
      audioManager.pause('lens');
      audioManager.play('mebit');
    } else {
      audioManager.pause('mebit');
      audioManager.play('lens');
    }
    return () => { audioManager.releaseBg('aero-gallery'); };
  }, [open, album, onPrefetchMeBit]);

  // Resume the album song if a fullscreen viewer closes but the hub stays open.
  useEffect(() => {
    if (!open) return;
    if (album === 'mebit' && !isGalleryOpen) audioManager.play('mebit');
    if (album === 'lens' && !isLensGalleryOpen) audioManager.play('lens');
  }, [open, album, isGalleryOpen, isLensGalleryOpen]);

  // Phase 2A.1: true fullscreen - lock page scroll and hide the bottom mobile
  // nav while the hub is open; restore on close. Depends on the viewer flags so
  // a viewer's own cleanup cannot silently re-enable page scrolling.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('nl-aero-active');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('nl-aero-active');
    };
  }, [open, isGalleryOpen, isLensGalleryOpen]);

  // Escape closes the hub.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleThumb = (index: number) => {
    if (album === 'lens') onOpenLens(index);
    else onOpenMeBit(index);
  };

  const albums: AeroAlbum[] = ['mebit', 'lens'];

  return (
    <div className="nlag-overlay" data-open={open} data-album={album ?? 'mebit'} aria-hidden={!open}>
      <div className="nlag-bg" aria-hidden>
        {videoEnabled && (
          <video
            ref={videoRef}
            className="nlag-bg-video"
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
          />
        )}
        <div className="nlag-bg-glass" />
      </div>
      <div className="nlag-rainbow" aria-hidden />
      <div className="nlag-scrim" aria-hidden />

      <button type="button" className="nlag-close" aria-label="Close gallery" onClick={onClose}>
        ✕
      </button>

      <div className="nlag-stage">
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key={album}
              className="nlag-pyramid"
              variants={pyramidVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {rows.map((row, r) => {
                const base = rows.slice(0, r).reduce((n, rr) => n + rr.length, 0);
                return (
                  <div className="nlag-row" key={r}>
                    {row.map((src, c) => {
                      const index = base + c;
                      return (
                        <motion.button
                          type="button"
                          className="nlag-frame"
                          key={src}
                          custom={direction}
                          variants={frameVariants}
                          whileHover={{ scale: 1.06, y: -3 }} 
                          whileTap={{ scale: 0.97 }} 
                          onClick={() => handleThumb(index)}
                          aria-label={`Open image ${index + 1}`}
                        >
                          <img src={src} alt="" loading="lazy" draggable={false} />
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="nlag-header">
        <div className="nlag-tabs" role="tablist" aria-label="Gallery albums">
          {albums.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className="nlag-tab"
              data-active={album === id}
              aria-selected={album === id}
              onClick={() => onSwitchAlbum(id)}
            >
              {album === id && (
                <motion.span
                  layoutId="nlag-seg"
                  className="nlag-seg"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }} 
                />
              )}
              <span className="nlag-tab-label">{id === 'mebit' ? 'ME bit' : 'Lens'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
