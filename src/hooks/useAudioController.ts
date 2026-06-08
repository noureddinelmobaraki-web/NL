import { useState, useEffect, useCallback, useRef } from 'react';
import type { ErrorData, Events } from 'hls.js';
import { audioManager } from '../audio/audioManager';
import { getOrCreateHls, getHlsClass } from '../audio/hlsPool';
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
  const themeSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeSwapAbortRef = useRef<AbortController | null>(null);

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
      : theme === 'lite' ? 'lite'
      : 'midnight';
    const url = THEME_BG_MUSIC[initialResolved] ?? ASSETS.media.music;
    currentBgUrlRef.current = url;

    const setupHls = async () => {
      // Safari: native HLS support
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = url;
        audio.load();
        audio.addEventListener('loadedmetadata', () => {
          audioManager.triggerManifestParsed();
        }, { once: true });
      } else {
        const HlsClass = await getHlsClass();
        if (HlsClass.isSupported()) {
          // Chrome/Android/Firefox: use hls.js
          const hls = await getOrCreateHls(url);
          hls.attachMedia(audio);
          hls.once(HlsClass.Events.MANIFEST_PARSED, () => {
            audioManager.triggerManifestParsed();
          });
          const errHandler = (_event: Events.ERROR, data: ErrorData) => {
            if (!data.fatal) return;
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          };
          hls.on(HlsClass.Events.ERROR, errHandler);
        }
      }

      // Lens
      const lensAudio = new Audio(ASSETS.media.lensMusic);
      lensAudio.crossOrigin = "anonymous";
      lensAudio.loop = true;
      lensAudio.preload = 'none';
      audioManager.register('lens', lensAudio, 0.7);

      // ME bit (Pre-initialize for instant playback)
      const meBitAudio = new Audio();
      meBitAudio.crossOrigin = "anonymous";
      meBitAudio.loop = true;
      meBitAudio.preload = 'none';
      meBitAudio.volume = 0;
      meBitAudioRef.current = meBitAudio;
      audioManager.register('mebit', meBitAudio, 0.6);

      const meBitUrl = ASSETS.media.meBitMusic;
      if (meBitAudio.canPlayType('application/vnd.apple.mpegurl')) {
        meBitAudio.src = meBitUrl;
        meBitAudio.load();
      } else {
        const HlsClass = await getHlsClass();
        if (HlsClass.isSupported()) {
          const hls = await getOrCreateHls(meBitUrl);
          hls.attachMedia(meBitAudio);
          meBitHlsAttached.current = true;
        }
      }
    };

    setupHls();

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
      : theme === 'lite' ? 'lite'
      : 'midnight';

    const newUrl = THEME_BG_MUSIC[resolved] ?? ASSETS.media.music;

    // Skip on initial mount — handled by the audio init useEffect([])
    if (!currentBgUrlRef.current || currentBgUrlRef.current === newUrl) return;

    if (themeSwapTimerRef.current) {
      clearTimeout(themeSwapTimerRef.current);
      themeSwapTimerRef.current = null;
    }
    if (themeSwapAbortRef.current) themeSwapAbortRef.current.abort();
    const abort = new AbortController();
    themeSwapAbortRef.current = abort;

    // 1. Fade out and pause current bg
    audioManager.pause('bg');

    const swapHls = async () => {
      // 2. Detach old HLS instance (kept alive in pool)
      if (!audio.canPlayType('application/vnd.apple.mpegurl')) {
        const HlsClass = await getHlsClass();
        if (abort.signal.aborted) return;
        if (HlsClass.isSupported()) {
          const oldHls = await getOrCreateHls(currentBgUrlRef.current);
          if (abort.signal.aborted) return;
          try { oldHls.detachMedia(); } catch {}
        }
      }

      // 3. Update tracking ref
      currentBgUrlRef.current = newUrl;

      // 4. Attach new HLS instance
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = newUrl;
        audio.load();
      } else {
        const HlsClass = await getHlsClass();
        if (abort.signal.aborted) return;
        if (HlsClass.isSupported()) {
          const newHls = await getOrCreateHls(newUrl);
          if (abort.signal.aborted) return;
          const errHandler = (_event: Events.ERROR, data: ErrorData) => {
            if (!data.fatal) return;
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) newHls.startLoad();
            else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) newHls.recoverMediaError();
          };
          newHls.on(HlsClass.Events.ERROR, errHandler);
          newHls.attachMedia(audio);
        }
      }
      if (abort.signal.aborted) return;

      // 5. Re-register the same audio element with audioManager (url changed)
      audioManager.register('bg', audio, 0.7);

      // 6. Play the background audio unconditionally when transitioning to any of the 6 modes/themes!
      themeSwapTimerRef.current = setTimeout(() => {
        themeSwapTimerRef.current = null;
        if (abort.signal.aborted) return;
        audioManager.unpauseBg();
        setAudioIntent('user-playing');
        savePrefs({ audioIntent: 'user-playing' });
      }, 400);
    };

    swapHls();

    return () => {
      abort.abort();
      if (themeSwapTimerRef.current) {
        clearTimeout(themeSwapTimerRef.current);
        themeSwapTimerRef.current = null;
      }
    };
  }, [theme, audioIntent]);
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
    if (!audioRef.current || !loaded) return;
    const audio = audioRef.current;

    if (audioIntent === 'user-playing') {
      audioManager.unpauseBg();
      return;
    }
    if (audioIntent !== 'initial') return;

    let active = true;
    const onInteraction = () => {
      if (!active) return;
      active = false;
      audio.muted = false;
      setAudioIntent('user-playing');
      audioManager.unpauseBg();
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('scroll', onInteraction);
    };
    window.addEventListener('click', onInteraction, { once: true });
    window.addEventListener('scroll', onInteraction, { once: true, passive: true });

    return () => {
      active = false;
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('scroll', onInteraction);
    };
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
