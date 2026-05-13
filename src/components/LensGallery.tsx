import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;
const PHOTOS = Array.from({ length: 9 }, (_, i) =>
  `${BASE}images/photos/${i + 1}.webp`
);

const MUSIC_URL = 'https://github.com/user-attachments/assets/6a55e330-2007-4109-b030-6661cb26e320';

interface LensGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LensGallery = ({ isOpen, onClose }: LensGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef(0);

  // Audio logic - fade in on open, loop, fade out on close
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('gallery:open'));
      const audio = new Audio(MUSIC_URL);
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;

      audio.play().then(() => {
        const startTime = performance.now();
        const fadeDuration = 2000; // 2 seconds
        const targetVolume = 0.7;
        
        const fadeIn = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / fadeDuration, 1);
          if (audio) audio.volume = progress * targetVolume;
          if (progress < 1) requestAnimationFrame(fadeIn);
        };
        requestAnimationFrame(fadeIn);
      }).catch(() => {});
      
      return () => {
        window.dispatchEvent(new CustomEvent('gallery:close'));
        // Fade out over 0.8 seconds then destroy
        let vol = audio.volume;
        const interval = setInterval(() => {
          vol = Math.max(vol - 0.07, 0);
          if (audio) audio.volume = vol;
          if (vol <= 0) {
            clearInterval(interval);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
          }
        }, 50);
      };
    }
    return () => {};
  }, [isOpen]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(m => !m);
    }
  };

  const navigate = (direction: 1 | -1) => {
    if (isTransitioning) return;
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(180deg, #f0ece8 0%, #e8e4df 40%, #ddd8d2 100%)',
      overflow: 'hidden',
      paddingBottom: 'env(safe-area-inset-bottom)',
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 400ms ease',
    }}>
      {/* Vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)',
      }} />

      {/* TOP BAR */}
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '16px 20px',
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        background: 'none',
        position: 'relative', zIndex: 10,
      }}>
        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-manga)', color: '#1a1a1a',
          fontSize: '18px', letterSpacing: '0.15em',
          textShadow: '0 0 20px rgba(255,255,255,0.3)',
        }}>
          THROUGH THE LENS
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={toggleMute} style={{
            background: 'rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.12)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#333',
            width: '36px', height: '36px',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', transition: 'all 200ms ease',
          }}>
            {isMuted ? '🔇' : '🎵'}
          </button>

          <button onClick={onClose} style={{
            background: 'rgba(220,60,60,0.12)',
            border: '1px solid rgba(200,50,50,0.25)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#c0392b',
            width: '36px', height: '36px',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 'bold',
            transition: 'all 200ms ease',
          }}>
            ✕
          </button>
        </div>
      </div>

      {/* MAIN PHOTO VIEWER */}
      <div 
        style={{
          flex: 1, position: 'relative', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5, overflow: 'hidden',
        }}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const delta = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(delta) > 50) navigate(delta > 0 ? 1 : -1);
        }}
      >
        {/* Glass blur background */}
        <div style={{
          position: 'absolute', inset: '-20px',
          backgroundImage: `url('${PHOTOS[activeIndex]}')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(50px) brightness(1.1) saturate(1.2)',
          transform: 'scale(1.1)',
          transition: 'background-image 600ms ease',
        }} />

        {/* The main photo frame */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: '100vw', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
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
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
              filter: wipeProgress > 5 && wipeProgress < 95
                ? `blur(${Math.sin(wipeProgress / 100 * Math.PI) * 3}px)`
                : 'none',
              transition: 'clip-path 0ms',
            }}>
              <img
                src={PHOTOS[nextIndex]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                draggable={false}
              />
              {/* Lens edge highlight */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                right: `${100 - wipeProgress}%`,
                width: '40px',
                transform: 'translateX(50%)',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                pointerEvents: 'none',
                filter: 'blur(8px)',
              }} />
            </div>
          )}

          {/* Current photo when no transition */}
          {nextIndex === null && (
            <img
              src={PHOTOS[activeIndex]}
              alt={`Photo ${activeIndex + 1}`}
              style={{
                position: 'relative', zIndex: 2,
                width: '100%', height: '100%',
                objectFit: 'contain', display: 'block',
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Left nav arrow */}
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

        {/* Right nav arrow */}
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
      </div>

      {/* FILMSTRIP CAROUSEL */}
      <div style={{
        width: '100%', position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: '8px',
        padding: '16px 12px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, transparent 0%, rgba(220,215,210,0.9) 40%, rgba(210,205,200,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}>
        {/* Center indicator line */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '2px', height: '100%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)',
          pointerEvents: 'none',
        }} />

        {[-3,-2,-1,0,1,2,3].map(offset => {
          const photoIndex = (activeIndex + offset + PHOTOS.length) % PHOTOS.length;
          const scale = getSlotScale(offset);
          const opacity = getSlotOpacity(offset);
          const isCenter = offset === 0;
          
          return (
            <button
              key={offset}
              onClick={() => !isTransitioning && setActiveIndex(photoIndex)}
              style={{
                flexShrink: 0,
                width: `${Math.round(56 * scale)}px`,
                height: `${Math.round(72 * scale)}px`,
                borderRadius: '8px',
                overflow: 'hidden',
                border: isCenter
                  ? '2px solid rgba(0,0,0,0.5)'
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
