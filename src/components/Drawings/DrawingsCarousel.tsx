import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { VideoData } from './types';
import { VideoCard } from './VideoCard';

interface DrawingsCarouselProps {
  videos: VideoData[];
  activeIndex: number;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRef: (el: HTMLVideoElement | null, i: number) => void;
}

export const DrawingsCarousel = ({
  videos,
  activeIndex,
  isMuted,
  onClose,
  onToggleMute,
  onNext,
  onPrev,
  onRef,
}: DrawingsCarouselProps) => {
  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="relative w-full mt-5"
      >
        <div
          className="relative w-full bg-[var(--bg-glass-strong)] backdrop-blur-xl rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
          style={{ padding: '20px 0' }}
        >
          {/* Top bar */}
          <div className="flex justify-between items-center px-4 py-3">
            <button
              className="text-[var(--text-inverse)] bg-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/70 p-2.5 rounded-full backdrop-blur-md"
              onClick={onClose}
              aria-label="Close drawings"
            >
              <X size={24} />
            </button>
            <button
              className="text-[var(--text-inverse)] bg-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/70 p-2.5 rounded-full backdrop-blur-md"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          {/* Carousel area — 70vh, clips overflow so neighbor cards peek in */}
          <div 
            className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden"
            style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
          >
            {videos.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                index={idx}
                activeIndex={activeIndex}
                isMobileView={false}
                isMuted={isMuted}
                total={videos.length}
                onRef={(el) => onRef(el, idx)}
              />
            ))}

            {/* Desktop arrows */}
            <button
              className="absolute left-6 top-1/2 -translate-y-1/2 z-[100] text-white bg-white/20 hover:bg-white/40 p-4 rounded-full disabled:opacity-0 transition-all backdrop-blur-md"
              onClick={onPrev}
              disabled={activeIndex === 0}
              aria-label="Previous work"
            >
              <ChevronLeft size={36} />
            </button>
            <button
              className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] text-white bg-white/20 hover:bg-white/40 p-4 rounded-full disabled:opacity-0 transition-all backdrop-blur-md"
              onClick={onNext}
              disabled={activeIndex === videos.length - 1}
              aria-label="Next work"
            >
              <ChevronRight size={36} />
            </button>
          </div>

          {/* Counter */}
          <div className="p-6 text-center">
            <span className="text-[var(--text-muted)] font-mono tracking-widest">
              {activeIndex + 1} / {videos.length}
            </span>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
};
