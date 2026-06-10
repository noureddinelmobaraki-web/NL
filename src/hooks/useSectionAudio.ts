import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import { audioManager } from '../audio/audioManager';
import { ensureAutoplay } from '../audio/ensureAutoplay';

type AudioSource = 'bg' | 'song' | 'lens' | 'video' | 'mebit';

interface UseSectionAudioOptions {
  source: AudioSource;
  url?: string;
  volume?: number;
  autoplay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
}

/**
 * Section-level audio hook — unifies registration, lifecycle, and playback state.
 * Replaces scattered audioManager.register() + audioManager.play() patterns.
 */
export function useSectionAudio({
  source,
  url,
  volume = 0.7,
  autoplay = false,
  preload = 'none',
}: UseSectionAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // useSyncExternalStore — modern React 18/19 pattern, replaces manual setState callback
  const isPlaying = useSyncExternalStore(
    (cb) => {
      const unsubscribe = audioManager.subscribeState(source, cb);
      return unsubscribe;
    },
    () => audioManager.isSourceActive(source),
    () => false
  );

  // Register on mount
  useEffect(() => {
    let cleanupAutoplay: (() => void) | undefined;
    if (!audioRef.current && url) {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      audio.preload = preload;
      audio.volume = 0;
      audioRef.current = audio;
      audioManager.register(source, audio, volume);
      if (autoplay) {
        cleanupAutoplay = ensureAutoplay(source);
      }
    }
    return () => {
      if (cleanupAutoplay) {
        cleanupAutoplay();
      }
      if (audioRef.current) {
        audioManager.stop(source);
        audioRef.current = null;
      }
    };
  }, [source, url, volume, autoplay, preload]);

  const play = useCallback(() => audioManager.play(source), [source]);
  const pause = useCallback(() => audioManager.pause(source), [source]);
  const toggle = useCallback(() => {
    if (audioManager.isSourceActive(source)) {
      audioManager.pause(source);
    } else {
      audioManager.play(source);
    }
  }, [source]);

  return { audioRef, isPlaying, play, pause, toggle };
}
