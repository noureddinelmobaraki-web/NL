import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ASSETS } from '../../constants/assets';
import { audioManager } from '../../audio/audioManager';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useLensGestures } from '../../hooks/useLensGestures';
import { LensSlide, getSlotScale, getSlotOpacity } from './LensSlide';
import { LensChrome } from './LensChrome';
import { useAutoHideUI } from '../../hooks/useAutoHideUI';
import { useOrientationListener } from '../../hooks/useOrientationListener';
import { useFullscreenManager } from '../../hooks/useFullscreenManager';
import { LensMobileView } from './LensMobileView';

const PHOTOS = ASSETS.profile.lens;
const MUSIC_URL = ASSETS.media.lensMusic;

interface LensGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LensGallery = ({ isOpen, onClose }: LensGalleryProps) => {
  const { isMobile, isTablet } = useDeviceType(); // MOBILE-ONLY
  const { setContext, registerButton, unregisterButton } = useButtonContext();
  const uiVisible = useAutoHideUI(isOpen && isMobile, 2000);

  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // MOBILE-ONLY: two-stage mode (grid → view)
  const [mobileMode, setMobileMode] = useState<'grid' | 'view'>('grid');

  useEffect(() => {
    if (isOpen && (isMobile || isTablet)) {
      setMobileMode('grid');
    }
  }, [isOpen, isMobile, isTablet]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useFocusTrap(isOpen);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContext(isOpen ? 'lens' : 'page');
    return () => setContext('page');
  }, [isOpen, setContext]);

  useFullscreenManager(isOpen, {
    bodyClass: 'lens-immersive',
    onEscape: onClose,
    lockOrientation: 'portrait',
    enabled: isMobile || isTablet,
  });



  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  // Audio lifecycle management
  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    audioRef.current = audio;
    audioManager.register('lens', audio, 0.7);

    return () => {
      audioManager.pause('lens');
    };
  }, []);

  const navigate = (direction: 1 | -1) => {
    if (isTransitioning) return;
    gestures.resetZoom();

    if (isMobile && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const next = (activeIndex + direction + PHOTOS.length) % PHOTOS.length;
      container.scrollTo({
        left: next * container.clientWidth,
        behavior: 'smooth'
      });
      setActiveIndex(next);
      return;
    }

    const next = (activeIndex + direction + PHOTOS.length) % PHOTOS.length;
    setNextIndex(next);
    setIsTransitioning(true);
    setWipeProgress(0);
    
    // Animate wipe progress 0 → 100 over 500ms
    const startTime = performance.now();
    const duration = isMobile ? 350 : 500; // MOBILE-ONLY
    
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease in-out curve
      const eased = isMobile 
        ? 1 - Math.pow(1 - progress, 3) 
        : progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      setWipeProgress(eased * 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setActiveIndex(next);
        setNextIndex(null);
        setIsTransitioning(false);
        setWipeProgress(0);
      }
    };
    requestAnimationFrame(animate);
  };



  // Connect gestural interactions hook
  const gestures = useLensGestures({
    onNavigate: navigate,
    onClose,
    isMobile,
    containerRef: scrollContainerRef,
  });

  useOrientationListener(useCallback(() => {
    gestures.resetZoom();
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = activeIndex * container.clientWidth;
    }
  }, [activeIndex, gestures.resetZoom]));


  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(m => !m);
    }
  };

  // Register Lens Custom Buttons under ButtonOrchestrator when gallery is open
  useEffect(() => {
    if (!isOpen || isMobile) return;

    registerButton({
      id: 'lensAudio',
      priority: 1,
      allowedContexts: ['lens'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={toggleMute}
          className="fab-button"
          style={{ touchAction: 'manipulation' }}
          aria-label="Mute Lens Music"
        >
          {isMuted ? '🔇' : '🎵'}
        </button>
      )
    });

    registerButton({
      id: 'lensClose',
      priority: 2,
      allowedContexts: ['lens'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onClose}
          className="fab-button transition-colors hover:bg-red-600/20 border-red-500/30"
          style={{ color: 'var(--accent-red, #ef4444)', touchAction: 'manipulation' }}
          aria-label="Close Lens Gallery"
        >
          ✕
        </button>
      )
    });

    return () => {
      unregisterButton('lensAudio');
      unregisterButton('lensClose');
    };
  }, [isOpen, isMuted, isMobile, onClose, registerButton, unregisterButton]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isTransitioning, activeIndex]);

  if (!isOpen && !isTransitioning) return null;



  const isMobileView = isMobile || isTablet;

  return (
    <div 
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="معرض الصور"
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: isOpen ? 'flex' : 'none',
        flexDirection: 'column',
        background: isMobileView ? '#000' : 'var(--gallery-strip-bg)',
        overflow: 'hidden',
        height: isMobileView ? '100dvh' : '100vh',
        minHeight: isMobileView ? '-webkit-fill-available' : undefined,
        overscrollBehavior: isMobileView ? 'none' : undefined,
        contain: isMobileView ? 'strict' : undefined,
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      {isMobileView ? (
        <LensMobileView
          photos={PHOTOS}
          selectedIndex={activeIndex}
          mode={mobileMode}
          isMuted={isMuted}
          uiVisible={uiVisible}
          onEnterGrid={() => setMobileMode('grid')}
          onOpenView={(i) => {
            setActiveIndex(i);
            setMobileMode('view');
          }}
          onIndexChange={(i) => setActiveIndex(i)}
          onClose={onClose}
          onToggleMute={toggleMute}
        />
      ) : (
        <>
          {/* Chrome (overlays / titles etc) */}
          <LensChrome
            onClose={onClose}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            activeIndex={activeIndex}
            totalPhotos={PHOTOS.length}
            isMobile={false}
            visible={true}
          />

          {/* MAIN PHOTO VIEWER (DESKTOP) */}
          <div 
            ref={scrollContainerRef}
            style={{
              flex: 1, 
              position: 'relative', 
              width: '100%',
              zIndex: 5, 
              overflowX: 'hidden',
              overflowY: 'hidden',
              display: 'block',
              scrollbarWidth: 'none',
              touchAction: 'none',
              background: '#000',
            }}
            onPointerDown={gestures.onPointerDown}
            onPointerMove={gestures.onPointerMove}
            onPointerUp={gestures.onPointerUp}
          >
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Layer 1: old photo */}
              {nextIndex !== null && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: wipeProgress > 90 ? 1 - (wipeProgress - 90) / 10 : 1,
                }}>
                  <img
                    src={PHOTOS[activeIndex]}
                    alt={`Photo ${activeIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    draggable={false}
                  />
                </div>
              )}

              {/* Layer 2: new photo with clipPath wipe */}
              {nextIndex !== null && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  clipPath: `inset(0 ${100 - wipeProgress}% 0 0)`,
                }}>
                  <img
                    src={PHOTOS[nextIndex]}
                    alt={`Photo ${nextIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    draggable={false}
                  />
                </div>
              )}

              {/* Current photo when no transition */}
              {nextIndex === null && (
                <LensSlide
                  photoUrl={PHOTOS[activeIndex]}
                  slotOffset={0}
                  zoomScale={gestures.zoomScale}
                  pan={gestures.pan}
                  dragY={gestures.dragY}
                  isActive={true}
                />
              )}
            </div>
          </div>

          {/* FILMSTRIP CAROUSEL (DESKTOP) */}
          <div style={{
            width: '100%', position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            gap: '8px',
            padding: '16px 12px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            background: 'var(--gallery-strip-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--gallery-strip-border)',
          }}>
            {[-3,-2,-1,0,1,2,3].map(offset => {
              const photoIndex = (activeIndex + offset + PHOTOS.length) % PHOTOS.length;
              let scale = getSlotScale(offset);
              let opacity = getSlotOpacity(offset);
              const isCenter = offset === 0;
              const thumbWidth = Math.round(56 * scale);
              const thumbHeight = Math.round(72 * scale);
              
              return (
                <button
                  key={offset}
                  onClick={() => !isTransitioning && setActiveIndex(photoIndex)}
                  style={{
                    flexShrink: 0,
                    width: `${thumbWidth}px`,
                    height: `${thumbHeight}px`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: isCenter ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    opacity,
                    cursor: isCenter ? 'default' : 'pointer',
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    background: '#111',
                  }}
                >
                  <img
                    src={PHOTOS[photoIndex]}
                    alt={`Thumb ${photoIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
