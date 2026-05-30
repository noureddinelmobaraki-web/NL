import { memo, useRef, useState } from 'react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { VideoData } from './types';

export const VideoPreview = memo(({ video, index }: { video: VideoData; index: number }) => {
  const resolvedTheme = useResolvedTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  const renderContent = () => (
    <div
      className={`w-full aspect-[9/16] cursor-pointer relative group overflow-hidden
        ${resolvedTheme === 'lite' ? 'bg-black' : 'bg-[var(--bg-glass)]'}
        ${resolvedTheme !== 'light' && resolvedTheme !== 'lite' ? 'rounded-[8px] border border-white/[0.08] hover:border-white/20 transition-all duration-500' : ''}
        ${resolvedTheme === 'dark' ? 'bg-white/[0.03]' : ''}
      `}
    >
      <video
        ref={videoRef}
        src={video.src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          filter: resolvedTheme === 'lite' ? 'grayscale(100%)' : 'none',
        }}
      />
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: resolvedTheme === 'lite' ? '#111' : 'var(--bg-elevated, #111)' }}
        >
          <span className="text-white/30 font-mono text-xs">
            {(index + 1).toString().padStart(2, '0')}
          </span>
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none'
      }} />
      <div className="absolute bottom-2 left-3">
        <span className="text-white text-[10px] font-mono font-bold tracking-widest opacity-80">
          {(index + 1).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );

  if (resolvedTheme === 'light') {
    return (
      <OsWindow title={`drawing_${index + 1}.mp4`} className="h-full">
        {renderContent()}
      </OsWindow>
    );
  }
  return renderContent();
});
