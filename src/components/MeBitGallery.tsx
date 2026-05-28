import { X, ChevronLeft, ChevronRight, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { ResponsiveImage } from './ResponsiveImage';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useButtonContext } from './layout/ButtonOrchestrator';

interface MeBitGalleryProps {
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
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  
  const { setContext, registerButton, unregisterButton } = useButtonContext();

  useEffect(() => {
    setContext(isOpen ? 'mebit' : 'page');
    return () => setContext('page');
  }, [isOpen, setContext]);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 md:p-14"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-3xl cursor-crosshair"
            onClick={onClose}
          />

          {/* Gallery body */}
          <div className={`relative w-full h-full flex flex-col z-[105] overflow-hidden
            ${(isMobile || isTablet) ? 'pt-[calc(var(--safe-top)+60px)]' : 'gap-6'}`}>

            <div className={`flex-1 flex flex-col md:flex-row overflow-hidden
              ${(isMobile || isTablet) ? '' : 'gap-6'}`}>

              {/* Main image view */}
              <div
                className={`${(isMobile || isTablet) ? 'order-1' : 'flex-1'} 
                  glass-morphism rounded-3xl relative flex items-center justify-center overflow-hidden shadow-inner group`}
                onTouchStart={e => {
                  touchStartX.current = e.touches[0].clientX;
                  touchStartY.current = e.touches[0].clientY;
                }}
                onTouchEnd={e => {
                  const dx = touchStartX.current - e.changedTouches[0].clientX;
                  const dy = touchStartY.current - e.changedTouches[0].clientY;
                  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                    dx > 0 ? onNext() : onPrev();
                  } else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) {
                    onClose();
                  }
                }}
              >
                {isMobile && selectedIndex !== null && (
                  <div className="absolute top-4 right-4 z-50 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[var(--text-primary)] text-xs font-mono border border-white/10">
                    {selectedIndex + 1} / {images.length}
                  </div>
                )}

                {selectedIndex !== null ? (
                  <motion.div
                    key={selectedIndex}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`w-full h-full flex items-center justify-center cursor-zoom-in
                      ${(isMobile || isTablet) ? 'p-0' : 'p-4 sm:p-8'}`}
                  >
                    <ResponsiveImage
                      src={images[selectedIndex] || ''}
                      alt="Selected Shot"
                      className={`${(isMobile || isTablet)
                        ? 'w-full h-full object-cover'
                        : 'max-w-full max-h-full object-contain'}
                        shadow-[0_0_80px_rgba(255,255,255,0.08)] rounded-sm 
                        transition-transform duration-700 hover:scale-110`}
                      loading="lazy"
                    />

                    {/* Desktop nav arrows */}
                    {!isMobile && !isTablet && (
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
                        <button
                          onClick={e => { e.stopPropagation(); onPrev(); }}
                          className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-10 h-10" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onNext(); }}
                          className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-10 h-10" />
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

              {/* Mobile thumbnail strip */}
              {isMobile && (
                <div className="order-2 w-full h-[100px] overflow-x-auto flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md">
                  {images.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectIndex(idx)}
                      className={`relative h-full aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all duration-300 shrink-0
                        ${selectedIndex === idx ? 'border-white scale-95' : 'border-transparent opacity-50'}`}
                      aria-label={`View moment ${idx + 1}`}
                    >
                      <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Tablet thumbnail strip */}
              {isTablet && (
                <div className="order-2 w-full h-[120px] overflow-x-auto flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-black/50">
                  {images.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectIndex(idx)}
                      className={`relative h-full aspect-square rounded-xl border-2 overflow-hidden shrink-0 transition-all
                        ${selectedIndex === idx ? 'border-white scale-95' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      aria-label={`View moment ${idx + 1}`}
                    >
                      <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Desktop sidebar */}
              {!isMobile && !isTablet && (
                <div className="w-full md:w-96 flex flex-col gap-6 glass-morphism p-6 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex flex-col">
                      <h3 className="font-manga text-white text-2xl tracking-tight leading-none uppercase">Shot Archive</h3>
                      <span className="font-hand text-zinc-400 text-sm mt-1 italic">Moments in time</span>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-full text-zinc-100 font-mono text-xs">
                      {selectedIndex !== null ? selectedIndex + 1 : 0} / {images.length}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-2 custom-scrollbar pb-4 content-start">
                    {images.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectIndex(idx)}
                        className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 transform
                          ${selectedIndex === idx
                            ? 'border-white scale-95 shadow-[0_0_20px_white/20] ring-4 ring-white/10'
                            : 'border-transparent hover:border-white/30 opacity-40 hover:opacity-100 hover:scale-[1.02]'}`}
                        aria-label={`Select archive moment ${idx + 1}`}
                      >
                        <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        {selectedIndex === idx && (
                          <div className="absolute inset-0 bg-white/10" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
