import { useState, useEffect, useCallback, useRef } from 'react';
import { audioManager } from '../audio/audioManager';
import { getOrCreateHls } from '../audio/hlsPool';
import Hls from 'hls.js';
import { THEME_BG_MUSIC, ASSETS } from '../constants/assets';
import { savePrefs } from '../utils/userPrefs';
import type { Theme, AudioIntent } from '../utils/userPrefs';

export interface UseAudioControllerProps {
  isLensGalleryOpen: boolean;
  isGalleryOpen: boolean;
  theme: Theme;
  audioIntent: AudioIntent;
  setAudioIntent: React.Dispatch<React.SetStateAction<AudioIntent>>;
  loaded: boolean;
  setIsGalleryOpen?: (isOpen: boolean) => void;
  setSelectedImageIndex?: (index: number | null) => void;
}

export function useAudioController({
  isLensGalleryOpen,
  isGalleryOpen,
  theme,
  audioIntent,
  setAudioIntent,
  loaded,
  setIsGalleryOpen,
  setSelectedImageIndex,
}: UseAudioControllerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const meBitAudioRef = useRef<HTMLAudioElement | null>(null);
  const meBitHlsAttached = useRef(false);
  const currentBgUrlRef = useRef<string>('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMeBitPlaying, setIsMeBitPlaying] = useState(false);

  // Audio lifecycle for persistent sources
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Register immediately with AudioManager
    audioManager.register('bg', audio, 0.7);
    audioManager.setStateCallback((playing) => setIsPlaying(playing));

    const initialResolved = theme === 'dark' ? 'dark'
      : theme === 'light' ? 'light'
      : theme === 'bit' ? 'bit'
      : 'midnight';
    const url = THEME_BG_MUSIC[initialResolved] ?? ASSETS.media.music;
    currentBgUrlRef.current = url;

    // Safari: native HLS support
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      audio.load();
      audio.addEventListener('loadedmetadata', () => {
        audioManager.triggerManifestParsed();
      }, { once: true });
    } else if (Hls.isSupported()) {
      // Chrome/Android/Firefox: use hls.js
      const hls = getOrCreateHls(url);
      hls.attachMedia(audio);
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        audioManager.triggerManifestParsed();
      });
      const errHandler = (_: any, data: any) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      };
      hls.on(Hls.Events.ERROR, errHandler);
    }

    // Lens
    const lensAudio = new Audio(ASSETS.media.lensMusic);
    lensAudio.crossOrigin = "anonymous";
    lensAudio.loop = true;
    lensAudio.preload = 'auto';
    audioManager.register('lens', lensAudio, 0.7);

    // ME bit (Pre-initialize for instant playback)
    const meBitAudio = new Audio();
    meBitAudio.crossOrigin = "anonymous";
    meBitAudio.loop = true;
    meBitAudio.preload = 'auto';
    meBitAudio.volume = 0;
    meBitAudioRef.current = meBitAudio;
    audioManager.register('mebit', meBitAudio, 0.6);

    const meBitUrl = ASSETS.media.meBitMusic;
    if (meBitAudio.canPlayType('application/vnd.apple.mpegurl')) {
      meBitAudio.src = meBitUrl;
      meBitAudio.load();
    } else if (Hls.isSupported()) {
      const hls = getOrCreateHls(meBitUrl);
      hls.attachMedia(meBitAudio);
      meBitHlsAttached.current = true;
    }

    return () => {
      audioManager.pause('lens');
      audioManager.pause('mebit');
    };
  }, []); // runs once on mount

  // ── Per-theme background music swap ──────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const resolved = theme === 'dark' ? 'dark'
      : theme === 'light' ? 'light'
      : theme === 'bit' ? 'bit'
      : 'midnight';

    const newUrl = THEME_BG_MUSIC[resolved] ?? ASSETS.media.music;

    // Skip on initial mount — handled by the audio init useEffect([])
    if (!currentBgUrlRef.current || currentBgUrlRef.current === newUrl) return;

    const wasPlaying = !audio.paused && audioManager.isSourceActive('bg');
    const wasNotUserPaused = audioIntent !== 'user-paused';

    // 1. Fade out and pause current bg
    audioManager.pause('bg');

    // 2. Detach old HLS instance (kept alive in pool)
    if (Hls.isSupported() && !audio.canPlayType('application/vnd.apple.mpegurl')) {
      // detach from pool instance — do not destroy, keep buffered
      const oldHls = getOrCreateHls(currentBgUrlRef.current);
      oldHls.detachMedia();
    }

    // 3. Update tracking ref
    currentBgUrlRef.current = newUrl;

    // 4. Attach new HLS instance
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari: set src directly
      audio.src = newUrl;
      audio.load();
    } else if (Hls.isSupported()) {
      const newHls = getOrCreateHls(newUrl); // pre-warmed if visited before
      const errHandler = (_: any, data: any) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) newHls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) newHls.recoverMediaError();
      };
      newHls.on(Hls.Events.ERROR, errHandler);
      newHls.attachMedia(audio);
    }

    // 5. Re-register the same audio element with audioManager (url changed)
    audioManager.register('bg', audio, 0.7);

    // 6. Resume playback if it was active and user hasn't manually paused
    if (wasPlaying && wasNotUserPaused) {
      // Small delay to allow HLS manifest to start loading
      setTimeout(() => {
        audioManager.unpauseBg();
      }, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  // ─────────────────────────────────────────────────────────────────

  // Lens suppression (isLensGalleryOpen effect)
  useEffect(() => {
    if (isLensGalleryOpen) {
      audioManager.suppressBg('lens_open');
    } else {
      audioManager.releaseBg('lens_open');
    }
  }, [isLensGalleryOpen]);

  // Gallery suppression (isGalleryOpen effect)
  useEffect(() => {
    if (isGalleryOpen) {
      audioManager.suppressBg('mebit_open');
    } else {
      audioManager.releaseBg('mebit_open');
    }
  }, [isGalleryOpen]);

  // audioIntent + loaded effect
  useEffect(() => {
    if (audioRef.current && loaded) {
      const audio = audioRef.current;
      if (audioIntent === 'user-playing') {
        audioManager.unpauseBg();
      } else if (audioIntent === 'initial') {
        const onInteraction = () => {
          audio.muted = false;
          setAudioIntent('user-playing');
          audioManager.unpauseBg();
          window.removeEventListener('click', onInteraction);
          window.removeEventListener('scroll', onInteraction);
        };
        window.addEventListener('click', onInteraction, { once: true });
        window.addEventListener('scroll', onInteraction, { once: true, passive: true });
      }
    }
  }, [audioIntent, loaded, setAudioIntent]);

  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioManager.pause('bg');
      setIsPlaying(false);
      setAudioIntent('user-paused');
      savePrefs({ audioIntent: 'user-paused' });
    } else {
      audioManager.unpauseBg();
      setIsPlaying(true);
      setAudioIntent('user-playing');
      savePrefs({ audioIntent: 'user-playing' });
    }
  }, [isPlaying, setAudioIntent]);

  const handleSongPlay = useCallback(() => {
    // Unconditionally pause gallery audio before song starts
    audioManager.pause('lens');
    audioManager.pause('mebit');
    // We just update the UI state.
    setIsPlaying(false);
  }, []);

  const handleSongStop = useCallback(() => {
    if (isLensGalleryOpen) {
      audioManager.play('lens');
    }
    if (isGalleryOpen) {
      audioManager.play('mebit');
    }
  }, [isLensGalleryOpen, isGalleryOpen]);

  const handleGalleryOpen = useCallback((index = 0) => {
    audioManager.play('mebit');
    if (setIsGalleryOpen) {
      setIsGalleryOpen(true);
    }
    if (setSelectedImageIndex) {
      setSelectedImageIndex(index);
    }
    setIsMeBitPlaying(true);
  }, [setIsGalleryOpen, setSelectedImageIndex]);

  const handleGalleryClose = useCallback(() => {
    audioManager.pause('mebit');
    if (setIsGalleryOpen) {
      setIsGalleryOpen(false);
    }
    setIsMeBitPlaying(false);
  }, [setIsGalleryOpen]);

  const toggleMeBitAudio = useCallback(() => {
    if (!meBitAudioRef.current) return;
    if (isMeBitPlaying) {
      audioManager.pause('mebit');
      setIsMeBitPlaying(false);
    } else {
      audioManager.play('mebit');
      setIsMeBitPlaying(true);
    }
  }, [isMeBitPlaying]);

  return {
    audioRef,
    isPlaying,
    isMeBitPlaying,
    setIsMeBitPlaying,
    toggleAudio,
    handleSongPlay,
    handleSongStop,
    handleGalleryOpen,
    handleGalleryClose,
    toggleMeBitAudio,
  };
}
