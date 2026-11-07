/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import type { ErrorData, Events } from 'hls.js';
import { audioManager } from '../audio/audioManager';
import { getOrCreateHls, getHlsClass, safeDetach } from '../audio/hlsPool';
import { THEME_BG_MUSIC, ASSETS } from '../constants/assets';
import { savePrefs, type Theme, type AudioIntent } from '../utils/userPrefs';

export interface UseThemeBgMusicSwapOptions {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentBgUrlRef: RefObject<string>;
  theme: Theme;
  audioIntent: AudioIntent;
  setAudioIntent: React.Dispatch<React.SetStateAction<AudioIntent>>;
}

export function useThemeBgMusicSwap({
  audioRef,
  currentBgUrlRef,
  theme,
  audioIntent,
  setAudioIntent,
}: UseThemeBgMusicSwapOptions): void {
  const themeSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeSwapAbortRef = useRef<AbortController | null>(null);
  const themeSwapBgPausedRef = useRef<boolean>(false);
  const themeSwapInFlightUrlRef = useRef<string | null>(null);

  const audioIntentRef = useRef(audioIntent);
  useEffect(() => {
    audioIntentRef.current = audioIntent;
  }, [audioIntent]);

  const promoteIntentToPlaying = useCallback(() => {
    if (audioIntentRef.current !== 'user-playing') {
      setAudioIntent('user-playing');
      savePrefs({ audioIntent: 'user-playing' });
    }
  }, [setAudioIntent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const resolved =
      theme === 'dark'
        ? 'dark'
        : theme === 'light'
          ? 'light'
          : theme === 'bit'
            ? 'bit'
            : theme === 'lite'
              ? 'lite'
              : 'midnight';

    const newUrl = THEME_BG_MUSIC[resolved] ?? ASSETS.media.music;

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

    audioManager.pause('bg');
    themeSwapBgPausedRef.current = true;

    const swapHls = async () => {
      const checkAbort = () => abort.signal.aborted;
      const prevUrl = currentBgUrlRef.current;

      if (!audio.canPlayType('application/vnd.apple.mpegurl')) {
        const HlsClass = await getHlsClass();
        if (checkAbort()) return;
        if (HlsClass.isSupported() && prevUrl) {
          safeDetach(prevUrl);
        }
      }
      if (checkAbort()) return;

      currentBgUrlRef.current = newUrl;

      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = newUrl;
        audio.load();
      } else {
        const HlsClass = await getHlsClass();
        if (checkAbort()) {
          safeDetach(newUrl);
          return;
        }
        if (HlsClass.isSupported()) {
          const newHls = await getOrCreateHls(newUrl);
          if (checkAbort()) {
            safeDetach(newUrl);
            return;
          }

          const errHandler = (_event: Events.ERROR, data: ErrorData) => {
            if (!data.fatal) return;
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) newHls.startLoad();
            else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) newHls.recoverMediaError();
          };
          newHls.on(HlsClass.Events.ERROR, errHandler);
          newHls.attachMedia(audio);

          if (checkAbort()) {
            try {
              newHls.off(HlsClass.Events.ERROR, errHandler);
            } catch {}
            safeDetach(newUrl);
            return;
          }
        }
      }

      if (checkAbort()) return;
      audioManager.register('bg', audio, 0.7);

      themeSwapTimerRef.current = setTimeout(() => {
        themeSwapTimerRef.current = null;
        if (checkAbort()) return;
        audioManager.unpauseBg();
        themeSwapBgPausedRef.current = false;
        themeSwapInFlightUrlRef.current = null;
        promoteIntentToPlaying();
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
      audioManager.forceReleaseBg('theme-swap');
    };
  }, [theme, audioRef, currentBgUrlRef, promoteIntentToPlaying]);
}
