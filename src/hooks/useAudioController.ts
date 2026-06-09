import { useState, useEffect, useCallback, useRef } from 'react';
import type { ErrorData, Events } from 'hls.js';
import { audioManager } from '../audio/audioManager';
import { getOrCreateHls, getHlsClass, safeDetach } from '../audio/hlsPool';
import { THEME_BG_MUSIC, ASSETS } from '../constants/assets';
import { savePrefs, needsUserGesture } from '../utils/userPrefs';
import type { Theme, AudioIntent } from '../utils/userPrefs';

const useEffectEvent = <T extends (...a: any[]) => any>(fn: T): T => {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback(((...a) => ref.current(...a)) as T, []);
};

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
  const themeSwapBgPausedRef = useRef<boolean>(false);  // ← NEW
  const themeSwapInFlightUrlRef = useRef<string | null>(null);  // ← NEW

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMeBitPlaying, setIsMeBitPlaying] = useState(false);

  // Audio lifecycle for persistent sources
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Register immediately with AudioManager
    audioManager.register('bg', audio, 0.7);
    audioManager.setStateCallback((playing) => setIsPlaying(playing));
    audioManager.armUserGestureResume(); // ← P01.6: prime iOS gesture path

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

      // ME bit — element registered but HLS attached lazily.
      // ensureMeBitLoaded() is called by useMeBitPrefetch on hover / intersection / first open.
      const meBitAudio = new Audio();
      meBitAudio.crossOrigin = "anonymous";
      meBitAudio.loop = true;
      meBitAudio.preload = 'none';
      meBitAudio.volume = 0;
      meBitAudioRef.current = meBitAudio;
      audioManager.register('mebit', meBitAudio, 0.6);
    };

    setupHls();

    return () => {
      audioManager.pause('lens');
      audioManager.pause('mebit');
    };
  }, []); // runs once on mount

  const ensureMeBitLoaded = useCallback(async () => {
    if (meBitHlsAttached.current || !meBitAudioRef.current) return;
    const meBitAudio = meBitAudioRef.current;
    const meBitUrl = ASSETS.media.meBitMusic;

    if (meBitAudio.canPlayType('application/vnd.apple.mpegurl')) {
      if (!meBitAudio.src || !meBitAudio.src.includes('m3u8')) {
        meBitAudio.src = meBitUrl;
        meBitAudio.load();
      }
    } else {
      const HlsClass = await getHlsClass();
      if (HlsClass.isSupported()) {
        const hls = await getOrCreateHls(meBitUrl);
        hls.attachMedia(meBitAudio);
        meBitHlsAttached.current = true;
      }
    }
  }, []);

  // ── Per-theme background music swap ──────────────────────────────
  // Reads audioIntent / writes prefs WITHOUT entering the effect's deps.
  const promoteIntentToPlaying = useEffectEvent(() => {
    if (audioIntent !== 'user-playing') {
      setAudioIntent('user-playing');
      savePrefs({ audioIntent: 'user-playing' });
    }
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const resolved = theme === 'dark' ? 'dark'
      : theme === 'light' ? 'light'
      : theme === 'bit' ? 'bit'
      : theme === 'lite' ? 'lite'
      : 'midnight';

    const newUrl = THEME_BG_MUSIC[resolved] ?? ASSETS.media.music;

    // ─── Robust dedup guard ──────────────────────────────────────────
    // (a) Never run on initial mount (the init effect handles it).
    if (!currentBgUrlRef.current) return;

    // (b) URL didn't change — silent return.
    if (currentBgUrlRef.current === newUrl) return;

    // (c) An in-flight swap is already targeting this exact URL — skip.
    if (themeSwapInFlightUrlRef.current === newUrl) return;

    themeSwapInFlightUrlRef.current = newUrl;

    if (themeSwapTimerRef.current) {
      clearTimeout(themeSwapTimerRef.current);
      themeSwapTimerRef.current = null;
    }
    if (themeSwapAbortRef.current) themeSwapAbortRef.current.abort();
    const abort = new AbortController();
    themeSwapAbortRef.current = abort;

    // ▶ Mark that *this* effect is the owner of the bg-paused state.
    audioManager.pause('bg');
    themeSwapBgPausedRef.current = true;

    const swapHls = async () => {
      const checkAbort = () => abort.signal.aborted;
      const prevUrl = currentBgUrlRef.current;

      // ─── Detach old HLS instance ──────────────────────────────────
      if (!audio.canPlayType('application/vnd.apple.mpegurl')) {
        const HlsClass = await getHlsClass();
        if (checkAbort()) return;
        if (HlsClass.isSupported() && prevUrl) {
          safeDetach(prevUrl);   // ← idempotent, no await needed
        }
      }
      if (checkAbort()) return;

      // ─── Commit new URL ───────────────────────────────────────────
      currentBgUrlRef.current = newUrl;

      // ─── Attach new HLS instance ──────────────────────────────────
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = newUrl;
        audio.load();
      } else {
        const HlsClass = await getHlsClass();
        if (checkAbort()) { safeDetach(newUrl); return; }
        if (HlsClass.isSupported()) {
          const newHls = await getOrCreateHls(newUrl);
          // ▶ CRITICAL: between the two awaits the user may have switched again.
          if (checkAbort()) { safeDetach(newUrl); return; }

          const errHandler = (_event: Events.ERROR, data: ErrorData) => {
            if (!data.fatal) return;
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) newHls.startLoad();
            else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) newHls.recoverMediaError();
          };
          newHls.on(HlsClass.Events.ERROR, errHandler);
          newHls.attachMedia(audio);

          // ▶ If abort fires *during* attachMedia, undo it.
          if (checkAbort()) {
            try { newHls.off(HlsClass.Events.ERROR, errHandler); } catch {}
            safeDetach(newUrl);
            return;
          }
        }
      }

      // ─── Re-register & schedule unmute ────────────────────────────
      if (checkAbort()) return;
      audioManager.register('bg', audio, 0.7);

      themeSwapTimerRef.current = setTimeout(() => {
        themeSwapTimerRef.current = null;
        if (checkAbort()) return;
        audioManager.unpauseBg();
        themeSwapBgPausedRef.current = false;
        themeSwapInFlightUrlRef.current = null;  // ← NEW: clear flight marker
        promoteIntentToPlaying();  // from Prompt G2
      }, 400);
    };

    swapHls();

    return () => {
      abort.abort();
      if (themeSwapTimerRef.current) {
        clearTimeout(themeSwapTimerRef.current);
        themeSwapTimerRef.current = null;
      }
      if (themeSwapBgPausedRef.current) {
        audioManager.unpauseBg();
        themeSwapBgPausedRef.current = false;
      }
      themeSwapInFlightUrlRef.current = null;
      // ▶ Final safety net: clear any leftover suppressors tagged 'theme-swap'.
      audioManager.forceReleaseBg('theme-swap');
    };
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

  // Suppression is now owned by useMeBitSession inside MeBitGallery.
  // Keep this effect only as a coarse fallback for legacy callers.
  useEffect(() => {
    if (!isGalleryOpen) {
      audioManager.forceReleaseBgPrefix('mebit-session');
    }
  }, [isGalleryOpen]);

  // audioIntent + loaded effect
  useEffect(() => {
    if (!audioRef.current || !loaded) return;
    const audio = audioRef.current;

    if (audioIntent === 'user-playing') {
      if (needsUserGesture()) {
        // Defer until first interaction — same listener as 'initial' branch.
        // Fall through to the gesture wait block below.
      } else {
        audioManager.unpauseBg();
        return;
      }
    }
    if (audioIntent !== 'initial' && !(audioIntent === 'user-playing' && needsUserGesture())) return;

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

  // ── Visibility / pageshow recovery (iOS Safari 18 quirks) ────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (document.visibilityState !== 'visible') return;
        // Primary: use hardened recoverAudio() from audioManager.
        if (typeof (audioManager as any).recoverAudio === 'function') {
          (audioManager as any).recoverAudio();
        } else {
          // Fallback: best-effort resume.
          if (!audioManager.isSourceActive('song') && !audioManager.isSourceActive('lens') && !audioManager.isSourceActive('mebit')) {
            audioManager.unpauseBg();
          }
        }
      }, 250);
    };

    const onVisibility = () => trigger();
    const onPageShow = (e: PageTransitionEvent) => {
      // bfcache restore — always retry.
      if (e.persisted) trigger();
      else trigger();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

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
    ensureMeBitLoaded();
    audioManager.play('mebit');
    if (setIsGalleryOpen) {
      setIsGalleryOpen(true);
    }
    if (setSelectedImageIndex) {
      setSelectedImageIndex(index);
    }
    setIsMeBitPlaying(true);
  }, [setIsGalleryOpen, setSelectedImageIndex, ensureMeBitLoaded]);

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
    ensureMeBitLoaded,
  };
}
