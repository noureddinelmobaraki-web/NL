import { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { useTouchGestures } from '../../hooks/useTouchGestures';

interface MobileMeBitViewProps {
  images: string[];
  selectedIndex: number;
  mode: 'grid' | 'view';
  onEnterGrid: () => void;
  onOpenView: (i: number) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  isMeBitPlaying: boolean;
  onToggleAudio: () => void;
}

const TOUCH_BTN_SIZE = 44;

export const MeBitMobileView = ({
  images,
  selectedIndex,
  mode,
  onEnterGrid,
  onOpenView,
  onClose,
  onNext,
  onPrev,
  isMeBitPlaying,
  onToggleAudio,
}: MobileMeBitViewProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Reset zoom whenever active image changes or mode transitions
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedIndex, mode]);

  // Handle drag/pan when zoomed in
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
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
      if (zoom === 1) onNext();
    },
    onSwipeRight: () => {
      if (zoom === 1) onPrev();
    },
    onSwipeDown: () => {
      if (zoom === 1) onClose();
    },
    onDoubleTap: (pt) => {
      if (zoom > 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setZoom(2);
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

  // ── Grid mode ────────────────────────────────────────────
  if (mode === 'grid') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
        {/* Fixed Top bar for Grid Mode */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
            paddingBottom: 12,
            paddingLeft: 16,
            paddingRight: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))',
            zIndex: 10,
          }}
        >
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            ME bit
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Audio Toggle Button */}
            <button
              onClick={onToggleAudio}
              aria-label={isMeBitPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
              style={{
                width: TOUCH_BTN_SIZE,
                height: TOUCH_BTN_SIZE,
                minWidth: TOUCH_BTN_SIZE,
                minHeight: TOUCH_BTN_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              {isMeBitPlaying ? <Volume2 size={22} /> : <VolumeX size={22} className="text-zinc-500" />}
            </button>

            {/* Close/Exit Button */}
            <button
              onClick={onClose}
              aria-label="إغلاق المعرض"
              style={{
                width: TOUCH_BTN_SIZE,
                height: TOUCH_BTN_SIZE,
                minWidth: TOUCH_BTN_SIZE,
                minHeight: TOUCH_BTN_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239, 68, 68, 0.4)',
                borderRadius: '50%',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fff',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable grid area */}
        <div
          style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingTop: 'calc(env(safe-area-inset-top) + 64px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <div
            role="grid"
            aria-label="MeBit gallery grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => onOpenView(i)}
                aria-label={`فتح الصورة ${i + 1}`}
                style={{
                  aspectRatio: '1 / 1',
                  background: '#111',
                  borderRadius: 8,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <img
                  src={src}
                  alt={`MeBit ${i + 1}`}
                  loading={i < 9 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {/* Top bar: Back + counter + audio + close */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          zIndex: 10,
        }}
      >
        <button
          onClick={onEnterGrid}
          aria-label="عودة للشبكة"
          style={{
            width: TOUCH_BTN_SIZE,
            height: TOUCH_BTN_SIZE,
            minWidth: TOUCH_BTN_SIZE,
            minHeight: TOUCH_BTN_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--text-primary, #fff)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={22} />
        </button>

        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'var(--text-primary, #fff)',
            background: 'rgba(0,0,0,0.35)',
            padding: '4px 10px',
            borderRadius: 12,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {selectedIndex + 1} / {images.length}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Audio Toggle Button */}
          <button
            onClick={onToggleAudio}
            aria-label={isMeBitPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
            style={{
              width: TOUCH_BTN_SIZE,
              height: TOUCH_BTN_SIZE,
              minWidth: TOUCH_BTN_SIZE,
              minHeight: TOUCH_BTN_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            {isMeBitPlaying ? <Volume2 size={22} /> : <VolumeX size={22} className="text-zinc-500" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="إغلاق المعرض"
            style={{
              width: TOUCH_BTN_SIZE,
              height: TOUCH_BTN_SIZE,
              minWidth: TOUCH_BTN_SIZE,
              minHeight: TOUCH_BTN_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.4)',
              borderRadius: '50%',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--text-primary, #fff)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Image viewer area (gesture-target) */}
      <div
        ref={viewerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          touchAction: zoom > 1 ? 'none' : 'pan-y',
        }}
      >
        <img
          src={images[selectedIndex]}
          alt={`MeBit ${selectedIndex + 1}`}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: zoom === 1 ? 'transform 250ms ease' : 'none',
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
};
