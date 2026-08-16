import { X, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useGenieTransition } from '../../transitions/useGenieTransition';
import { useEffect, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useMeBitSession } from '../../hooks/useMeBitSession';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useMeBitSwipe } from '../../hooks/useMeBitSwipe';
import { MeBitMainImage } from './MeBitMainImage';
import { MeBitThumbnails } from './MeBitThumbnails';
import { useFullscreenManager } from '../../hooks/useFullscreenManager';
import { MeBitMobileView } from './MeBitMobileView';
import { useMeBitPrefetch } from '../../hooks/useMeBitPrefetch';

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
  useMeBitSession(isOpen);
  useMeBitPrefetch(images, selectedIndex ?? 0);
  const { onTouchStart, onTouchEnd } = useMeBitSwipe({ onNext, onPrev, onClose });
  const genie = useGenieTransition(isOpen);
  const { setContext, registerButton, unregisterButton } = useButtonContext();

  useEffect(() => {
    setContext(isOpen ? 'mebit' : 'page');
    return () => setContext('page');
  }, [isOpen, setContext]);

  useFullscreenManager(isOpen, {
    bodyClass: 'gallery-immersive',
    onEscape: onClose,
    lockOrientation: 'portrait',
    enabled: isMobile || isTablet,
  });

  // Register MeBit custom buttons in the portaled orchestrator (DESKTOP ONLY)
  useEffect(() => {
    if (!isOpen || isMobile || isTablet) return;

    registerButton({
      id: 'mebitAudio',
      priority: 1,
      allowedContexts: ['mebit'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onToggleAudio}
          className="fab-button"
          style={{ touchAction: 'manipulation' }}
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
      priority: 2,
      allowedContexts: ['mebit'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onClose}
          className="fab-button transition-colors hover:bg-red-600/20 border-red-500/30"
          style={{ color: 'var(--accent-red, #ef4444)', touchAction: 'manipulation' }}
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
  }, [isOpen, isMeBitPlaying, onClose, onToggleAudio, registerButton, unregisterButton, isMobile, isTablet]);

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

  const isMobileView = isMobile || isTablet;

  // MOBILE-ONLY: Two-stage navigation — grid first, fullscreen viewer second
  const [mobileMode, setMobileMode] = useState<'grid' | 'view'>('grid');

  // Reset to grid whenever the gallery is (re)opened
  useEffect(() => {
    if (isOpen && isMobileView) {
      setMobileMode(selectedIndex !== null ? 'view' : 'grid');
    }
  }, [isOpen, isMobileView, selectedIndex]);

  // When user opens via thumbnail, ensure we go straight to view
  useEffect(() => {
    if (isMobileView && isOpen && selectedIndex !== null) {
      setMobileMode('view');
    }
  }, [selectedIndex, isOpen, isMobileView]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <m.div
          ref={galleryRef}
          role="dialog"
          aria-modal="true"
          aria-label="MeBit Gallery"
          initial={genie.initial}
          animate={genie.animate}
          exit={genie.exit}
          transition={genie.transition}
          className={`fixed inset-0 z-[100] flex items-center justify-center mid-gallery
            ${isMobileView ? 'p-0' : 'p-4 sm:p-10 md:p-14'}`}
          style={{
            ...(isMobileView
              ? {
                  height: '100dvh',
                  minHeight: '-webkit-fill-available',
                  overscrollBehavior: 'none' as const,
                  contain: 'strict' as const,
                }
              : {}),
            ...genie.style,
          }}
        >
          {/* Backdrop — solid black on mobile (skip expensive backdrop-blur), glass on desktop */}
          <div
            className={`absolute inset-0 cursor-crosshair
              ${isMobileView ? 'bg-black' : 'bg-black/95 backdrop-blur-3xl'}`}
            onClick={onClose}
            style={isMobileView ? { touchAction: 'manipulation' } : undefined}
          />

          {/* Gallery body */}
          <div 
            className={`relative w-full h-full flex flex-col z-[105] overflow-hidden
            ${isMobileView ? '' : 'gap-6'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobileView ? (
              <MeBitMobileView
                images={images}
                selectedIndex={selectedIndex ?? 0}
                mode={mobileMode}
                onEnterGrid={() => setMobileMode('grid')}
                onOpenView={(i) => {
                  onSelectIndex(i);
                  setMobileMode('view');
                }}
                onClose={onClose}
                onNext={onNext}
                onPrev={onPrev}
                isMeBitPlaying={isMeBitPlaying}
                onToggleAudio={onToggleAudio}
              />
            ) : (
              <>
                <div className="flex-1 flex overflow-hidden flex-col md:flex-row gap-6">
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
              </>
            )}

            {/* Desktop footer bar — unchanged */}
            {!isMobile && !isTablet && (
              <m.div
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
              </m.div>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
