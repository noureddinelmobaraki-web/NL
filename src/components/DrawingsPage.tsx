import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceType } from '../hooks/useDeviceType';

const videos = [
  "https://github.com/user-attachments/assets/c4d4ad7b-3510-4ddf-a27f-8527b4d4ab6b",
  "https://github.com/user-attachments/assets/90858c96-a2d9-4afd-b6ea-2671fe0af65a",
  "https://github.com/user-attachments/assets/a790a505-8e73-4d8b-80d7-b2e11527e7e5",
  "https://github.com/user-attachments/assets/b9fe4e0b-5414-48f3-9b54-d2748325b98b",
  "https://github.com/user-attachments/assets/80fb8f8e-45fa-46d2-9326-53f5dfd85e33",
  "https://github.com/user-attachments/assets/ce41a097-eb9e-4d65-ae38-dc3401e73700",
  "https://github.com/user-attachments/assets/27d9b8a7-719a-455e-ade5-f1cea3ad0b15",
  "https://github.com/user-attachments/assets/e905896e-13f1-48de-9acd-a3b1e075b829",
  "https://github.com/user-attachments/assets/216e3cb7-b159-4b63-90d3-f1a12d3c47d0",
  "https://github.com/user-attachments/assets/33bb3f27-6d4b-4820-a3ad-1ed706eb65a9",
  "https://github.com/user-attachments/assets/57383d4c-7747-491c-833c-9d51894b9589",
  "https://github.com/user-attachments/assets/b229c09e-b2ac-4c20-86b6-e1396b161de1",
  "https://github.com/user-attachments/assets/a556574f-d7f4-4b64-9afd-1389de160df0",
  "https://github.com/user-attachments/assets/1798b138-4126-4c3e-8a44-a81d46bc4386",
  "https://github.com/user-attachments/assets/f6c28409-7ef1-4be3-8da2-cb0584a513f3",
  "https://github.com/user-attachments/assets/7a7b92df-895f-424a-839f-bf89b2ef5f8c",
  "https://github.com/user-attachments/assets/353967f7-c9d7-446e-ac7b-ed42bc96b3e4",
  "https://github.com/user-attachments/assets/c6e605bb-3104-4ddd-940e-9efd3b47d529",
  "https://github.com/user-attachments/assets/d760627b-cc17-4d1a-a34c-d46a74608c7e",
  "https://github.com/user-attachments/assets/aa2ea65f-b7fa-4f32-ae75-ce17e07cd665",
  "https://github.com/user-attachments/assets/50446b3e-2652-4ce5-b30b-72f084ea2066",
  "https://github.com/user-attachments/assets/21965ef2-4b9f-4cd8-81fd-1abd50aff375",
  "https://github.com/user-attachments/assets/24b205a5-7781-449a-ac33-d9993d625a23",
  "https://github.com/user-attachments/assets/fa361da1-0c26-4181-853b-03ae4027b938",
  "https://github.com/user-attachments/assets/3c79256f-674a-4add-a2ce-94aed5afaa59",
  "https://github.com/user-attachments/assets/2d6f90f8-66e1-4ffd-99c8-e02cc3ba1a59",
  "https://github.com/user-attachments/assets/e931d6d4-1cd4-4639-b48a-396bd2712b44",
  "https://github.com/user-attachments/assets/e74a139b-242c-4306-8caf-bfcbd1b9bb59",
  "https://github.com/user-attachments/assets/3b7343a8-eebe-438a-804d-464b8ca491a8",
  "https://github.com/user-attachments/assets/457e221f-1357-4811-be18-39d3cd967aef",
  "https://github.com/user-attachments/assets/f489caf7-14d0-4a20-b0a7-cf6e07a2fc5b",
  "https://github.com/user-attachments/assets/5b68feab-b194-42f2-ae40-3a315599f6a9",
  "https://github.com/user-attachments/assets/3ffd52c7-b168-4753-a7d1-0e50bce3c5b4",
  "https://github.com/user-attachments/assets/a05f98d0-a60a-4aa9-9e7b-c3f57ab32bfe",
  "https://github.com/user-attachments/assets/2ba7487c-e2c1-4a17-8ca5-6686dd962bdf",
  "https://github.com/user-attachments/assets/f3e5e9fc-7e45-40ac-826b-886856b5cc43",
  "https://github.com/user-attachments/assets/85df54af-b89a-4e9f-9a9b-5b5da5bc13e8",
  "https://github.com/user-attachments/assets/bfce5c2a-e63d-4c95-9b43-1027edc1f83a",
  "https://github.com/user-attachments/assets/1afe3ca5-3f59-47d5-a1a0-20f688962245",
  "https://github.com/user-attachments/assets/c16fbeb7-957d-4efb-9987-385a55be2719",
  "https://github.com/user-attachments/assets/16b39456-ff22-43e8-b562-acb7c6b216bf",
  "https://github.com/user-attachments/assets/14cc0381-1f9b-49ce-a69a-3fe4a178fdd5",
  "https://github.com/user-attachments/assets/48e0669e-7910-4943-b372-43563cc04218",
];

