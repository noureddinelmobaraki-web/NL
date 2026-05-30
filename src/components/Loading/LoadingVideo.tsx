import { useEffect, useRef, useState } from 'react';

interface LoadingVideoProps {
  videoUrl: string;
  posterUrl: string;
  useStatic: boolean;
  isReturning: boolean;
  onFail: () => void;
  onCanPlay?: () => void;
}

export const LoadingVideo = ({
  videoUrl,
  posterUrl,
  useStatic,
  isReturning: _isReturning,
  onFail,
  onCanPlay,
}: LoadingVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localFailed, setLocalFailed] = useState(false);

  const triggerFail = () => {
    setLocalFailed(true);
    onFail();
  };

  useEffect(() => {
    if (useStatic) return;
    const video = videoRef.current;
    if (!video) return;

    video.load();
    const tryPlay = () => {
      video.play()
        .then(() => {
          onCanPlay?.();
        })
        .catch(triggerFail);
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    const stall = setTimeout(() => {
      triggerFail();
    }, 3000);

    const handlePlaying = () => {
      clearTimeout(stall);
    };

    video.addEventListener('playing', handlePlaying, { once: true });

    return () => {
      clearTimeout(stall);
      if (video) {
        video.removeEventListener('canplay', tryPlay);
        video.removeEventListener('playing', handlePlaying);
      }
    };
  }, [useStatic, videoUrl]);

  if (useStatic) {
    return (
      <img
        src={posterUrl}
        alt="Loading screen background"
        referrerPolicy="no-referrer"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
      />
    );
  }

  if (localFailed) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg,#0a0a0f 0%,#141428 50%,#0a0a0f 100%)',
        backgroundImage: 'radial-gradient(circle at 2px 2px,rgba(255,255,255,0.04) 1px,transparent 0)',
        backgroundSize: '20px 20px',
      }} />
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      onError={triggerFail}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
    />
  );
};
