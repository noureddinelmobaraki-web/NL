import React from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { VideoData } from './types';
import { VideoCard } from './VideoCard';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

interface DrawingsFullscreenProps {
  videos: VideoData[];
  activeIndex: number;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onRef: (el: HTMLVideoElement | null, i: number) => void;
}

export const DrawingsFullscreen = ({
  videos,
  activeIndex,
  isMuted,
  onClose,
  onToggleMute,
  onNext,
  onPrev,
  onTouchStart,
  onTouchEnd,
  onRef,
}: DrawingsFullscreenProps) => {
  const resolvedTheme = useResolvedTheme();

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${resolvedTheme === 'light' ? 'bg-white' : 'bg-black'}`}
      style={{ zIndex: 9010 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Video cards — each is a full 100vw × 100dvh layer */}
      <div className="relative w-full h-full" style={{ touchAction: 'pan-y' }}>
        {videos.map((video, idx) => (
          <VideoCard
            key={video.id}
            video={video}
            index={idx}
            activeIndex={activeIndex}
            isMobileView={true}
            isMuted={isMuted}
            total={videos.length}
            onRef={(el) => onRef(el, idx)}
          />
        ))}
      </div>

      {/* Top bar: close + counter + mute */}
      <div
        className={`absolute top-0 left-0 right-0 z-[200] flex justify-between items-center px-4 ${resolvedTheme === 'light' ? 'text-black' : 'text-white'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
      >
        <button
          onClick={onClose}
          className={`backdrop-blur-md p-2.5 rounded-full border ${resolvedTheme === 'light' ? 'bg-white/50 border-black/20' : 'bg-black/50 border-white/20'}`}
          aria-label="Close"
        >
          <X size={22} />
        </button>

        <span className={`font-mono text-sm backdrop-blur-md px-3 py-1 rounded-full ${resolvedTheme === 'light' ? 'bg-white/40 text-black/70' : 'bg-black/40 text-white/70'}`}>
          {activeIndex + 1} / {videos.length}
        </span>

        <button
          onClick={onToggleMute}
          className={`backdrop-blur-md p-2.5 rounded-full border ${resolvedTheme === 'light' ? 'bg-white/50 border-black/20' : 'bg-black/50 border-white/20'}`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      </div>

      {/* Invisible tap zones for prev/next (left 30% / right 30%) */}
      <div
        className="absolute left-0 z-[100] cursor-pointer"
        style={{ top: '20%', bottom: '20%', width: '30%' }}
        onClick={() => { if (activeIndex > 0) onPrev(); }}
        aria-label="Previous"
      />
      <div
        className="absolute right-0 z-[100] cursor-pointer"
        style={{ top: '20%', bottom: '20%', width: '30%' }}
        onClick={() => { if (activeIndex < videos.length - 1) onNext(); }}
        aria-label="Next"
      />

      {/* Progress dots at bottom */}
      <div
        className="absolute left-0 right-0 z-[200] flex justify-center gap-1.5"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {videos.slice(
          Math.max(0, activeIndex - 3),
          Math.min(videos.length, activeIndex + 4)
        ).map((_, i) => {
          const realIdx = Math.max(0, activeIndex - 3) + i;
          return (
            <div
              key={realIdx}
              className="rounded-full transition-all duration-300"
              style={{
                width: realIdx === activeIndex ? '18px' : '6px',
                height: '6px',
                background: realIdx === activeIndex
                  ? (resolvedTheme === 'light' ? 'black' : 'white')
                  : (resolvedTheme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'),
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
