import { useState, useEffect, useRef } from 'react';
import { ASSETS } from '../../constants/assets';
import { audioManager } from '../../audio/audioManager';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useLensGestures } from '../../hooks/useLensGestures';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { LensSlide, getSlotScale, getSlotOpacity } from './LensSlide';
import { LensChrome } from './LensChrome';

const PHOTOS = ASSETS.profile.lens;
const MUSIC_URL = ASSETS.media.lensMusic;

interface LensGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LensGallery = ({ isOpen, onClose }: LensGalleryProps) => {
  const { isMobile } = useDeviceType();
  const { setContext, registerButton, unregisterButton } = useButtonContext();
  const resolvedTheme = useResolvedTheme();

  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setContext(isOpen ? 'lens' : 'page');
    return () => setContext('page');
  }, [isOpen, setContext]);

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
    const next = (activeIndex + direction + PHOTOS.length) % PHOTOS.length;
    setNextIndex(next);
    setIsTransitioning(true);
    setWipeProgress(0);
    
    // Animate wipe progress 0 → 100 over 500ms
    const startTime = performance.now();
    const duration = 500;
    
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease in-out curve
      const eased = progress < 0.5
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
  });

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(m => !m);
    }
  };

  // Register Lens Custom Buttons under ButtonOrchestrator when gallery is open
  useEffect(() => {
    if (!isOpen) return;

    registerButton({
      id: 'lensAudio',
      priority: 2,
      allowedContexts: ['lens'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={toggleMute}
          className="fab-button"
          aria-label="Mute Lens Music"
        >
          {isMuted ? '🔇' : '🎵'}
        </button>
      )
    });

    registerButton({
      id: 'lensClose',
      priority: 1,
      allowedContexts: ['lens'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={onClose}
          className="fab-button transition-colors hover:bg-red-600/20 border-red-500/30"
          style={{ color: 'var(--accent-red, #ef4444)' }}
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
  }, [isOpen, isMuted, onClose, registerButton, unregisterButton]);

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
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isMobile ? (resolvedTheme === 'light' ? '#fff' : '#000') : 'var(--gallery-strip-bg)',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      overflow: 'hidden',
      height: isMobile ? '100dvh' : '100vh',
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0',
      paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0',
      opacity: isOpen ? 1 : 0,
      transition: isMobile 
        ? (gestures.dragY === 0 ? 'transform 300ms ease, opacity 400ms ease' : 'opacity 400ms ease')
        : 'opacity 400ms ease',
      transform: isMobile ? `translateY(${gestures.dragY}px)` : 'none',
    }}>
      {/* Chrome (overlays / titles etc) */}
      <LensChrome
        onClose={onClose}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        activeIndex={activeIndex}
        totalPhotos={PHOTOS.length}
        isMobile={isMobile}
      />

      {/* Zoom Slider Mobile */}
      {isMobile && (
        <div style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          zIndex: 100, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          padding: '12px 6px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>+</span>
          <input 
            type="range"
            min="1"
            max="4"
            step="0.1"
            value={gestures.zoomScale}
            onChange={e => gestures.setZoomScale(parseFloat(e.target.value))}
            style={{
              writingMode: 'vertical-lr',
              WebkitAppearance: 'slider-vertical',
              width: '4px', height: '120px',
              opacity: 0.7,
            }}
          />
          <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>-</span>
        </div>
      )}

      {/* MAIN PHOTO VIEWER */}
      <div 
        style={{
          flex: 1, position: 'relative', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5, overflow: 'hidden',
          height: isMobile ? 'calc(100dvh - 120px)' : '100%',
          background: resolvedTheme === 'light' ? '#fff' : '#000',
        }}
        onTouchStart={gestures.onTouchStart}
        onTouchMove={gestures.onTouchMove}
        onTouchEnd={gestures.onTouchEnd}
      >
        {/* Glass blur background */}
        {!isMobile && (
          <div style={{
            position: 'absolute', inset: '-20px',
            backgroundImage: `url('${PHOTOS[activeIndex]}')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(50px) brightness(1.1) saturate(1.2)',
            transform: 'scale(1.1)',
            transition: 'background-image 600ms ease',
            opacity: 0, // Disabled as user wants solid white/black
          }} />
        )}

        {/* The main photo frame */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: '100vw', 
          height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          touchAction: 'none'
        }}>
          {/* Layer 1: old photo (underneath, fades out when wipe complete) */}
          {nextIndex !== null && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: wipeProgress > 90 ? 1 - (wipeProgress - 90) / 10 : 1,
            }}>
              <img
                src={PHOTOS[activeIndex]}
                alt={`Photo ${activeIndex + 1}`}
                width={1200}
                height={800}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  display: 'block' 
                }}
                draggable={false}
              />
            </div>
          )}

          {/* Layer 2: new photo with clipPath wipe from right */}
          {nextIndex !== null && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              clipPath: `inset(0 ${100 - wipeProgress}% 0 0)`,
              // Glass lens distortion at the wipe edge
              filter: !isMobile && wipeProgress > 5 && wipeProgress < 95
                ? `blur(${Math.sin(wipeProgress / 100 * Math.PI) * 3}px)`
                : 'none',
              transition: 'clip-path 0ms',
            }}>
              <img
                src={PHOTOS[nextIndex]}
                alt={`Photo ${nextIndex + 1}`}
                width={1200}
                height={800}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  display: 'block' 
                }}
                draggable={false}
              />
              {/* Lens edge highlight */}
              {!isMobile && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  right: `${100 - wipeProgress}%`,
                  width: '40px',
                  transform: 'translateX(50%)',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  pointerEvents: 'none',
                  filter: 'blur(8px)',
                }} />
              )}
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

        {/* Navigation Controls Mobile (only show if not zoomed) */}
        {isMobile && gestures.zoomScale <= 1.05 && (
          <>
            {/* Left nav arrow */}
            <button onClick={() => navigate(-1)} style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)',
              width: '40px', height: '40px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', color: 'white', fontSize: '20px',
              cursor: 'pointer', zIndex: 80,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>

            {/* Right nav arrow */}
            <button onClick={() => navigate(1)} style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)',
              width: '40px', height: '40px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', color: 'white', fontSize: '20px',
              cursor: 'pointer', zIndex: 80,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </>
        )}

        {/* Left nav arrow (Desktop) */}
        {!isMobile && (
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)',
            width: '48px', height: '48px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '50%', color: 'rgba(0,0,0,0.7)', fontSize: '20px',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'none',
            transition: 'all 200ms ease',
          }}>‹</button>
        )}

        {/* Right nav arrow (Desktop) */}
        {!isMobile && (
          <button onClick={() => navigate(1)} style={{
            position: 'absolute', right: '16px', top: '50%',
            transform: 'translateY(-50%)',
            width: '48px', height: '48px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '50%', color: 'rgba(0,0,0,0.7)', fontSize: '20px',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'none',
            transition: 'all 200ms ease',
          }}>›</button>
        )}
      </div>

      {/* FILMSTRIP CAROUSEL */}
      <div style={{
        width: '100%', position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: '8px',
        padding: isMobile ? '12px 8px' : '16px 12px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        background: isMobile ? 'rgba(var(--bg-page-rgb), 0.4)' : 'var(--gallery-strip-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--gallery-strip-border)',
      }}>
        {/* Center indicator line */}
        {!isMobile && (
          <div style={{
            position: 'absolute', top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: '2px', height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)',
            pointerEvents: 'none',
          }} />
        )}

        {(isMobile ? [-2,-1,0,1,2] : [-3,-2,-1,0,1,2,3]).map(offset => {
          const photoIndex = (activeIndex + offset + PHOTOS.length) % PHOTOS.length;
          
          let scale = getSlotScale(offset);
          let opacity = getSlotOpacity(offset);
          
          if (isMobile) {
            // Mobile specific scaling
            const abs = Math.abs(offset);
            if (abs === 1) scale = 0.72;
            if (abs === 2) scale = 0.54;
          }

          const isCenter = offset === 0;
          
          // Width/Height logic for mobile vs desktop
          const thumbWidth = isMobile
            ? (offset === 0 ? 52 : (Math.abs(offset) === 1 ? 40 : 30))
            : Math.round(56 * scale);
          const thumbHeight = isMobile
            ? (offset === 0 ? 68 : (Math.abs(offset) === 1 ? 52 : 40))
            : Math.round(72 * scale);
          
          return (
            <button
              key={offset}
              onClick={() => !isTransitioning && setActiveIndex(photoIndex)}
              style={{
                flexShrink: 0,
                width: `${thumbWidth}px`,
                height: `${thumbHeight}px`,
                borderRadius: isMobile ? '6px' : '8px',
                overflow: 'hidden',
                border: isCenter
                  ? '2px solid var(--text-primary)'
                  : '1px solid var(--border-subtle)',
                boxShadow: isCenter
                  ? '0 4px 16px rgba(0,0,0,0.25)'
                  : '0 4px 12px rgba(0,0,0,0.4)',
                opacity,
                transform: `scale(1)`,
                transformOrigin: 'bottom center',
                cursor: isCenter ? 'default' : 'pointer',
                transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                background: '#111',
              }}
              aria-label={`Go to photo ${photoIndex + 1}`}
            >
              <img
                src={PHOTOS[photoIndex]}
                alt={`Gallery photo ${photoIndex + 1}`}
                width={thumbWidth}
                height={thumbHeight}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              {isCenter && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  pointerEvents: 'none',
                  borderRadius: 'inherit',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
