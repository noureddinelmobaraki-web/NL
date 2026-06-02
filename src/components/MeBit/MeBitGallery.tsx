import { X, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useMeBitSwipe } from '../../hooks/useMeBitSwipe';
import { MeBitMainImage } from './MeBitMainImage';
import { MeBitThumbnails } from './MeBitThumbnails';
import { useViewportSize } from '../../hooks/useViewportSize';

export interface MeBitGalleryProps {
  isOpen: boolean;
  images: string[];
  selectedIndex: number | null;
  isMeBitPlaying: boolean;
  isMobile: boolean;
  isTablet: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectIndex: (idx: number) => void;
  onToggleAudio: () => void;
}

export const MeBitGallery = ({
  isOpen,
  images,
  selectedIndex,
  isMeBitPlaying,
  isMobile,
  isTablet,
  onClose,
  onNext,
  onPrev,
  onSelectIndex,
  onToggleAudio,
}: MeBitGalleryProps) => {
  const galleryRef = useFocusTrap(isOpen);
  const { onTouchStart, onTouchEnd } = useMeBitSwipe({ onNext, onPrev, onClose });
  const { setContext, registerButton, unregisterButton } = useButtonContext();
  const viewport = useViewportSize();


  useEffect(() => {
    setContext(isOpen ? 'mebit' : 'page');
    return () => setContext('page');
  }, [isOpen, setContext]);

  // Fullscreen & body immersive class for mobile/tablet
  useEffect(() => {
    if (isOpen && (isMobile || isTablet)) {
      document.body.classList.add('gallery-immersive'); // MOBILE-ONLY
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
        // Lock orientation to portrait if supported
        const sor = screen.orientation as any;
        if (sor && sor.lock) {
          sor.lock('portrait').catch(() => {});
        }
      } catch (e) {
        // Silently fallback if unsupported (like iOS Safari)
      }
    } else {
      document.body.classList.remove('gallery-immersive'); // MOBILE-ONLY
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
        const sor = screen.orientation as any;
        if (sor && sor.unlock) {
          sor.unlock();
        }
      } catch (e) {
        // Silently fallback
      }
    }

    return () => {
      document.body.classList.remove('gallery-immersive'); // MOBILE-ONLY
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
        const sor = screen.orientation as any;
        if (sor && sor.unlock) {
          sor.unlock();
        }
      } catch (e) {}
    };
  }, [isOpen, isMobile, isTablet]);

  // Body scroll lock

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Register MeBit custom buttons in the portaled orchestrator
  useEffect(() => {
    if (!isOpen) return;

    registerButton({
      id: 'mebitAudio',
      priority: 2,
      allowedContexts: ['mebit'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onToggleAudio}
          className="fab-button"
          aria-label="Toggle Gallery Music"
        >
          {isMeBitPlaying ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5 text-zinc-500" />
          )}
        </button>
      )
    });

    registerButton({
      id: 'mebitClose',
      priority: 1,
      allowedContexts: ['mebit'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onClose}
          className="fab-button transition-colors hover:bg-red-600/20 border-red-500/30"
          style={{ color: 'var(--accent-red, #ef4444)' }}
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )
    });

    return () => {
      unregisterButton('mebitAudio');
      unregisterButton('mebitClose');
    };
  }, [isOpen, isMeBitPlaying, onClose, onToggleAudio, registerButton, unregisterButton]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onNext, onPrev, onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={galleryRef}
          role="dialog"
          aria-modal="true"
          aria-label="ميبيت غاليري"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center
            ${(isMobile || isTablet) ? 'p-0' : 'p-4 sm:p-10 md:p-14'}`} // MOBILE-ONLY
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 backdrop-blur-3xl cursor-crosshair
              ${(isMobile || isTablet) ? 'bg-black' : 'bg-black/95'}`} // MOBILE-ONLY
            onClick={onClose}
          />

          {/* Gallery body */}
          <div 
            className={`relative w-full h-full flex flex-col z-[105] overflow-hidden
            ${(isMobile || isTablet) ? (viewport.isLandscape ? 'pt-4 pl-4 select-none' : 'pt-[calc(var(--safe-top)+60px)]') : 'gap-6'}`}
            onClick={(e) => e.stopPropagation()}
          >

            <div className={`flex-1 flex overflow-hidden
              ${(isMobile || isTablet) ? (viewport.isLandscape ? 'flex-row gap-2' : 'flex-col') : 'flex-col md:flex-row gap-6'}`}>

              {/* Main image view */}
              <MeBitMainImage
                imageUrl={selectedIndex !== null ? images[selectedIndex] : ''}
                selectedIndex={selectedIndex ?? 0}
                totalImages={images.length}
                isMobile={isMobile}
                isTablet={isTablet}
                onClose={onClose}
                onNext={onNext}
                onPrev={onPrev}
                onSwipeStart={onTouchStart}
                onSwipeEnd={onTouchEnd}
              />

              {/* Responsive thumbnail strip or sidebar */}
              <MeBitThumbnails
                images={images}
                selectedIndex={selectedIndex ?? 0}
                onSelectIndex={onSelectIndex}
                isMeBitPlaying={isMeBitPlaying}
                onToggleAudio={onToggleAudio}
              />
            </div>

            {/* Desktop footer bar */}
            {!isMobile && !isTablet && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-8 manga-border border-[var(--ink-color)] shadow-[12px_12px_0px_var(--manga-shadow-color)] flex flex-col md:flex-row justify-between items-center gap-6"
                style={{ background: 'var(--paper-color)' }}
              >
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-[var(--ink-color)] text-[var(--text-inverse)] rounded-2xl shadow-lg -rotate-3">
                    <Maximize2 className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-manga text-3xl font-black uppercase text-[var(--ink-color)] leading-none tracking-tight">
                      Theater Mode
                    </h4>
                    <p className="font-hand text-[var(--text-muted)] text-xl mt-1">
                      Curated photography and sketches from Noordine's private collection.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--bg-glass)] rounded-full text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">
                    <span>Arrows to navigate</span>
                    <div className="w-1 h-1 bg-[var(--border-subtle)] rounded-full" />
                    <span>ESC to close</span>
                  </div>
                  <button
                    onClick={onClose}
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
  );
};
