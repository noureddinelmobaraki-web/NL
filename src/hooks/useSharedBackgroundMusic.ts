import { useEffect, useRef, useState } from 'react';
import { audioManager } from '../audio/audioManager';
import { ensureAutoplay } from '../audio/ensureAutoplay';
import Hls from 'hls.js';

type MusicKey = 'bg' | 'song' | 'lens' | 'video' | 'mebit' | 'intro' | 'games' | 'movies' | 'series' | 'tv' | 'retro' | 'xp';

interface SharedMusicOptions {
  key: MusicKey;
  url: string;
  volume?: number;
}

export function useSharedBackgroundMusic(isActive: boolean, options: SharedMusicOptions) {
  const { key, url, volume = 0.6 } = options;
  const readyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Keep a ref of isActive to avoid re-triggering audio initialization on state changes
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Handle dynamic play/pause transitions when isActive state changes
  useEffect(() => {
    if (!readyRef.current) return;
    if (isActive) {
      audioManager.pause(key);
    } else {
      audioManager.play(key).catch(() => {});
    }
  }, [isActive, key]);

  // Audio setup and HLS binding - runs only when stream source (key/url) changes
  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try { a.pause(); } catch {}
      try { a.removeAttribute('src'); a.load(); } catch {}
    };

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    audioManager.register(key, audio, volume);

    const onAudioError = (e: any) => {
      console.error(`[SharedBackgroundMusic:${key}] Audio source failed:`, url, e);
    };
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (!isActiveRef.current) {
        audioManager.play(key).catch((err) => {
          console.log(`[SharedBackgroundMusic:${key}] Autoplay prevented, waiting user gesture.`, err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error(`[SharedBackgroundMusic:${key}] HLS error:`, data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(url);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
    }

    const cleanupAutoplay = ensureAutoplay(key);
    readyRef.current = true;
    tryPlay();

    return () => {
      audio.removeEventListener('error', onAudioError);
      audio.removeEventListener('canplay', tryPlay);
      if (hlsRef.current) {
        try {
          hlsRef.current.off(Hls.Events.MANIFEST_PARSED, tryPlay);
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      cleanupAutoplay();
      readyRef.current = false;
      audioManager.stop(key);
      try { audioManager.unregister(key); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [key, url, volume]);

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioManager.isSourceActive(key)) {
        audioManager.pause(key);
        setIsMuted(true);
      } else {
        audioManager.play(key).catch(() => {});
        setIsMuted(false);
      }
    }
  };

  return { isMuted, toggleMute };
}
