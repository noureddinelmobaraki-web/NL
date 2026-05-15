import { useState, useEffect, useRef } from 'react';
import { ASSETS } from '../constants/assets';
import { audioManager } from '../audio/audioManager';
import { useDeviceType } from '../hooks/useDeviceType';

const PHOTOS = ASSETS.profile.lens;

const MUSIC_URL = ASSETS.media.lensMusic;

interface LensGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LensGallery = ({ isOpen, onClose }: LensGalleryProps) => {
  const { isMobile } = useDeviceType();
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Zoom / Gesture refs
  const lastTapTime = useRef(0);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);

  // Audio logic using audioManager
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio(MUSIC_URL);
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;
      
      audioManager.register('lens', audio, 0.7);
      window.dispatchEvent(new CustomEvent('gallery:open'));
      audioManager.play('lens');
      
      return () => {
        window.dispatchEvent(new CustomEvent('gallery:close'));
        audioManager.pause('lens');
        audioRef.current = null;
      };
    }
    return () => {};
  }, [isOpen]);

  const resetZoom = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const delay = now - lastTapTime.current;
    if (delay < 300) {
      if (zoomScale > 1) {
        resetZoom();
      } else {
        setZoomScale(2.5);
      }
    }
    lastTapTime.current = now;
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(m => !m);
    }
  };

  const navigate = (direction: 1 | -1) => {
    if (isTransitioning) return;
    resetZoom();
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

  const getSlotScale = (slotOffset: number): number => {
    const abs = Math.abs(slotOffset);
    if (abs === 0) return 1.0;      // center: full size
    if (abs === 1) return 0.75;     // ±1: 75%
    if (abs === 2) return 0.55;     // ±2: 55%
    return 0.40;                    // ±3+: 40%
  };

  const getSlotOpacity = (slotOffset: number): number => {
    const abs = Math.abs(slotOffset);
    if (abs === 0) return 1.0;
    if (abs === 1) return 0.7;
    if (abs === 2) return 0.45;
    return 0.25;
  };

  if (!isOpen && !isTransitioning) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDist.current = dist;
      initialZoom.current = zoomScale;
    } else {
      touchStartX.current = e.touches[0].clientX; 
      startY.current = e.touches[0].clientY;
      handleDoubleTap();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = (dist / initialPinchDist.current) * initialZoom.current;
      setZoomScale(Math.min(Math.max(scale, 1), 4));
    } else if (e.touches.length === 1) {
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - touchStartX.current;
      
      if (zoomScale > 1.05) {
        setPan(p => ({ x: p.x + dx * 0.5, y: p.y + dy * 0.5 }));
        touchStartX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
      } else if (isMobile) {
        if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
          currentY.current = dy;
          setDragY(dy);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialPinchDist.current = null;
    if (zoomScale > 1.05) {
      return; 
    }

    if (isMobile && currentY.current > 120) {
      onClose();
      currentY.current = 0;
      setDragY(0);
      return;
    }
    if (isMobile) {
      setDragY(0);
      currentY.current = 0;
    }
    
    if (e.changedTouches.length === 1) {
      const delta = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(delta) > 50) navigate(delta > 0 ? 1 : -1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isMobile ? '#000' : 'var(--bg-page)',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      overflow: 'hidden',
      height: isMobile ? '100dvh' : '100vh',
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0',
      paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0',
      opacity: isOpen ? 1 : 0,
      transition: isMobile 
        ? (dragY === 0 ? 'transform 300ms ease, opacity 400ms ease' : 'opacity 400ms ease')
        : 'opacity 400ms ease',
      transform: isMobile ? `translateY(${dragY}px)` : 'none',
    }}>
      {/* Vignette overlay */}
      {!isMobile && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(var(--bg-page-rgb), 0.25) 100%)',
        }} />
      )}

      {/* TOP BAR */}
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: isMobile ? '12px 16px' : '16px 20px',
        paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 8px)' : 'calc(env(safe-area-inset-top) + 16px)',
        background: isMobile ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' : 'none',
        position: 'relative', zIndex: 100,
      }}>
        {/* Title */}
        <div style={{
          fontFamily: isMobile ? 'inherit' : 'var(--font-manga)', 
          color: isMobile ? '#fff' : 'var(--text-primary)',
          fontSize: isMobile ? 'clamp(16px, 5vw, 22px)' : '18px', 
          fontWeight: isMobile ? 700 : 400,
          letterSpacing: isMobile ? '-0.02em' : '0.15em',
          textShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.3)' : '0 0 20px rgba(var(--bg-page-rgb), 0.3)',
        }}>
          THROUGH THE LENS
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center' }}>
          <button onClick={toggleMute} style={{
            background: isMobile ? 'rgba(255,255,255,0.15)' : 'rgba(var(--bg-page-rgb), 0.08)',
            border: isMobile ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-subtle)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: isMobile ? '#fff' : 'var(--text-primary)',
            width: isMobile ? '44px' : '36px', 
            height: isMobile ? '44px' : '36px',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', transition: 'all 200ms ease',
          }}>
            {isMuted ? '🔇' : '🎵'}
          </button>

          <button onClick={onClose} style={{
            background: isMobile ? 'rgba(255,255,255,0.15)' : 'rgba(220,60,60,0.12)',
            border: isMobile ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(200,50,50,0.25)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: isMobile ? '#fff' : 'var(--accent-red)',
            width: isMobile ? '44px' : '36px', 
            height: isMobile ? '44px' : '36px',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '20px' : '18px', 
            fontWeight: 'bold',
            transition: 'all 200ms ease',
          }}>
            ✕
          </button>
        </div>
      </div>

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
            value={zoomScale}
            onChange={e => setZoomScale(parseFloat(e.target.value))}
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
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          }} />
        )}

        {/* The main photo frame */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: isMobile ? '100vw' : '100vw', 
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
                alt=""
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
                alt=""
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
            <div 
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `scale(${zoomScale}) translate(${pan.x / zoomScale}px, ${pan.y / zoomScale}px)`,
                transition: zoomScale === 1 ? 'transform 300ms ease' : 'none'
              }}
            >
              <img
                src={PHOTOS[activeIndex]}
                alt={`Photo ${activeIndex + 1}`}
                style={{
                  position: 'relative', zIndex: 2,
                  maxWidth: '100%', maxHeight: '100%',
                  objectFit: 'contain', 
                  display: 'block',
                  width: '100%',
                  height: '100%',
                }}
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Navigation Controls Mobile (only show if not zoomed) */}
        {isMobile && zoomScale <= 1.05 && (
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

        {/* Left nav arrow */}
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

        {/* Right nav arrow */}
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

        {/* Bottom pill navigation on mobile */}
        {isMobile && (
          <div style={{
            position: 'absolute', bottom: '130px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: '16px', zIndex: 10,
          }}>
            <button onClick={() => navigate(-1)} style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', width: '44px', height: '44px',
              borderRadius: '50%', fontSize: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <button onClick={() => navigate(1)} style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', width: '44px', height: '44px',
              borderRadius: '50%', fontSize: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
        )}
      </div>

      {/* FILMSTRIP CAROUSEL */}
      <div style={{
        width: '100%', position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: '8px',
        padding: isMobile ? '12px 8px' : '16px 12px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        background: isMobile ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg, transparent 0%, rgba(220,215,210,0.9) 40%, rgba(210,205,200,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: isMobile ? 'none' : '1px solid rgba(0,0,0,0.08)',
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
            if (abs === 1) scale = 0.72; // ~40px wide if base is 56? actually prompt said 40x52
            if (abs === 2) scale = 0.54; // ~30px wide
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
                  ? (isMobile ? '2px solid #fff' : '2px solid rgba(0,0,0,0.5)')
                  : '1px solid rgba(255,255,255,0.1)',
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
                alt=""
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
                loading="lazy"
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