interface VideoCardProps {
  index: number;
  activeIndex: number;
  isMobile: boolean;
  videoRefCallback: (el: HTMLVideoElement | null) => void;
  observer: IntersectionObserver | null;
}

const VideoCard = memo(({ index, activeIndex, isMobile, videoRefCallback, observer }: VideoCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = index === activeIndex;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [observer]);

  return (
    <div 
      ref={containerRef}
      className={`${isActive ? (isMobile ? 'relative w-full' : 'relative') : 'absolute top-0'} left-0 w-full flex items-center justify-center transition-all duration-500 ease-out pointer-events-none`}
      style={{
        transform: isMobile ? `translateX(${(index - activeIndex) * 100}%)` : `translateX(${(index - activeIndex) * 102}%)`,
        zIndex: isActive ? 10 : 5,
        opacity: isMobile ? (isActive ? 1 : 0) : (Math.abs(index - activeIndex) > 1 ? 0.05 : activeIndex === index ? 1 : 0.4)
      }}
    >
      <div 
        className="relative shadow-2xl transition-all duration-500 bg-black flex-shrink-0"
        style={{
          width: isMobile ? '100vw' : 'min(340px, 85vw)',
          height: isMobile ? 'calc(100dvh - var(--safe-top) - var(--safe-bottom))' : 'auto',
          aspectRatio: isMobile ? 'auto' : '9 / 16',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: isMobile ? '0' : '16px',
          background: '#000',
          flexShrink: 0,
          margin: '0 auto',
          transform: (isActive || isMobile) ? 'scale(1)' : 'scale(0.85)',
          pointerEvents: 'auto'
        }}
      >
        <video
          ref={videoRefCallback}
          playsInline
          loop
          muted={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center'
          }}
        />
      </div>
    </div>
  );
});

