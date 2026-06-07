import { useEffect, useRef, useCallback } from 'react';

export interface UseSectionVideoOpts {
  src: string;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  onEnded?: () => void;
  onError?: () => void;
}

export const useSectionVideo = (opts: UseSectionVideoOpts) => {
  const ref = useRef<HTMLVideoElement>(null);
  const play = useCallback(() => ref.current?.play().catch(() => opts.onError?.()), [opts]);
  const pause = useCallback(() => ref.current?.pause(), []);
  const reset = useCallback(() => {
    if (ref.current) { ref.current.currentTime = 0; }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !opts.autoplay) return;
    const tryPlay = () => play();
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener('canplay', tryPlay, { once: true });
    return () => el.removeEventListener('canplay', tryPlay);
  }, [opts.src, opts.autoplay, play]);

  return { ref, play, pause, reset };
};
