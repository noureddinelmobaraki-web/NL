import { useCallback, useEffect, useRef } from 'react';
import { audioManager } from '../../../audio/audioManager';
import { ensureAutoplay } from '../../../audio/ensureAutoplay';
import { soundGovernor } from '../../../audio/soundGovernor';
import {
  PORTRAIT_AMBIENCE_VOLUME,
  PORTRAIT_AUDIO_SOURCE,
  PORTRAIT_DUCK_MS,
} from '../constants';

const CHANNEL_ID = 'bg:portrait';

/**
 * Owns the page ambience.
 *
 * CONTRACT WITH audioManager — read before changing anything here.
 *
 *   audioManager.register() ends with `element.volume = 0`. The only code that
 *   raises it again is executePlay(), reached only through audioManager.play().
 *   Therefore: never call el.play() on a registered element, and never write
 *   el.volume directly. Both are silent no-ops at best and desyncs at worst.
 *   Use audioManager.play() / audioManager.pause() and let it own the volume.
 *
 * Site-wide silencing is NOT done here. 'portrait' being a PageId makes
 * AppContext stop and suppress the theme background on entry. That path is
 * already tested; duplicating it here would create two owners of one state.
 */
export function usePortraitAudio(src: string) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /** True only while the ambience is *supposed* to be audible. */
  const wantAmbienceRef = useRef(false);

  const playAmbience = useCallback(async () => {
    wantAmbienceRef.current = true;
    await audioManager.play(PORTRAIT_AUDIO_SOURCE, { force: true });
    // play() resolves off an internal chain, pause() is synchronous. By the
    // time we get here the intent may have flipped, so re-read it and undo.
    if (!wantAmbienceRef.current) {
      audioManager.pause(PORTRAIT_AUDIO_SOURCE, 120);
    }
  }, []);

  const stopAmbience = useCallback((fadeMs: number = PORTRAIT_DUCK_MS) => {
    wantAmbienceRef.current = false;
    audioManager.pause(PORTRAIT_AUDIO_SOURCE, fadeMs);
  }, []);

  // ── registration + lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.loop = true;

    // Diagnostic only. Never gate playback on canPlayType — browsers return
    // '' for formats they can in fact decode.
    if (import.meta.env.DEV && el.canPlayType('audio/webm; codecs="opus"') === '') {
      console.warn(
        '[portrait] This browser reports no WebM/Opus audio support. If the ' +
          'ambience stays silent here, upload an .m4a twin and swap ' +
          'PORTRAIT_ASSETS.ambience.',
      );
    }

    audioManager.register(PORTRAIT_AUDIO_SOURCE, el, PORTRAIT_AMBIENCE_VOLUME);

    // audioManager.register() installs a `canplay` listener whose staleness
    // check compares the entry generation against the value captured at
    // registration — but play() increments that same field on every call, so
    // the check can never pass again after the first play(). The manager's own
    // catch-up path is therefore dead, and a play() that arrives before the
    // media is buffered is parked in pendingPlay and never resumed.
    //
    // Every other audio surface in this codebase carries its own retry for
    // this reason (RetroWorldPage.tsx:92, ThemeSongBar.tsx:99,
    // LauncherBackground.tsx:160). This is ours.
    const tryPlay = () => {
      if (!wantAmbienceRef.current) return;
      void audioManager.play(PORTRAIT_AUDIO_SOURCE, { force: true });
    };
    el.addEventListener('canplay', tryPlay);

    const unregister = soundGovernor.register({
      id: CHANNEL_ID,
      kind: 'background',
      priority: 40,
      isPlaying: () => !el.paused && !el.ended,
      pause: () => audioManager.pause(PORTRAIT_AUDIO_SOURCE),
      stop: () => audioManager.stop(PORTRAIT_AUDIO_SOURCE),
      setVolume: (v) => {
        el.volume = v;
      },
      getVolume: () => el.volume,
    });

    const onPlaying = () => {
      try {
        soundGovernor.notePlaying(CHANNEL_ID);
      } catch {
        /* noop */
      }
    };
    const onPause = () => {
      try {
        soundGovernor.noteStopped(CHANNEL_ID);
      } catch {
        /* noop */
      }
    };

    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);

    wantAmbienceRef.current = true;

    // force: true is mandatory — 'portrait' has priority 6 and the home page
    // often leaves 'profile' (12) or 'song' (10) active, which makes an
    // unforced play a silent no-op (audioManager.ts:403).
    const cleanupAutoplay = ensureAutoplay(PORTRAIT_AUDIO_SOURCE, {
      force: true,
      verify: () => !el.paused,
    });

    // Three independent triggers, in order of how early they can fire:
    //   1. right now, if the element is already buffered;
    //   2. `canplay`, which is the normal path on a cold cache;
    //   3. the first gesture or movement, via ensureAutoplay.
    // Whichever lands first wins; the rest are no-ops because executePlay
    // skips an element that is not paused (audioManager.ts:480).
    tryPlay();

    return () => {
      el.removeEventListener('canplay', tryPlay);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      unregister();
      cleanupAutoplay();
      try {
        soundGovernor.noteStopped(CHANNEL_ID);
      } catch {
        /* noop */
      }
      try {
        audioManager.stop(PORTRAIT_AUDIO_SOURCE);
      } catch {
        /* noop */
      }
      try {
        audioManager.unregister(PORTRAIT_AUDIO_SOURCE);
      } catch {
        /* not registered */
      }
    };
  }, []);

  // ── ducking for the video ─────────────────────────────────────────────────
  const duckForVideo = useCallback(() => {
    stopAmbience();
  }, [stopAmbience]);

  const restoreAfterVideo = useCallback(() => {
    void playAmbience();
  }, [playAmbience]);

  return {
    audioRef,
    src,
    playAmbience,
    stopAmbience,
    duckForVideo,
    restoreAfterVideo,
  };
}
