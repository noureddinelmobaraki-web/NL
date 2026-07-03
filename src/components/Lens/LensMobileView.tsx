import { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useGalleryThemeSkin } from '../../hooks/useGalleryThemeSkin';
import { motion } from 'framer-motion';

interface LensMobileViewProps {
  photos: string[];
  selectedIndex: number;
  mode: 'grid' | 'view';
  isMuted: boolean;
  uiVisible: boolean;
  onEnterGrid: () => void;
  onOpenView: (i: number) => void;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onToggleMute: () => void;
}

export const LensMobileView = ({
  photos,
  selectedIndex,
  mode,
  isMuted,
  uiVisible,
  onEnterGrid,
  onOpenView,
  onIndexChange,
  onClose,
  onToggleMute,
}: LensMobileViewProps) => {
  const skin = useGalleryThemeSkin();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [chromeVisible, setChromeVisible] = useState(true);

  // Sync state with chromeVisibility from props or toggle locally
  useEffect(() => {
    setChromeVisible(uiVisible);
  }, [uiVisible]);

  // Reset zoom whenever selectedIndex or mode transitions
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedIndex, mode]);

  // Synchronize CSS scroll snap container when selectedIndex changes
  useEffect(() => {
    if (mode === 'view' && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const targetLeft = selectedIndex * container.clientWidth;
      if (Math.abs(container.scrollLeft - targetLeft) > 10) {
        container.scrollTo({ left: targetLeft, behavior: 'auto' });
      }
    }
  }, [selectedIndex, mode]);

  // Handle snapping in iOS momentum Scroll Snap
  const handleScroll = () => {
    if (mode !== 'view' || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    if (container.clientWidth === 0) return;
    const currentScrollIndex = Math.round(container.scrollLeft / container.clientWidth);
    if (currentScrollIndex >= 0 && currentScrollIndex < photos.length && currentScrollIndex !== selectedIndex) {
      onIndexChange(currentScrollIndex);
    }
  };

  // Handle zoom dragging
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerImgMove = (e: React.PointerEvent) => {
    if (zoom > 1 && lastTouchRef.current) {
      const dx = e.clientX - lastTouchRef.current.x;
      const dy = e.clientY - lastTouchRef.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUpOrCancel = () => {
    lastTouchRef.current = null;
  };

  useTouchGestures(viewerRef, {
    enabled: mode === 'view',
    onSwipeLeft: () => {
      if (zoom === 1) onIndexChange((selectedIndex + 1) % photos.length);
    },
    onSwipeRight: () => {
      if (zoom === 1) onIndexChange((selectedIndex - 1 + photos.length) % photos.length);
    },
    onSwipeDown: () => {
      if (zoom === 1) onClose();
    },
    onDoubleTap: (pt) => {
      if (zoom > 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setZoom(2.2);
        if (viewerRef.current) {
          const r = viewerRef.current.getBoundingClientRect();
          setPan({
            x: -(pt.x - r.left - r.width / 2),
            y: -(pt.y - r.top - r.height / 2),
          });
        }
      }
    },
    onPinch: (scale) => {
      setZoom(Math.min(Math.max(scale, 1), 3.5));
    },
    onPinchEnd: () => {
      if (zoom < 1.1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    },
    threshold: 50,
  });

  const toggleChrome = (_e: React.MouseEvent) => {
    if (zoom > 1) return;
    setChromeVisible(prev => !prev);
  };

  // ── GRID MODE ────────────────────────────────────────────
  if (mode === 'grid') {
    return (
      <div className="mobile-gallery-root transition-all duration-300" data-gallery-skin={skin}>
        {/* Glass Header for Grid Mode */}
        <div className="ios-chrome-bar" style={{ opacity: chromeVisible ? 1 : 0 }}>
          <span className="text-white text-lg font-bold tracking-tight">Lens</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              className="ios-btn"
              aria-label={isMuted ? 'Play Audio' : 'Mute'}
              type="button"
            >
              {isMuted ? <VolumeX size={20} className="text-zinc-400" /> : <Volume2 size={20} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="ios-btn ios-btn-close"
              aria-label="Close Gallery"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Momentum Grid Scroll */}
        <div className="ios-grid-container">
          <div className="ios-grid" role="grid" aria-label="Lens photos grid">
            {photos.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => onOpenView(i)}
                className="grid-photo-btn"
                aria-label={`Open Image ${i + 1}`}
              >
                <motion.img
                  layoutId={i === selectedIndex ? "lens-img-active" : undefined}
                  src={src}
                  alt={`Lens photo ${i + 1}`}
                  loading={i < 12 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-full object-cover block"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ────────────────────────────────────────────
  return (
    <div className="mobile-gallery-root relative overflow-hidden select-none" data-gallery-skin={skin} onClick={toggleChrome}>
      {/* iOS Tap-to-toggle Top Bar */}
      <div 
        className="ios-chrome-bar"
        style={{
          opacity: chromeVisible ? 1 : 0,
          transform: chromeVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: chromeVisible ? 'auto' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEnterGrid(); }}
          className="ios-btn"
          aria-label="Back to Grid"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="ios-counter">
          {selectedIndex + 1} / {photos.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            className="ios-btn"
            aria-label={isMuted ? 'Play Audio' : 'Mute'}
            type="button"
          >
            {isMuted ? <VolumeX size={20} className="text-zinc-400" /> : <Volume2 size={20} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="ios-btn ios-btn-close"
            aria-label="Close Gallery"
            type="button"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Snap Horizontal Scroll View */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="ios-scroll-container"
      >
        {photos.map((src, i) => (
          <div key={`view-${src}-${i}`} className="ios-scroll-item">
            {i === selectedIndex ? (
              <div
                ref={viewerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerImgMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                className="w-full h-full flex items-center justify-center p-4 bg-black"
                style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
              >
                <motion.img
                  layoutId="lens-img-active"
                  src={src}
                  alt={`Photo ${selectedIndex + 1}`}
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none transform-gpu origin-center"
                  style={{
                    scale: zoom,
                    x: pan.x,
                    y: pan.y,
                    transition: zoom === 1 ? 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                    willChange: 'transform'
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* أسهم تنقّل شفافة — تظهر فقط عند عدم التكبير */}
      {zoom === 1 && (
        <>
          <button
            type="button"
            className="gallery-nav-arrow gallery-nav-prev"
            aria-label="Previous Image"
            onClick={(e) => { e.stopPropagation(); onIndexChange((selectedIndex - 1 + photos.length) % photos.length); }}
          >
            <ChevronLeft size={26} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gallery-nav-arrow gallery-nav-next"
            aria-label="Next Image"
            onClick={(e) => { e.stopPropagation(); onIndexChange((selectedIndex + 1) % photos.length); }}
          >
            <ChevronRight size={26} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
};