export const DrawingsPage = ({ onSongPlay }: { onSongPlay: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { isMobile } = useDeviceType();
  const touchStart = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>(new Array(videos.length).fill(null));

  const playVideo = useCallback((index: number) => {
    const v = videoRefs.current[index];
    if (!v) return;
    if (!v.src || !v.src.includes(videos[index])) {
      v.src = videos[index];
      v.load();
    }
    const attempt = () => {
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name === 'AbortError') return;
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    };
    if (v.readyState >= 3) {
      attempt();
    } else {
      v.addEventListener('canplay', attempt, { once: true });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Handled in activeIndex effect
          }
        });
      }, { rootMargin: '0px 400px' });
      
      playVideo(activeIndex);
    } else {
      observerRef.current?.disconnect();
      observerRef.current = null;
      
      videoRefs.current.forEach(v => {
        if (v) {
          v.pause();
          v.src = "";
          v.load();
        }
      });
    }
    return () => observerRef.current?.disconnect();
  }, [isOpen, activeIndex, playVideo]);

  useEffect(() => {
    if (!isOpen) return;

    playVideo(activeIndex);
    
    // PRELOAD neighbors
    [-1, 1].forEach(offset => {
      const i = activeIndex + offset;
      if (i >= 0 && i < videos.length) {
        const v = videoRefs.current[i];
        if (v && !v.src) {
          v.src = videos[i];
          v.preload = 'metadata';
          v.load();
        }
      }
    });

    // Pause all except active
    videoRefs.current.forEach((v, i) => {
      if (i !== activeIndex && v && !v.paused) {
        v.pause();
      }
    });
    
    onSongPlay();
  }, [activeIndex, isOpen, playVideo, onSongPlay]);

  const nextVideo = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, videos.length - 1));
  }, []);

  const prevVideo = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextVideo();
      if (e.key === 'ArrowLeft') prevVideo();
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextVideo, prevVideo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextVideo();
      else prevVideo();
    }
    touchStart.current = null;
  };

  const openGallery = (index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const [showArrows, setShowArrows] = useState(true);
  const arrowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetArrowTimer = useCallback(() => {
    setShowArrows(true);
    if (arrowTimeoutRef.current) clearTimeout(arrowTimeoutRef.current);
    arrowTimeoutRef.current = setTimeout(() => {
      setShowArrows(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      resetArrowTimer();
    }
    return () => {
      if (arrowTimeoutRef.current) clearTimeout(arrowTimeoutRef.current);
    };
  }, [isOpen, isMobile, resetArrowTimer]);

  return (
    <section id="drawings-section" className="w-full py-20 px-6 sm:px-12 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              MY DRAWINGS
            </h1>
          </div>
          <div className="h-px flex-1 bg-zinc-800 hidden sm:block mx-12 mb-4" />
          <div className="text-right">
            <span className="text-red-500 font-mono text-xl">{videos.length}</span>
            <span className="text-zinc-600 text-xs uppercase tracking-widest ml-2">Works total</span>
          </div>
        </header>

        {/* Collapsed State Preview */}
        {!isOpen && (
          <div className="space-y-8 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
              {videos.slice(0, 6).map((url, i) => (
                <div 
                  key={i} 
                  className="bg-[#1a1a1a] rounded-[8px] overflow-hidden"
                  onClick={() => openGallery(i)}
                >
                  <video
                    src={url}
                    preload="metadata"
                    muted
                    playsInline
                    poster="" 
                    onMouseOver={e => {
                      const v = e.currentTarget as HTMLVideoElement;
                      const playPromise = v.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(() => {});
                      }
                    }}
                    onMouseOut={e => { 
                      const v = e.currentTarget as HTMLVideoElement;
                      v.pause(); 
                      if (v.readyState > 0) v.currentTime = 0; 
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '9 / 16',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  />
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setIsOpen(true)}
              className="manga-button !py-4 !px-8 text-xl bg-white text-black shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] transition-all"
            >
              VIEW ALL {videos.length} →
            </button>
          </div>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: isMobile ? '100dvh' : 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`relative w-full ${isMobile ? 'mobile-fullscreen' : 'mt-5'}`}
              style={isMobile ? { zIndex: 9010, background: '#000' } : {}}
            >
              <div 
                className={`relative w-full ${isMobile ? '' : 'bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden'}`}
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  padding: isMobile ? '0' : '20px 0',
                  height: isMobile ? '100%' : 'auto'
                }}
                onTouchStart={(e) => {
                  handleTouchStart(e);
                  if (isMobile) resetArrowTimer();
                }}
                onTouchEnd={(e) => {
                  handleTouchEnd(e);
                  if (isMobile) resetArrowTimer();
                }}
                onClick={() => {
                  if (isMobile) resetArrowTimer();
                }}
              >
                {isMobile ? (
                  <button className="mobile-back-btn" onClick={() => setIsOpen(false)}>
                    <ChevronLeft size={20} /> Back
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                )}
                <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />
                <div className={`relative z-10 w-full flex flex-col items-center ${isMobile ? 'h-full' : ''}`}>
                  {videos.map((_, index) => (
                    <VideoCard 
                      key={index}
                      index={index}
                      activeIndex={activeIndex}
                      isMobile={isMobile}
                      videoRefCallback={el => videoRefs.current[index] = el}
                      observer={observerRef.current}
                    />
                  ))}
                  {isMobile && (
                    <AnimatePresence>
                      {showArrows && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="contents"
                        >
                          <button 
                            onClick={(e) => { e.stopPropagation(); prevVideo(); resetArrowTimer(); }}
                            className="fixed left-2 top-1/2 -translate-y-1/2 z-[9200] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); nextVideo(); resetArrowTimer(); }}
                            className="fixed right-2 top-1/2 -translate-y-1/2 z-[9200] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white"
                          >
                            <ChevronRight size={24} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                  {!isMobile && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); prevVideo(); }} 
                        disabled={activeIndex === 0} 
                        className="absolute left-10 top-1/2 -translate-y-1/2 z-30 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 transition-all hover:bg-white/30 disabled:opacity-0"
                      >
                        <ChevronLeft size={32} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); nextVideo(); }} 
                        disabled={activeIndex === videos.length - 1} 
                        className="absolute right-10 top-1/2 -translate-y-1/2 z-30 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 transition-all hover:bg-white/30 disabled:opacity-0"
                      >
                        <ChevronRight size={32} />
                      </button>
                    </>
                  )}
                  <div 
                    className={`absolute z-30 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 transition-all`}
                    style={{
                      bottom: isMobile ? 'calc(var(--safe-bottom) + 20px)' : '10px',
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className="text-white font-mono text-sm tracking-widest">
                      {activeIndex + 1} <span className="mx-2 text-zinc-500">/</span> {videos.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
