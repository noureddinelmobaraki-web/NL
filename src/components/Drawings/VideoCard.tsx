import { useState, useEffect, useRef, memo } from 'react';
import Hls from 'hls.js';
import { ASSETS } from '../../constants/assets';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { VideoData } from './types';

export const VideoCard = memo(({
  video, index, activeIndex, isMobileView, isMuted, total, onRef
}: {
  video: VideoData;
  index: number;
  activeIndex: number;
  isMobileView: boolean;
  isMuted: boolean;
  total: number;
  onRef: (el: HTMLVideoElement | null, idx: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isActive = index === activeIndex;
  const [shouldLoad, setShouldLoad] = useState(false);
  const resolvedTheme = useResolvedTheme();

  // Lazy load: only initialize HLS when card is near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) { setShouldLoad(true); observer.disconnect(); } },
      { rootMargin: '400px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const videoEl = videoRef.current;
    const source = video.hls || video.src;
    if (Hls.isSupported() && source.includes('.m3u8')) {
      const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hls.loadSource(source);
      hls.attachMedia(videoEl);
      hlsRef.current = hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = source;
    } else {
      videoEl.src = video.src;
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [shouldLoad, video.src, video.hls]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // ── MOBILE/TABLET FULLSCREEN LAYOUT ──────────────────────────────────────
  if (isMobileView) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center bg-black"
        style={{
          width: '100vw',
          height: '100dvh',
          transform: `translateX(${(index - activeIndex) * 100}%)`,
          transition: 'transform 300ms ease-out',
          willChange: 'transform',
        }}
      >
        <video
          ref={el => { videoRef.current = el; onRef(el, index); }}
          poster={video.poster.startsWith('/images/posters/') ? ASSETS.profile.me_bits[0] : video.poster}
          aria-label={`Drawing work ${index + 1} of ${total}`}
          playsInline
          loop
          muted={isMuted}
          autoPlay={isActive}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: resolvedTheme === 'light' ? 'white' : 'black',
          }}
        />
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  const renderVideo = () => (
    <video
      ref={el => { videoRef.current = el; onRef(el, index); }}
      poster={video.poster.startsWith('/images/posters/') ? ASSETS.profile.me_bits[0] : video.poster}
      aria-label={`Drawing work ${index + 1} of ${total}`}
      playsInline
      loop
      muted={isMuted}
      autoPlay={isActive}
      className="absolute inset-0 w-full h-full object-contain"
      style={{ background: resolvedTheme === 'light' ? 'white' : 'black' }}
    />
  );

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateX(${(index - activeIndex) * 102}%)`,
        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isActive ? 10 : 5,
        opacity: Math.abs(index - activeIndex) > 1 ? 0.05 : isActive ? 1 : 0.4,
      }}
    >
      <div
        style={{
          height: '100%',
          aspectRatio: '9 / 16',
          maxWidth: '100vw',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: resolvedTheme === 'light' ? '0px' : '16px',
          background: resolvedTheme === 'light' ? 'white' : 'black',
          transform: isActive ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 400ms ease',
          boxShadow: resolvedTheme === 'light' ? 'none' : (isActive ? '0 32px 80px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.3)'),
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        {resolvedTheme === 'light' ? (
          <OsWindow title={`player.${video.id}`} className="w-full h-full p-0">
            <div className="relative w-full h-full overflow-hidden">
              {renderVideo()}
            </div>
          </OsWindow>
        ) : (
          renderVideo()
        )}
      </div>
    </div>
  );
});
