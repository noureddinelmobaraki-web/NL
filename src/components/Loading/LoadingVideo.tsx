import { useEffect, useRef, useState, useCallback } from 'react';
import { useViewportMode } from '../../hooks/useViewportMode';

interface LoadingVideoProps {
  desktopUrl: string;
  mobileUrl: string;
  posterUrl: string;
  useStatic: boolean;
  onFail: () => void;
  onCanPlay?: () => void;
}

export const LoadingVideo = ({
  desktopUrl, mobileUrl, posterUrl, useStatic, onFail, onCanPlay,
}: LoadingVideoProps) => {
  const { isMobile, isTablet } = useViewportMode();
  const videoUrl = (isMobile || isTablet) ? mobileUrl : desktopUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localFailed, setLocalFailed] = useState(false);

  const onFailRef = useRef(onFail);
  const onCanPlayRef = useRef(onCanPlay);

  useEffect(() => {
    onFailRef.current = onFail;
    onCanPlayRef.current = onCanPlay;
  }, [onFail, onCanPlay]);

  const triggerFail = useCallback(() => {
    setLocalFailed(true);
    onFailRef.current();
  }, []);

  const onCanPlayEvent = useCallback(() => {
    onCanPlayRef.current?.();
  }, []);

  useEffect(() => {
    if (useStatic) return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    const tryPlay = () => video.play().then(() => onCanPlayEvent()).catch(e => {
        console.warn('Video failed to play:', e);
        triggerFail();
    });
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener('canplay', tryPlay, { once: true });
    
    return () => {
      video.removeEventListener('canplay', tryPlay);
    };
  }, [useStatic, videoUrl, onCanPlayEvent, triggerFail]);

  if (useStatic) {
    return (
      <img src={posterUrl} alt="" referrerPolicy="no-referrer"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
    );
  }
  if (localFailed) {
    return <div style={{ position:'absolute', inset:0, background:
      'radial-gradient(circle at 50% 50%, #1e3a8a 0%, #0c1f4d 60%, #050a1f 100%)' }} />;
  }
  return (
    <video
      ref={videoRef}
      key={videoUrl}
      autoPlay muted loop playsInline preload="auto"
      onError={triggerFail}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
    >
      <source src={videoUrl} type="video/webm" />
    </video>
  );
};
