import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { audioManager } from '../audio/audioManager';
import { getHlsClass } from '../audio/hlsPool';
import { INTRO_MUSIC_HLS } from '../constants/assets';

type HlsInstance = { loadSource: (u: string) => void; attachMedia: (el: HTMLMediaElement) => void; destroy: () => void };

/**
 * Owns a persistent <audio> element for the "Intro Music" track and wires it
 * into the central audioManager as the 'intro' source.
 *
 * Behavior (matches the other background tracks):
 *  - press => plays immediately (stream is pre-loaded on mount for fast start),
 *  - press again => audioManager.pause('intro') keeps currentTime, so the next
 *    press RESUMES from where it stopped (never restarts),
 *  - entering any other mode (song/lens/mebit/video) auto-interrupts intro
 *    because intro has a lower priority (see getPriority change).
 */
export function useIntroMusic(volume = 0.6) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const didSetupRef = useRef(false);

  const isIntroPlaying = useSyncExternalStore(
    (cb) => audioManager.subscribeState('intro', cb),
    () => audioManager.isSourceActive('intro'),
    () => false,
  );

  useEffect(() => {
    if (didSetupRef.current) return;
    didSetupRef.current = true;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0; // audioManager controls the real volume via fades
    audioRef.current = audio;

    audioManager.register('intro', audio, volume);

    let cancelled = false;

    const setupStream = async () => {
      try {
        if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = INTRO_MUSIC_HLS;
          audio.load();
          return;
        }
        const Hls = await getHlsClass();
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            backBufferLength: 30,
            startPosition: 0,
          }) as unknown as HlsInstance;
          hlsRef.current = hls;
          hls.loadSource(INTRO_MUSIC_HLS); // prefetch now => fast first press
          hls.attachMedia(audio);
        } else {
          audio.src = INTRO_MUSIC_HLS;
          audio.load();
        }
      } catch {
        /* swallow: button becomes a no-op if the stream can't load */
      }
    };

    void setupStream();

    return () => {
      cancelled = true;
      try { audioManager.stop('intro'); } catch { /* ignore */ }
      try { hlsRef.current?.destroy(); } catch { /* ignore */ }
      hlsRef.current = null;
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch { /* ignore */ }
      audioManager.unregister('intro');
      audioRef.current = null;
      didSetupRef.current = false;
    };
  }, [volume]);

  const toggleIntro = useCallback(() => {
    if (audioManager.isSourceActive('intro')) {
      audioManager.pause('intro'); // keeps currentTime => resume on next press
    } else {
      audioManager.play('intro').catch(() => {
        audioManager.armUserGestureResume();
      });
    }
  }, []);

  return { isIntroPlaying, toggleIntro };
}
